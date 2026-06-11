// All game art is generated procedurally into textures at boot.
// No external assets are used anywhere in the game.

function make(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  draw(g, w, h);
  g.generateTexture(key, w, h);
  g.destroy();
}

function darken(color, f) {
  const r = Math.floor(((color >> 16) & 0xff) * f);
  const gg = Math.floor(((color >> 8) & 0xff) * f);
  const b = Math.floor((color & 0xff) * f);
  return (r << 16) | (gg << 8) | b;
}

// Ground vehicle drawn pointing "up" (forward = -y)
function drawVehicle(g, w, h, color, opts = {}) {
  const bodyW = w * 0.62;
  const bodyX = (w - bodyW) / 2;
  if (opts.treads) {
    g.fillStyle(0x23211c, 1);
    g.fillRoundedRect(1, 3, w * 0.22, h - 6, 2);
    g.fillRoundedRect(w - 1 - w * 0.22, 3, w * 0.22, h - 6, 2);
  }
  g.fillStyle(darken(color, 0.6), 1);
  g.fillRoundedRect(bodyX - 1, 2, bodyW + 2, h - 4, 3);
  g.fillStyle(color, 1);
  g.fillRoundedRect(bodyX, 3, bodyW, h - 6, 3);
  // windshield near the front (top)
  g.fillStyle(0x1d2c38, 1);
  g.fillRect(bodyX + 2, 5, bodyW - 4, h * 0.18);
  if (opts.turret) {
    g.fillStyle(darken(color, 0.45), 1);
    g.fillCircle(w / 2, h * 0.55, w * 0.2);
    g.fillRect(w / 2 - 1.5, h * 0.22, 3, h * 0.33);
  }
  if (opts.plates) {
    g.lineStyle(1, darken(color, 0.4), 1);
    for (let y = h * 0.35; y < h - 6; y += 5) {
      g.lineBetween(bodyX + 2, y, bodyX + bodyW - 2, y);
    }
  }
}

function drawAircraft(g, w, h, color, kind) {
  const cx = w / 2;
  if (kind === 'drone') {
    // X-frame quadcopter
    g.lineStyle(3, darken(color, 0.55), 1);
    g.lineBetween(4, 4, w - 4, h - 4);
    g.lineBetween(w - 4, 4, 4, h - 4);
    g.fillStyle(darken(color, 0.5), 1);
    [
      [5, 5],
      [w - 5, 5],
      [5, h - 5],
      [w - 5, h - 5],
    ].forEach(([x, y]) => g.fillCircle(x, y, 3.5));
    g.fillStyle(color, 1);
    g.fillCircle(cx, h / 2, 6);
    g.fillStyle(0xffe066, 1);
    g.fillCircle(cx, h / 2 - 2, 2);
  } else {
    // helicopter / gunship hull pointing up
    g.fillStyle(darken(color, 0.55), 1);
    g.fillRect(cx - 2, h * 0.45, 4, h * 0.5); // tail
    g.fillStyle(color, 1);
    g.fillEllipse(cx, h * 0.34, w * 0.56, h * 0.5);
    g.fillStyle(0x1d2c38, 1);
    g.fillEllipse(cx, h * 0.22, w * 0.3, h * 0.16); // cockpit
    if (kind === 'gunship') {
      g.fillStyle(darken(color, 0.45), 1);
      g.fillRect(2, h * 0.3, w - 4, 4); // stub wings
      g.fillStyle(0x2a2a2a, 1);
      g.fillRect(3, h * 0.24, 3, 7);
      g.fillRect(w - 6, h * 0.24, 3, 7);
    }
    // tail rotor
    g.fillStyle(darken(color, 0.4), 1);
    g.fillRect(cx - 6, h - 5, 12, 3);
  }
}

function drawTowerBase(g, w, h, accent) {
  const cx = w / 2;
  const cy = h / 2;
  g.fillStyle(0x2e2a25, 1);
  g.fillCircle(cx, cy, w / 2 - 2);
  g.fillStyle(0x57504a, 1);
  g.fillCircle(cx, cy, w / 2 - 4);
  g.fillStyle(darken(accent, 0.35), 1);
  g.fillCircle(cx, cy, w / 2 - 9);
  // corner bolts
  g.fillStyle(0x88817a, 1);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.fillCircle(cx + Math.cos(a) * (w / 2 - 6), cy + Math.sin(a) * (w / 2 - 6), 1.6);
  }
}

