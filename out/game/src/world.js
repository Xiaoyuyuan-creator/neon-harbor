// world.js — builds the city of Port Meridian from a seed: roads, blocks,
// buildings, parks, the dockyard, the harbor water and the mission places.
// Everything is generated here, so the same seed always yields the same map.

import { WORLD, COLORS } from './config.js';
import { makeRng, range, randInt, pick, chance } from './random.js';

function roadCenters(limit) {
  const out = [];
  for (let c = 150; c <= limit; c += WORLD.roadPitch) out.push(c);
  return out;
}

function removeBuildingsNear(buildings, cx, cy, radius) {
  for (let i = buildings.length - 1; i >= 0; i--) {
    const b = buildings[i];
    const bx = Math.max(b.x, Math.min(cx, b.x + b.w));
    const by = Math.max(b.y, Math.min(cy, b.y + b.h));
    const dx = cx - bx;
    const dy = cy - by;
    if (dx * dx + dy * dy < radius * radius) buildings.splice(i, 1);
  }
}

export function buildWorld(seed) {
  const rng = makeRng(seed);
  const roadsV = roadCenters(WORLD.w - 100);
  const roadsH = roadCenters(WORLD.h - 100);
  const half = WORLD.roadWidth / 2;
  const buildings = [];
  const parks = [];
  const trees = [];

  // City blocks sit between the roads. Most get buildings, some become parks.
  for (let i = 0; i < roadsV.length - 1; i++) {
    for (let j = 0; j < roadsH.length - 1; j++) {
      const x0 = roadsV[i] + half + 10;
      const x1 = roadsV[i + 1] - half - 10;
      const y0 = roadsH[j] + half + 10;
      const y1 = roadsH[j + 1] - half - 10;
      if (y0 > 2260) continue; // the dockyard strip is laid out separately
      if (chance(rng, 0.16)) {
        const park = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
        parks.push(park);
        const treeCount = randInt(rng, 3, 7);
        for (let t = 0; t < treeCount; t++) {
          trees.push({
            x: range(rng, park.x + 16, park.x + park.w - 16),
            y: range(rng, park.y + 16, park.y + park.h - 16),
            r: range(rng, 9, 15),
          });
        }
        continue;
      }
      const count = randInt(rng, 1, 3);
      for (let k = 0; k < count; k++) {
        const bw = range(rng, 62, 150);
        const bh = range(rng, 62, 140);
        const bx = range(rng, x0, Math.max(x0 + 1, x1 - bw));
        const by = range(rng, y0, Math.max(y0 + 1, y1 - bh));
        buildings.push({
          x: bx,
          y: by,
          w: bw,
          h: bh,
          color: pick(rng, [COLORS.buildingRoof, COLORS.buildingRoof2, COLORS.buildingRoof3]),
          windows: randInt(rng, 4, 12),
          seed: rng(),
        });
      }
    }
  }

  // The Harbor Bank holds the vault. It is the building nearest the plaza.
  let bank = null;
  let best = Infinity;
  for (const b of buildings) {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const d = (cx - 1800) * (cx - 1800) + (cy - 900) * (cy - 900);
    if (d < best) {
      best = d;
      bank = b;
    }
  }
  bank.color = '#8a6d3b';
  bank.isBank = true;
  const vaultPos = { x: bank.x + bank.w / 2, y: bank.y + bank.h + 26 };

  // Safehouse corner: a small green house lot in the north-west.
  const safehousePos = { x: 300, y: 300 };
  removeBuildingsNear(buildings, safehousePos.x, safehousePos.y, 130);
  buildings.push({
    x: safehousePos.x - 42,
    y: safehousePos.y - 30,
    w: 84,
    h: 60,
    color: '#3d7a44',
    windows: 4,
    seed: 0.5,
    isSafehouse: true,
  });

  // Keep the start intersection and the bank front clear of buildings.
  removeBuildingsNear(buildings, 1050, 1050, 110);
  removeBuildingsNear(buildings, vaultPos.x, vaultPos.y, 60);

  // Dockyard: stacked shipping containers on concrete, south of the last road.
  const containers = [];
  for (let i = 0; i < 10; i++) {
    containers.push({
      x: 260 + i * 330 + range(rng, -40, 40),
      y: range(rng, 2290, 2335),
      w: range(rng, 110, 170),
      h: 34,
      color: pick(rng, [COLORS.containerRed, COLORS.containerBlue, COLORS.containerGreen]),
    });
  }

  // Piers reach out into the water. Pier 2 is where the crate waits.
  const piers = [
    { x: 570, y: 2330, w: 64, h: 150 },
    { x: 1770, y: 2330, w: 64, h: 150 },
    { x: 2970, y: 2330, w: 64, h: 150 },
  ];
  const cratePos = { x: 1802, y: 2452 };
  const docksPos = { x: 1802, y: 2348 };

  // Cash and health pickups scattered along the roads. A pickup that would
  // land inside a building is nudged onto the nearest road instead.
  const pickups = [];
  for (let i = 0; i < 26; i++) {
    const spot = roadPickupSpot(rng, roadsV, roadsH, buildings);
    pickups.push({ ...spot, kind: 'cash', amount: randInt(rng, 15, 60), taken: false });
  }
  for (let i = 0; i < 8; i++) {
    const spot = roadPickupSpot(rng, roadsV, roadsH, buildings);
    pickups.push({ ...spot, kind: 'health', amount: 35, taken: false });
  }

  return {
    seed,
    roadsV,
    roadsH,
    buildings,
    parks,
    trees,
    containers,
    piers,
    bank,
    vaultPos,
    safehousePos,
    cratePos,
    docksPos,
    pickups,
    startPos: { x: 1050, y: 1050 },
  };
}

