import Phaser from 'phaser';
import './styles.css';
import { GAME_W, GAME_H } from './constants.js';
import { BootScene } from './scenes/BootScene.js';
import { MapSelectScene } from './scenes/MapSelectScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { AudioManager } from './systems/AudioManager.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#11151c',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 2,
  },
  scene: [BootScene, MapSelectScene, GameScene, UIScene],
});

// One shared Web Audio manager for the whole game.
// Browsers require a user gesture before audio can start.
game.audioManager = new AudioManager();
const unlockAudio = () => game.audioManager.ensure();
window.addEventListener('pointerdown', unlockAudio, { passive: true });
window.addEventListener('keydown', unlockAudio);
