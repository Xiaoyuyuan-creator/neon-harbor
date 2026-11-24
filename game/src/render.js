// render.js — draws everything: the city, the harbor, cars, people, police,
// the HUD (health, cash, wanted stars, minimap, objective) and the title,
// pause and game-over screens. Canvas 2D only, no images, no web fonts.

import { WORLD, VIEW, COLORS, MISSIONS, STORY } from './config.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawStar(ctx, cx, cy, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? '#ffd23a' : 'rgba(255,255,255,0.25)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawCarShape(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // wheels
  ctx.fillStyle = '#111111';
  ctx.fillRect(-15, -13, 10, 5);
  ctx.fillRect(6, -13, 10, 5);
  ctx.fillRect(-15, 8, 10, 5);
  ctx.fillRect(6, 8, 10, 5);
  // body
  ctx.fillStyle = car.color;
  roundRect(ctx, -23, -11, 46, 22, 6);
  ctx.fill();
  // windshield + roof
  ctx.fillStyle = 'rgba(20,30,40,0.85)';
  ctx.fillRect(2, -8, 10, 16);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(-8, -8, 6, 16);
  // headlights
  ctx.fillStyle = '#ffe9a3';
  ctx.fillRect(21, -8, 3, 4);
  ctx.fillRect(21, 4, 3, 4);
  if (car.kind === 'police') {
    ctx.fillStyle = COLORS.cruiserStripe;
    ctx.fillRect(-6, -11, 12, 3);
    ctx.fillRect(-6, 8, 12, 3);
    const blink = Math.floor(performance.now() / 260) % 2 === 0;
    ctx.fillStyle = blink ? '#ff3b30' : '#2f7bff';
    ctx.beginPath();
    ctx.arc(-2, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = blink ? '#2f7bff' : '#ff3b30';
    ctx.beginPath();
    ctx.arc(6, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (car.smoke) {
    ctx.fillStyle = 'rgba(120,120,120,0.6)';
    ctx.beginPath();
    ctx.arc(-14, 0, 7 + Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPed(ctx, ped) {
  if (ped.down) {
    ctx.save();
    ctx.translate(ped.x, ped.y);
    ctx.rotate(1.2);
    ctx.fillStyle = ped.color;
    ctx.fillRect(-11, -6, 22, 12);
    ctx.fillStyle = '#e8c39a';
    ctx.beginPath();
    ctx.arc(14, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(ped.x, ped.y + 9, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ped.color;
  ctx.beginPath();
  ctx.arc(ped.x, ped.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8c39a';
  ctx.beginPath();
  ctx.arc(ped.x, ped.y - 3, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#22222a';
  ctx.beginPath();
  ctx.arc(ped.x, ped.y - 6, 6.5, Math.PI, 0);
  ctx.fill();
}

function drawWorld(ctx, G, cam) {
  const w = G.world;
  const x0 = cam.x;
  const y0 = cam.y;
  const x1 = cam.x + VIEW.w;
  const y1 = cam.y + VIEW.h;

  // Ground: grass everywhere, then roads, parks, water on top.
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(x0, y0, VIEW.w, VIEW.h);

  // Parks
  for (const park of w.parks) {
    if (park.x > x1 || park.y > y1 || park.x + park.w < x0 || park.y + park.h < y0) continue;
    ctx.fillStyle = COLORS.parkGrass;
    ctx.fillRect(park.x, park.y, park.w, park.h);
  }

  // Sidewalks + roads
  ctx.fillStyle = COLORS.sidewalk;
  for (const c of w.roadsV) ctx.fillRect(c - WORLD.roadWidth / 2 - 10, y0, WORLD.roadWidth + 20, VIEW.h);
  for (const c of w.roadsH) ctx.fillRect(x0, c - WORLD.roadWidth / 2 - 10, VIEW.w, WORLD.roadWidth + 20);
  ctx.fillStyle = COLORS.road;
  for (const c of w.roadsV) ctx.fillRect(c - WORLD.roadWidth / 2, y0, WORLD.roadWidth, VIEW.h);
  for (const c of w.roadsH) ctx.fillRect(x0, c - WORLD.roadWidth / 2, VIEW.w, WORLD.roadWidth);

  // Lane dashes
  ctx.fillStyle = COLORS.lane;
  for (const c of w.roadsV) {
    for (let y = Math.floor(y0 / 44) * 44; y < y1; y += 44) {
      ctx.fillRect(c - 2, y, 4, 22);
    }
  }
  for (const c of w.roadsH) {
    for (let x = Math.floor(x0 / 44) * 44; x < x1; x += 44) {
      ctx.fillRect(x, c - 2, 22, 4);
    }
  }

  // Dockyard concrete + containers
  ctx.fillStyle = COLORS.dockConcrete;
  ctx.fillRect(x0, 2280, VIEW.w, 110);
  for (const box of w.containers) {
    ctx.fillStyle = box.color;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let i = 1; i < 5; i++) ctx.fillRect(box.x + (box.w / 5) * i, box.y, 2, box.h);
  }

  // Harbor water with a slow shimmer, then the wooden piers.
  ctx.fillStyle = COLORS.water;
  ctx.fillRect(x0, WORLD.waterY, VIEW.w, y1 - WORLD.waterY);
  ctx.fillStyle = COLORS.waterDeep;
  const t = performance.now() / 900;
  for (let i = 0; i < 24; i++) {
    const wx = x0 + ((i * 173 + t * 40) % (VIEW.w + 80)) - 40;
    const wy = WORLD.waterY + 14 + ((i * 37) % 90);
    ctx.fillRect(wx, wy, 46, 3);
  }
  for (const pier of w.piers) {
    ctx.fillStyle = COLORS.pier;
    ctx.fillRect(pier.x, pier.y, pier.w, pier.h);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for (let y = pier.y + 12; y < pier.y + pier.h; y += 22) ctx.fillRect(pier.x, y, pier.w, 2);
  }

  // Trees
  for (const tree of w.trees) {
    if (tree.x < x0 - 20 || tree.x > x1 + 20 || tree.y < y0 - 20 || tree.y > y1 + 20) continue;
    ctx.fillStyle = '#2a5a2e';
    ctx.beginPath();
    ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a9a4f';
    ctx.beginPath();
    ctx.arc(tree.x - 3, tree.y - 3, tree.r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Buildings: roof, edge, a few lit windows, and a BANK sign on the bank.
  for (const b of w.buildings) {
    if (b.x > x1 || b.y > y1 || b.x + b.w < x0 || b.y + b.h < y0) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(b.x + 4, b.y + 5, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    ctx.fillStyle = 'rgba(255,235,160,0.75)';
    const cols = Math.max(1, Math.floor(b.w / 26));
    const rows = Math.max(1, Math.floor(b.h / 26));
    for (let i = 0; i < b.windows; i++) {
      const wx = b.x + 8 + (i % cols) * 24;
      const wy = b.y + 8 + Math.floor(i / cols) * 24;
      if (Math.floor(i / cols) < rows) ctx.fillRect(wx, wy, 10, 8);
    }
    if (b.isBank) {
      ctx.fillStyle = '#ffd23a';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HARBOR BANK', b.x + b.w / 2, b.y + b.h / 2 + 5);
    }
    if (b.isSafehouse) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SAFEHOUSE', b.x + b.w / 2, b.y + b.h / 2 + 4);
    }
  }
}

function drawMarker(ctx, G, target) {
  if (!target) return;
  const pulse = 1 + Math.sin(performance.now() / 280) * 0.15;
  ctx.save();
  ctx.translate(target.x, target.y);
  ctx.strokeStyle = target.color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = target.color;
  ctx.beginPath();
  ctx.moveTo(0, -52 * pulse);
  ctx.lineTo(-9, -32 * pulse);
  ctx.lineTo(9, -32 * pulse);
  ctx.closePath();
  ctx.fill();
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(target.label, 0, -58 * pulse);
  ctx.restore();
}

function drawHUD(ctx, G) {
  const p = G.player;
  ctx.textAlign = 'left';
  // Health bar
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, 16, 16, 220, 30, 8);
  ctx.fill();
  ctx.fillStyle = '#333';
  ctx.fillRect(28, 26, 120, 10);
  ctx.fillStyle = p.health > 30 ? '#37d67a' : '#ff5a6e';
  ctx.fillRect(28, 26, 120 * (p.health / 100), 10);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(`${Math.ceil(p.health)} HP`, 156, 35);
  // Cash gets its own pill under the health bar so it never collides with it.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, 16, 52, 132, 30, 8);
  ctx.fill();
  ctx.fillStyle = '#37d67a';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`$${p.cash}`, 28, 74);

  // Wanted stars, top centre
  const starCount = p.wanted;
  const startX = VIEW.w / 2 - (5 * 30) / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, startX - 12, 12, 5 * 30 + 24, 36, 8);
  ctx.fill();
  for (let i = 0; i < 5; i++) drawStar(ctx, startX + 15 + i * 30, 30, 11, i < starCount);

  // Objective, bottom left
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  const obj = G.missionText;
  ctx.font = '14px system-ui, sans-serif';
  const objW = Math.min(640, ctx.measureText(obj).width + 28);
  roundRect(ctx, 16, VIEW.h - 66, objW, 50, 8);
  ctx.fill();
  ctx.fillStyle = '#ffd23a';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(G.missions.index >= 3 ? 'FREE ROAM' : `MISSION ${G.missions.index + 1}: ${MISSIONS[G.missions.index].name}`, 28, VIEW.h - 46);
  ctx.fillStyle = '#ffffff';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(obj, 28, VIEW.h - 26);

  // Mission timer, under the stars when it matters
  if (G.missions.index === 0 && G.missions.phase === 'active') {
    const t = Math.max(0, G.missions.timer);
    ctx.fillStyle = t < 15 ? '#ff5a6e' : '#ffffff';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`TIME ${Math.ceil(t)}s`, VIEW.w / 2, 84);
    ctx.textAlign = 'left';
  }

  // Vault crack progress
  if (G.missions.index === 2 && G.missions.phase === 'active' && G.missions.crackT > 0 && G.missions.crackT < MISSIONS[2].crackSeconds) {
    const frac = G.missions.crackT / MISSIONS[2].crackSeconds;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, VIEW.w / 2 - 130, VIEW.h - 130, 260, 26, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd23a';
    ctx.fillRect(VIEW.w / 2 - 122, VIEW.h - 122, 244 * frac, 10);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CRACKING VAULT…', VIEW.w / 2, VIEW.h - 104);
    ctx.textAlign = 'left';
  }

  // Context hint (E / F prompts)
  if (G.hint) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const hw = ctx.measureText(G.hint).width + 28;
    roundRect(ctx, VIEW.w / 2 - hw / 2, VIEW.h - 176, hw, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(G.hint, VIEW.w / 2, VIEW.h - 156);
    ctx.textAlign = 'left';
  }

  // Weapon + controls, bottom right (short lines so nothing clips at the edge)
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, VIEW.w - 296, VIEW.h - 66, 280, 50, 8);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(p.car ? 'Driving — W/S gas & brake, A/D steer' : p.weapon === 'pistol' ? 'Pistol — click / K to shoot' : 'Fists — SPACE to punch', VIEW.w - 284, VIEW.h - 46);
  ctx.fillStyle = '#bbbbbb';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('F car · 1 fists · 2 pistol · P pause · M mute', VIEW.w - 284, VIEW.h - 26);

  // Mission banner, centre top
  if (G.missions.bannerT > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    const bw = Math.min(900, ctx.measureText(G.missions.bannerText).width + 40);
    roundRect(ctx, VIEW.w / 2 - bw / 2, 96, bw, 40, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd23a';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(G.missions.bannerText, VIEW.w / 2, 122);
    ctx.textAlign = 'left';
  }

  drawMinimap(ctx, G);
}

function drawMinimap(ctx, G) {
  const mw = 190;
  const mh = 132;
  const mx = VIEW.w - mw - 16;
  const my = 16;
  const sx = mw / WORLD.w;
  const sy = mh / WORLD.h;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(ctx, mx - 6, my - 6, mw + 12, mh + 12, 8);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(mx, my, mw, mh);
  ctx.clip();
  ctx.fillStyle = '#22442a';
  ctx.fillRect(mx, my, mw, mh);
  ctx.fillStyle = '#1d4e6b';
  ctx.fillRect(mx, my + WORLD.waterY * sy, mw, mh - WORLD.waterY * sy);
  ctx.fillStyle = '#55555e';
  for (const c of G.world.roadsV) ctx.fillRect(mx + c * sx - 1, my, 2, mh);
  for (const c of G.world.roadsH) ctx.fillRect(mx, my + c * sy - 1, mw, 2);
  ctx.fillStyle = '#ffd23a';
  ctx.beginPath();
  ctx.arc(mx + G.player.x * sx, my + G.player.y * sy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const target = G.currentTarget;
  if (target) {
    ctx.fillStyle = target.color;
    ctx.beginPath();
    ctx.arc(mx + target.x * sx, my + target.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const cop of G.police) {
    ctx.fillStyle = '#2f7bff';
    ctx.fillRect(mx + cop.x * sx - 2, my + cop.y * sy - 2, 4, 4);
  }
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('PORT MERIDIAN', mx, my + mh + 20);
}

function drawPlayer(ctx, G) {
  const p = G.player;
  if (p.car) return; // the car shape is the player while driving
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 11, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(p.angle);
  // body + head, facing right
  ctx.fillStyle = COLORS.playerJacket;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8c39a';
  ctx.beginPath();
  ctx.arc(4, 0, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#22222a';
  ctx.beginPath();
  ctx.arc(3, -2, 7, Math.PI * 0.9, Math.PI * 2.1);
  ctx.fill();
  // fists or pistol in hand
  ctx.fillStyle = p.weapon === 'pistol' ? '#22222a' : '#e8c39a';
  ctx.fillRect(12, -4, p.weapon === 'pistol' ? 12 : 7, 5);
  ctx.restore();
  // arrest pressure ring
  if (p.arrestT > 0.05) {
    ctx.strokeStyle = '#ff5a6e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 24, -Math.PI / 2, -Math.PI / 2 + (p.arrestT / 1.25) * Math.PI * 2);
    ctx.stroke();
  }
}

function drawOverlays(ctx, G) {
  if (G.state === 'title') {
    ctx.fillStyle = 'rgba(8,10,24,0.72)';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23a';
    ctx.font = 'bold 84px system-ui, sans-serif';
    ctx.fillText(STORY.title, VIEW.w / 2, 210);
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText(STORY.tagline, VIEW.w / 2, 252);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = '#bbbbbb';
    ctx.fillText(STORY.hero, VIEW.w / 2, 286);
    ctx.fillText(STORY.contact, VIEW.w / 2, 312);
    ctx.fillStyle = '#37d67a';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(G.save ? 'CLICK TO CONTINUE YOUR STORY' : 'CLICK TO START', VIEW.w / 2, 400);
    if (G.save) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText(`Saved: $${G.save.cash} — ${G.save.missionIndex >= 3 ? 'free roam' : `mission ${G.save.missionIndex + 1} of 3`}`, VIEW.w / 2, 434);
    }
    ctx.fillStyle = '#dddddd';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('WASD move · SHIFT run · F enter / exit car · SPACE punch · click / K shoot · 1 / 2 weapons', VIEW.w / 2, 500);
    ctx.fillText('E interact / hold to crack · P pause · M mute · R retry a failed mission', VIEW.w / 2, 526);
    ctx.fillStyle = '#888888';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('An entirely original game. No real city, person or brand appears in it.', VIEW.w / 2, 580);
    ctx.textAlign = 'left';
    return;
  }
  if (G.state === 'paused') {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px system-ui, sans-serif';
    ctx.fillText('PAUSED', VIEW.w / 2, 330);
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('Press P or click to keep playing', VIEW.w / 2, 372);
    ctx.textAlign = 'left';
    return;
  }
  if (G.state === 'wasted' || G.state === 'busted') {
    ctx.fillStyle = G.state === 'wasted' ? 'rgba(60,0,0,0.7)' : 'rgba(0,0,60,0.7)';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    ctx.textAlign = 'center';
    ctx.fillStyle = G.state === 'wasted' ? '#ff5a6e' : '#7fb0ff';
    ctx.font = 'bold 84px system-ui, sans-serif';
    ctx.fillText(G.state === 'wasted' ? 'WASTED' : 'BUSTED', VIEW.w / 2, 330);
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(
      G.state === 'wasted'
        ? 'Jax is down. The harbor keeps its secrets — for now.'
        : 'The Port Meridian police hauled Jax in. Mara is not pleased.',
      VIEW.w / 2,
      372,
    );
    ctx.fillStyle = '#37d67a';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('CLICK TO TRY AGAIN', VIEW.w / 2, 430);
    ctx.textAlign = 'left';
  }
}

export function render(G) {
  const ctx = G.ctx;
  ctx.clearRect(0, 0, VIEW.w, VIEW.h);
  const cam = {
    x: Math.max(0, Math.min(WORLD.w - VIEW.w, G.camera.x - VIEW.w / 2)),
    y: Math.max(0, Math.min(WORLD.h - VIEW.h, G.camera.y - VIEW.h / 2)),
  };
  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  drawWorld(ctx, G, cam);

  // Pickups
  for (const pk of G.world.pickups) {
    if (pk.taken) continue;
    const bob = Math.sin(performance.now() / 300 + pk.x) * 2;
    ctx.fillStyle = pk.kind === 'cash' ? COLORS.cash : COLORS.health;
    ctx.beginPath();
    ctx.arc(pk.x, pk.y + bob, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pk.kind === 'cash' ? '$' : '+', pk.x, pk.y + bob + 4);
    ctx.textAlign = 'left';
  }

  // Crate on Pier 2 (mission 2)
  if (G.missions.index === 1 && !G.missions.hasCrate) {
    ctx.fillStyle = '#a03d2d';
    ctx.fillRect(G.world.cratePos.x - 16, G.world.cratePos.y - 16, 32, 32);
    ctx.strokeStyle = '#ffd23a';
    ctx.lineWidth = 2;
    ctx.strokeRect(G.world.cratePos.x - 16, G.world.cratePos.y - 16, 32, 32);
  }

  drawMarker(ctx, G, G.currentTarget);
  for (const ped of G.peds) drawPed(ctx, ped);
  for (const car of G.cars) drawCarShape(ctx, car);
  for (const cop of G.police) drawCarShape(ctx, cop);
  if (G.player.car) drawCarShape(ctx, G.player.car);
  drawPlayer(ctx, G);

  // Bullets
  ctx.fillStyle = '#ffe9a3';
  for (const b of G.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Particles
  for (const p of G.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  if (G.state === 'playing' || G.state === 'paused') drawHUD(ctx, G);
  if (G.state !== 'playing') drawOverlays(ctx, G);
}
