# Mountain Defense

A 2D canyon/mountain-path tower defense game in the style of classic Canyon Defense. Built with [Phaser 3](https://phaser.io/), [Vite](https://vitejs.dev/), and plain JavaScript. All graphics and audio are generated procedurally — no external assets.

Defend the base at the end of a winding canyon road. Enemies pour in from the mountain pass and follow the road; flying enemies cross the canyon on their own air routes. Build and upgrade towers on the fixed cliff-ledge build pads, earn money for every kill, and survive every wave.

## Features

- **3 maps**: Pine Pass (easy), Rocky Spiral (medium), Eagle Canyon (hard) — unlocked progressively
- **5 towers**: Machine Gun, Cannon, Missile (splash), Anti-Air, Laser (beam) — each with 3 upgrade levels, sellable for a 75% refund
- **7 enemy types**: Scouts, Soldiers, Heavies, Armored Vehicles on the ground; Drones, Helicopters, Gunships in the air
- **15–18 escalating waves per map** with armor, speed, and health scaling
- **5 targeting modes** per tower: First, Last, Closest, Strongest, Weakest
- **Support powers**: Air Strike, Time Stop, Repair Base (with cooldowns)
- **Procedural audio** via the Web Audio API — no sound files
- **Save/progress** in localStorage: map unlocks, best scores, settings
- Playable on desktop (mouse + keyboard shortcuts) and mobile (touch, responsive scaling)

## Controls

- **Click/tap** a build pad to select it, then pick a tower from the bottom panel
- **Click/tap** an existing tower to upgrade, sell, or change its target mode
- **1–5**: build the corresponding tower on the selected pad
- **Space**: start the next wave · **P**: pause · **F** or the **1×/2×/3×** button: game speed · **M**: mute · **Esc**: deselect

## Install

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## Build

```bash
npm run build
```

The production build is written to `dist/`.

## Preview build

```bash
npm run preview
```

## Git setup

```bash
git init
git add .
git commit -m "Initial Mountain Defense game"
```

## Create GitHub repository

Create a new repository called `mountain-defense` on GitHub (via https://github.com/new, or with the GitHub CLI):

```bash
gh repo create mountain-defense --public --source=. 
```

## Push to GitHub

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mountain-defense.git
git push -u origin main
```

## GitHub Pages

1. Open the repository on GitHub and go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually from the **Actions** tab).

The included workflow at `.github/workflows/deploy.yml` builds the Vite app and deploys the `dist` folder to GitHub Pages on every push to `main`. The game will be live at:

```
https://YOUR_USERNAME.github.io/mountain-defense/
```

> Note: `vite.config.js` uses `base: './'` so the build works from any sub-path, including GitHub Pages project sites.

If the first workflow run fails with a Pages permission error, enable Pages once manually (step 1–2 above) or run:

```bash
gh api -X POST repos/YOUR_USERNAME/mountain-defense/pages -f build_type=workflow
```

then re-run the workflow.

## Project structure

```
index.html                  entry page
src/main.js                 Phaser game bootstrap
src/styles.css              page styles
src/constants.js            game-wide constants and states
src/utils.js                math/path helpers, seeded RNG
src/textures.js             all procedural texture generation
src/data/maps.js            the 3 map definitions (paths, pads, economy)
src/data/waves.js           wave templates + difficulty scaling
src/data/enemyTypes.js      enemy stat tables
src/data/towerTypes.js      tower stat tables
src/entities/Enemy.js       waypoint-following enemies with health bars
src/entities/Tower.js       targeting, firing, upgrades, laser beam
src/entities/Projectile.js  pooled homing projectiles + splash
src/systems/WaveManager.js  timed spawn queues per wave
src/systems/SupportPowers.js air strike / time stop / repair
src/systems/SaveManager.js  localStorage progress + unlocks
src/systems/AudioManager.js Web Audio oscillator sound effects
src/scenes/BootScene.js     texture generation, save load
src/scenes/MapSelectScene.js start screen + map selection
src/scenes/GameScene.js     core gameplay loop
src/scenes/UIScene.js       HUD, panels, end screens
.github/workflows/deploy.yml GitHub Pages deployment
```
