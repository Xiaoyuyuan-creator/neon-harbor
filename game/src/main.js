// main.js — boots Neon Harbor, runs the frame loop and owns the game state.
// Player movement, driving, stealing cars, wanted decay, pickups, camera,
// saving and the click-to-start / pause / retry flows all live here.

import { WORLD, VIEW, PLAYER, CAR, WANTED, CAMERA } from './config.js';
import { makeRng } from './random.js';
import { buildWorld, hitsSolid, clampToWorld } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import {
  spawnTraffic,
  spawnPeds,
  spawnPolice,
  updateTraffic,
  updatePeds,
  updatePolice,
  updateBullets,
  updateParticles,
  tryPunch,
  tryShoot,
  raiseWanted,
} from './entities.js';
import {
  createMissionState,
  startMission,
  retryMission,
  updateMissions,
  objectiveText,
  currentTarget,
  saveGame,
  loadSave,
  exitCar,
} from './missions.js';
import { render } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const seed = params.get('seed') || '1';
const shotName = params.get('shot') || '';

const rng = makeRng(`world-${seed}`);
const world = buildWorld(seed);

const G = {
  ctx,
  world,
  rng,
  time: 0,
  state: 'title', // title | playing | paused | wasted | busted
  input: createInput(canvas),
  audio: createAudio(),
  player: {
    x: world.startPos.x,
    y: world.startPos.y,
    angle: 0,
    car: null,
    health: PLAYER.maxHealth,
    cash: 0,
    wanted: 0,
    weapon: 'fists',
    punchCd: 0,
    shootCd: 0,
    arrestT: 0,
    lastDamageT: -99,
    lastCrimeT: -99,
  },
  cars: [],
  peds: [],
  police: [],
  bullets: [],
  particles: [],
  missions: createMissionState(),
  camera: { x: world.startPos.x, y: world.startPos.y },
  hint: '',
  missionText: '',
  currentTarget: null,
  save: loadSave(),
  saveTimer: 0,
  shotMode: shotName !== '',
};

// Street life for the city.
G.cars = spawnTraffic(world, seed, 14);
G.peds = spawnPeds(world, seed, 24);

// Restore a previous run's cash and progress on the title screen.
if (G.save && !G.shotMode) {
  G.player.cash = G.save.cash || 0;
  G.missions.index = Math.min(G.save.missionIndex || 0, 3);
  if (G.missions.index >= 3) G.missions.phase = 'done';
}

function startPlaying() {
  G.audio.ensure();
  G.state = 'playing';
  if (G.missions.phase === 'intro' && G.missions.index < 3) {
    startMission(G, G.missions.index);
  } else if (G.missions.index >= 3) {
    G.missions.phase = 'done';
  }
}

function resetAfterEnding() {
  const p = G.player;
  if (G.state === 'wasted') p.cash = Math.floor(p.cash * 0.9);
  p.health = PLAYER.maxHealth;
  p.wanted = 0;
  p.arrestT = 0;
  G.police.length = 0;
  G.audio.stopSiren();
  if (p.car) {
    p.car.kind = 'parked';
    p.car.speed = 0;
    p.car = null;
  }
  p.x = world.safehousePos.x;
  p.y = world.safehousePos.y;
  p.angle = 0;
  G.state = 'playing';
  if (G.missions.index < 3) startMission(G, G.missions.index);
}

