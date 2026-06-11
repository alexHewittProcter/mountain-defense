import { STATES } from '../constants.js';

// Support powers with cooldowns: Air Strike (targeted), Time Stop, Repair Base.
export class SupportPowerManager {
  constructor(scene) {
    this.scene = scene;
    this.powers = {
      airstrike: { name: 'Air Strike', cooldown: 30, remaining: 0, damage: 120, radius: 90 },
      timestop: { name: 'Time Stop', cooldown: 45, remaining: 0, duration: 3 },
      repair: { name: 'Repair', cooldown: 60, remaining: 0, heal: 3 },
    };
  }

  update(dt) {
    for (const key of Object.keys(this.powers)) {
      const p = this.powers[key];
      if (p.remaining > 0) p.remaining = Math.max(0, p.remaining - dt);
    }
  }

  canUse(key) {
    const p = this.powers[key];
    if (!p || p.remaining > 0) return false;
    const s = this.scene.state;
    if (s === STATES.VICTORY || s === STATES.GAME_OVER) return false;
    if (key === 'repair' && this.scene.lives >= this.scene.maxLives) return false;
    return true;
  }

  // Air strike is two-step: arm it, then the next map click calls strikeAt()
  arm() {
    if (!this.canUse('airstrike')) return false;
    this.scene.airstrikeMode = true;
    return true;
  }

  strikeAt(x, y) {
    const p = this.powers.airstrike;
    p.remaining = p.cooldown;
    this.scene.airstrikeMode = false;
    this.scene.damageArea(x, y, p.damage, p.radius, { hitGround: true, hitAir: true });
    this.scene.showExplosion(x, y, p.radius);
    this.scene.cameras.main.shake(200, 0.01);
    this.scene.audio.explosion();
  }

  useTimeStop() {
    if (!this.canUse('timestop')) return false;
    const p = this.powers.timestop;
    p.remaining = p.cooldown;
    this.scene.applyFreeze(p.duration);
    this.scene.audio.powerUse();
    return true;
  }

  useRepair() {
    if (!this.canUse('repair')) return false;
    const p = this.powers.repair;
    p.remaining = p.cooldown;
    this.scene.lives = Math.min(this.scene.lives + p.heal, this.scene.maxLives);
    this.scene.floatText(this.scene.basePos.x, this.scene.basePos.y - 30, `+${p.heal} ♥`, '#7CFC9A');
    this.scene.audio.powerUse();
    return true;
  }
}
