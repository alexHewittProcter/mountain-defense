// Wave templates and per-map wave generation.
// Each wave: { waveNumber, enemies: [{ type, count, delay }], spawnRate, rewardBonus }
// spawnRate = enemies spawned per second within an entry.
// delay = seconds before an entry starts (after the previous entry finished spawning).

const g = (type, count, delay = 0) => ({ type, count, delay, air: false });
const a = (type, count, delay = 0) => ({ type, count, delay, air: true });

const TEMPLATES = [
  /* 1 */ [g('scout', 6)],
  /* 2 */ [g('scout', 9)],
  /* 3 */ [g('scout', 6), g('soldier', 4, 2)],
  /* 4 */ [g('soldier', 8)],
  /* 5 */ [a('drone', 5), g('scout', 6, 2)],
  /* 6 */ [g('soldier', 7), g('heavy', 2, 3)],
  /* 7 */ [a('drone', 6), g('soldier', 6, 2)],
  /* 8 */ [g('heavy', 4), g('scout', 10, 2)],
  /* 9 */ [a('helicopter', 4), g('soldier', 8, 2)],
  /* 10 */ [g('armored', 2), g('heavy', 4, 3)],
  /* 11 */ [a('drone', 8), a('helicopter', 4, 3)],
  /* 12 */ [g('armored', 3), g('soldier', 12, 2)],
  /* 13 */ [a('gunship', 2), a('helicopter', 4, 2), a('drone', 6, 2)],
  /* 14 */ [g('armored', 4), g('heavy', 5, 2), g('scout', 12, 2)],
  /* 15 */ [a('gunship', 3), g('armored', 4, 2), a('helicopter', 5, 2), g('soldier', 10, 2)],
];

export function generateWaves(mapDef) {
  const waves = [];
  for (let w = 1; w <= mapDef.waveCount; w++) {
    const tpl = TEMPLATES[Math.min(w, TEMPLATES.length) - 1];
    // Waves past the 15 templates re-use the final template, scaled up
    const overflow = w > TEMPLATES.length ? 1 + (w - TEMPLATES.length) * 0.25 : 1;
    const enemies = tpl.map((e) => ({
      type: e.type,
      count: Math.max(
        1,
        Math.round(e.count * mapDef.difficultyFactor * (e.air ? mapDef.airFactor : 1) * overflow)
      ),
      delay: e.delay,
    }));
    waves.push({
      waveNumber: w,
      enemies,
      spawnRate: Math.min(0.9 + w * 0.05, 1.8),
      rewardBonus: Math.round((60 + w * 18) * mapDef.difficultyFactor),
    });
  }
  return waves;
}

// Per-wave difficulty scaling applied to spawned enemies
export function waveMultipliers(waveNumber) {
  return {
    health: 1 + waveNumber * 0.08,
    speed: 1 + waveNumber * 0.015,
    reward: 1 + waveNumber * 0.03,
  };
}
