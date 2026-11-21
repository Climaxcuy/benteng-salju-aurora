// audio.js — Semua suara disintesis WebAudio, tanpa file eksternal.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.windGain = null;
    this.stepAlt = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.startWind();
    } catch (e) {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.ctx) this.ctx.suspend().catch(() => {});
    if (!this.muted && this.ctx) this.ctx.resume().catch(() => {});
    return this.muted;
  }

  // Desis angin ambient: noise buffer + lowpass, gain rendah.
  startWind() {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 320;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.035;
    src.connect(filt).connect(this.windGain).connect(ctx.destination);
    src.start();
  }

  setStorm(on) {
    if (this.windGain) this.windGain.gain.linearRampToValueAtTime(on ? 0.09 : 0.035, this.ctx.currentTime + 0.6);
  }

  blip(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol || 0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(this.ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch (e) {}
  }

  step(sneak) {
    this.stepAlt = !this.stepAlt;
    this.blip(this.stepAlt ? 190 : 160, 0.07, 'triangle', sneak ? 0.03 : 0.06, 120);
  }

  pickup() {
    this.blip(660, 0.12, 'sine', 0.14, 990);
    setTimeout(() => this.blip(990, 0.2, 'sine', 0.12, 1320), 90);
  }

  alert() {
    this.blip(220, 0.35, 'sawtooth', 0.12, 440);
    setTimeout(() => this.blip(330, 0.3, 'sawtooth', 0.1, 220), 160);
  }

  suspicious() {
    this.blip(520, 0.15, 'square', 0.05, 620);
  }

  throwBall() {
    this.blip(500, 0.1, 'sine', 0.08, 300);
  }

  win() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.3, 'sine', 0.12), i * 130));
  }

  lose() {
    [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.blip(f, 0.35, 'triangle', 0.1), i * 150));
  }
}
