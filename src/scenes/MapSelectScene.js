import Phaser from 'phaser';
import { MAPS } from '../data/maps.js';
import { SaveManager } from '../systems/SaveManager.js';
import { GAME_W, GAME_H } from '../constants.js';
import { mulberry32 } from '../utils.js';

const DIFF_COLORS = { Easy: '#7CFC9A', Medium: '#f5c542', Hard: '#ff6b6b' };

export class MapSelectScene extends Phaser.Scene {
  constructor() {
    super('MapSelectScene');
  }

  create() {
    this.audio = this.game.audioManager;
    this.drawBackground();

    this.add
      .text(GAME_W / 2, 64, 'MOUNTAIN DEFENSE', {
        fontFamily: 'Georgia, serif',
        fontSize: '52px',
        fontStyle: 'bold',
        color: '#f2e8d5',
        stroke: '#1d1812',
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_W / 2, 108, 'Defend the canyon base. Hold the line through every wave.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#cdbfa3',
      })
      .setOrigin(0.5);

    const cardW = 270;
    const gap = 30;
    const totalW = MAPS.length * cardW + (MAPS.length - 1) * gap;
    const startX = (GAME_W - totalW) / 2 + cardW / 2;
    MAPS.forEach((mapDef, i) => {
      this.makeCard(startX + i * (cardW + gap), 360, cardW, 330, mapDef, i);
    });

    this.add
      .text(GAME_W / 2, 560, 'Select a map to play. Win a map to unlock the next one.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#9c917c',
      })
      .setOrigin(0.5);

