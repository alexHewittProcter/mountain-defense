import Phaser from 'phaser';
import { STATES, GAME_W, GAME_H, TOP_H, BOTTOM_Y, MAX_TOWER_LEVEL, SELL_REFUND } from '../constants.js';
import { TOWER_TYPES, TOWER_ORDER } from '../data/towerTypes.js';
import { SaveManager } from '../systems/SaveManager.js';

const FONT = 'Arial, sans-serif';

class UIButton extends Phaser.GameObjects.Container {
  constructor(scene, x, y, w, h, label, onClick, opts = {}) {
    super(scene, x, y);
    this.baseColor = opts.color ?? 0x2c3e50;
    this.strokeColor = opts.stroke ?? 0x46627f;
    this.bg = scene.add.rectangle(0, 0, w, h, this.baseColor).setStrokeStyle(2, this.strokeColor);
    this.label = scene.add
      .text(0, 0, label, {
        fontFamily: FONT,
        fontSize: opts.fontSize || '14px',
        fontStyle: 'bold',
        color: '#e8eef5',
        align: 'center',
      })
      .setOrigin(0.5);
    this.add([this.bg, this.label]);
    this.setSize(w, h);
    this.enabled = true;
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', () => {
      if (this.enabled) this.bg.setFillStyle(this.baseColor + 0x101820);
      if (opts.onHover) opts.onHover();
    });
    this.on('pointerout', () => {
      this.bg.setFillStyle(this.baseColor);
      if (opts.onOut) opts.onOut();
    });
    this.on('pointerdown', () => {
      if (!this.enabled) return;
      this.bg.setFillStyle(0x1c2733);
    });
    this.on('pointerup', () => {
      if (!this.enabled) return;
      this.bg.setFillStyle(this.baseColor);
      onClick();
    });
    scene.add.existing(this);
  }

  setEnabled(on) {
    this.enabled = on;
    this.setAlpha(on ? 1 : 0.45);
  }

  setLabel(text) {
    this.label.setText(text);
  }
}

