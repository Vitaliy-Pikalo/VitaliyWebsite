// Procedural sound for the campaign: every effect is synthesized with the Web Audio API,
// so the game ships no audio files. Effects take any BaseAudioContext, which lets tests
// render them offline and check their levels.

export type SfxName =
  | "click"
  | "select"
  | "move"
  | "hit"
  | "shoot"
  | "bolt"
  | "heal"
  | "hurt"
  | "death"
  | "recruit"
  | "shrine"
  | "slamWind"
  | "slamImpact"
  | "boulderMark"
  | "boulderLaunch"
  | "boulderImpact"
  | "shardSpawn"
  | "shardBreak"
  | "drone"
  | "checkmate"
  | "kelly"
  | "bossHit"
  | "bossAggro"
  | "locked";

export const SFX_NAMES: SfxName[] = [
  "click", "select", "move", "hit", "shoot", "bolt", "heal", "hurt", "death", "recruit", "shrine",
  "slamWind", "slamImpact", "boulderMark", "boulderLaunch", "boulderImpact", "shardSpawn", "shardBreak",
  "drone", "checkmate", "kelly", "bossHit", "bossAggro", "locked",
];

export type SfxOpts = {
  pan?: number; // -1 left .. 1 right
  gain?: number; // 0..1 extra attenuation
  dur?: number; // for sounds with a variable length (slam wind-up)
};

/** Where an effect plays: a context, a dry destination, and a reverb send. */
export type SfxTarget = { ctx: BaseAudioContext; dry: AudioNode; wet: AudioNode; t: number };

/* ---------------------------------------------------------------- helpers */

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuffer(ctx: BaseAudioContext) {
  let b = noiseCache.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, b);
  }
  return b;
}

/** Exponential attack-decay envelope on a gain param. */
function envelope(g: AudioParam, t: number, attack: number, peak: number, decay: number) {
  g.setValueAtTime(0.0001, t);
  g.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

type ToneSpec = {
  type?: OscillatorType;
  f0: number;
  f1?: number; // glide target
  at?: number; // start offset (s)
  a?: number; // attack
  d: number; // decay
  gain: number;
  wet?: number; // reverb send 0..1
  detune?: number;
};

function tone(x: SfxTarget, s: ToneSpec, out: AudioNode) {
  const { ctx } = x;
  const t = x.t + (s.at ?? 0);
  const a = s.a ?? 0.005;
  const o = ctx.createOscillator();
  o.type = s.type ?? "sine";
  o.frequency.setValueAtTime(s.f0, t);
  if (s.f1) o.frequency.exponentialRampToValueAtTime(s.f1, t + a + s.d);
  if (s.detune) o.detune.value = s.detune;
  const g = ctx.createGain();
  envelope(g.gain, t, a, s.gain, s.d);
  o.connect(g).connect(out);
  if (s.wet) {
    const send = ctx.createGain();
    send.gain.value = s.wet;
    g.connect(send).connect(x.wet);
  }
  o.start(t);
  o.stop(t + a + s.d + 0.05);
}

type NoiseSpec = {
  filter?: BiquadFilterType;
  f0: number;
  f1?: number;
  q?: number;
  at?: number;
  a?: number;
  d: number;
  gain: number;
  wet?: number;
};

function noise(x: SfxTarget, s: NoiseSpec, out: AudioNode) {
  const { ctx } = x;
  const t = x.t + (s.at ?? 0);
  const a = s.a ?? 0.003;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = s.filter ?? "lowpass";
  f.frequency.setValueAtTime(s.f0, t);
  if (s.f1) f.frequency.exponentialRampToValueAtTime(s.f1, t + a + s.d);
  f.Q.value = s.q ?? 0.8;
  const g = ctx.createGain();
  envelope(g.gain, t, a, s.gain, s.d);
  src.connect(f).connect(g).connect(out);
  if (s.wet) {
    const send = ctx.createGain();
    send.gain.value = s.wet;
    g.connect(send).connect(x.wet);
  }
  src.start(t, Math.random() * 0.5);
  src.stop(t + a + s.d + 0.05);
}

/** A struck bell: inharmonic partials with long decays. */
function bell(x: SfxTarget, f: number, gain: number, at = 0, d = 1.2, out: AudioNode) {
  const partials: [number, number][] = [[1, 1], [2.76, 0.45], [5.4, 0.25], [8.93, 0.12]];
  for (const [ratio, amp] of partials) tone(x, { f0: f * ratio, at, a: 0.002, d: d / Math.sqrt(ratio), gain: gain * amp, wet: 0.5 }, out);
}

/** Output stage for one effect: gain then stereo pan into the dry bus. */
function outStage(x: SfxTarget, o: SfxOpts) {
  const g = x.ctx.createGain();
  g.gain.value = o.gain ?? 1;
  const p = x.ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, o.pan ?? 0));
  g.connect(p).connect(x.dry);
  return g;
}

