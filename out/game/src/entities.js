// entities.js — the moving things in Port Meridian: traffic cars, walking
// pedestrians, police cruisers, bullets and impact particles, plus the
// combat actions (punch, shoot) the player uses on them.

import { WORLD, CAR, POLICE, PLAYER, COLORS } from './config.js';
import { makeRng, range, pick } from './random.js';
import { hitsSolid, nearestRoadPoint, randomRoadPoint, clampToWorld } from './world.js';

export function makeCar(x, y, angle, color, kind) {
  return {
    x,
    y,
    angle,
    speed: 0,
    color,
    kind: kind || 'traffic', // traffic | police | parked | player
    health: 100,
    w: 46,
    h: 22,
    // traffic cars cruise one road; police chase freely
    axis: 'h',
    dir: 1,
    cruise: 120,
    smoke: 0,
  };
}

export function spawnTraffic(world, seed, count) {
  const rng = makeRng(`traffic-${seed}`);
  const cars = [];
  for (let i = 0; i < count; i++) {
    const p = randomRoadPoint(rng, world.roadsV, world.roadsH);
    const horizontal = rng() < 0.5;
    const car = makeCar(p.x, p.y, horizontal ? (rng() < 0.5 ? 0 : Math.PI) : rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2, pick(rng, COLORS.carColors), 'traffic');
    car.axis = horizontal ? 'h' : 'v';
    car.dir = rng() < 0.5 ? 1 : -1;
    car.cruise = range(rng, 95, 165);
    car.speed = car.cruise;
    // Sit in a lane, not dead-centre on the road.
    if (horizontal) car.y += car.dir > 0 ? 22 : -22;
    else car.x += car.dir > 0 ? 22 : -22;
    cars.push(car);
  }
  return cars;
}

export function spawnPeds(world, seed, count) {
  const rng = makeRng(`peds-${seed}`);
  const peds = [];
  for (let i = 0; i < count; i++) {
    const p = randomRoadPoint(rng, world.roadsV, world.roadsH);
    peds.push({
      x: p.x,
      y: p.y,
      tx: p.x,
      ty: p.y,
      speed: range(rng, 32, 62),
      color: pick(rng, COLORS.pedShirt),
      down: false,
      downT: 0,
      fleeT: 0,
      r: 11,
    });
  }
  return peds;
}

export function updateTraffic(world, cars, dt) {
  for (const car of cars) {
    if (car.kind !== 'traffic') continue;
    if (car.axis === 'h') {
      car.x += car.dir * car.speed * dt;
      if (car.x < 60) car.x = WORLD.w - 60;
      if (car.x > WORLD.w - 60) car.x = 60;
    } else {
      car.y += car.dir * car.speed * dt;
      if (car.y < 60) car.y = WORLD.h - 60;
      if (car.y > WORLD.h - 60) car.y = 60;
    }
  }
}

function repickTarget(rng, ped, world) {
  const p = randomRoadPoint(rng, world.roadsV, world.roadsH);
  ped.tx = p.x;
  ped.ty = p.y;
}

export function updatePeds(world, peds, player, dt, rng) {
  for (const ped of peds) {
    if (ped.down) {
      ped.downT -= dt;
      continue;
    }
    if (ped.fleeT > 0) {
      ped.fleeT -= dt;
      const dx = ped.x - player.x;
      const dy = ped.y - player.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = ped.x + (dx / len) * ped.speed * 2.1 * dt;
      const ny = ped.y + (dy / len) * ped.speed * 2.1 * dt;
      if (!hitsSolid(world, nx, ny, 10)) {
        ped.x = nx;
        ped.y = ny;
      }
      continue;
    }
    const dx = ped.tx - ped.x;
    const dy = ped.ty - ped.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 12) {
      repickTarget(rng, ped, world);
      continue;
    }
    const nx = ped.x + (dx / dist) * ped.speed * dt;
    const ny = ped.y + (dy / dist) * ped.speed * dt;
    if (!hitsSolid(world, nx, ny, 10)) {
      ped.x = nx;
      ped.y = ny;
    } else {
      repickTarget(rng, ped, world);
    }
  }
  // Drop peds that have been down a while; the street refills itself.
  for (let i = peds.length - 1; i >= 0; i--) {
    if (peds[i].down && peds[i].downT <= 0) peds.splice(i, 1);
  }
}

