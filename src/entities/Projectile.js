import { DEPTH } from '../constants.js';
import { dist } from '../utils.js';

const TEXTURES = {
  bullet: 'p_bullet',
  shell: 'p_shell',
  missile: 'p_missile',
  flak: 'p_flak',
};

// Pooled homing projectile. Not a GameObject subclass - it owns a pooled Image.
export class Projectile {
  constructor(scene) {
    this.scene = scene;
    this.sprite = scene.add.image(0, 0, 'p_bullet').setVisible(false).setDepth(DEPTH.PROJECTILE);
    this.active = false;
  }

  launch(cfg) {
    this.type = cfg.type;
    this.x = cfg.x;
    this.y = cfg.y;
    this.target = cfg.target;
    this.lastTargetPos = { x: cfg.target.x, y: cfg.target.y };
    this.speed = cfg.speed;
    this.damage = cfg.damage;
    this.splashRadius = cfg.splashRadius || 0;
    this.hitGround = cfg.hitGround;
    this.hitAir = cfg.hitAir;
    this.life = 4; // safety despawn after 4s
    this.active = true;
    this.sprite.setTexture(TEXTURES[this.type] || 'p_bullet');
    this.sprite.setPosition(this.x, this.y).setVisible(true);
  }

  update(dt) {
    if (!this.active) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.deactivate();
      return;
    }

    const targetAlive = this.target && !this.target.dead;
    if (targetAlive) {
      this.lastTargetPos.x = this.target.x;
      this.lastTargetPos.y = this.target.y;
    } else if (this.splashRadius <= 0) {
      // Single-target shot whose target died: fizzle out
      this.deactivate();
      return;
    }

    const tx = this.lastTargetPos.x;
    const ty = this.lastTargetPos.y;
    const d = dist(this.x, this.y, tx, ty);
    const hitDist = targetAlive ? this.target.radius + 4 : 6;
    const step = this.speed * dt;

    if (d <= hitDist || step >= d) {
      this.x = tx;
      this.y = ty;
      this.impact(targetAlive);
      return;
    }

    const nx = (tx - this.x) / d;
    const ny = (ty - this.y) / d;
    this.x += nx * step;
    this.y += ny * step;
    this.sprite.setPosition(this.x, this.y);
    this.sprite.rotation = Math.atan2(ny, nx) + Math.PI / 2;

    if (this.type === 'missile') {
      this.scene.showTrailPuff(this.x - nx * 10, this.y - ny * 10);
    }
  }

  impact(targetAlive) {
    if (this.splashRadius > 0) {
      this.scene.damageArea(this.x, this.y, this.damage, this.splashRadius, {
        hitGround: this.hitGround,
        hitAir: this.hitAir,
      });
      this.scene.showExplosion(this.x, this.y, this.splashRadius);
      this.scene.audio.explosion();
    } else if (targetAlive) {
      this.target.takeDamage(this.damage);
    }
    this.deactivate();
  }

  deactivate() {
    this.active = false;
    this.target = null;
    this.sprite.setVisible(false);
  }
}
