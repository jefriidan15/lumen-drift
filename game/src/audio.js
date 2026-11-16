// Lumen Drift — all sound is synthesized with WebAudio, no audio files.
// One file, one job: every beep, boom and pad the game makes lives here.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicNodes = null;
  }

  // Browsers only let audio start after a user gesture; call from the
  // first click / keypress, never on load.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.startPad();
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  // A slow two-oscillator pad underneath everything, quiet on purpose.
  startPad() {
    if (!this.ctx) return;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.05;
    gain.connect(this.master);
    const o1 = this.ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = 110;
    const o2 = this.ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = 164.81;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    o1.connect(gain);
    o2.connect(gain);
    o1.start();
    o2.start();
    lfo.start();
    this.musicNodes = { o1, o2, lfo, gain };
  }

  blip({ type = 'square', from = 880, to = 440, dur = 0.08, vol = 0.16, when = 0 }) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise({ dur = 0.25, vol = 0.3, low = 1200 }) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = low;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t);
  }

  shoot() { this.blip({ type: 'square', from: 920, to: 320, dur: 0.07, vol: 0.1 }); }
  hit() { this.blip({ type: 'triangle', from: 300, to: 180, dur: 0.06, vol: 0.12 }); }
  explode(big = false) {
    this.noise({ dur: big ? 0.45 : 0.22, vol: big ? 0.4 : 0.25, low: big ? 900 : 1600 });
    this.blip({ type: 'sine', from: 220, to: 40, dur: big ? 0.4 : 0.22, vol: 0.3 });
  }
  pickup() { this.blip({ type: 'sine', from: 660, to: 1320, dur: 0.09, vol: 0.12 }); }
  hurt() {
    this.blip({ type: 'sawtooth', from: 200, to: 60, dur: 0.25, vol: 0.25 });
    this.noise({ dur: 0.18, vol: 0.2, low: 800 });
  }
  dash() { this.noise({ dur: 0.12, vol: 0.14, low: 3000 }); }
  wave() {
    this.blip({ type: 'triangle', from: 392, to: 392, dur: 0.16, vol: 0.14 });
    this.blip({ type: 'triangle', from: 523.25, to: 523.25, dur: 0.16, vol: 0.14, when: 0.12 });
    this.blip({ type: 'triangle', from: 659.25, to: 659.25, dur: 0.24, vol: 0.14, when: 0.24 });
  }
  upgrade() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      this.blip({ type: 'sine', from: f, to: f, dur: 0.12, vol: 0.13, when: i * 0.07 }));
  }
  gameOver() {
    [392, 311.13, 233.08, 155.56].forEach((f, i) =>
      this.blip({ type: 'triangle', from: f, to: f * 0.94, dur: 0.3, vol: 0.16, when: i * 0.18 }));
  }
}