/* ---------------------------------------------------------------- effects */

/** Plays one effect at x.t. Returns its length in seconds. */
export function playSfx(x: SfxTarget, name: SfxName, o: SfxOpts = {}): number {
  const out = outStage(x, o);
  switch (name) {
    case "click":
      tone(x, { type: "triangle", f0: 1200, f1: 900, d: 0.04, gain: 0.18 }, out);
      return 0.06;
    case "select":
      tone(x, { type: "triangle", f0: 660, d: 0.05, gain: 0.16 }, out);
      tone(x, { type: "triangle", f0: 990, at: 0.05, d: 0.07, gain: 0.14 }, out);
      return 0.14;
    case "move":
      tone(x, { type: "sine", f0: 520, f1: 700, d: 0.07, gain: 0.14 }, out);
      return 0.09;
    case "hit": // sword on armor: bright scrape plus a body thud
      noise(x, { filter: "bandpass", f0: 3200, f1: 900, q: 1.4, d: 0.09, gain: 0.32 }, out);
      tone(x, { type: "sine", f0: 160, f1: 70, d: 0.09, gain: 0.35 }, out);
      tone(x, { type: "square", f0: 2400 + Math.random() * 600, d: 0.05, gain: 0.03 }, out);
      return 0.12;
    case "shoot": // bowstring twang and arrow hiss
      tone(x, { type: "triangle", f0: 320, f1: 190, d: 0.08, gain: 0.22 }, out);
      noise(x, { filter: "highpass", f0: 5000, f1: 1800, d: 0.16, gain: 0.12 }, out);
      return 0.18;
    case "bolt": // arcane bolt from the strategist's staff
      tone(x, { type: "sine", f0: 1100, f1: 260, a: 0.01, d: 0.28, gain: 0.2, wet: 0.4 }, out);
      tone(x, { type: "triangle", f0: 1650, f1: 390, a: 0.01, d: 0.22, gain: 0.07 }, out);
      noise(x, { filter: "bandpass", f0: 2500, q: 3, d: 0.18, gain: 0.07 }, out);
      return 0.32;
    case "heal":
      [784, 988, 1175].forEach((f, i) => tone(x, { f0: f, at: i * 0.06, a: 0.01, d: 0.35, gain: 0.09, wet: 0.6 }, out));
      return 0.55;
    case "hurt":
      tone(x, { type: "square", f0: 230, f1: 140, d: 0.08, gain: 0.07 }, out);
      noise(x, { filter: "lowpass", f0: 900, d: 0.07, gain: 0.12 }, out);
      return 0.1;
    case "death":
      tone(x, { type: "triangle", f0: 330, f1: 98, a: 0.01, d: 0.55, gain: 0.25, wet: 0.4 }, out);
      noise(x, { filter: "lowpass", f0: 1400, f1: 300, d: 0.4, gain: 0.18 }, out);
      return 0.6;
    case "recruit": // short brass-like fanfare
      [[523, 0], [659, 0.09], [784, 0.18], [1047, 0.3]].forEach(([f, at]) => {
        tone(x, { type: "sawtooth", f0: f, at, a: 0.02, d: 0.4, gain: 0.06, wet: 0.5 }, out);
        tone(x, { type: "triangle", f0: f, at, a: 0.02, d: 0.5, gain: 0.12 }, out);
      });
      return 0.85;
    case "shrine":
      bell(x, 880, 0.22, 0, 1.6, out);
      bell(x, 1318, 0.12, 0.12, 1.4, out);
      return 1.7;
    case "slamWind": { // rumble that swells for the whole wind-up
      const d = o.dur ?? 1.7;
      const t = x.t;
      const src = x.ctx.createOscillator();
      src.type = "sawtooth";
      src.frequency.setValueAtTime(42, t);
      src.frequency.linearRampToValueAtTime(70, t + d);
      const f = x.ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(140, t);
      f.frequency.linearRampToValueAtTime(420, t + d);
      const g = x.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32, t + d);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.08);
      src.connect(f).connect(g).connect(out);
      src.start(t);
      src.stop(t + d + 0.12);
      noise(x, { filter: "lowpass", f0: 200, f1: 600, a: d * 0.9, d: 0.1, gain: 0.16 }, out);
      return d + 0.12;
    }
    case "slamImpact":
      tone(x, { type: "sine", f0: 85, f1: 28, a: 0.003, d: 0.75, gain: 0.75 }, out);
      noise(x, { filter: "lowpass", f0: 1800, f1: 160, d: 0.6, gain: 0.45, wet: 0.35 }, out);
      noise(x, { filter: "bandpass", f0: 600, q: 0.7, at: 0.05, d: 0.5, gain: 0.15 }, out); // gravel
      return 0.85;
    case "boulderMark": // warning: two falling tones
      tone(x, { type: "triangle", f0: 587, d: 0.12, gain: 0.16 }, out);
      tone(x, { type: "triangle", f0: 440, at: 0.14, d: 0.18, gain: 0.16 }, out);
      return 0.35;
    case "boulderLaunch":
      noise(x, { filter: "bandpass", f0: 300, f1: 1600, q: 1.2, a: 0.08, d: 0.38, gain: 1.1 }, out);
      tone(x, { type: "sine", f0: 180, f1: 90, a: 0.05, d: 0.35, gain: 0.12 }, out);
      return 0.5;
    case "boulderImpact":
      tone(x, { type: "sine", f0: 120, f1: 40, d: 0.45, gain: 0.55 }, out);
      noise(x, { filter: "lowpass", f0: 2400, f1: 250, d: 0.45, gain: 0.38, wet: 0.25 }, out);
      return 0.55;
    case "shardSpawn": // crystals humming into existence
      [1568, 2093, 2637].forEach((f, i) => tone(x, { f0: f, at: i * 0.05, a: 0.04, d: 0.6, gain: 0.06, wet: 0.7 }, out));
      noise(x, { filter: "highpass", f0: 6000, a: 0.05, d: 0.4, gain: 0.05 }, out);
      tone(x, { type: "sawtooth", f0: 98, a: 0.1, d: 0.5, gain: 0.07 }, out);
      return 0.8;
    case "shardBreak":
      noise(x, { filter: "highpass", f0: 3500, d: 0.18, gain: 0.25 }, out);
      tone(x, { f0: 2637 + Math.random() * 400, d: 0.25, gain: 0.08, wet: 0.5 }, out);
      tone(x, { f0: 3520, at: 0.03, d: 0.2, gain: 0.05 }, out);
      return 0.3;
    case "drone": { // quadcopter buzz, then the heal chime
      const t = x.t;
      const src = x.ctx.createOscillator();
      src.type = "sawtooth";
      src.frequency.setValueAtTime(170, t);
      src.frequency.linearRampToValueAtTime(210, t + 0.9);
      const trem = x.ctx.createOscillator();
      trem.frequency.value = 32;
      const tremGain = x.ctx.createGain();
      tremGain.gain.value = 0.5;
      const f = x.ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 1300;
      const g = x.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.15);
      g.gain.setValueAtTime(0.18, t + 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
      const am = x.ctx.createGain();
      am.gain.value = 0.5;
      trem.connect(tremGain).connect(am.gain);
      src.connect(f).connect(am).connect(g).connect(out);
      src.start(t);
      trem.start(t);
      src.stop(t + 1.05);
      trem.stop(t + 1.05);
      [784, 988, 1175, 1568].forEach((fr, i) => tone(x, { f0: fr, at: 0.75 + i * 0.07, a: 0.01, d: 0.45, gain: 0.08, wet: 0.6 }, out));
      return 1.5;
    }
    case "checkmate": // decisive bell and a heavy strike
      bell(x, 1319, 0.2, 0, 1.3, out);
      tone(x, { type: "sine", f0: 140, f1: 45, d: 0.35, gain: 0.5 }, out);
      noise(x, { filter: "bandpass", f0: 2200, f1: 700, q: 1, d: 0.2, gain: 0.25 }, out);
      return 1.3;
    case "kelly": // coins
      [0, 0.07, 0.13, 0.22].forEach((at, i) => {
        tone(x, { f0: i % 2 ? 2637 : 2093, at, a: 0.001, d: 0.18, gain: 0.08, wet: 0.3 }, out);
        tone(x, { f0: (i % 2 ? 2637 : 2093) * 2.4, at, a: 0.001, d: 0.08, gain: 0.03 }, out);
      });
      tone(x, { type: "triangle", f0: 523, at: 0.3, a: 0.02, d: 0.4, gain: 0.08, wet: 0.4 }, out);
      tone(x, { type: "triangle", f0: 784, at: 0.3, a: 0.02, d: 0.4, gain: 0.06, wet: 0.4 }, out);
      return 0.75;
    case "bossHit": // stone being chipped
      tone(x, { type: "sine", f0: 95, f1: 55, d: 0.12, gain: 0.32 }, out);
      noise(x, { filter: "bandpass", f0: 1100 + Math.random() * 500, q: 1.1, d: 0.1, gain: 0.22 }, out);
      return 0.14;
    case "bossAggro": { // war horn
      const t = x.t;
      for (const [f, gain] of [[110, 0.14], [165, 0.09], [220, 0.05]] as [number, number][]) {
        const src = x.ctx.createOscillator();
        src.type = "sawtooth";
        src.frequency.setValueAtTime(f * 0.94, t);
        src.frequency.linearRampToValueAtTime(f, t + 0.25);
        const flt = x.ctx.createBiquadFilter();
        flt.type = "lowpass";
        flt.frequency.setValueAtTime(250, t);
        flt.frequency.linearRampToValueAtTime(1300, t + 0.6);
        flt.frequency.linearRampToValueAtTime(500, t + 1.6);
        const g = x.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + 0.25);
        g.gain.setValueAtTime(gain, t + 1.1);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
        src.connect(flt).connect(g).connect(out);
        const send = x.ctx.createGain();
        send.gain.value = 0.5;
        g.connect(send).connect(x.wet);
        src.start(t);
        src.stop(t + 1.75);
      }
      return 1.8;
    }
    case "locked":
      tone(x, { type: "square", f0: 180, d: 0.07, gain: 0.09 }, out);
      tone(x, { type: "square", f0: 150, at: 0.08, d: 0.09, gain: 0.09 }, out);
      return 0.2;
  }
}

