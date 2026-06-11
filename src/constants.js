export const GAME_W = 960;
export const GAME_H = 640;

// Layout regions (in game pixels)
export const TOP_H = 36; // top HUD bar height
export const BOTTOM_Y = 560; // y where the bottom UI panel starts

export const STATES = {
  BOOT: 'BOOT',
  MAP_SELECT: 'MAP_SELECT',
  BUILD_PHASE: 'BUILD_PHASE',
  WAVE_ACTIVE: 'WAVE_ACTIVE',
  WAVE_COMPLETE: 'WAVE_COMPLETE',
  VICTORY: 'VICTORY',
  GAME_OVER: 'GAME_OVER',
};

export const TARGET_MODES = ['First', 'Last', 'Closest', 'Strongest', 'Weakest'];

export const MAX_TOWER_LEVEL = 3;
export const SELL_REFUND = 0.75;
export const MIN_DAMAGE = 1;

export const DEPTH = {
  MAP: 0,
  BASE: 5,
  PAD: 6,
  GROUND_ENEMY: 15,
  TOWER: 20,
  AIR_SHADOW: 22,
  AIR_ENEMY: 25,
  PROJECTILE: 30,
  RANGE: 35,
  LASER: 40,
  FX: 50,
  CURSOR: 60,
  FLOAT: 70,
};
