import Phaser from 'phaser';
import {
  STATES,
  GAME_W,
  GAME_H,
  TOP_H,
  BOTTOM_Y,
  DEPTH,
  MAX_TOWER_LEVEL,
  SELL_REFUND,
} from '../constants.js';
import { TOWER_TYPES, TOWER_ORDER } from '../data/towerTypes.js';
import { generateWaves, waveMultipliers } from '../data/waves.js';
import { Enemy } from '../entities/Enemy.js';
import { Tower } from '../entities/Tower.js';
import { Projectile } from '../entities/Projectile.js';
import { WaveManager } from '../systems/WaveManager.js';
import { SupportPowerManager } from '../systems/SupportPowers.js';
import { SaveManager } from '../systems/SaveManager.js';
import { buildPath, dist, distToPath, mulberry32, pointAtDistance } from '../utils.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.mapDef = data.mapDef;
  }

  create() {
    const map = this.mapDef;
    this.state = STATES.BUILD_PHASE;
    this.money = map.startingMoney;
    this.lives = map.baseLives;
    this.maxLives = map.baseLives;
    this.score = 0;
    this.kills = 0;
    this.currentWave = 0;
    this.freezeTimer = 0;
    this.paused = false;
    this.airstrikeMode = false;

    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.explosionPool = [];
    this.puffPool = [];
    this.floatPool = [];
    this.selectedPad = null;
    this.selectedTower = null;
    this.hoverPad = null;
    this.previewRadius = null;

    this.groundPath = buildPath(map.pathWaypoints);
    this.airPath = buildPath(map.airPathWaypoints);
    this.basePos = map.pathWaypoints[map.pathWaypoints.length - 1];

    this.audio = this.game.audioManager;
    this.drawMap();
    this.createPads();

    this.waves = generateWaves(map);
    this.waveManager = new WaveManager(this, this.waves);
    this.powers = new SupportPowerManager(this);

    this.rangeGfx = this.add.graphics().setDepth(DEPTH.RANGE);
    this.laserGfx = this.add.graphics().setDepth(DEPTH.LASER);
    this.cursorGfx = this.add.graphics().setDepth(DEPTH.CURSOR);

    this.setupInput();
    this.scene.launch('UIScene');
  }

  // ---------- map rendering ----------

  drawMap() {
    const map = this.mapDef;
    const theme = map.theme;
    const rand = mulberry32(map.seed);
    const g = this.add.graphics().setDepth(DEPTH.MAP);

    // canyon floor
    g.fillStyle(theme.bg, 1);
    g.fillRect(0, 0, GAME_W, GAME_H);

    // rocky texture patches
    for (let i = 0; i < 90; i++) {
      const x = rand() * GAME_W;
      const y = rand() * GAME_H;
      const r = 8 + rand() * 30;
      g.fillStyle(rand() > 0.5 ? theme.rock : theme.rockLight, 0.16 + rand() * 0.12);
      g.fillCircle(x, y, r);
    }

    // canyon wall shading along the screen edges
    g.fillStyle(theme.rock, 0.55);
    g.fillRect(0, 0, GAME_W, 14);
    g.fillRect(0, 0, 10, GAME_H);
    g.fillRect(GAME_W - 10, 0, 10, GAME_H);

    // the winding road (edge + surface + rounded corners)
    const pts = this.groundPath.points;
    this.strokeRoad(g, pts, 40, theme.roadEdge);
    this.strokeRoad(g, pts, 30, theme.road);

    // road centre dashes
    g.fillStyle(0xffffff, 0.18);
    for (let d = 14; d < this.groundPath.total; d += 30) {
      const p = pointAtDistance(this.groundPath, d);
      g.fillCircle(p.x, p.y, 2);
    }

    // subtle dashed air route
    g.fillStyle(0xffffff, 0.1);
    for (let d = 10; d < this.airPath.total; d += 26) {
      const p = pointAtDistance(this.airPath, d);
      g.fillCircle(p.x, p.y, 1.6);
    }

    // decorations away from road and pads
    const decoCount = theme.deco === 'trees' ? 60 : 40;
    for (let i = 0; i < decoCount; i++) {
      const x = 20 + rand() * (GAME_W - 40);
      const y = 50 + rand() * (BOTTOM_Y - 80);
      if (distToPath(x, y, pts) < 42) continue;
      if (map.buildPads.some((p) => dist(x, y, p.x, p.y) < 40)) continue;
      if (dist(x, y, this.basePos.x, this.basePos.y) < 60) continue;
      if (theme.deco === 'trees') {
        g.fillStyle(0x1f2d1a, 1);
        g.fillCircle(x + 2, y + 3, 7 + rand() * 4);
        g.fillStyle(0x33502a, 1);
        g.fillCircle(x, y, 6 + rand() * 4);
      } else if (theme.deco === 'rocks') {
        g.fillStyle(theme.rock, 1);
        g.fillTriangle(x - 8, y + 6, x + 8, y + 6, x + rand() * 6 - 3, y - 8 - rand() * 6);
        g.fillStyle(theme.rockLight, 0.7);
        g.fillTriangle(x - 4, y + 6, x + 6, y + 6, x + 1, y - 4);
      } else {
        // mesa: flat-topped buttes
        const w = 14 + rand() * 14;
        g.fillStyle(theme.rock, 1);
        g.fillRect(x - w / 2, y - 8, w, 14);
        g.fillStyle(theme.rockLight, 1);
        g.fillRect(x - w / 2, y - 11, w, 4);
      }
    }

    // spawn marker near where the road enters the screen
    const spawnPt = pointAtDistance(this.groundPath, 70);
    this.add.image(spawnPt.x, spawnPt.y, 'spawn_cave').setDepth(DEPTH.BASE);

    // base fortress at the end of the road
    this.add.image(this.basePos.x, this.basePos.y, 'base_fort').setDepth(DEPTH.BASE);
  }

  strokeRoad(g, pts, width, color) {
    g.lineStyle(width, color, 1);
    g.beginPath();
    pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
    g.strokePath();
    g.fillStyle(color, 1);
    pts.forEach((p) => g.fillCircle(p.x, p.y, width / 2));
  }

  createPads() {
    this.pads = this.mapDef.buildPads.map((def) => {
      const sprite = this.add.image(def.x, def.y, 'pad').setDepth(DEPTH.PAD);
      return { id: def.id, x: def.x, y: def.y, occupied: false, tower: null, sprite };
    });
  }

  // ---------- input ----------

  setupInput() {
    this.input.on('pointerdown', (pointer) => {
      this.audio.ensure();
      if (this.state === STATES.VICTORY || this.state === STATES.GAME_OVER) return;
      // ignore clicks on the HUD bars or any UI element
      if (pointer.y < TOP_H || pointer.y > BOTTOM_Y) return;
      const ui = this.scene.get('UIScene');
      if (ui && ui.input.hitTestPointer(pointer).length > 0) return;

      if (this.airstrikeMode) {
        this.powers.strikeAt(pointer.worldX, pointer.worldY);
        this.events.emit('selection');
        return;
      }

      const pad = this.padAt(pointer.worldX, pointer.worldY);
      if (pad) {
        this.selectPad(pad);
      } else {
        this.clearSelection();
      }
    });

    this.input.on('pointermove', (pointer) => {
      if (this.airstrikeMode) return;
      const pad = this.padAt(pointer.worldX, pointer.worldY);
      if (pad !== this.hoverPad) {
        if (this.hoverPad && this.hoverPad !== this.selectedPad) this.hoverPad.sprite.clearTint();
        this.hoverPad = pad;
        if (pad && pad !== this.selectedPad) pad.sprite.setTint(0xb8e0b8);
      }
    });

    this.input.keyboard.on('keydown', (ev) => {
      const k = ev.key.toLowerCase();
      if (k === ' ') this.tryStartWave();
      else if (k === 'p') this.togglePause();
      else if (k === 'escape') {
        this.airstrikeMode = false;
        this.clearSelection();
      } else if (k === 'm') {
        this.audio.setMuted(!this.audio.muted);
        SaveManager.setMuted(this.audio.muted);
        this.events.emit('selection');
      } else if (['1', '2', '3', '4', '5'].includes(k)) {
        const typeKey = TOWER_ORDER[Number(k) - 1];
        if (this.selectedPad && !this.selectedPad.occupied) this.buildTower(this.selectedPad, typeKey);
      }
    });
  }

  padAt(x, y) {
    return this.pads.find((p) => dist(x, y, p.x, p.y) <= 26) || null;
  }

  selectPad(pad) {
    this.clearSelection(true);
    this.selectedPad = pad;
    this.selectedTower = pad.tower;
    pad.sprite.setTint(pad.occupied ? 0xffe8a0 : 0x9fe29f);
    this.audio.click();
    this.updateRangeDisplay();
    this.events.emit('selection');
  }

  clearSelection(quiet = false) {
    if (this.selectedPad) this.selectedPad.sprite.clearTint();
    this.selectedPad = null;
    this.selectedTower = null;
    this.previewRadius = null;
    this.updateRangeDisplay();
    if (!quiet) this.events.emit('selection');
  }

  // Range preview (selected tower / hovering a build option)
  previewRange(radius) {
    this.previewRadius = radius;
    this.updateRangeDisplay();
  }

  clearPreviewRange() {
    this.previewRadius = null;
    this.updateRangeDisplay();
  }

  updateRangeDisplay() {
    const g = this.rangeGfx;
    g.clear();
    let cx = null;
    let cy = null;
    let r = null;
    if (this.selectedPad && this.previewRadius) {
      cx = this.selectedPad.x;
      cy = this.selectedPad.y;
      r = this.previewRadius;
    } else if (this.selectedTower) {
      cx = this.selectedTower.x;
      cy = this.selectedTower.y;
      r = this.selectedTower.range;
    }
    if (r !== null) {
      g.fillStyle(0xffffff, 0.07);
      g.fillCircle(cx, cy, r);
      g.lineStyle(2, 0xffffff, 0.35);
      g.strokeCircle(cx, cy, r);
    }
  }

  // ---------- economy / building ----------

  buildTower(pad, typeKey) {
    if (pad.occupied) return false;
    const def = TOWER_TYPES[typeKey];
    if (this.money < def.cost) {
      this.audio.error();
      this.events.emit('message', 'Not enough money!');
      return false;
    }
    this.money -= def.cost;
    const tower = new Tower(this, pad, typeKey);
    pad.occupied = true;
    pad.tower = tower;
    this.towers.push(tower);
    this.audio.build();
    this.selectedTower = tower;
    this.previewRadius = null;
    pad.sprite.setTint(0xffe8a0);
    this.updateRangeDisplay();
    this.events.emit('selection');
    return true;
  }

  upgradeTower(tower) {
    if (!tower || tower.level >= MAX_TOWER_LEVEL) return false;
    if (this.money < tower.upgradeCost) {
      this.audio.error();
      this.events.emit('message', 'Not enough money!');
      return false;
    }
    this.money -= tower.upgradeCost;
    tower.upgrade();
    this.audio.upgrade();
    this.floatText(tower.x, tower.y - 26, `Lv ${tower.level}`, '#ffe066');
    this.updateRangeDisplay();
    this.events.emit('selection');
    return true;
  }

  sellTower(tower) {
    if (!tower) return;
    const refund = Math.floor(tower.totalSpent * SELL_REFUND);
    this.money += refund;
    const pad = tower.pad;
    pad.occupied = false;
    pad.tower = null;
    const i = this.towers.indexOf(tower);
    if (i >= 0) this.towers.splice(i, 1);
    this.floatText(tower.x, tower.y - 20, `+$${refund}`, '#7CFC9A');
    tower.destroy();
    this.audio.sell();
    this.clearSelection();
  }

  // ---------- waves & enemies ----------

  tryStartWave() {
    if (this.state !== STATES.BUILD_PHASE && this.state !== STATES.WAVE_COMPLETE) return;
    if (this.currentWave >= this.mapDef.waveCount) return;
    this.currentWave++;
    this.waveManager.startWave(this.currentWave);
    this.state = STATES.WAVE_ACTIVE;
    this.audio.click();
    this.events.emit('selection');
  }

  spawnEnemy(typeKey) {
    const enemy = new Enemy(this, typeKey, waveMultipliers(this.currentWave));
    this.enemies.push(enemy);
  }

  onEnemyKilled(enemy) {
    this.money += enemy.reward;
    this.score += enemy.reward * 10;
    this.kills++;
    this.floatText(enemy.x, enemy.y - 14, `+$${enemy.reward}`, '#7CFC9A');
    this.showExplosion(enemy.x, enemy.y, enemy.radius + 8);
    this.audio.enemyDeath();
    this.removeEnemy(enemy);
  }

  enemyReachedBase(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    this.lives = Math.max(0, this.lives - enemy.baseDamage);
    this.cameras.main.shake(160, 0.008);
    this.audio.baseHit();
    this.floatText(this.basePos.x, this.basePos.y - 36, `-${enemy.baseDamage} ♥`, '#ff6b6b');
    this.removeEnemy(enemy);
    if (this.lives <= 0) this.gameOver();
  }

  removeEnemy(enemy) {
    const i = this.enemies.indexOf(enemy);
    if (i >= 0) this.enemies.splice(i, 1);
    enemy.destroy();
  }

  damageArea(x, y, damage, radius, { hitGround = true, hitAir = true } = {}) {
    // copy: takeDamage can kill & splice mid-iteration
    for (const e of [...this.enemies]) {
      if (e.dead) continue;
      if (e.flying && !hitAir) continue;
      if (!e.flying && !hitGround) continue;
      if (dist(x, y, e.x, e.y) <= radius + e.radius) e.takeDamage(damage);
    }
  }

  applyFreeze(duration) {
    this.freezeTimer = duration;
    for (const e of this.enemies) e.setFrozenTint(true);
  }

  // ---------- pooled effects ----------

  spawnProjectile(cfg) {
    let p = this.projectiles.find((pr) => !pr.active);
    if (!p) {
      p = new Projectile(this);
      this.projectiles.push(p);
    }
    p.launch(cfg);
  }

  showExplosion(x, y, radius) {
    let img = this.explosionPool.find((e) => !e.visible);
    if (!img) {
      img = this.add.image(0, 0, 'explosion').setDepth(DEPTH.FX).setVisible(false);
      this.explosionPool.push(img);
    }
    img.setPosition(x, y).setVisible(true).setAlpha(0.9);
    img.setScale((radius / 46) * 0.4);
    this.tweens.add({
      targets: img,
      scale: radius / 46,
      alpha: 0,
      duration: 280,
      ease: 'Quad.easeOut',
      onComplete: () => img.setVisible(false),
    });
  }

  showTrailPuff(x, y) {
    if (Math.random() > 0.4) return;
    let img = this.puffPool.find((e) => !e.visible);
    if (!img) {
      img = this.add.image(0, 0, 'smoke_puff').setDepth(DEPTH.PROJECTILE - 1).setVisible(false);
      this.puffPool.push(img);
    }
    img.setPosition(x, y).setVisible(true).setAlpha(0.5).setScale(0.7);
    this.tweens.add({
      targets: img,
      alpha: 0,
      scale: 1.4,
      duration: 350,
      onComplete: () => img.setVisible(false),
    });
  }

  floatText(x, y, str, color) {
    let txt = this.floatPool.find((t) => !t.visible);
    if (!txt) {
      txt = this.add
        .text(0, 0, '', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setDepth(DEPTH.FLOAT)
        .setOrigin(0.5)
        .setVisible(false);
      this.floatPool.push(txt);
    }
    txt.setText(str).setColor(color).setPosition(x, y).setAlpha(1).setVisible(true);
    this.tweens.add({
      targets: txt,
      y: y - 32,
      alpha: 0,
      duration: 900,
      ease: 'Quad.easeOut',
      onComplete: () => txt.setVisible(false),
    });
  }

  // ---------- state transitions ----------

  togglePause() {
    if (this.state === STATES.VICTORY || this.state === STATES.GAME_OVER) return;
    this.paused = !this.paused;
    this.audio.click();
    this.events.emit('pause', this.paused);
  }

  onWaveCleared() {
    const waveDef = this.waves[this.currentWave - 1];
    if (waveDef) {
      this.money += waveDef.rewardBonus;
      this.score += waveDef.rewardBonus;
      this.floatText(GAME_W / 2, 220, `Wave ${this.currentWave} cleared!  +$${waveDef.rewardBonus}`, '#ffe066');
    }
    if (this.currentWave >= this.mapDef.waveCount) {
      this.victory();
    } else {
      this.state = STATES.WAVE_COMPLETE;
      this.events.emit('selection');
    }
  }

  victory() {
    this.state = STATES.VICTORY;
    this.score += this.lives * 50; // bonus for remaining lives
    this.isNewBest = SaveManager.recordVictory(this.mapDef.id, this.score);
    this.audio.victory();
    this.events.emit('game-end', { victory: true });
  }

  gameOver() {
    if (this.state === STATES.GAME_OVER) return;
    this.state = STATES.GAME_OVER;
    this.isNewBest = SaveManager.recordScore(this.mapDef.id, this.score);
    this.audio.gameOver();
    this.events.emit('game-end', { victory: false });
  }

  // ---------- main loop ----------

  update(time, delta) {
    if (this.paused || this.state === STATES.VICTORY || this.state === STATES.GAME_OVER) return;
    const dt = Math.min(delta, 50) / 1000;

    const wasFrozen = this.freezeTimer > 0;
    if (this.freezeTimer > 0) this.freezeTimer = Math.max(0, this.freezeTimer - dt);
    const frozen = this.freezeTimer > 0;
    if (wasFrozen && !frozen) {
      for (const e of this.enemies) e.setFrozenTint(false);
    }

    this.waveManager.update(dt, frozen);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this.enemies[i].update(dt, frozen);
    }

    this.laserGfx.clear();
    for (const t of this.towers) t.update(dt);

    for (const p of this.projectiles) {
      if (p.active) p.update(dt);
    }

    this.powers.update(dt);
    this.drawAirstrikeCursor();

    if (this.state === STATES.WAVE_ACTIVE && this.waveManager.cleared()) {
      this.onWaveCleared();
    }
  }

  drawAirstrikeCursor() {
    const g = this.cursorGfx;
    g.clear();
    if (!this.airstrikeMode) return;
    const p = this.input.activePointer;
    if (p.y < TOP_H || p.y > BOTTOM_Y) return;
    const r = this.powers.powers.airstrike.radius;
    g.lineStyle(2, 0xff6b6b, 0.9);
    g.strokeCircle(p.worldX, p.worldY, r);
    g.lineStyle(1, 0xff6b6b, 0.6);
    g.lineBetween(p.worldX - r, p.worldY, p.worldX + r, p.worldY);
    g.lineBetween(p.worldX, p.worldY - r, p.worldX, p.worldY + r);
  }
}
