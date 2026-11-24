// shots.js — stages the four deterministic screenshot scenes.
// Each scene is built from the game's own state (same world, same entities,
// same renderer), so a screenshot is a real render, never a mock-up.
// The seed comes from the URL (?shot=play&seed=1) and rebuilds the city.

import { MISSIONS } from './config.js';
import { makeCar, spawnPolice } from './entities.js';
import { enterCar } from './missions.js';

export const SHOT_NAMES = ['start', 'play', 'chase', 'heist'];

export function applyShot(G, name) {
  const p = G.player;
  const world = G.world;

  if (name === 'start') {
    // Title screen over a slow view of downtown. A staged shot never shows
    // a stranger's save file, so the title always says CLICK TO START.
    G.state = 'title';
    G.save = null;
    G.camera.x = 1500;
    G.camera.y = 1150;
    return;
  }

  G.state = 'playing';
  G.save = null;

  if (name === 'play') {
    // Jax on foot downtown, traffic rolling, a little cash in pocket.
    p.x = world.startPos.x;
    p.y = world.startPos.y;
    p.angle = -Math.PI / 4;
    p.car = null;
    p.health = 100;
    p.cash = 350;
    p.wanted = 0;
    p.weapon = 'fists';
    G.missions.index = 0;
    G.missions.phase = 'intro';
    G.missions.bannerT = 0;
    G.camera.x = p.x;
    G.camera.y = p.y;
    return;
  }

  if (name === 'chase') {
    // Mid-getaway: Jax driving fast with three cruisers on his tail, 3 stars.
    const car = makeCar(1500, 1050, 0, '#b03a3a', 'player');
    car.speed = 420;
    G.cars.push(car);
    enterCar(G, car);
    p.health = 82;
    p.lastDamageT = G.time; // staged health stays 82 in the shot, no regen yet
    p.cash = 640;
    p.wanted = 3;
    p.lastCrimeT = G.time;
    p.weapon = 'pistol';
    G.missions.index = 0;
    G.missions.phase = 'active';
    G.missions.timer = 62;
    G.missions.bannerT = 0;
    const rng = G.rng;
    const cops = spawnPolice(world, p, 3, rng);
    cops[0].x = p.x - 180;
    cops[0].y = p.y + 40;
    cops[0].angle = 0;
    cops[1].x = p.x - 260;
    cops[1].y = p.y - 60;
    cops[1].angle = 0;
    cops[2].x = p.x - 120;
    cops[2].y = p.y - 150;
    cops[2].angle = 0.4;
    G.police.push(...cops);
    G.camera.x = p.x;
    G.camera.y = p.y;
    return;
  }

  if (name === 'heist') {
    // The vault crack, halfway done, with 4 stars and cruisers closing in.
    p.x = world.vaultPos.x;
    p.y = world.vaultPos.y + 10;
    p.angle = -Math.PI / 2;
    p.car = null;
    p.health = 68;
    p.lastDamageT = G.time; // staged health stays 68 in the shot, no regen yet
    p.cash = 1250;
    p.wanted = 4;
    p.lastCrimeT = G.time;
    p.weapon = 'pistol';
    G.missions.index = 2;
    G.missions.phase = 'active';
    G.missions.crackT = MISSIONS[2].crackSeconds * 0.6;
    G.missions.bannerT = 0;
    const rng = G.rng;
    const cops = spawnPolice(world, p, 4, rng);
    cops[0].x = p.x - 200;
    cops[0].y = p.y + 130;
    cops[1].x = p.x + 230;
    cops[1].y = p.y + 90;
    cops[2].x = p.x - 90;
    cops[2].y = p.y - 240;
    cops[3].x = p.x + 320;
    cops[3].y = p.y - 140;
    G.police.push(...cops);
    G.camera.x = p.x;
    G.camera.y = p.y;
    return;
  }

  // Unknown shot name: fall back to plain on-foot play.
  applyShot(G, 'play');
}