export class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    this.gs = this.scene.get('GameScene');
    this.audio = this.game.audioManager;
    this.acc = 0;

    this.buildTopBar();
    this.buildBottomPanel();
    this.buildSelectedPanel();
    this.buildMessageLine();
    this.buildPauseOverlay();
    this.endOverlay = null;

    this.onSelection = () => this.refreshSelectedPanel();
    this.onMessage = (msg) => this.showMessage(msg);
    this.onGameEnd = ({ victory }) => this.showEndScreen(victory);
    this.onPause = (paused) => this.pauseOverlay.setVisible(paused);
    this.gs.events.on('selection', this.onSelection);
    this.gs.events.on('message', this.onMessage);
    this.gs.events.on('game-end', this.onGameEnd);
    this.gs.events.on('pause', this.onPause);
    this.events.once('shutdown', () => {
      this.gs.events.off('selection', this.onSelection);
      this.gs.events.off('message', this.onMessage);
      this.gs.events.off('game-end', this.onGameEnd);
      this.gs.events.off('pause', this.onPause);
    });

    this.refreshSelectedPanel();
    this.refreshDynamic();
  }

  // ---------- top bar ----------

  buildTopBar() {
    this.add.rectangle(GAME_W / 2, TOP_H / 2, GAME_W, TOP_H, 0x141b24, 0.94).setStrokeStyle(1, 0x2a3644);
    const style = { fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#e8eef5' };
    this.moneyText = this.add.text(14, 9, '', { ...style, color: '#ffe066' });
    this.livesText = this.add.text(150, 9, '', { ...style, color: '#ff8585' });
    this.waveText = this.add.text(265, 9, '', style);
    this.scoreText = this.add.text(400, 9, '', style);
    this.add.text(560, 9, this.gs.mapDef.name + '  ·  ' + this.gs.mapDef.difficulty, {
      ...style,
      color: '#9fb4cc',
    });

    this.muteBtn = new UIButton(this, GAME_W - 26, TOP_H / 2, 32, 26, this.audio.muted ? '🔇' : '🔊', () => {
      this.audio.setMuted(!this.audio.muted);
      SaveManager.setMuted(this.audio.muted);
      this.muteBtn.setLabel(this.audio.muted ? '🔇' : '🔊');
      this.audio.click();
    });
    this.pauseBtn = new UIButton(this, GAME_W - 66, TOP_H / 2, 36, 26, '⏸', () => this.gs.togglePause());
  }

  // ---------- bottom panel ----------

  buildBottomPanel() {
    this.add
      .rectangle(GAME_W / 2, (GAME_H + BOTTOM_Y) / 2, GAME_W, GAME_H - BOTTOM_Y, 0x141b24, 0.96)
      .setStrokeStyle(1, 0x2a3644);

    // tower build buttons
    this.towerBtns = {};
    TOWER_ORDER.forEach((key, i) => {
      const def = TOWER_TYPES[key];
      const x = 50 + i * 92;
      const y = (GAME_H + BOTTOM_Y) / 2;
      const btn = new UIButton(
        this,
        x,
        y,
        86,
        66,
        '',
        () => this.onTowerButton(key),
        {
          onHover: () => {
            if (this.gs.selectedPad && !this.gs.selectedPad.occupied) this.gs.previewRange(def.range);
            this.showMessage(`${def.name}: ${def.desc}`, 2.4);
          },
          onOut: () => this.gs.clearPreviewRange(),
        }
      );
      btn.add(this.add.image(0, -14, `tw_${key}_base`).setScale(0.7));
      btn.add(this.add.image(0, -14, `tw_${key}_gun`).setScale(0.7).setOrigin(0.5, 0.65));
      btn.add(
        this.add
          .text(0, 8, def.name, { fontFamily: FONT, fontSize: '11px', color: '#cdd9e5' })
          .setOrigin(0.5)
      );
      btn.add(
        this.add
          .text(0, 22, `$${def.cost}`, {
            fontFamily: FONT,
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#ffe066',
          })
          .setOrigin(0.5)
      );
      btn.add(
        this.add
          .text(-36, -26, `${i + 1}`, { fontFamily: FONT, fontSize: '10px', color: '#7d8da0' })
          .setOrigin(0, 0)
      );
      this.towerBtns[key] = btn;
    });

    // support power buttons
    this.powerBtns = {};
    const powerDefs = [
      { key: 'airstrike', label: '💥\nStrike' },
      { key: 'timestop', label: '⏱\nFreeze' },
      { key: 'repair', label: '🔧\nRepair' },
    ];
    powerDefs.forEach((p, i) => {
      const x = 530 + i * 68;
      const y = (GAME_H + BOTTOM_Y) / 2;
      const btn = new UIButton(this, x, y, 62, 66, p.label, () => this.onPowerButton(p.key), {
        color: 0x3a2f4d,
        stroke: 0x5d4d7a,
        fontSize: '12px',
      });
      this.cooldownText = this.cooldownText || {};
      const cd = this.add
        .text(0, 24, '', { fontFamily: FONT, fontSize: '10px', color: '#b8a8d8' })
        .setOrigin(0.5);
      btn.add(cd);
      btn.cdText = cd;
      this.powerBtns[p.key] = btn;
    });

    // wave control button
    this.waveBtn = new UIButton(
      this,
      845,
      (GAME_H + BOTTOM_Y) / 2,
      200,
      66,
      '',
      () => this.gs.tryStartWave(),
      { color: 0x2f5d3a, stroke: 0x55996a, fontSize: '16px' }
    );
  }

  onTowerButton(key) {
    const gs = this.gs;
    if (!gs.selectedPad) {
      this.audio.error();
      this.showMessage('Select an empty build pad first!');
      return;
    }
    if (gs.selectedPad.occupied) {
      this.audio.error();
      this.showMessage('That pad already has a tower.');
      return;
    }
    gs.buildTower(gs.selectedPad, key);
  }

  onPowerButton(key) {
    const gs = this.gs;
    if (!gs.powers.canUse(key)) {
      this.audio.error();
      return;
    }
    if (key === 'airstrike') {
      gs.powers.arm();
      this.showMessage('Air Strike armed - click/tap a target area!', 4);
    } else if (key === 'timestop') {
      gs.powers.useTimeStop();
      this.showMessage('Time Stop! Enemies frozen.');
    } else if (key === 'repair') {
      gs.powers.useRepair();
      this.showMessage('Base repaired.');
    }
  }

  // ---------- selected tower / pad panel ----------

  buildSelectedPanel() {
    this.selPanel = this.add.container(818, 415).setVisible(false);
    this.selBg = this.add
      .rectangle(0, 0, 264, 240, 0x141b24, 0.95)
      .setStrokeStyle(2, 0x2a3644)
      .setInteractive(); // blocks map clicks underneath
    this.selPanel.add(this.selBg);
    this.selContent = this.add.container(0, 0);
    this.selPanel.add(this.selContent);
  }

  refreshSelectedPanel() {
    const gs = this.gs;
    this.selContent.removeAll(true);
    this.muteBtn.setLabel(this.audio.muted ? '🔇' : '🔊');

    const tower = gs.selectedTower;
    const pad = gs.selectedPad;
    if (!tower && !pad) {
      this.selPanel.setVisible(false);
      return;
    }
    this.selPanel.setVisible(true);

    const addLine = (y, text, color = '#cdd9e5', size = '13px', bold = false) => {
      const t = this.add
        .text(0, y, text, {
          fontFamily: FONT,
          fontSize: size,
          fontStyle: bold ? 'bold' : 'normal',
          color,
          align: 'center',
        })
        .setOrigin(0.5);
      this.selContent.add(t);
      return t;
    };

    if (!tower) {
      this.selBg.setSize(264, 110);
      this.selPanel.setY(480);
      addLine(-34, 'Empty Build Pad', '#f2e8d5', '16px', true);
      addLine(-10, 'Pick a tower below to build here.', '#9fb4cc');
      const close = new UIButton(this, 0, 26, 110, 30, 'Deselect', () => gs.clearSelection());
      this.selContent.add(close);
      return;
    }

    this.selBg.setSize(264, 240);
    this.selPanel.setY(415);
    const def = tower.def;
    addLine(-100, `${def.name}  ·  Lv ${tower.level}`, '#f2e8d5', '16px', true);
    const dmgLabel = def.beam ? `${Math.round(tower.damage)}/s` : Math.round(tower.damage);
    const rateLabel = def.beam ? 'continuous' : `${tower.fireRate.toFixed(2)}/s`;
    addLine(-76, `Damage: ${dmgLabel}    Range: ${Math.round(tower.range)}`);
    addLine(-58, `Fire rate: ${rateLabel}`);
    const targets = [def.canTargetGround ? 'Ground' : null, def.canTargetAir ? 'Air' : null]
      .filter(Boolean)
      .join(' + ');
    addLine(-40, `Targets: ${targets}`, '#9fb4cc');

    this.targetModeBtn = new UIButton(
      this,
      0,
      -10,
      230,
      30,
      `Target: ${tower.targetMode}`,
      () => {
        const mode = tower.cycleTargetMode();
        this.targetModeBtn.setLabel(`Target: ${mode}`);
        this.audio.click();
      }
    );
    this.selContent.add(this.targetModeBtn);

    const maxed = tower.level >= MAX_TOWER_LEVEL;
    this.upgradeBtn = new UIButton(
      this,
      0,
      28,
      230,
      32,
      maxed ? 'Max Level' : `Upgrade  $${tower.upgradeCost}`,
      () => gs.upgradeTower(tower),
      { color: 0x2f5d3a, stroke: 0x55996a }
    );
    if (maxed) this.upgradeBtn.setEnabled(false);
    this.selContent.add(this.upgradeBtn);

    const refund = Math.floor(tower.totalSpent * SELL_REFUND);
    this.sellBtn = new UIButton(this, 0, 66, 230, 32, `Sell  +$${refund}`, () => gs.sellTower(tower), {
      color: 0x5d2f2f,
      stroke: 0x995555,
    });
    this.selContent.add(this.sellBtn);

    const close = new UIButton(this, 0, 102, 230, 26, 'Deselect', () => gs.clearSelection());
    this.selContent.add(close);
  }

  // ---------- messages, pause, end screens ----------

  buildMessageLine() {
    this.msgText = this.add
      .text(GAME_W / 2, BOTTOM_Y - 18, '', {
        fontFamily: FONT,
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffe066',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.msgTween = null;
  }

  showMessage(msg, holdSeconds = 1.8) {
    this.msgText.setText(msg).setAlpha(1);
    if (this.msgTween) this.msgTween.stop();
    this.msgTween = this.tweens.add({
      targets: this.msgText,
      alpha: 0,
      delay: holdSeconds * 1000,
      duration: 400,
    });
  }

  buildPauseOverlay() {
    this.pauseOverlay = this.add.container(0, 0).setVisible(false);
    const rect = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.55).setInteractive();
    const txt = this.add
      .text(GAME_W / 2, GAME_H / 2 - 20, 'PAUSED', {
        fontFamily: 'Georgia, serif',
        fontSize: '48px',
        fontStyle: 'bold',
        color: '#f2e8d5',
      })
      .setOrigin(0.5);
    const hint = this.add
      .text(GAME_W / 2, GAME_H / 2 + 30, 'Press P or the pause button to resume', {
        fontFamily: FONT,
        fontSize: '16px',
        color: '#9fb4cc',
      })
      .setOrigin(0.5);
    rect.on('pointerdown', () => this.gs.togglePause());
    this.pauseOverlay.add([rect, txt, hint]);
    this.pauseOverlay.setDepth(90);
  }

  showEndScreen(victory) {
    if (this.endOverlay) this.endOverlay.destroy();
    const gs = this.gs;
    const c = this.add.container(0, 0).setDepth(100);
    this.endOverlay = c;

    c.add(this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.72).setInteractive());
    c.add(
      this.add
        .rectangle(GAME_W / 2, GAME_H / 2, 460, 380, 0x141b24, 0.97)
        .setStrokeStyle(3, victory ? 0x55996a : 0x995555)
    );
    c.add(
      this.add
        .text(GAME_W / 2, GAME_H / 2 - 140, victory ? 'VICTORY!' : 'GAME OVER', {
          fontFamily: 'Georgia, serif',
          fontSize: '44px',
          fontStyle: 'bold',
          color: victory ? '#7CFC9A' : '#ff6b6b',
        })
        .setOrigin(0.5)
    );

    const lines = victory
      ? [
          `Map Completed: ${gs.mapDef.name}`,
          `Final Score: ${gs.score}${gs.isNewBest ? '  ★ New Best!' : ''}`,
          `Enemies Killed: ${gs.kills}`,
          `Lives Remaining: ${gs.lives} / ${gs.maxLives}`,
        ]
      : [
          `Map: ${gs.mapDef.name}`,
          `Final Score: ${gs.score}${gs.isNewBest ? '  ★ New Best!' : ''}`,
          `Wave Reached: ${gs.currentWave} / ${gs.mapDef.waveCount}`,
          `Enemies Killed: ${gs.kills}`,
        ];
    lines.forEach((s, i) => {
      c.add(
        this.add
          .text(GAME_W / 2, GAME_H / 2 - 80 + i * 28, s, {
            fontFamily: FONT,
            fontSize: '17px',
            color: '#cdd9e5',
          })
          .setOrigin(0.5)
      );
    });

    if (victory && gs.mapDef.id !== 'eagle-canyon') {
      c.add(
        this.add
          .text(GAME_W / 2, GAME_H / 2 + 44, 'Next map unlocked!', {
            fontFamily: FONT,
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#ffe066',
          })
          .setOrigin(0.5)
      );
    }

    const restart = new UIButton(
      this,
      GAME_W / 2 - 105,
      GAME_H / 2 + 110,
      180,
      44,
      'Restart',
      () => {
        const mapDef = gs.mapDef;
        this.audio.click();
        this.scene.stop();
        gs.scene.restart({ mapDef });
      },
      { color: 0x2f5d3a, stroke: 0x55996a, fontSize: '17px' }
    );
    const toMaps = new UIButton(
      this,
      GAME_W / 2 + 105,
      GAME_H / 2 + 110,
      180,
      44,
      'Map Select',
      () => {
        this.audio.click();
        this.scene.stop('GameScene');
        this.scene.start('MapSelectScene');
      },
      { fontSize: '17px' }
    );
    c.add([restart, toMaps]);
  }

  // ---------- per-frame refresh (throttled) ----------

  update(time, delta) {
    this.acc += delta;
    if (this.acc < 120) return;
    this.acc = 0;
    this.refreshDynamic();
  }

  refreshDynamic() {
    const gs = this.gs;
    if (!gs || gs.state === undefined) return;

    this.moneyText.setText(`$ ${gs.money}`);
    this.livesText.setText(`♥ ${gs.lives}/${gs.maxLives}`);
    this.waveText.setText(`Wave ${gs.currentWave}/${gs.mapDef.waveCount}`);
    this.scoreText.setText(`Score ${gs.score}`);

    // tower buttons: disabled look when unaffordable
    for (const key of TOWER_ORDER) {
      this.towerBtns[key].setEnabled(gs.money >= TOWER_TYPES[key].cost);
    }

    // power buttons + cooldowns
    for (const key of Object.keys(this.powerBtns)) {
      const btn = this.powerBtns[key];
      const p = gs.powers.powers[key];
      const usable = gs.powers.canUse(key);
      btn.setEnabled(usable);
      if (key === 'airstrike' && gs.airstrikeMode) {
        btn.bg.setStrokeStyle(2, 0xffe066);
      } else {
        btn.bg.setStrokeStyle(2, 0x5d4d7a);
      }
      btn.cdText.setText(p.remaining > 0 ? `${Math.ceil(p.remaining)}s` : 'Ready');
    }

    // wave button
    if (gs.state === STATES.BUILD_PHASE) {
      this.waveBtn.setLabel(`▶  Start Wave 1`);
      this.waveBtn.setEnabled(true);
    } else if (gs.state === STATES.WAVE_ACTIVE) {
      const left = gs.waveManager.remainingToSpawn() + gs.enemies.length;
      this.waveBtn.setLabel(`Wave ${gs.currentWave} active\n${left} enemies left`);
      this.waveBtn.setEnabled(false);
    } else if (gs.state === STATES.WAVE_COMPLETE) {
      this.waveBtn.setLabel(`▶  Next Wave (${gs.currentWave + 1}/${gs.mapDef.waveCount})`);
      this.waveBtn.setEnabled(true);
    } else {
      this.waveBtn.setLabel(gs.state === STATES.VICTORY ? 'All waves cleared!' : '—');
      this.waveBtn.setEnabled(false);
    }

    // keep upgrade/sell affordability fresh while panel is open
    if (gs.selectedTower && this.upgradeBtn && this.upgradeBtn.active) {
      const t = gs.selectedTower;
      if (t.level < MAX_TOWER_LEVEL) {
        this.upgradeBtn.setEnabled(gs.money >= t.upgradeCost);
      }
    }
  }
}