/** Generated stereo impulse response: a short, dark hall. */
export function makeReverb(ctx: BaseAudioContext, seconds = 2.2) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const k = i / len;
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - k, 3) * (i < ctx.sampleRate * 0.01 ? i / (ctx.sampleRate * 0.01) : 1);
    }
  }
  const conv = ctx.createConvolver();
  conv.buffer = ir;
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 3200;
  conv.connect(tone);
  return { input: conv, output: tone };
}

/* ------------------------------------------------------------------ mixer */

export type AudioSettings = { sound: boolean; music: boolean; voices: boolean };

const SETTINGS_KEY = "campaign-audio";
const DEFAULTS: AudioSettings = { sound: true, music: true, voices: false };

// Shortest gap between repeats of the same effect, so a crowded fight doesn't turn to noise.
const MIN_GAP: Partial<Record<SfxName, number>> = {
  hit: 0.07,
  bossHit: 0.06,
  shoot: 0.08,
  bolt: 0.1,
  hurt: 0.12,
  heal: 0.25,
  select: 0.08,
  move: 0.1,
  click: 0.04,
  shardBreak: 0.08,
};

function loadSettings(): AudioSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AudioSettings>) };
  } catch {
    // Storage can be unavailable (private mode, blocked site data); defaults are fine.
  }
  return { ...DEFAULTS };
}

