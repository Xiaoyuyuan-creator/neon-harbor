// missions.js — the three-story-mission chain, then free roam.
// Mission 1: getaway drive to the docks against a 90-second clock.
// Mission 2: grab the crate on Pier 2, then reach the safehouse at 2 stars.
// Mission 3: hold E at the bank vault to crack it, then escape at 4 stars.

import { MISSIONS, COLORS } from './config.js';
import { makeCar } from './entities.js';

export function createMissionState() {
  return {
    index: 0, // 0, 1, 2 = story missions; 3 = free roam after the heist
    phase: 'intro', // intro | active | done
    timer: 0,
    crackT: 0,
    hasCrate: false,
    escaped: false,
    bannerT: 0,
    bannerText: '',
  };
}

function showBanner(G, text) {
  G.missions.bannerText = text;
  G.missions.bannerT = 3.2;
}

export function startMission(G, index) {
  const m = G.missions;
  m.index = index;
  m.phase = 'active';
  m.timer = MISSIONS[index].timeLimit || 0;
  m.crackT = 0;
  m.hasCrate = false;
  m.escaped = false;
  const def = MISSIONS[index];
  showBanner(G, `MISSION ${index + 1}: ${def.name} — ${def.briefing}`);

  if (index === 0) {
    // The getaway needs wheels: park Mara's sedan beside Jax if he is on foot.
    if (!G.player.car) {
      const car = makeCar(G.player.x + 70, G.player.y, 0, '#b03a3a', 'player');
      G.cars.push(car);
      enterCar(G, car);
    }
  }
  if (index === 1) {
    G.player.wanted = 0;
  }
}

export function enterCar(G, car) {
  const p = G.player;
  p.car = car;
  car.kind = 'player';
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
}

export function exitCar(G) {
  const p = G.player;
  if (!p.car) return;
  const car = p.car;
  car.kind = 'parked';
  car.speed = 0;
  p.car = null;
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
  p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
  p.angle = car.angle;
}

function completeMission(G) {
  const m = G.missions;
  const def = MISSIONS[m.index];
  G.player.cash += def.reward;
  G.audio.missionDone();
  G.player.wanted = 0;
  G.police.length = 0;
  G.audio.stopSiren();
  showBanner(G, `MISSION COMPLETE — ${def.name}  +$${def.reward}`);
  saveGame(G);
  if (m.index >= 2) {
    m.index = 3;
    m.phase = 'done';
    showBanner(G, 'FREE ROAM — Port Meridian is yours. Keep the cash coming.');
  } else {
    m.phase = 'intro';
  }
}

function failMission(G, reason) {
  const m = G.missions;
  G.audio.failed();
  showBanner(G, `MISSION FAILED — ${reason}  Press R to retry.`);
  m.phase = 'failed';
}

export function retryMission(G) {
  const m = G.missions;
  const idx = Math.min(m.index, 2);
  G.player.wanted = 0;
  G.police.length = 0;
  G.audio.stopSiren();
  G.player.health = 100;
  if (G.player.car) exitCar(G);
  G.player.x = G.world.startPos.x;
  G.player.y = G.world.startPos.y;
  startMission(G, idx);
}

export function objectiveText(G) {
  const m = G.missions;
  if (m.index >= 3) return 'Free roam — explore Port Meridian, grab cash, dodge the law.';
  const def = MISSIONS[m.index];
  if (m.phase === 'intro') return `${def.name}: press ENTER to start — ${def.briefing}`;
  if (m.index === 0) return 'Getaway: drive to the docks before the clock runs out.';
  if (m.index === 1) {
    return m.hasCrate
      ? 'Crate secured — lose the heat and get to the safehouse (green house, NW).'
      : 'Go to Pier 2 at the harbor and press E to grab the crate.';
  }
  if (m.index === 2) {
    return m.crackT >= def.crackSeconds
      ? 'Vault cracked — escape to the safehouse with 4 stars on you.'
      : 'Get to Harbor Bank and hold E at the vault door to crack it.';
  }
  return def.briefing;
}