export function spawnPolice(world, player, count, rng) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = range(rng, 320, 520);
    const spot = nearestRoadPoint(
      world,
      player.x + Math.cos(angle) * dist,
      player.y + Math.sin(angle) * dist,
    );
    const clamped = clampToWorld(spot.x, spot.y, 80);
    const car = makeCar(clamped.x, clamped.y, 0, COLORS.cruiser, 'police');
    car.speed = 200;
    car.ramCd = 0;
    out.push(car);
  }
  return out;
}

export function updatePolice(G, dt) {
  const { world, player } = G;
  const target = player.car || player;
  for (const cop of G.police) {
    cop.ramCd = Math.max(0, (cop.ramCd || 0) - dt);
    const dx = target.x - cop.x;
    const dy = target.y - cop.y;
    const dist = Math.hypot(dx, dy) || 1;
    const wantAngle = Math.atan2(dy, dx);
    let diff = wantAngle - cop.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cop.angle += Math.max(-2.8 * dt, Math.min(2.8 * dt, diff));
    cop.speed = Math.min(POLICE.topSpeed, cop.speed + POLICE.accel * dt);
    if (dist < 90) cop.speed = Math.min(cop.speed, 240);
    const nx = cop.x + Math.cos(cop.angle) * cop.speed * dt;
    const ny = cop.y + Math.sin(cop.angle) * cop.speed * dt;
    // Slide along walls instead of stopping dead on them.
    if (!hitsSolid(world, nx, cop.y, 20)) cop.x = nx;
    else if (!hitsSolid(world, cop.x, ny, 20)) cop.y = ny;
    else {
      cop.angle += Math.PI / 2;
      cop.speed *= 0.5;
    }
    cop.x = Math.max(40, Math.min(WORLD.w - 40, cop.x));
    cop.y = Math.max(40, Math.min(WORLD.h - 40, cop.y));

    // Cruisers shove each other apart so they stop stacking on one spot.
    for (const other of G.police) {
      if (other === cop) continue;
      const ox = cop.x - other.x;
      const oy = cop.y - other.y;
      const od = Math.hypot(ox, oy);
      if (od > 0.01 && od < 52) {
        cop.x += (ox / od) * 26 * dt * 8;
        cop.y += (oy / od) * 26 * dt * 8;
      }
    }

    // Ramming the player hurts; standing next to a cop on foot gets you caught.
    if (dist < 44 && cop.ramCd <= 0) {
      cop.ramCd = POLICE.ramCooldown;
      if (player.car) {
        hurtPlayer(G, POLICE.ramDamage);
        addParticles(G, cop.x, cop.y, 8, '#ffd23a');
      } else {
        player.arrestT += 0.55;
        if (player.arrestT >= PLAYER.arrestSeconds) {
          G.state = 'busted';
          G.audio.failed();
          G.audio.stopSiren();
        }
      }
    }
    if (dist > 70 && !player.car) player.arrestT = Math.max(0, player.arrestT - dt);
  }
  // Cruisers that fall far behind give up and despawn.
  for (let i = G.police.length - 1; i >= 0; i--) {
    const cop = G.police[i];
    if (Math.hypot(cop.x - player.x, cop.y - player.y) > 1500) G.police.splice(i, 1);
  }
}

export function hurtPlayer(G, amount) {
  const p = G.player;
  p.health -= amount;
  p.lastDamageT = G.time;
  if (p.health <= 0) {
    p.health = 0;
    G.state = 'wasted';
    G.audio.failed();
    G.audio.stopSiren();
  }
}

export function addParticles(G, x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 60 + Math.random() * 160;
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5, max: 0.5, color });
  }
  if (G.particles.length > 220) G.particles.splice(0, G.particles.length - 220);
}

export function updateParticles(G, dt) {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
    p.life -= dt;
    if (p.life <= 0) G.particles.splice(i, 1);
  }
}

