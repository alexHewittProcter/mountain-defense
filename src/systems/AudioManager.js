// Small Web Audio sound manager. All sounds are generated with
// oscillators / noise buffers - no external audio files.
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuf = null;
    this.muted = false;
    this.lastPlayed = {};
  }

  // Call on a user gesture so the AudioContext is allowed to start
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.3;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.5);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
  }

  throttled(key, ms) {
    const now = performance.now();
    if (now - (this.lastPlayed[key] || 0) < ms) return true;
    this.lastPlayed[key] = now;
    return false;
  }

  tone(freq, endFreq, dur, type = 'square', vol = 0.4, when = 0) {
    if (this.muted || !this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const gn = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(freq, 1), t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), t0 + dur);
    gn.gain.setValueAtTime(vol, t0);
    gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(gn);
    gn.connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  noise(dur, vol = 0.5, filterFreq = 800) {
    if (this.muted || !this.ctx || !this.noiseBuf) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(filterFreq * 0.15, 40), t0 + dur);
    const gn = this.ctx.createGain();
    gn.gain.setValueAtTime(vol, t0);
    gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gn);
    gn.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  click() {
    this.tone(620, 500, 0.05, 'square', 0.25);
  }

  error() {
    this.tone(160, 120, 0.15, 'square', 0.3);
  }

  build() {
    this.tone(380, 760, 0.12, 'triangle', 0.4);
  }

  upgrade() {
    this.tone(440, 660, 0.09, 'triangle', 0.4);
    this.tone(660, 990, 0.12, 'triangle', 0.4, 0.08);
  }

  sell() {
    this.tone(520, 260, 0.15, 'triangle', 0.35);
  }

  shoot(kind) {
    switch (kind) {
      case 'bullet':
        if (this.throttled('mg', 50)) return;
        this.tone(900, 650, 0.04, 'square', 0.12);
        break;
      case 'shell':
        this.noise(0.12, 0.3, 500);
        this.tone(170, 90, 0.12, 'square', 0.3);
        break;
      case 'missile':
        this.tone(300, 140, 0.3, 'sawtooth', 0.2);
        break;
      case 'flak':
        if (this.throttled('flak', 70)) return;
        this.tone(700, 420, 0.07, 'square', 0.18);
        break;
      case 'beam':
        if (this.throttled('beam', 140)) return;
        this.tone(1150, 1050, 0.07, 'sine', 0.1);
        break;
      default:
        break;
    }
  }

  explosion() {
    if (this.throttled('boom', 60)) return;
    this.noise(0.35, 0.5, 900);
    this.tone(95, 38, 0.3, 'sawtooth', 0.3);
  }

  enemyDeath() {
    if (this.throttled('death', 60)) return;
    this.tone(500, 180, 0.12, 'triangle', 0.25);
  }

  baseHit() {
    this.tone(220, 70, 0.35, 'sawtooth', 0.55);
    this.noise(0.25, 0.4, 600);
  }

  powerUse() {
    this.tone(520, 1040, 0.2, 'sine', 0.4);
  }

  victory() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this.tone(f, f, 0.18, 'triangle', 0.4, i * 0.16));
  }

  gameOver() {
    const notes = [392, 330, 262, 196];
    notes.forEach((f, i) => this.tone(f, f * 0.95, 0.25, 'sawtooth', 0.35, i * 0.22));
  }
}
