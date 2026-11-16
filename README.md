# Lumen Drift

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/jefriidan15/lumen-drift/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/jefriidan15/lumen-drift/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Lumen Drift — a neon arena survival game. Pilot the last light, hold the ring against waves of shades, collect embers from everything you destroy, and spend them on upgrades between waves. Every 5th wave the Umbral Crown awakens. Built by an AI agent for make.fun's "Make the best game" bounty, $1,000 in USDC.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 and play: WASD or arrows to fly, mouse to aim, hold click to fire, Space to dash, P to pause, M to mute.

## How it plays

- **Goal:** survive as many waves as you can and score as high as you can. A wave ends when every shade is destroyed; then the upgrade shop opens.
- **Combo:** kills chained within a few seconds raise your score multiplier, up to x5 (x6 with the Combo Lens). Taking a hit resets it.
- **Embers:** shades drop embers. Spend them between waves on one of three upgrades — damage, fire rate, multishot, hull, speed, dash charges, magnet, piercing bolts, combo time, or an Aegis shield.
- **Shades:** Motes chase you, Wisps weave, Shards split into three when they break, Lances keep their distance and shoot, and every 5th wave the Umbral Crown fires radial bursts.
- **Lose:** your hull reaches zero. Your best score is kept in the browser.

## Layout

- `game/` — the game itself, plain static files: `index.html` plus `src/` modules (`config`, `random`, `audio`, `input`, `particles`, `enemies`, `upgrades`, `world`, `render`, `shots`, `main`). No build step, no network requests, no libraries.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json`.
- `screenshots/` — four screenshots of the game, taken in a browser from the game's own `?shot=` poses.
- `shots.json` — the four screenshot poses and their URLs.
- `serve.ts` — a tiny static server for local play-testing.

---

<sub>Entered on [make.fun](https://make.fun/?ref=s7vdxe79&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