function nearestCar(maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of G.cars) {
    const d = Math.hypot(car.x - G.player.x, car.y - G.player.y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

// The same clamped top-left corner of the viewport the renderer uses, so
// mouse aim matches what the player sees even at the world edges.
function viewOrigin() {
  return {
    x: Math.max(0, Math.min(WORLD.w - VIEW.w, G.camera.x - VIEW.w / 2)),
    y: Math.max(0, Math.min(WORLD.h - VIEW.h, G.camera.y - VIEW.h / 2)),
  };
}

function updatePlayerOnFoot(dt) {
  const p = G.player;
  const input = G.input;
  const mv = input.moveVector();
  const running = input.down('ShiftLeft', 'ShiftRight');
  const speed = running ? PLAYER.runSpeed : PLAYER.walkSpeed;
  if (mv.x !== 0 || mv.y !== 0) {
    p.angle = Math.atan2(mv.y, mv.x);
    if (p.weapon === 'pistol' && (input.mouse.x !== 0 || input.mouse.y !== 0)) {
      const origin = viewOrigin();
      const wx = origin.x + input.mouse.x;
      const wy = origin.y + input.mouse.y;
      p.angle = Math.atan2(wy - p.y, wx - p.x);
    }
    const nx = p.x + mv.x * speed * dt;
    const ny = p.y + mv.y * speed * dt;
    if (!hitsSolid(world, nx, p.y, PLAYER.radius)) p.x = nx;
    if (!hitsSolid(world, p.x, ny, PLAYER.radius)) p.y = ny;
    const clamped = clampToWorld(p.x, p.y, 20);
    p.x = clamped.x;
    p.y = clamped.y;
  }
  p.punchCd = Math.max(0, p.punchCd - dt);
  p.shootCd = Math.max(0, p.shootCd - dt);
  if (input.pressed('Space', 'KeyJ')) tryPunch(G);
  if (input.mouse.clicked || input.pressed('KeyK')) {
    if (p.weapon === 'pistol') {
      const origin = viewOrigin();
      const wx = origin.x + input.mouse.x;
      const wy = origin.y + input.mouse.y;
      tryShoot(G, wx, wy);
    } else {
      tryPunch(G);
    }
  }
}

function updatePlayerDriving(dt) {
  const p = G.player;
  const car = p.car;
  const input = G.input;
  if (!car) return;
  const forward = input.down('KeyW', 'ArrowUp');
  const back = input.down('KeyS', 'ArrowDown');
  const left = input.down('KeyA', 'ArrowLeft');
  const right = input.down('KeyD', 'ArrowRight');
  if (forward) car.speed += CAR.accel * dt;
  if (back) {
    if (car.speed > 20) car.speed -= CAR.brake * dt;
    else car.speed -= CAR.accel * 0.6 * dt;
  }
  if (!forward && !back) {
    car.speed -= Math.sign(car.speed) * CAR.drag * 220 * dt;
    if (Math.abs(car.speed) < 8) car.speed = 0;
  }
  car.speed = Math.max(-CAR.reverseMax, Math.min(CAR.topSpeed, car.speed));
  const steer = (left ? -1 : 0) + (right ? 1 : 0);
  if (steer !== 0 && Math.abs(car.speed) > 12) {
    car.angle += steer * CAR.steerRate * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 160);
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (!hitsSolid(world, nx, car.y, CAR.radius - 6)) car.x = nx;
  else car.speed *= 0.4;
  if (!hitsSolid(world, car.x, ny, CAR.radius - 6)) car.y = ny;
  else car.speed *= 0.4;
  const clamped = clampToWorld(car.x, car.y, 30);
  car.x = clamped.x;
  car.y = clamped.y;
  // Bump traffic cars instead of passing through them.
  for (const other of G.cars) {
    if (other === car || other.kind !== 'traffic') continue;
    const d = Math.hypot(other.x - car.x, other.y - car.y);
    if (d < 46 && d > 0.01) {
      car.speed *= 0.55;
      other.x += ((other.x - car.x) / d) * 8;
      other.y += ((other.y - car.y) / d) * 8;
      if (Math.abs(car.speed) > 200) G.audio.crash();
    }
  }
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  G.audio.engine(Math.abs(car.speed) / CAR.topSpeed, true);
}

function updateWanted(dt) {
  const p = G.player;
  const wantedCount = WANTED.cruisersForStars[p.wanted] || 0;
  if (G.police.length < wantedCount && p.wanted > 0) {
    const fresh = spawnPolice(world, p, wantedCount - G.police.length, G.rng);
    G.police.push(...fresh);
  }
  if (p.wanted > 0 && G.time - p.lastCrimeT > WANTED.decayDelay) {
    let near = false;
    for (const cop of G.police) {
      if (Math.hypot(cop.x - p.x, cop.y - p.y) < 600) near = true;
    }
    if (!near) {
      p.decayT = (p.decayT || 0) + dt;
      if (p.decayT >= WANTED.decayEvery) {
        p.decayT = 0;
        p.wanted -= 1;
        if (p.wanted === 0) G.audio.stopSiren();
      }
    } else {
      p.decayT = 0;
    }
  }
  if (p.wanted === 0 && G.police.length > 0) {
    // The heat is off: cruisers drift away and leave.
    for (let i = G.police.length - 1; i >= 0; i--) {
      const cop = G.police[i];
      if (Math.hypot(cop.x - p.x, cop.y - p.y) > 700) G.police.splice(i, 1);
    }
    if (G.police.length === 0) G.audio.stopSiren();
  }
  // Health comes back slowly once a fight has been over for a while.
  if (G.time - p.lastDamageT > PLAYER.regenDelay && p.health > 0 && p.health < PLAYER.maxHealth) {
    p.health = Math.min(PLAYER.maxHealth, p.health + PLAYER.regenRate * dt);
  }
}

function updatePickups() {
  const p = G.player;
  for (const pk of world.pickups) {
    if (pk.taken) continue;
    if (Math.hypot(pk.x - p.x, pk.y - p.y) < 36) {
      pk.taken = true;
      if (pk.kind === 'cash') {
        p.cash += pk.amount;
        G.audio.cash();
      } else {
        p.health = Math.min(PLAYER.maxHealth, p.health + pk.amount);
        G.audio.pickup();
      }
    }
  }
}

function update(dt) {
  G.time += dt;
  G.hint = '';
  const input = G.input;

  if (G.state === 'title') {
    // The city stays alive behind the title: traffic rolls, camera drifts.
    updateTraffic(world, G.cars, dt);
    updatePeds(world, G.peds, G.player, dt, G.rng);
    G.camera.x = 1500 + Math.sin(G.time * 0.05) * 260;
    G.camera.y = 1150 + Math.cos(G.time * 0.04) * 160;
    if (input.mouse.clicked || input.anyKey) startPlaying();
    return;
  }

  if (G.state === 'paused') {
    if (input.pressed('KeyP', 'Escape') || input.mouse.clicked) G.state = 'playing';
    return;
  }

  if (G.state === 'wasted' || G.state === 'busted') {
    if (input.mouse.clicked || input.anyKey) resetAfterEnding();
    return;
  }

  // ---- playing ----
  if (input.pressed('KeyP', 'Escape')) {
    G.state = 'paused';
    return;
  }
  if (input.pressed('KeyM')) {
    const muted = G.audio.toggleMute();
    G.hint = muted ? 'Sound muted (M to unmute)' : 'Sound on';
  }
  if (input.pressed('Digit1')) G.player.weapon = 'fists';
  if (input.pressed('Digit2')) G.player.weapon = 'pistol';
  if (input.pressed('KeyR') && G.missions.phase === 'failed') retryMission(G);

  // Start a mission from its intro card.
  if (G.missions.phase === 'intro' && G.missions.index < 3) {
    if (input.pressed('Enter', 'NumpadEnter')) startMission(G, G.missions.index);
  }

  // Get in / out of cars.
  if (input.pressed('KeyF')) {
    if (G.player.car) {
      exitCar(G);
    } else {
      const car = nearestCar(84);
      if (car) {
        const wasTraffic = car.kind === 'traffic';
        const idx = G.cars.indexOf(car);
        if (idx >= 0) G.cars.splice(idx, 1);
        G.player.car = car;
        car.kind = 'player';
        car.speed = 0;
        G.player.x = car.x;
        G.player.y = car.y;
        if (wasTraffic) raiseWanted(G, 0, 1); // stealing a car draws 1 star
      }
    }
  }

  if (G.player.car) updatePlayerDriving(dt);
  else updatePlayerOnFoot(dt);

  updateTraffic(world, G.cars, dt);
  updatePeds(world, G.peds, G.player, dt, G.rng);
  updatePolice(G, dt);
  updateBullets(G, dt);
  updateParticles(G, dt);
  updateMissions(G, dt);
  updateWanted(dt);
  updatePickups();

  // Camera follows the player (or the car) smoothly.
  const tx = G.player.x;
  const ty = G.player.y;
  G.camera.x += (tx - G.camera.x) * Math.min(1, dt * CAMERA.followRate);
  G.camera.y += (ty - G.camera.y) * Math.min(1, dt * CAMERA.followRate);

  G.missionText = objectiveText(G);
  G.currentTarget = currentTarget(G);

  // Autosave every 15 seconds of play.
  G.saveTimer += dt;
  if (G.saveTimer > 15) {
    G.saveTimer = 0;
    saveGame(G);
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - (frame.last || now)) / 1000 || 0.016);
  frame.last = now;
  try {
    update(dt);
    render(G);
  } catch (err) {
    // Never blank the screen silently: show the error on the canvas once.
    try {
      ctx.fillStyle = '#30060a';
      ctx.fillRect(0, 0, VIEW.w, VIEW.h);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText('Neon Harbor hit a snag: ' + err.message, 24, 40);
    } catch (ignored) {
      // ignore
    }
  }
  G.input.endFrame();
}

// Stage a screenshot scene before the first frame, if one was requested.
if (shotName) {
  applyShot(G, shotName);
  G.missionText = objectiveText(G);
  G.currentTarget = currentTarget(G);
  G.audio.ensure = function ensure() {
    return false;
  };
}

canvas.focus();
requestAnimationFrame(frame);
