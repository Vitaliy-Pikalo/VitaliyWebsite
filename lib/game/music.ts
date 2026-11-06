// An original score in D dorian, synthesized live. Explore: slow pads, bass, and a lute
// melody. Battle: war drums, a bass ostinato, brass stabs, and a horn line. Modes crossfade,
// and victory and defeat get their own stingers.

export type MusicMode = "off" | "explore" | "battle" | "victory" | "defeat";

type Ev =
  | { k: "pad"; b: number; notes: number[]; dur: number }
  | { k: "bass"; b: number; n: number; dur: number }
  | { k: "lute"; b: number; n: number; dur: number }
  | { k: "horn"; b: number; n: number; dur: number }
  | { k: "stab"; b: number; notes: number[] }
  | { k: "tom"; b: number; accent: boolean }
  | { k: "rim"; b: number };

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/* ------------------------------------------------------------ composition */

// Chord voicings (MIDI). Dm, C, Bb, F, A.
const CH = {
  Dm: [50, 57, 62, 65],
  C: [48, 55, 60, 64],
  Bb: [46, 53, 58, 62],
  F: [41, 53, 57, 60],
  A: [45, 52, 57, 61],
};
type Chord = keyof typeof CH;

// Explore: 16 bars, two chords per 4 bars. Melody as [bar, beat, midi, beats].
const EXPLORE_CHORDS: Chord[] = ["Dm", "C", "Bb", "C", "Bb", "F", "C", "Dm"];
const EXPLORE_MELODY: [number, number, number, number][] = [
  [0, 0, 69, 1.5], [0, 1.5, 65, 0.5], [0, 2, 62, 1], [0, 3, 64, 1],
  [1, 0, 65, 1], [1, 1, 67, 1], [1, 2, 69, 2],
  [2, 0, 67, 1.5], [2, 1.5, 64, 0.5], [2, 2, 60, 1], [2, 3, 64, 1],
  [3, 0, 67, 3],
  [4, 0, 65, 1], [4, 1, 62, 1], [4, 2, 65, 1], [4, 3, 67, 1],
  [5, 0, 69, 2], [5, 2, 65, 2],
  [6, 0, 64, 1], [6, 1, 67, 1], [6, 2, 72, 1.5], [6, 3.5, 69, 0.5],
  [7, 0, 67, 2], [7, 2, 64, 1],
  [8, 0, 74, 1.5], [8, 1.5, 72, 0.5], [8, 2, 69, 1], [8, 3, 65, 1],
  [9, 0, 67, 1], [9, 1, 69, 1], [9, 2, 70, 2],
  [10, 0, 69, 1.5], [10, 1.5, 67, 0.5], [10, 2, 65, 1], [10, 3, 69, 1],
  [11, 0, 72, 3],
  [12, 0, 76, 1], [12, 1, 74, 1], [12, 2, 72, 1], [12, 3, 67, 1],
  [13, 0, 64, 2], [13, 2, 67, 2],
  [14, 0, 65, 1], [14, 1, 64, 1], [14, 2, 62, 1], [14, 3, 57, 1],
  [15, 0, 62, 3],
];

function exploreLoop(withMelody: boolean): Ev[] {
  const ev: Ev[] = [];
  EXPLORE_CHORDS.forEach((c, i) => {
    const b = i * 8;
    ev.push({ k: "pad", b, notes: CH[c].slice(1), dur: 8 });
    ev.push({ k: "bass", b, n: CH[c][0] - 12, dur: 3.5 });
    ev.push({ k: "bass", b: b + 4, n: CH[c][0] - 12, dur: 3.5 });
    if (!withMelody) {
      // A rolling arpeggio instead of the tune on alternate passes.
      const arp = [CH[c][1], CH[c][2], CH[c][3], CH[c][2] + 12, CH[c][3], CH[c][2]];
      arp.forEach((n, j) => ev.push({ k: "lute", b: b + j * 1.25, n, dur: 1 }));
    }
  });
  if (withMelody) for (const [bar, beat, n, dur] of EXPLORE_MELODY) ev.push({ k: "lute", b: bar * 4 + beat, n, dur });
  return ev;
}

