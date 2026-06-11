import Phaser from 'phaser';
import { ENEMY_TYPES } from '../data/enemyTypes.js';
import { DEPTH, MIN_DAMAGE } from '../constants.js';

let nextEnemyId = 1;

export class Enemy extends Phaser.GameObjects.Container {
  constructor(scene, typeKey, mults) {
    const def = ENEMY_TYPES[typeKey];
    const path = def.flying ? scene.airPath : scene.groundPath;
    super(scene, path.points[0].x, path.points[0].y);

    this.id = nextEnemyId++;
    this.type = typeKey;
    this.def = def;
    this.path = path;
    this.maxHealth = Math.round(def.health * mults.health);
    this.health = this.maxHealth;
    this.speed = def.speed * mults.speed;
    this.reward = Math.round(def.reward * mults.reward);
    this.armor = def.armor;
    this.baseDamage = def.baseDamage;
    this.flying = def.flying;
    this.radius = def.radius;
    this.dead = false;

    this.pathIndex = 0;
    this.distanceAlongSegment = 0;
    this.pathProgress = 0;
    this.flashTimer = 0;
    this.barY = def.radius + 12;

    if (this.flying) {
      this.shadow = scene.add.image(7, 12, 'shadow').setAlpha(0.35);
      this.add(this.shadow);
    }
    this.bodyImg = scene.add.image(0, 0, def.texture);
    this.add(this.bodyImg);
    if (typeKey === 'helicopter' || typeKey === 'gunship') {
      this.rotor = scene.add.image(0, 0, 'rotor');
      this.add(this.rotor);
    } else if (typeKey === 'drone') {
      this.rotor = scene.add.image(0, 0, 'rotor_x');
      this.add(this.rotor);
    }
    this.hpGfx = scene.add.graphics();
    this.add(this.hpGfx);

    this.setDepth(this.flying ? DEPTH.AIR_ENEMY : DEPTH.GROUND_ENEMY);
    scene.add.existing(this);

    if (scene.freezeTimer > 0) this.setFrozenTint(true);
  }

  update(dt, frozen) {
    if (this.dead) return;
    if (this.rotor) this.rotor.rotation += (frozen ? 2 : 24) * dt;

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) this.restoreTint();
    }

    if (frozen) return;

    let remaining = this.speed * dt;
    const pts = this.path.points;
    while (remaining > 0) {
      if (this.pathIndex >= pts.length - 1) {
        this.scene.enemyReachedBase(this);
        return;
      }
      const segLen = this.path.segLengths[this.pathIndex];
      const left = segLen - this.distanceAlongSegment;
      if (remaining >= left) {
        remaining -= left;
        this.pathIndex++;
        this.distanceAlongSegment = 0;
      } else {
        this.distanceAlongSegment += remaining;
        remaining = 0;
      }
    }
    if (this.pathIndex >= pts.length - 1) {
      this.scene.enemyReachedBase(this);
      return;
    }

    const a = pts[this.pathIndex];
    const b = pts[this.pathIndex + 1];
    const segLen = this.path.segLengths[this.pathIndex] || 1;
    const t = this.distanceAlongSegment / segLen;
    this.x = a.x + (b.x - a.x) * t;
    this.y = a.y + (b.y - a.y) * t;
    this.bodyImg.rotation = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
    this.pathProgress =
      (this.path.cum[this.pathIndex] + this.distanceAlongSegment) / this.path.total;
  }

  takeDamage(rawDamage) {
    if (this.dead) return;
    const final = Math.max(rawDamage - this.armor, MIN_DAMAGE);
    this.applyDamage(final);
    this.bodyImg.setTintFill(0xffffff);
    this.flashTimer = 0.05;
  }

  // Damage already reduced by armor (laser ticks, etc.)
  applyDamage(amount) {
    if (this.dead) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
      this.scene.onEnemyKilled(this);
      return;
    }
    this.redrawHp();
  }

  redrawHp() {
    const gfx = this.hpGfx;
    gfx.clear();
    if (this.health >= this.maxHealth) return;
    const w = 24;
    const frac = Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1);
    gfx.fillStyle(0x000000, 0.65);
    gfx.fillRect(-w / 2, -this.barY, w, 5);
    const color = frac > 0.5 ? 0x4ade60 : frac > 0.25 ? 0xf5c542 : 0xe74c3c;
    gfx.fillStyle(color, 1);
    gfx.fillRect(-w / 2 + 1, -this.barY + 1, (w - 2) * frac, 3);
  }

  setFrozenTint(on) {
    if (on) {
      this.bodyImg.setTint(0x7fd9ff);
      if (this.rotor) this.rotor.setTint(0x7fd9ff);
    } else {
      this.restoreTint();
    }
  }

  restoreTint() {
    if (this.scene && this.scene.freezeTimer > 0) {
      this.bodyImg.setTint(0x7fd9ff);
      if (this.rotor) this.rotor.setTint(0x7fd9ff);
    } else {
      this.bodyImg.clearTint();
      if (this.rotor) this.rotor.clearTint();
    }
  }
}