export function currentTarget(G) {
  const m = G.missions;
  if (m.index === 0) return { ...G.world.docksPos, color: COLORS.marker, label: 'DOCKS' };
  if (m.index === 1) {
    return m.hasCrate
      ? { ...G.world.safehousePos, color: COLORS.safehouse, label: 'SAFEHOUSE' }
      : { ...G.world.cratePos, color: COLORS.marker, label: 'CRATE' };
  }
  if (m.index === 2) {
    return m.crackT >= MISSIONS[2].crackSeconds
      ? { ...G.world.safehousePos, color: COLORS.safehouse, label: 'SAFEHOUSE' }
      : { ...G.world.vaultPos, color: COLORS.marker, label: 'VAULT' };
  }
  return null;
}

export function updateMissions(G, dt) {
  const m = G.missions;
  const p = G.player;
  if (m.bannerT > 0) m.bannerT -= dt;
  if (m.index >= 3 || m.phase === 'failed' || m.phase === 'intro') return;

  // Mission 1: the clock only runs while the mission is active.
  if (m.index === 0 && m.timer > 0) {
    m.timer -= dt;
    if (m.timer <= 0) {
      m.timer = 0;
      failMission(G, 'Out of time — the docks run went cold.');
      return;
    }
    const d = Math.hypot(p.x - G.world.docksPos.x, p.y - G.world.docksPos.y);
    if (d < 90) {
      completeMission(G);
      return;
    }
  }

  // Mission 2: pick the crate up, then run for the safehouse.
  if (m.index === 1) {
    if (!m.hasCrate) {
      const d = Math.hypot(p.x - G.world.cratePos.x, p.y - G.world.cratePos.y);
      if (d < 70 && !p.car) {
        G.hint = 'Press E to grab the crate';
        if (G.input.pressed('KeyE')) {
          m.hasCrate = true;
          p.wanted = Math.max(p.wanted, 2);
          p.lastCrimeT = G.time;
          G.audio.cash();
          showBanner(G, 'CRATE SECURED — 2 stars! Get to the safehouse.');
        }
      } else if (d < 70 && p.car) {
        G.hint = 'Get out of the car (F) to grab the crate';
      }
    } else {
      const d = Math.hypot(p.x - G.world.safehousePos.x, p.y - G.world.safehousePos.y);
      if (d < 110) {
        completeMission(G);
        return;
      }
    }
  }

  // Mission 3: hold E at the vault, then escape to the safehouse.
  if (m.index === 2) {
    const def = MISSIONS[2];
    const d = Math.hypot(p.x - G.world.vaultPos.x, p.y - G.world.vaultPos.y);
    if (m.crackT < def.crackSeconds) {
      if (d < 80 && !p.car && G.input.down('KeyE')) {
        m.crackT += dt;
        if (Math.floor(m.crackT * 4) !== Math.floor((m.crackT - dt) * 4)) G.audio.crackTick();
        G.hint = 'Cracking the vault — keep holding E…';
        if (m.crackT >= def.crackSeconds) {
          p.wanted = 4;
          p.lastCrimeT = G.time;
          G.audio.startSiren();
          showBanner(G, 'VAULT OPEN — 4 stars! Run for the safehouse!');
        }
      } else if (d < 80 && !p.car) {
        G.hint = 'Hold E to crack the vault';
        m.crackT = Math.max(0, m.crackT - dt * 0.5);
      } else if (d < 80 && p.car) {
        G.hint = 'Get out of the car (F) to crack the vault';
      }
    } else {
      const ds = Math.hypot(p.x - G.world.safehousePos.x, p.y - G.world.safehousePos.y);
      if (ds < 110) {
        completeMission(G);
      }
    }
  }
}

// ---- save / load (localStorage) -------------------------------------------

export function saveGame(G) {
  try {
    const data = {
      cash: G.player.cash,
      missionIndex: Math.min(G.missions.index, 3),
      health: G.player.health,
      savedAt: Date.now(),
    };
    localStorage.setItem('neon-harbor-save-v1', JSON.stringify(data));
    G.save = data;
  } catch (err) {
    // Private mode etc: the game plays fine without saving.
  }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem('neon-harbor-save-v1');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}
