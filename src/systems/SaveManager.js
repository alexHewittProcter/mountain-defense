import { MAPS, nextMapId } from '../data/maps.js';

const KEY = 'mountain-defense-save-v1';

const DEFAULTS = {
  completedMaps: [],
  bestScores: {},
  unlockedMaps: [MAPS[0].id],
  settings: {
    muted: false,
    unlockAll: false,
  },
};

export const SaveManager = {
  data: null,

  load() {
    if (this.data) return this.data;
    let parsed = null;
    try {
      parsed = JSON.parse(localStorage.getItem(KEY));
    } catch (e) {
      parsed = null;
    }
    this.data = {
      ...structuredClone(DEFAULTS),
      ...(parsed || {}),
      settings: { ...DEFAULTS.settings, ...((parsed && parsed.settings) || {}) },
    };
    if (!this.data.unlockedMaps || !this.data.unlockedMaps.length) {
      this.data.unlockedMaps = [MAPS[0].id];
    }
    return this.data;
  },

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {
      // localStorage unavailable (private mode etc.) - play without persistence
    }
  },

  isUnlocked(mapId) {
    const d = this.load();
    return d.settings.unlockAll || d.unlockedMaps.includes(mapId);
  },

  recordVictory(mapId, score) {
    const d = this.load();
    if (!d.completedMaps.includes(mapId)) d.completedMaps.push(mapId);
    const next = nextMapId(mapId);
    if (next && !d.unlockedMaps.includes(next)) d.unlockedMaps.push(next);
    const isBest = this.recordScore(mapId, score);
    this.save();
    return isBest;
  },

  recordScore(mapId, score) {
    const d = this.load();
    const prev = d.bestScores[mapId] || 0;
    if (score > prev) {
      d.bestScores[mapId] = score;
      this.save();
      return true;
    }
    return false;
  },

  bestScore(mapId) {
    return this.load().bestScores[mapId] || 0;
  },

  setMuted(muted) {
    this.load().settings.muted = muted;
    this.save();
  },

  toggleUnlockAll() {
    const d = this.load();
    d.settings.unlockAll = !d.settings.unlockAll;
    this.save();
    return d.settings.unlockAll;
  },
};
