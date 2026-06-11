import Phaser from 'phaser';
import { TOWER_TYPES } from '../data/towerTypes.js';
import { TARGET_MODES, MAX_TOWER_LEVEL, DEPTH, MIN_DAMAGE } from '../constants.js';
import { dist } from '../utils.js';

let nextTowerId = 1;

export class Tower extends Phaser.GameObjects.Container {
  constructor(scene, pad, typeKey) {
    super(scene, pad.x, pad.y);
    const def = TOWER_TYPES[typeKey];
    this.id = nextTowerId++;
    this.type = typeKey;
    this.def = def;
    this.pad = pad;
    this.level = 1;
    this.range = def.range;
    this.damage = def.damage;
    this.fireRate = def.fireRate;
    this.upgradeCost = def.upgradeCost;
    this.totalSpent = def.cost;
    this.targetMode = 'First';
    this.canTargetGround = def.canTargetGround;
    this.canTargetAir = def.canTargetAir;
    this.projectileType = def.projectile;
    this.splashRadius = def.splashRadius;
    this.cooldown = 0;
    this.target = null;
    this.beamSoundTick = 0;

    this.baseImg = scene.add.image(0, 0, `tw_${typeKey}_base`);
    this.turret = scene.add.image(0, 0, `tw_${typeKey}_gun`).setOrigin(0.5, 0.65);
    this.levelGfx = scene.add.graphics();
    this.add([this.baseImg, this.turret, this.levelGfx]);
    this.redrawLevelPips();

    this.setDepth(DEPTH.TOWER);
    scene.add.existing(this);
  }

  upgrade() {
    if (this.level >= MAX_TOWER_LEVEL) return false;
    this.level++;
    this.damage *= 1.25;
    this.range *= 1.1;
    if (this.fireRate > 0) this.fireRate *= 1.12;
    this.totalSpent += this.upgradeCost;
    this.upgradeCost = Math.round(this.upgradeCost * 1.5);
    this.turret.setScale(1 + 0.14 * (this.level - 1));
    this.redrawLevelPips();
    return true;
  }

  redrawLevelPips() {
    const gfx = this.levelGfx;
    gfx.clear();
    for (let i = 0; i < this.level; i++) {
      gfx.fillStyle(0xffe066, 1);
      gfx.fillCircle(-8 + i * 8, 20, 2.5);
      gfx.lineStyle(1, 0x4a3b10, 1);
      gfx.strokeCircle(-8 + i * 8, 20, 2.5);
    }
  }

  cycleTargetMode() {
    const i = TARGET_MODES.indexOf(this.targetMode);
    this.targetMode = TARGET_MODES[(i + 1) % TARGET_MODES.length];
    return this.targetMode;
  }

  validTarget(e) {
    if (!e || e.dead) return false;
    if (e.flying && !this.canTargetAir) return false;
    if (!e.flying && !this.canTargetGround) return false;
    return dist(this.x, this.y, e.x, e.y) <= this.range;
  }

  acquireTarget() {
    const inRange = [];
    for (const e of this.scene.enemies) {
      if (this.validTarget(e)) inRange.push(e);
    }
    if (!inRange.length) return null;
    switch (this.targetMode) {
      case 'First':
        return inRange.reduce((a, b) => (a.pathProgress >= b.pathProgress ? a : b));
      case 'Last':
        return inRange.reduce((a, b) => (a.pathProgress <= b.pathProgress ? a : b));
      case 'Closest':
        return inRange.reduce((a, b) =>
          dist(this.x, this.y, a.x, a.y) <= dist(this.x, this.y, b.x, b.y) ? a : b
        );
      case 'Strongest':
        return inRange.reduce((a, b) => (a.health >= b.health ? a : b));
      case 'Weakest':
        return inRange.reduce((a, b) => (a.health <= b.health ? a : b));
      default:
        return inRange[0];
    }
  }

  update(dt) {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
    if (!this.validTarget(this.target)) this.target = this.acquireTarget();
    const t = this.target;
    if (!t) return;

    this.turret.rotation = Math.atan2(t.y - this.y, t.x - this.x) + Math.PI / 2;

    if (this.def.beam) {
      // Continuous laser: armor reduces DPS, never below 1 dps
      const effectiveDps = Math.max(this.damage - t.armor, MIN_DAMAGE);
      t.applyDamage(effectiveDps * dt);
      this.drawBeam(t);
      this.beamSoundTick -= dt;
      if (this.beamSoundTick <= 0) {
        this.scene.audio.shoot('beam');
        this.beamSoundTick = 0.15;
      }
      return;
    }

    if (this.cooldown <= 0) {
      this.fire(t);
      this.cooldown = 1 / this.fireRate;
    }
  }

  drawBeam(target) {
    const gfx = this.scene.laserGfx;
    const muzzle = this.muzzlePoint();
    gfx.lineStyle(7, 0xb07cf7, 0.25);
    gfx.lineBetween(muzzle.x, muzzle.y, target.x, target.y);
    gfx.lineStyle(2.5, 0xf2dcff, 0.95);
    gfx.lineBetween(muzzle.x, muzzle.y, target.x, target.y);
    gfx.fillStyle(0xf2dcff, 0.85);
    gfx.fillCircle(target.x, target.y, 4);
  }

  muzzlePoint() {
    const ang = this.turret.rotation - Math.PI / 2;
    return { x: this.x + Math.cos(ang) * 16, y: this.y + Math.sin(ang) * 16 };
  }

  fire(target) {
    const muzzle = this.muzzlePoint();
    this.scene.spawnProjectile({
      type: this.projectileType,
      x: muzzle.x,
      y: muzzle.y,
      target,
      speed: this.def.projectileSpeed,
      damage: this.damage,
      splashRadius: this.splashRadius,
      hitGround: this.canTargetGround,
      hitAir: this.canTargetAir,
    });
    this.scene.audio.shoot(this.projectileType);
  }
}