// Battle: 8 bars, one chord per bar.
const BATTLE_CHORDS: Chord[] = ["Dm", "Dm", "Bb", "C", "Dm", "Dm", "Bb", "A"];
const BATTLE_HORN: [number, number, number, number][] = [
  [0, 0, 62, 1], [0, 1, 65, 0.5], [0, 1.5, 69, 1.5], [0, 3, 67, 1],
  [1, 0, 65, 1], [1, 1, 64, 1], [1, 2, 62, 2],
  [2, 0, 62, 1], [2, 1, 65, 0.5], [2, 1.5, 70, 1.5], [2, 3, 69, 1],
  [3, 0, 67, 2], [3, 2, 64, 2],
  [4, 0, 69, 1], [4, 1, 72, 0.5], [4, 1.5, 74, 1.5], [4, 3, 72, 1],
  [5, 0, 69, 1], [5, 1, 67, 1], [5, 2, 65, 2],
  [6, 0, 65, 1], [6, 1, 67, 1], [6, 2, 70, 2],
  [7, 0, 64, 1], [7, 1, 61, 1], [7, 2, 57, 2],
];
const OSTINATO = [0, 0, 12, 0, 7, 0, 12, 7];

function battleLoop(withHorn: boolean): Ev[] {
  const ev: Ev[] = [];
  BATTLE_CHORDS.forEach((c, i) => {
    const b = i * 4;
    const root = CH[c][0] - 12;
    OSTINATO.forEach((o, j) => ev.push({ k: "bass", b: b + j * 0.5, n: root + o, dur: 0.45 }));
    ev.push({ k: "stab", b, notes: CH[c].slice(1) });
    if (i % 2 === 1) ev.push({ k: "stab", b: b + 2.5, notes: CH[c].slice(1) });
    ev.push({ k: "tom", b, accent: true });
    ev.push({ k: "tom", b: b + 1.5, accent: false });
    ev.push({ k: "tom", b: b + 2, accent: true });
    ev.push({ k: "tom", b: b + 3, accent: false });
    if (i % 2 === 1) ev.push({ k: "tom", b: b + 3.5, accent: false });
    ev.push({ k: "rim", b: b + 1 }, { k: "rim", b: b + 3 });
    ev.push({ k: "pad", b, notes: CH[c].slice(1), dur: 4 });
  });
  if (withHorn) for (const [bar, beat, n, dur] of BATTLE_HORN) ev.push({ k: "horn", b: bar * 4 + beat, n, dur });
  return ev;
}

export const PATTERNS = {
  explore: { bpm: 74, beats: 64, loops: [exploreLoop(true), exploreLoop(false)] },
  battle: { bpm: 104, beats: 32, loops: [battleLoop(false), battleLoop(true), battleLoop(true), battleLoop(false)] },
};

/* ------------------------------------------------------------ instruments */

type Out = { ctx: BaseAudioContext; out: AudioNode; wet: AudioNode };

function voice(o: Out, t: number, wetAmt: number) {
  const g = o.ctx.createGain();
  g.connect(o.out);
  if (wetAmt) {
    const s = o.ctx.createGain();
    s.gain.value = wetAmt;
    g.connect(s).connect(o.wet);
  }
  void t;
  return g;
}

function pad(o: Out, t: number, notes: number[], dur: number) {
  const g = voice(o, t, 0.6);
  const f = o.ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(500, t);
  f.frequency.linearRampToValueAtTime(950, t + dur * 0.5);
  f.frequency.linearRampToValueAtTime(600, t + dur);
  f.Q.value = 0.5;
  f.connect(g);
  const attack = Math.min(1.2, dur * 0.3);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.045, t + attack);
  g.gain.setValueAtTime(0.045, t + dur - 0.1);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.2);
  for (const n of notes) {
    for (const det of [-7, 7]) {
      const osc = o.ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = hz(n);
      osc.detune.value = det;
      osc.connect(f);
      osc.start(t);
      osc.stop(t + dur + 1.3);
    }
  }
}

function bass(o: Out, t: number, n: number, dur: number, battle: boolean) {
  const g = voice(o, t, 0);
  const osc = o.ctx.createOscillator();
  osc.type = battle ? "sawtooth" : "triangle";
  osc.frequency.value = hz(n);
  const f = o.ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(battle ? 700 : 400, t);
  f.frequency.exponentialRampToValueAtTime(battle ? 220 : 300, t + dur);
  osc.connect(f).connect(g);
  const peak = battle ? 0.1 : 0.16;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
  g.gain.exponentialRampToValueAtTime(peak * 0.5, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
  osc.start(t);
  osc.stop(t + dur + 0.1);
}

/** Plucked lute: bright attack, quick decay, a little body resonance. */
function lute(o: Out, t: number, n: number, dur: number) {
  const g = voice(o, t, 0.45);
  const f = o.ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(4200, t);
  f.frequency.exponentialRampToValueAtTime(900, t + 0.4);
  f.connect(g);
  for (const [mult, amp, type] of [[1, 1, "triangle"], [2, 0.3, "sine"], [3, 0.12, "sine"]] as [number, number, OscillatorType][]) {
    const osc = o.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = hz(n) * mult;
    const og = o.ctx.createGain();
    og.gain.value = amp;
    osc.connect(og).connect(f);
    osc.start(t);
    osc.stop(t + dur + 1.6);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.13, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.04, t + 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.6, dur) + 1.2);
}

