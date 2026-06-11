// Builds a timed spawn queue per wave and feeds enemies into the scene.
export class WaveManager {
  constructor(scene, waves) {
    this.scene = scene;
    this.waves = waves;
    this.queue = [];
    this.timer = 0;
    this.spawning = false;
    this.currentWaveDef = null;
  }

  startWave(waveNumber) {
    const waveDef = this.waves[waveNumber - 1];
    if (!waveDef) return;
    this.currentWaveDef = waveDef;
    this.queue = [];
    let t = 0.6;
    const gap = 1 / waveDef.spawnRate;
    for (const entry of waveDef.enemies) {
      t += entry.delay;
      for (let i = 0; i < entry.count; i++) {
        this.queue.push({ type: entry.type, at: t });
        t += gap;
      }
    }
    this.totalThisWave = this.queue.length;
    this.timer = 0;
    this.spawning = true;
  }

  update(dt, frozen) {
    if (!this.spawning || frozen) return;
    this.timer += dt;
    while (this.queue.length && this.queue[0].at <= this.timer) {
      const next = this.queue.shift();
      this.scene.spawnEnemy(next.type);
    }
    if (!this.queue.length) this.spawning = false;
  }

  remainingToSpawn() {
    return this.queue.length;
  }

  // Wave fully cleared: nothing left to spawn and no enemies alive
  cleared() {
    return !this.queue.length && this.scene.enemies.length === 0;
  }
}