// A punch hits the nearest person or cruiser inside range in front of you.
export function tryPunch(G) {
  const p = G.player;
  if (p.punchCd > 0 || p.car) return;
  p.punchCd = PLAYER.punchCooldown;
  G.audio.punch();
  const fx = p.x + Math.cos(p.angle) * 30;
  const fy = p.y + Math.sin(p.angle) * 30;
  let hitSomething = false;
  for (const ped of G.peds) {
    if (ped.down) continue;
    if (Math.hypot(ped.x - fx, ped.y - fy) < PLAYER.punchRange) {
      ped.down = true;
      ped.downT = 6;
      addParticles(G, ped.x, ped.y, 10, '#ffffff');
      G.player.cash += 20;
      hitSomething = true;
      break;
    }
  }
  if (!hitSomething) {
    for (const cop of G.police) {
      if (Math.hypot(cop.x - fx, cop.y - fy) < PLAYER.punchRange + 18) {
        cop.health -= PLAYER.punchDamage;
        cop.speed *= 0.4;
        addParticles(G, cop.x, cop.y, 10, '#ffd23a');
        hitSomething = true;
        break;
      }
    }
  }
  if (hitSomething) raiseWanted(G, 1);
  for (const ped of G.peds) {
    if (!ped.down && Math.hypot(ped.x - p.x, ped.y - p.y) < 260) ped.fleeT = 2.5;
  }
}

export function tryShoot(G, targetX, targetY) {
  const p = G.player;
  if (p.shootCd > 0 || p.car) return;
  p.shootCd = PLAYER.shootCooldown;
  G.audio.shot();
  const angle = Math.atan2(targetY - p.y, targetX - p.x);
  p.angle = angle;
  G.bullets.push({
    x: p.x + Math.cos(angle) * 22,
    y: p.y + Math.sin(angle) * 22,
    vx: Math.cos(angle) * PLAYER.bulletSpeed,
    vy: Math.sin(angle) * PLAYER.bulletSpeed,
    life: 0.9,
  });
  raiseWanted(G, 0, 2); // firing a gun puts you at 2 stars minimum
  for (const ped of G.peds) {
    if (!ped.down && Math.hypot(ped.x - p.x, ped.y - p.y) < 320) ped.fleeT = 3;
  }
}

export function updateBullets(G, dt) {
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0 || b.x < 0 || b.x > WORLD.w || b.y < 0 || b.y > WORLD.h;
    if (!dead && hitsSolid(G.world, b.x, b.y, 2)) {
      addParticles(G, b.x, b.y, 6, '#ffb347');
      dead = true;
    }
    if (!dead) {
      for (const ped of G.peds) {
        if (!ped.down && Math.hypot(ped.x - b.x, ped.y - b.y) < 14) {
          ped.down = true;
          ped.downT = 8;
          G.player.cash += 20;
          addParticles(G, ped.x, ped.y, 12, '#ff5a6e');
          raiseWanted(G, 1);
          dead = true;
          break;
        }
      }
    }
    if (!dead) {
      for (let j = G.police.length - 1; j >= 0; j--) {
        const cop = G.police[j];
        if (Math.hypot(cop.x - b.x, cop.y - b.y) < 26) {
          cop.health -= 34;
          addParticles(G, cop.x, cop.y, 10, '#ffd23a');
          if (cop.health <= 0) {
            cop.smoke = 1;
            G.player.cash += 50;
            addParticles(G, cop.x, cop.y, 26, '#888888');
            G.police.splice(j, 1);
          }
          raiseWanted(G, 1);
          dead = true;
          break;
        }
      }
    }
    if (dead) G.bullets.splice(i, 1);
  }
}

// add: extra stars now; floor: minimum star level after this crime.
export function raiseWanted(G, add, floor) {
  const p = G.player;
  const before = p.wanted;
  if (add) p.wanted = Math.min(5, p.wanted + add);
  if (floor !== undefined) p.wanted = Math.max(p.wanted, Math.min(5, floor));
  if (p.wanted !== before) {
    p.lastCrimeT = G.time;
    G.audio.startSiren();
  }
}