/** Owns the AudioContext, the mix buses, and the player's sound settings. */
export class GameAudio {
  ctx: AudioContext | null = null;
  settings: AudioSettings = loadSettings();
  private master!: GainNode;
  private sfxBus!: GainNode;
  private reverbIn!: AudioNode;
  protected musicBus!: GainNode;
  private last = new Map<SfxName, number>();
  private listeners = new Set<(s: AudioSettings) => void>();

  /** Creates or resumes the context. Call from a user gesture (browsers block audio before one). */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      this.ctx = ctx;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      comp.attack.value = 0.004;
      comp.release.value = 0.2;
      this.master = ctx.createGain();
      this.master.connect(comp).connect(ctx.destination);
      this.sfxBus = ctx.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus = ctx.createGain();
      this.musicBus.connect(this.master);
      const rev = makeReverb(ctx);
      const revGain = ctx.createGain();
      revGain.gain.value = 0.35;
      rev.output.connect(revGain).connect(this.master);
      this.reverbIn = rev.input;
      this.applySettings();
      this.onUnlock(ctx);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  /** Hook for subclasses (the score) once the context exists. */
  protected onUnlock(ctx: AudioContext) {
    void ctx;
  }

  get reverbSend() {
    return this.reverbIn;
  }

  setSettings(patch: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...patch };
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      // Not persisted; the setting still applies for this visit.
    }
    this.applySettings();
    if (!this.settings.voices && typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    this.listeners.forEach((l) => l(this.settings));
  }

  onSettings(l: (s: AudioSettings) => void) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  protected applySettings() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.settings.sound ? 0.8 : 0, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(0.9, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.settings.music ? 0.5 : 0, t, 0.3);
  }

  sfx(name: SfxName, opts: SfxOpts = {}) {
    const ctx = this.ctx;
    if (!ctx || !this.settings.sound || ctx.state !== "running") return;
    const now = ctx.currentTime;
    const gap = MIN_GAP[name] ?? 0;
    if (gap && now - (this.last.get(name) ?? -1) < gap) return;
    this.last.set(name, now);
    playSfx({ ctx, dry: this.sfxBus, wet: this.reverbIn, t: now + 0.005 }, name, opts);
  }

  dispose() {
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    void this.ctx?.close();
    this.ctx = null;
    this.listeners.clear();
  }
}
