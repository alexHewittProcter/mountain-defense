import Phaser from 'phaser';
import { makeTextures } from '../textures.js';
import { SaveManager } from '../systems/SaveManager.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    makeTextures(this);
    const save = SaveManager.load();
    this.game.audioManager.setMuted(save.settings.muted);
    this.scene.start('MapSelectScene');
  }
}
