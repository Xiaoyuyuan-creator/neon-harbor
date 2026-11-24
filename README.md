# Neon Harbor

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Xiaoyuyuan-creator/neon-harbor/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Xiaoyuyuan-creator/neon-harbor/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original 2D top-down open-world crime game, written from scratch for the
gta6-01 contest. You are **Jax Reed**, a driver-for-hire in the fictional
city of **Port Meridian**. Your fixer, **Mara Voss**, pays in cash and never
asks twice. Explore a 3600×2500 city on foot and by car, steal cars, dodge
(or fight) the Port Meridian police, and run three story missions — then keep
the city for yourself in free roam.

Nothing in this game comes from any commercial game: the city, characters,
names, art and sounds are all original, drawn and synthesized in code.

## How to play

Open `game/index.html` in a browser (or serve the `game/` folder with any
static server) and click to start. Progress saves to `localStorage`.

### Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move (on foot) or drive (in a car) |
| Shift | Run |
| F | Enter / exit the nearest car (stealing one draws 1 wanted star) |
| Space / J | Punch (fists) |
| Mouse click / K | Shoot (pistol) |
| 1 / 2 | Switch between fists and pistol |
| E | Interact — grab the crate, hold to crack the vault |
| Enter | Start the next mission |
| R | Retry a failed mission |
| P / Esc | Pause |
| M | Mute |

### The city

- **Roads, blocks, parks and the harbor** — a full grid city with traffic
  cars cruising the streets and pedestrians on the sidewalks.
- **The docks** — piers stretch into the harbor water at the south edge.
- **Harbor Bank** — the gold-roofed building near the plaza; the vault is
  behind it.
- **Safehouse** — the green house in the north-west corner; mission escapes
  end here.
- **Pickups** — green `$` cash and red `+` health dotted along the roads.

### Wanted system (0–5 stars)

Punching someone, shooting, or stealing a car raises your wanted level, and
police cruisers spawn to chase you. On foot, a cruiser that stays close will
arrest you (**BUSTED**). In a car they ram you — lose all health and you are
**WASTED**. Lay low away from the police and stars fade one at a time.

### Missions

1. **Getaway Driver** — Mara's sedan is waiting. Drive to the docks in
   90 seconds.
2. **Harbor Pickup** — get out on Pier 2, press E to grab the crate, then
   lose the 2-star heat and reach the safehouse.
3. **Vault Heist** — hold E at the Harbor Bank vault to crack it (3 seconds),
   then escape to the safehouse with 4 stars on you.

Finish all three and the city opens up: **free roam**. Cash from missions
and pickups is yours to keep; getting wasted costs you 10% of it.

## Tech

- Plain Canvas 2D + ES modules, no libraries, no network requests, no
  external assets. Every script, image, font and sound is a file under
  `game/` or a `data:` URI — there is nothing to download at runtime.
- All sound is synthesized WebAudio (engine hum, sirens, gunshots, chimes).
- The city is generated from a seed, so `?seed=1` always builds the same
  Port Meridian.
- Screenshots are staged by the game itself: `?shot=start|play|chase|heist`
  (see `shots.json`) renders that exact scene deterministically.

## Testing

- `node --check` on every `game/src/*.js` file (copied to `.mjs` first, so
  the ES-module syntax is checked without executing the game).
- Headless Chromium play test (Playwright): title → click to start →
  Enter to start mission 1 → drive → exit the car → switch to pistol →
  shoot → pause → resume, with **zero console errors and zero page
  errors**. The four `screenshots/` images are real renders captured the
  same way from `?shot=start|play|chase|heist&seed=1`, each 1280×720.
- `MAKEFUN_OUTPUT_DIR=out node main.ts` twice produces a byte-identical
  `out/dossier.json`.

## Files

- `game/index.html` — page shell, loads the game as ES modules.
- `game/src/config.js` — tuning, missions, colors, story text.
- `game/src/random.js` — seeded RNG.
- `game/src/world.js` — city generation, collision, road helpers.
- `game/src/input.js` — keyboard + mouse.
- `game/src/audio.js` — synthesized WebAudio sounds.
- `game/src/entities.js` — traffic, pedestrians, police, bullets, combat.
- `game/src/missions.js` — the mission chain, save/load.
- `game/src/render.js` — all drawing: city, HUD, minimap, screens.
- `game/src/shots.js` — deterministic screenshot scenes.
- `game/src/main.js` — boot, game loop, player driving, wanted decay.
- `main.ts` — builds the submission dossier (`MAKEFUN_OUTPUT_DIR=out node main.ts`).

---

<sub>Entered on [make.fun](https://make.fun/?ref=cbqrbn11&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