function horn(o: Out, t: number, n: number, dur: number) {
  const g = voice(o, t, 0.4);
  const f = o.ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(400, t);
  f.frequency.linearRampToValueAtTime(1700, t + 0.12);
  f.frequency.linearRampToValueAtTime(1100, t + dur);
  f.connect(g);
  const vib = o.ctx.createOscillator();
  vib.frequency.value = 5.2;
  const vibAmt = o.ctx.createGain();
  vibAmt.gain.setValueAtTime(0, t);
  vibAmt.gain.linearRampToValueAtTime(9, t + Math.min(0.6, dur));
  vib.connect(vibAmt);
  for (const det of [-5, 5]) {
    const osc = o.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = hz(n);
    osc.detune.value = det;
    vibAmt.connect(osc.detune);
    osc.connect(f);
    osc.start(t);
    osc.stop(t + dur + 0.4);
  }
  vib.start(t);
  vib.stop(t + dur + 0.4);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.07, t + 0.06);
  g.gain.setValueAtTime(0.07, t + Math.max(0.07, dur - 0.08));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.3);
}

function stab(o: Out, t: number, notes: number[]) {
  const g = voice(o, t, 0.35);
  const f = o.ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(1800, t);
  f.frequency.exponentialRampToValueAtTime(400, t + 0.45);
  f.connect(g);
  for (const n of notes) {
    const osc = o.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = hz(n);
    osc.connect(f);
    osc.start(t);
    osc.stop(t + 0.6);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.05, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
}

const drumNoise = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuf(ctx: BaseAudioContext) {
  let b = drumNoise.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    drumNoise.set(ctx, b);
  }
  return b;
}

/** Big skin drum: pitched thump plus a short burst of filtered noise. */
function tom(o: Out, t: number, accent: boolean) {
  const g = voice(o, t, 0.3);
  const osc = o.ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(accent ? 105 : 125, t);
  osc.frequency.exponentialRampToValueAtTime(48, t + 0.35);
  const og = o.ctx.createGain();
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(accent ? 0.42 : 0.26, t + 0.004);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  osc.connect(og).connect(g);
  osc.start(t);
  osc.stop(t + 0.55);
  const src = o.ctx.createBufferSource();
  src.buffer = noiseBuf(o.ctx);
  const f = o.ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 900;
  const ng = o.ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(accent ? 0.18 : 0.1, t + 0.003);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  src.connect(f).connect(ng).connect(g);
  src.start(t, Math.random() * 0.5);
  src.stop(t + 0.15);
}

function rim(o: Out, t: number) {
  const g = voice(o, t, 0.2);
  const src = o.ctx.createBufferSource();
  src.buffer = noiseBuf(o.ctx);
  const f = o.ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 1900;
  f.Q.value = 2;
  src.connect(f).connect(g);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  src.start(t, Math.random() * 0.5);
  src.stop(t + 0.1);
}

function play(o: Out, e: Ev, t: number, spb: number, battle: boolean) {
  switch (e.k) {
    case "pad":
      return pad(o, t, e.notes, e.dur * spb);
    case "bass":
      return bass(o, t, e.n, e.dur * spb, battle);
    case "lute":
      return lute(o, t, e.n, e.dur * spb);
    case "horn":
      return horn(o, t, e.n, e.dur * spb);
    case "stab":
      return stab(o, t, e.notes);
    case "tom":
      return tom(o, t, e.accent);
    case "rim":
      return rim(o, t);
  }
}

/**
 * Schedules every event of `mode` whose beat falls in [fromBeat, toBeat), counting beats
 * from t0 across loop repeats. Shared by the live scheduler and offline rendering.
 */