    // mute toggle
    this.muteText = this.add
      .text(GAME_W - 16, 16, this.audio.muted ? '🔇' : '🔊', { fontSize: '22px' })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.audio.setMuted(!this.audio.muted);
        SaveManager.setMuted(this.audio.muted);
        this.muteText.setText(this.audio.muted ? '🔇' : '🔊');
        this.audio.click();
      });

    // developer/debug map unlock toggle
    const save = SaveManager.load();
    this.unlockText = this.add
      .text(GAME_W - 12, GAME_H - 10, this.unlockLabel(save.settings.unlockAll), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#6d6452',
      })
      .setOrigin(1, 1)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        const on = SaveManager.toggleUnlockAll();
        this.unlockText.setText(this.unlockLabel(on));
        this.audio.click();
        this.scene.restart();
      });
  }

  unlockLabel(on) {
    return on ? 'dev: all maps unlocked (click to relock)' : 'dev: unlock all maps';
  }

  drawBackground() {
    const g = this.add.graphics();
    // dusk sky bands
    const bands = [0x1b2433, 0x23304a, 0x32405c, 0x4a4a63];
    bands.forEach((c, i) => {
      g.fillStyle(c, 1);
      g.fillRect(0, i * 60, GAME_W, 60);
    });
    g.fillStyle(0x4a4a63, 1);
    g.fillRect(0, 240, GAME_W, GAME_H - 240);
    // mountain silhouettes (two layers)
    const rand = mulberry32(7);
    g.fillStyle(0x2b2b3d, 1);
    let x = -60;
    while (x < GAME_W + 60) {
      const w = 180 + rand() * 160;
      const h = 120 + rand() * 100;
      g.fillTriangle(x, 280, x + w / 2, 280 - h, x + w, 280);
      x += w * 0.55;
    }
    g.fillStyle(0x1d1d2b, 1);
    x = -80;
    while (x < GAME_W + 80) {
      const w = 220 + rand() * 200;
      const h = 160 + rand() * 130;
      g.fillTriangle(x, 320, x + w / 2, 320 - h, x + w, 320);
      x += w * 0.6;
    }
    // valley floor
    g.fillStyle(0x191d16, 1);
    g.fillRect(0, 320, GAME_W, GAME_H - 320);
  }

  makeCard(cx, cy, w, h, mapDef, index) {
    const unlocked = SaveManager.isUnlocked(mapDef.id);
    const completed = SaveManager.load().completedMaps.includes(mapDef.id);
    const best = SaveManager.bestScore(mapDef.id);

    const card = this.add.container(cx, cy);
    const bg = this.add
      .rectangle(0, 0, w, h, unlocked ? 0x2a3140 : 0x20242c, 0.96)
      .setStrokeStyle(2, unlocked ? 0x55657f : 0x3a3f49);
    card.add(bg);

    card.add(
      this.add
        .text(0, -h / 2 + 24, mapDef.name, {
          fontFamily: 'Georgia, serif',
          fontSize: '24px',
          fontStyle: 'bold',
          color: unlocked ? '#f2e8d5' : '#7d7466',
        })
        .setOrigin(0.5)
    );
    card.add(
      this.add
        .text(0, -h / 2 + 48, mapDef.difficulty + (completed ? '  ★ completed' : ''), {
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          fontStyle: 'bold',
          color: unlocked ? DIFF_COLORS[mapDef.difficulty] : '#6a6258',
        })
        .setOrigin(0.5)
    );

    // mini path preview
    const pv = this.add.graphics();
    const scale = (w - 40) / 960;
    const py = -h / 2 + 70;
    const px = -(960 * scale) / 2;
    pv.fillStyle(unlocked ? 0x222c22 : 0x1c1f24, 1);
    pv.fillRoundedRect(px - 4, py - 4, 960 * scale + 8, 560 * scale + 8, 4);
    pv.lineStyle(5, unlocked ? 0x8a6f47 : 0x4a463f, 1);
    pv.beginPath();
    mapDef.pathWaypoints.forEach((p, i) => {
      const sx = px + Phaser.Math.Clamp(p.x, 0, 960) * scale;
      const sy = py + Phaser.Math.Clamp(p.y, 0, 560) * scale;
      if (i === 0) pv.moveTo(sx, sy);
      else pv.lineTo(sx, sy);
    });
    pv.strokePath();
    mapDef.buildPads.forEach((p) => {
      pv.fillStyle(unlocked ? 0x7c8894 : 0x4a4f57, 1);
      pv.fillRect(px + p.x * scale - 2, py + p.y * scale - 2, 4, 4);
    });
    const last = mapDef.pathWaypoints[mapDef.pathWaypoints.length - 1];
    pv.fillStyle(0xd9534f, 1);
    pv.fillRect(px + last.x * scale - 3, py + Math.min(last.y, 560) * scale - 3, 6, 6);
    card.add(pv);

    const statsY = py + 560 * scale + 22;
    const stats = [
      `${mapDef.waveCount} waves   ·   ${mapDef.buildPads.length} build pads`,
      `Start $${mapDef.startingMoney}   ·   ${mapDef.baseLives} lives`,
      best > 0 ? `Best score: ${best}` : ' ',
    ];
    stats.forEach((s, i) => {
      card.add(
        this.add
          .text(0, statsY + i * 18, s, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '13px',
            color: unlocked ? '#b9c2cf' : '#6a6f78',
          })
          .setOrigin(0.5)
      );
    });

    const btnLabel = unlocked ? 'PLAY' : `🔒 Beat ${index > 0 ? MAPS[index - 1].name : ''}`;
    const btn = this.add
      .rectangle(0, h / 2 - 32, w - 60, 38, unlocked ? 0x3f7a4a : 0x33373f)
      .setStrokeStyle(2, unlocked ? 0x6fae7a : 0x44484f);
    const btnText = this.add
      .text(0, h / 2 - 32, btnLabel, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: unlocked ? '#eaffea' : '#8a8f97',
      })
      .setOrigin(0.5);
    card.add([btn, btnText]);

    bg.setInteractive({ useHandCursor: unlocked });
    bg.on('pointerover', () => unlocked && card.setScale(1.02));
    bg.on('pointerout', () => card.setScale(1));
    bg.on('pointerdown', () => {
      if (unlocked) {
        this.audio.click();
        this.scene.start('GameScene', { mapDef });
      } else {
        this.audio.error();
        this.tweens.add({ targets: card, x: cx + 6, duration: 50, yoyo: true, repeat: 2 });
      }
    });
  }
}