export function randomRoadPoint(rng, roadsV, roadsH) {
  if (rng() < 0.5) {
    return {
      x: pick(rng, roadsV) + range(rng, -30, 30),
      y: range(rng, 120, WORLD.h - 220),
    };
  }
  return {
    x: range(rng, 120, WORLD.w - 120),
    y: pick(rng, roadsH) + range(rng, -30, 30),
  };
}

// A road point that is guaranteed not to sit inside a building: try a few
// road points and fall back to the middle of the nearest road.
function roadPickupSpot(rng, roadsV, roadsH, buildings) {
  for (let tries = 0; tries < 8; tries++) {
    const spot = randomRoadPoint(rng, roadsV, roadsH);
    let inside = false;
    for (const b of buildings) {
      if (spot.x > b.x - 24 && spot.x < b.x + b.w + 24 && spot.y > b.y - 24 && spot.y < b.y + b.h + 24) {
        inside = true;
        break;
      }
    }
    if (!inside) return spot;
  }
  return { x: roadsV[2], y: roadsH[2] };
}

// True when the point (with a small radius) is inside a building or a
// container. The water is also solid except where a pier crosses it.
export function hitsSolid(world, x, y, pad) {
  for (const b of world.buildings) {
    if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return true;
  }
  for (const c of world.containers) {
    if (x > c.x - pad && x < c.x + c.w + pad && y > c.y - pad && y < c.y + c.h + pad) return true;
  }
  if (y > WORLD.waterY) {
    let onPier = false;
    for (const p of world.piers) {
      if (x > p.x - pad && x < p.x + p.w + pad && y > p.y && y < p.y + p.h + pad) onPier = true;
    }
    if (!onPier) return true;
  }
  return false;
}

export function isWater(world, x, y) {
  if (y <= WORLD.waterY) return false;
  for (const p of world.piers) {
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return false;
  }
  return true;
}

// Nearest point on any road to (x, y): used to drop police onto streets.
export function nearestRoadPoint(world, x, y) {
  let bestV = world.roadsV[0];
  let bestD = Infinity;
  for (const c of world.roadsV) {
    const d = Math.abs(c - x);
    if (d < bestD) {
      bestD = d;
      bestV = c;
    }
  }
  let bestH = world.roadsH[0];
  bestD = Infinity;
  for (const c of world.roadsH) {
    const d = Math.abs(c - y);
    if (d < bestD) {
      bestD = d;
      bestH = c;
    }
  }
  if (Math.abs(bestV - x) < Math.abs(bestH - y)) return { x: bestV, y };
  return { x, y: bestH };
}

export function clampToWorld(x, y, margin) {
  return {
    x: Math.max(margin, Math.min(WORLD.w - margin, x)),
    y: Math.max(margin, Math.min(WORLD.h - margin, y)),
  };
}