export function scheduleBeats(o: Out, mode: "explore" | "battle", fromBeat: number, toBeat: number, t0: number) {
  const p = PATTERNS[mode];
  const spb = 60 / p.bpm;
  const battle = mode === "battle";
  for (let loopStart = Math.floor(fromBeat / p.beats) * p.beats; loopStart < toBeat; loopStart += p.beats) {
    const loop = p.loops[(loopStart / p.beats) % p.loops.length];
    for (const e of loop) {
      const beat = loopStart + e.b;
      if (beat >= fromBeat && beat < toBeat) play(o, e, t0 + beat * spb, spb, battle);
    }
  }
}

/** Victory: a D-major fanfare over a timpani roll. Defeat: a falling line into a low drone. */
export function playStinger(o: Out, kind: "victory" | "defeat", t: number) {
  if (kind === "victory") {
    for (let i = 0; i < 10; i++) tom(o, t + i * 0.06, i === 9);
    const line: [number, number, number][] = [[62, 0.6, 0.25], [66, 0.85, 0.25], [69, 1.1, 0.25], [74, 1.35, 1.6]];
    for (const [n, at, d] of line) horn(o, t + at, n, d);
    pad(o, t + 1.35, [62, 66, 69, 74], 2.4);
    bass(o, t + 1.35, 38, 2.2, false);
    for (const [n, at] of [[74, 1.6], [78, 1.8], [81, 2.0], [86, 2.3]] as [number, number][]) lute(o, t + at, n, 0.8);
    return 4.2;
  }
  const line: [number, number, number][] = [[69, 0, 0.6], [65, 0.6, 0.6], [62, 1.2, 0.6], [61, 1.8, 1.8]];
  for (const [n, at, d] of line) horn(o, t + at, n, d);
  pad(o, t, [50, 53, 57], 3.2);
  bass(o, t + 1.8, 38, 2.5, false);
  tom(o, t + 1.8, true);
  return 4.5;
}

/* -------------------------------------------------------------- scheduler */

const LOOKAHEAD = 0.3; // seconds of music scheduled ahead
const TICK = 60; // ms between scheduler runs

/** Live player: a lookahead scheduler with one bus per mode for crossfades. */
export class Score {
  private buses: Record<"explore" | "battle" | "stinger", GainNode>;
  private mode: MusicMode = "off";
  private beat = 0;
  private t0 = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private ctx: AudioContext,
    out: AudioNode,
    private wet: AudioNode,
  ) {
    const mk = () => {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(out);
      return g;
    };
    this.buses = { explore: mk(), battle: mk(), stinger: mk() };
  }

  get current() {
    return this.mode;
  }

  setMode(mode: MusicMode) {
    if (mode === this.mode) return;
    const now = this.ctx.currentTime;
    const prev = this.mode;
    this.mode = mode;
    for (const [k, bus] of Object.entries(this.buses)) {
      const on = k === mode || (k === "stinger" && (mode === "victory" || mode === "defeat"));
      bus.gain.cancelScheduledValues(now);
      bus.gain.setTargetAtTime(on ? 1 : 0, now, on ? 0.4 : prev === "explore" && mode === "battle" ? 0.15 : 0.6);
    }
    if (mode === "explore" || mode === "battle") {
      // Start the new pattern from its top, just ahead of now.
      this.beat = 0;
      this.t0 = now + 0.12;
      this.start();
    } else {
      this.stop();
      if (mode === "victory" || mode === "defeat") {
        playStinger({ ctx: this.ctx, out: this.buses.stinger, wet: this.wet }, mode, now + 0.15);
      }
    }
  }

  private start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), TICK);
    this.tick();
  }

  private stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private tick() {
    const mode = this.mode;
    if (mode !== "explore" && mode !== "battle") return;
    const spb = 60 / PATTERNS[mode].bpm;
    const until = this.ctx.currentTime + LOOKAHEAD;
    // If the tab was throttled and we fell behind, skip ahead instead of bursting notes.
    const behind = (this.ctx.currentTime - (this.t0 + this.beat * spb)) / spb;
    if (behind > 1) this.beat += Math.ceil(behind);
    const toBeat = (until - this.t0) / spb;
    if (toBeat <= this.beat) return;
    const next = Math.ceil(toBeat * 4) / 4; // schedule in sixteenths
    scheduleBeats({ ctx: this.ctx, out: this.buses[mode], wet: this.wet }, mode, this.beat, next, this.t0);
    this.beat = next;
  }

  dispose() {
    this.stop();
  }
}
