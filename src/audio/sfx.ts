/**
 * Procedural sound effects via the Web Audio API — no asset files.
 * Every call is wrapped so audio failures can never break gameplay.
 * Must be resumed from a user gesture (the Rise button) before it makes sound.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private windGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;

  /** Create/resume the audio graph. Call from a user gesture. */
  resume(): void {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        this.master.connect(this.ctx.destination);
        this.noiseBuffer = this.makeNoise(this.ctx, 1.0);
        this.startWind();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch { /* audio unsupported — silent */ }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.value = m ? 0 : 0.9;
  }

  private makeNoise(ctx: AudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  /** Looping airy wind bed under gameplay. */
  private startWind(): void {
    if (!this.ctx || !this.master || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 480;
    lp.Q.value = 0.6;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0.05;
    src.connect(lp); lp.connect(this.windGain); this.windGain.connect(this.master);
    src.start();
    // slow drift on the filter so the bed feels alive
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.07; lfoGain.gain.value = 220;
    lfo.connect(lfoGain); lfoGain.connect(lp.frequency); lfo.start();
  }

  private noiseBurst(dur: number, freq: number, q: number, gain: number, type: BiquadFilterType = 'bandpass'): void {
    if (!this.ctx || !this.master || !this.noiseBuffer || this.muted) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  private tone(freqStart: number, freqEnd: number, dur: number, gain: number, type: OscillatorType = 'sine'): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  /** Crisp deflect; brighter/louder with faster impacts. */
  deflect(speed: number): void {
    const s = Math.min(1, speed / 12);
    this.noiseBurst(0.09 + s * 0.05, 900 + s * 1400, 1.2, 0.18 + s * 0.16);
    this.tone(420 + s * 260, 180, 0.1, 0.05, 'triangle');
  }

  /** Warm rising chime for collecting an ember. */
  ember(): void {
    this.tone(660, 990, 0.16, 0.10, 'sine');
    this.tone(990, 1320, 0.22, 0.06, 'sine');
  }

  /** Soft low thud when the lantern is struck. */
  hit(): void {
    this.tone(180, 60, 0.22, 0.16, 'sine');
    this.noiseBurst(0.14, 220, 0.8, 0.12, 'lowpass');
  }

  /** Descending tones when the flame goes out. */
  gameover(): void {
    this.tone(440, 220, 0.5, 0.12, 'sine');
    this.tone(330, 110, 0.7, 0.10, 'triangle');
  }
}