export function makeTextures(scene) {
  // --- build pad ---
  make(scene, 'pad', 44, 44, (g, w, h) => {
    g.fillStyle(0x3b362f, 1);
    g.fillRoundedRect(0, 0, w, h, 8);
    g.fillStyle(0x6b6257, 1);
    g.fillRoundedRect(2, 2, w - 4, h - 4, 7);
    g.fillStyle(0x57504a, 1);
    g.fillRoundedRect(7, 7, w - 14, h - 14, 5);
    g.lineStyle(1.5, 0x83796c, 1);
    g.strokeRoundedRect(7, 7, w - 14, h - 14, 5);
    g.fillStyle(0x8d8478, 1);
    [
      [6, 6],
      [w - 6, 6],
      [6, h - 6],
      [w - 6, h - 6],
    ].forEach(([x, y]) => g.fillCircle(x, y, 2));
  });

  // --- base fortress ---
  make(scene, 'base_fort', 64, 64, (g, w, h) => {
    g.fillStyle(0x3a3631, 1);
    g.fillRoundedRect(4, 12, w - 8, h - 16, 5);
    g.fillStyle(0x5d564e, 1);
    g.fillRoundedRect(6, 14, w - 12, h - 20, 4);
    // crenellations
    g.fillStyle(0x3a3631, 1);
    for (let x = 8; x < w - 8; x += 10) g.fillRect(x, 10, 6, 6);
    // inner keep
    g.fillStyle(0x756c60, 1);
    g.fillRoundedRect(18, 26, 28, 26, 3);
    g.fillStyle(0x2c2925, 1);
    g.fillRect(28, 40, 8, 12); // door
    // flag
    g.lineStyle(2, 0x9c948a, 1);
    g.lineBetween(46, 26, 46, 6);
    g.fillStyle(0xd9534f, 1);
    g.fillTriangle(46, 6, 46, 16, 60, 11);
  });

  // --- enemy spawn cave marker ---
  make(scene, 'spawn_cave', 52, 40, (g, w, h) => {
    g.fillStyle(0x241f1a, 1);
    g.fillEllipse(w / 2, h, w - 4, h * 1.7);
    g.fillStyle(0x0c0a08, 1);
    g.fillEllipse(w / 2, h, w - 16, h * 1.25);
    g.fillStyle(0xf5c542, 1);
    g.fillTriangle(w / 2 - 7, 10, w / 2 + 7, 10, w / 2, 20);
  });

  // --- ground enemies ---
  make(scene, 'enemy_scout', 18, 26, (g, w, h) => drawVehicle(g, w, h, 0xf3c13a));
  make(scene, 'enemy_soldier', 20, 28, (g, w, h) => drawVehicle(g, w, h, 0x6a9c3c));
  make(scene, 'enemy_heavy', 26, 34, (g, w, h) =>
    drawVehicle(g, w, h, 0x8a6d3b, { treads: true, turret: true })
  );
  make(scene, 'enemy_armored', 30, 40, (g, w, h) =>
    drawVehicle(g, w, h, 0x7a8088, { treads: true, turret: true, plates: true })
  );

  // --- flying enemies ---
  make(scene, 'enemy_drone', 26, 26, (g, w, h) => drawAircraft(g, w, h, 0x9b59b6, 'drone'));
  make(scene, 'enemy_helicopter', 30, 44, (g, w, h) =>
    drawAircraft(g, w, h, 0x5dade2, 'helicopter')
  );
  make(scene, 'enemy_gunship', 36, 52, (g, w, h) => drawAircraft(g, w, h, 0xc0392b, 'gunship'));

  // spinning rotors (children of flying enemies)
  make(scene, 'rotor', 40, 6, (g, w, h) => {
    g.fillStyle(0xdddddd, 0.85);
    g.fillRoundedRect(0, h / 2 - 1.5, w, 3, 1.5);
    g.fillStyle(0x333333, 1);
    g.fillCircle(w / 2, h / 2, 2.5);
  });
  make(scene, 'rotor_x', 26, 26, (g, w, h) => {
    g.lineStyle(2, 0xdddddd, 0.8);
    g.lineBetween(2, h / 2, w - 2, h / 2);
    g.lineBetween(w / 2, 2, w / 2, h - 2);
  });

  // shadow under flying units
  make(scene, 'shadow', 26, 14, (g, w, h) => {
    g.fillStyle(0x000000, 1);
    g.fillEllipse(w / 2, h / 2, w - 2, h - 2);
  });

  // --- towers: base + turret (turret drawn pointing up) ---
  make(scene, 'tw_machinegun_base', 40, 40, (g, w, h) => drawTowerBase(g, w, h, 0x9bb0c1));
  make(scene, 'tw_machinegun_gun', 30, 34, (g, w, h) => {
    g.fillStyle(0x55606a, 1);
    g.fillRect(w / 2 - 6, 2, 3.5, 16);
    g.fillRect(w / 2 + 2.5, 2, 3.5, 16);
    g.fillStyle(0x9bb0c1, 1);
    g.fillCircle(w / 2, h * 0.62, 8);
    g.fillStyle(0x55606a, 1);
    g.fillCircle(w / 2, h * 0.62, 4);
  });

  make(scene, 'tw_cannon_base', 40, 40, (g, w, h) => drawTowerBase(g, w, h, 0xd98a3d));
  make(scene, 'tw_cannon_gun', 30, 36, (g, w, h) => {
    g.fillStyle(0x6e4a22, 1);
    g.fillRect(w / 2 - 4, 1, 8, 20);
    g.fillStyle(0x9c6a32, 1);
    g.fillRect(w / 2 - 2.5, 2, 5, 18);
    g.fillStyle(0xd98a3d, 1);
    g.fillCircle(w / 2, h * 0.64, 9);
    g.fillStyle(0x6e4a22, 1);
    g.fillCircle(w / 2, h * 0.64, 4.5);
  });

  make(scene, 'tw_missile_base', 40, 40, (g, w, h) => drawTowerBase(g, w, h, 0xd9534f));
  make(scene, 'tw_missile_gun', 32, 34, (g, w, h) => {
    g.fillStyle(0x7c2f2c, 1);
    g.fillRoundedRect(w / 2 - 10, 4, 20, 22, 3);
    g.fillStyle(0xd9534f, 1);
    g.fillRoundedRect(w / 2 - 8, 6, 16, 18, 2);
    g.fillStyle(0x2a2a2a, 1);
    [
      [-4.5, 10],
      [4.5, 10],
      [-4.5, 19],
      [4.5, 19],
    ].forEach(([dx, y]) => g.fillCircle(w / 2 + dx, y, 3));
  });

  make(scene, 'tw_antiair_base', 40, 40, (g, w, h) => drawTowerBase(g, w, h, 0x5bc0de));
  make(scene, 'tw_antiair_gun', 32, 34, (g, w, h) => {
    g.fillStyle(0x2f6f84, 1);
    g.fillRect(w / 2 - 7, 2, 3, 17);
    g.fillRect(w / 2 + 4, 2, 3, 17);
    g.lineStyle(2.5, 0x5bc0de, 1);
    g.strokeCircle(w / 2, h * 0.62, 8);
    g.lineStyle(1.5, 0xbfeaf7, 1);
    g.strokeCircle(w / 2, h * 0.62, 4);
    g.fillStyle(0xbfeaf7, 1);
    g.fillCircle(w / 2, h * 0.62, 1.8);
  });

  make(scene, 'tw_laser_base', 40, 40, (g, w, h) => drawTowerBase(g, w, h, 0xb07cf7));
  make(scene, 'tw_laser_gun', 30, 34, (g, w, h) => {
    g.fillStyle(0x5b3d86, 1);
    g.fillTriangle(w / 2 - 8, 18, w / 2 + 8, 18, w / 2, 1);
    g.fillStyle(0xb07cf7, 1);
    g.fillTriangle(w / 2 - 5, 16, w / 2 + 5, 16, w / 2, 4);
    g.fillStyle(0xf2dcff, 1);
    g.fillCircle(w / 2, h * 0.62, 6);
    g.fillStyle(0xb07cf7, 1);
    g.fillCircle(w / 2, h * 0.62, 3);
  });

  // --- projectiles (pointing up) ---
  make(scene, 'p_bullet', 6, 12, (g, w, h) => {
    g.fillStyle(0xffe066, 1);
    g.fillRoundedRect(w / 2 - 1.5, 0, 3, h - 3, 1.5);
    g.fillStyle(0xfff6cc, 1);
    g.fillRect(w / 2 - 1, 0, 2, 4);
  });
  make(scene, 'p_shell', 10, 10, (g, w, h) => {
    g.fillStyle(0x2e2a25, 1);
    g.fillCircle(w / 2, h / 2, 4.5);
    g.fillStyle(0x6b6257, 1);
    g.fillCircle(w / 2 - 1, h / 2 - 1, 1.8);
  });
  make(scene, 'p_missile', 10, 20, (g, w, h) => {
    g.fillStyle(0xd9d9d9, 1);
    g.fillRoundedRect(w / 2 - 2.5, 2, 5, 12, 2);
    g.fillStyle(0xd9534f, 1);
    g.fillTriangle(w / 2 - 2.5, 3, w / 2 + 2.5, 3, w / 2, 0);
    g.fillStyle(0xff9d3c, 1);
    g.fillTriangle(w / 2 - 3, 14, w / 2 + 3, 14, w / 2, h);
  });
  make(scene, 'p_flak', 8, 8, (g, w, h) => {
    g.fillStyle(0xbfeaf7, 1);
    g.fillCircle(w / 2, h / 2, 3.5);
    g.fillStyle(0x5bc0de, 1);
    g.fillCircle(w / 2, h / 2, 1.8);
  });

  // --- effects ---
  make(scene, 'explosion', 96, 96, (g, w, h) => {
    g.fillStyle(0xff6a00, 0.3);
    g.fillCircle(w / 2, h / 2, 46);
    g.fillStyle(0xff9d00, 0.55);
    g.fillCircle(w / 2, h / 2, 30);
    g.fillStyle(0xfff3b0, 0.9);
    g.fillCircle(w / 2, h / 2, 14);
  });
  make(scene, 'smoke_puff', 12, 12, (g, w, h) => {
    g.fillStyle(0xcccccc, 0.5);
    g.fillCircle(w / 2, h / 2, 5);
  });
}
