// ============================================================================
// MusicEngine — adaptive procedural soundtrack for Empire Engine.
//
// All synthesis via Web Audio API — no audio files, no external deps.
// Shares the AudioContext with AudioEngine (via getAudioCtx).
//
// Architecture:
//   • Look-ahead scheduler: 25ms interval, 180ms horizon, 16th-note resolution
//   • 6 independent mix layers: pad | bass | melody | arp | perc | tension
//   • Layer gains crossfade smoothly on director-era changes (5 s ramp)
//   • Tension layer (rival threat) uses a C–F# tritone drone + LFO filter
//   • BPM rises with era: 88 → 96 → 104 → 112 → 120
//   • Key: C natural / harmonic minor; loop Cm7 → Fm7 → Ebmaj7 → G7 (4 bars)
//   • Stinger API ducks the main mix and plays a one-shot musical moment
// ============================================================================

import { getAudioCtx } from './AudioEngine';

// ---- Frequency table (Hz, equal temperament) --------------------------------

const HZ = {
  C2:  65.41,  D2:  73.42,  Eb2: 77.78,  F2:  87.31,
  Fs2: 92.50,  G2:  98.00,  Ab2: 103.83, Bb2: 116.54, B2: 123.47,
  C3:  130.81, D3:  146.83, Eb3: 155.56, F3:  174.61,
  G3:  196.00, Ab3: 207.65, Bb3: 233.08, B3:  246.94,
  C4:  261.63, D4:  293.66, Eb4: 311.13, F4:  349.23,
  G4:  392.00, Ab4: 415.30, Bb4: 466.16, B4:  493.88,
  C5:  523.25, D5:  587.33, Eb5: 622.25, F5:  698.46,
  G5:  783.99, Ab5: 830.61, Bb5: 932.33,
};

// ---- Chord loop: Cm7 → Fm7 → Ebmaj7 → G7 -----------------------------------

interface ChordDef { bass: number; pad: number[]; arp: number[] }

const CHORDS: ChordDef[] = [
  // i7  Cm7 — dark home
  { bass: HZ.C2,  pad: [HZ.C3, HZ.Eb3, HZ.G3,  HZ.Bb3], arp: [HZ.C5,  HZ.Eb5, HZ.G5,  HZ.Bb5] },
  // iv7 Fm7 — searching, tension
  { bass: HZ.F2,  pad: [HZ.F3, HZ.Ab3, HZ.C4,  HZ.Eb4], arp: [HZ.F4,  HZ.Ab4, HZ.C5,  HZ.Eb5] },
  // III7 Ebmaj7 — relief, dreaming
  { bass: HZ.Eb2, pad: [HZ.Eb3, HZ.G3,  HZ.Bb3, HZ.D4],  arp: [HZ.Eb5, HZ.G5,  HZ.Bb5, HZ.D5]  },
  // V7  G7 — dominant pull (harmonic minor)
  { bass: HZ.G2,  pad: [HZ.G3,  HZ.B3,  HZ.D4,  HZ.F4],  arp: [HZ.G4,  HZ.B4,  HZ.D5,  HZ.F5]  },
];

// ---- Melody: 4-bar pentatonic hook (64 16th-note steps) --------------------
// null = rest. Pitches from C minor pentatonic + Ab blue note (fits Fm7).

const MEL: (number | null)[] = [
  // Bar 1 — Cm7
  HZ.G4,  null,  null,   null,  HZ.Eb4, null,  null,   null,
  HZ.G4,  null,  HZ.Bb4, null,  HZ.G4,  null,  null,   null,
  // Bar 2 — Fm7
  HZ.F4,  null,  null,   null,  HZ.Ab4, null,  HZ.C5,  null,
  null,   null,  null,   null,  HZ.Bb4, null,  null,   null,
  // Bar 3 — Ebmaj7
  HZ.Bb4, null,  null,   null,  HZ.G4,  null,  null,   null,
  HZ.F4,  null,  null,   null,  HZ.Eb4, null,  null,   null,
  // Bar 4 — G7
  HZ.G4,  null,  null,   null,  null,   null,  HZ.F4,  null,
  HZ.D4,  null,  null,   null,  HZ.G4,  null,  null,   null,
];

// Arp fires every 2 steps (8th-note), cycling through chord.arp[] indices.
const ARP_SEQ = [0, 1, 2, 3, 2, 1, 0, 1];

// Percussion: 16-step bar pattern (K=kick S=snare H=hihat Oh=open-hihat).
type PercHit = 'K' | 'S' | 'H' | 'Oh' | null;
const PERC_BAR: PercHit[] = [
  'K', 'H', null, 'H',  'S', 'H', null,  'H',
  'K', 'H', null, 'H',  'S', 'H', 'Oh',  null,
];

// ---- Era config -------------------------------------------------------------

const ERA_BPM: Record<string, number> = {
  BOOTSTRAPPING: 88, GROWING: 96, SCALING: 104, ESTABLISHED: 112, TITAN: 120,
};

interface EraGains { pad: number; bass: number; melody: number; arp: number; perc: number }
const ERA_GAINS: Record<string, EraGains> = {
  BOOTSTRAPPING: { pad: 0.55, bass: 0.00, melody: 0.00, arp: 0.00, perc: 0.00 },
  GROWING:       { pad: 0.55, bass: 0.62, melody: 0.00, arp: 0.00, perc: 0.00 },
  SCALING:       { pad: 0.50, bass: 0.70, melody: 0.58, arp: 0.00, perc: 0.48 },
  ESTABLISHED:   { pad: 0.48, bass: 0.80, melody: 0.66, arp: 0.50, perc: 0.68 },
  TITAN:         { pad: 0.52, bass: 0.88, melody: 0.74, arp: 0.66, perc: 0.82 },
};

// ---- Module state -----------------------------------------------------------

let _master: GainNode | null = null;
let _layers: Record<keyof EraGains | 'tension', GainNode> | null = null;
let _tensionOscs: [OscillatorNode, OscillatorNode] | null = null;
let _noise: AudioBuffer | null = null;
let _enabled = true;
let _era = 'BOOTSTRAPPING';
let _stepDur = 60 / ERA_BPM.BOOTSTRAPPING / 4;
let _schedulerTimer = 0;
let _nextStepTime = 0;
let _currentStep = 0;

const TOTAL_STEPS = 64;   // 4 bars × 16 steps
const LOOK_AHEAD  = 0.18; // seconds ahead to schedule
const SCHED_MS    = 25;   // ms between scheduler ticks
const BASE_VOL    = 0.24; // master gain (undipped)

// ---- Noise buffer -----------------------------------------------------------

function ensureNoise(ac: AudioContext): AudioBuffer {
  if (_noise) return _noise;
  const len = ac.sampleRate * 2;
  _noise = ac.createBuffer(1, len, ac.sampleRate);
  const d = _noise.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return _noise;
}

// ---- Audio graph ------------------------------------------------------------

function buildGraph(ac: AudioContext) {
  if (_layers) return;
  _master = ac.createGain();
  _master.gain.value = BASE_VOL;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -10; comp.ratio.value = 8;
  comp.attack.value = 0.004; comp.release.value = 0.1;
  _master.connect(comp);
  comp.connect(ac.destination);

  const mk = (v: number) => { const g = ac.createGain(); g.gain.value = v; g.connect(_master!); return g; };
  const init = ERA_GAINS.BOOTSTRAPPING;
  _layers = {
    pad:     mk(init.pad),
    bass:    mk(init.bass),
    melody:  mk(init.melody),
    arp:     mk(init.arp),
    perc:    mk(init.perc),
    tension: mk(0),
  };
}

function startTensionLayer(ac: AudioContext) {
  if (_tensionOscs || !_layers) return;
  const dest = _layers.tension;

  const filt = ac.createBiquadFilter();
  filt.type = 'lowpass'; filt.frequency.value = 180; filt.Q.value = 4;
  filt.connect(dest);

  // Slow LFO on filter cutoff — gives the drone a breathing, organic quality.
  const lfo = ac.createOscillator();
  const lfoG = ac.createGain();
  lfo.frequency.value = 0.14; lfoG.gain.value = 32;
  lfo.connect(lfoG); lfoG.connect(filt.frequency);
  lfo.start();

  const o1 = ac.createOscillator();
  const o2 = ac.createOscillator();
  o1.type = 'sawtooth'; o1.frequency.value = HZ.C2;
  o2.type = 'sawtooth'; o2.frequency.value = HZ.Fs2; // tritone = maximum tension
  o1.connect(filt); o2.connect(filt);
  o1.start(); o2.start();
  _tensionOscs = [o1, o2];
}

// ---- Synthesis helpers ------------------------------------------------------

function synthPad(ac: AudioContext, dest: AudioNode, freqs: number[], t: number, dur: number) {
  const peak = 0.18 / (freqs.length * 3);
  freqs.forEach(freq => {
    ([-7, 0, 7] as const).forEach(detune => {
      const osc = ac.createOscillator();
      const flt = ac.createBiquadFilter();
      const g = ac.createGain();
      osc.type = 'sawtooth'; osc.frequency.value = freq; osc.detune.value = detune;
      flt.type = 'lowpass'; flt.frequency.value = 860; flt.Q.value = 0.5;
      const atk = Math.min(1.4, dur * 0.28);
      const rel = Math.min(0.9, dur * 0.22);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + atk);
      g.gain.setValueAtTime(peak, t + dur - rel);
      g.gain.linearRampToValueAtTime(0, t + dur + 0.05);
      osc.connect(flt); flt.connect(g); g.connect(dest);
      osc.start(t); osc.stop(t + dur + 0.1);
    });
  });
}

function synthBass(ac: AudioContext, dest: AudioNode, freq: number, t: number, dur: number, vel = 1.0) {
  const osc = ac.createOscillator();
  const flt = ac.createBiquadFilter();
  const g = ac.createGain();
  osc.type = 'sawtooth'; osc.frequency.value = freq;
  flt.type = 'lowpass';
  flt.frequency.setValueAtTime(2200, t);
  flt.frequency.exponentialRampToValueAtTime(480, t + 0.055);
  flt.Q.value = 3.5;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.78 * vel, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.42 * vel, t + 0.1);
  g.gain.setValueAtTime(0.42 * vel, t + dur - 0.04);
  g.gain.linearRampToValueAtTime(0, t + dur);
  osc.connect(flt); flt.connect(g); g.connect(dest);
  osc.start(t); osc.stop(t + dur + 0.05);
}

function synthTri(ac: AudioContext, dest: AudioNode, freq: number, t: number, dur: number, peak = 0.6) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'triangle'; osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.014);
  g.gain.setValueAtTime(peak, t + dur - 0.03);
  g.gain.linearRampToValueAtTime(0, t + dur + 0.02);
  osc.connect(g); g.connect(dest);
  osc.start(t); osc.stop(t + dur + 0.05);
}

function synthSine(ac: AudioContext, dest: AudioNode, freq: number, t: number, dur: number, peak = 0.5) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'sine'; osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.008);
  g.gain.exponentialRampToValueAtTime(peak * 0.3, t + dur * 0.7);
  g.gain.linearRampToValueAtTime(0, t + dur);
  osc.connect(g); g.connect(dest);
  osc.start(t); osc.stop(t + dur + 0.02);
}

function synthKick(ac: AudioContext, dest: AudioNode, t: number) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(165, t);
  osc.frequency.exponentialRampToValueAtTime(38, t + 0.13);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.88, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  osc.connect(g); g.connect(dest);
  osc.start(t); osc.stop(t + 0.36);
}

function synthSnare(ac: AudioContext, dest: AudioNode, t: number) {
  const nb = ensureNoise(ac);
  // Noise body
  const ns = ac.createBufferSource(); ns.buffer = nb;
  const nf = ac.createBiquadFilter();
  nf.type = 'bandpass'; nf.frequency.value = 2200; nf.Q.value = 0.9;
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.22, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  ns.connect(nf); nf.connect(ng); ng.connect(dest);
  ns.start(t); ns.stop(t + 0.22);
  // Tonal crack
  const osc = ac.createOscillator();
  const og = ac.createGain();
  osc.type = 'triangle'; osc.frequency.value = 200;
  og.gain.setValueAtTime(0.32, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  osc.connect(og); og.connect(dest);
  osc.start(t); osc.stop(t + 0.1);
}

function synthHat(ac: AudioContext, dest: AudioNode, t: number, open: boolean) {
  const nb = ensureNoise(ac);
  const ns = ac.createBufferSource(); ns.buffer = nb;
  const hf = ac.createBiquadFilter();
  hf.type = 'highpass'; hf.frequency.value = 8500;
  const hg = ac.createGain();
  const dur = open ? 0.13 : 0.038;
  hg.gain.setValueAtTime(0.18, t);
  hg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  ns.connect(hf); hf.connect(hg); hg.connect(dest);
  ns.start(t); ns.stop(t + dur + 0.01);
}

// ---- Melody duration: gap to the next non-null note (wraps) -----------------

function melDur(step: number, sd: number): number {
  for (let i = 1; i <= 8; i++) {
    if (MEL[(step + i) % TOTAL_STEPS] !== null) return Math.min(i, 4) * sd * 0.88;
  }
  return sd * 2;
}

// ---- Scheduler --------------------------------------------------------------

function scheduleStep(step: number, t: number) {
  const ac = getAudioCtx();
  if (!ac || !_layers) return;
  const sd = _stepDur;
  const ci = Math.floor(step / 16) % 4; // chord index (0-3)
  const chord = CHORDS[ci];
  const si = step % 16; // step within bar

  // PAD: trigger on every new bar (step 0 within bar)
  if (si === 0) synthPad(ac, _layers.pad, chord.pad, t, sd * 17);

  // BASS: strong beat (si=0), mid beat (si=8), approach pickup (si=14)
  if (si === 0) {
    synthBass(ac, _layers.bass, chord.bass, t, sd * 3.5, 0.88);
  } else if (si === 8) {
    synthBass(ac, _layers.bass, chord.bass * 2, t, sd * 3.0, 0.72);
  } else if (si === 14) {
    const next = CHORDS[(ci + 1) % 4];
    synthBass(ac, _layers.bass, next.bass * 2, t, sd * 1.3, 0.52);
  }

  // MELODY
  const mf = MEL[step];
  if (mf !== null) synthTri(ac, _layers.melody, mf, t, melDur(step, sd), 0.60);

  // ARP: every 2 steps (8th-note grid)
  if (step % 2 === 0) {
    const af = chord.arp[ARP_SEQ[Math.floor(si / 2) % ARP_SEQ.length]];
    if (af) synthSine(ac, _layers.arp, af, t, sd * 1.7, 0.48);
  }

  // PERCUSSION
  const ph = PERC_BAR[si];
  if (ph === 'K')  synthKick(ac, _layers.perc, t);
  if (ph === 'S')  synthSnare(ac, _layers.perc, t);
  if (ph === 'H')  synthHat(ac, _layers.perc, t, false);
  if (ph === 'Oh') synthHat(ac, _layers.perc, t, true);
}

function runScheduler() {
  const ac = getAudioCtx();
  if (!ac || !_enabled) return;
  if (ac.state === 'suspended') { void ac.resume(); return; }
  const horizon = ac.currentTime + LOOK_AHEAD;
  while (_nextStepTime < horizon) {
    scheduleStep(_currentStep, _nextStepTime);
    _currentStep = (_currentStep + 1) % TOTAL_STEPS;
    _nextStepTime += _stepDur;
  }
}

// ---- Engine start / stop ----------------------------------------------------

function startEngine() {
  if (_schedulerTimer) return;
  const ac = getAudioCtx();
  if (!ac) return;
  buildGraph(ac);
  startTensionLayer(ac);
  _nextStepTime = ac.currentTime + 0.14;
  _currentStep = 0;
  _schedulerTimer = window.setInterval(runScheduler, SCHED_MS);
}

function stopEngine() {
  if (_schedulerTimer) { window.clearInterval(_schedulerTimer); _schedulerTimer = 0; }
  if (_tensionOscs) {
    _tensionOscs.forEach(o => { try { o.stop(); } catch { /* already gone */ } });
    _tensionOscs = null;
  }
  const ac = getAudioCtx();
  if (ac && _master) {
    const t = ac.currentTime;
    _master.gain.cancelScheduledValues(t);
    _master.gain.setValueAtTime(_master.gain.value, t);
    _master.gain.linearRampToValueAtTime(0, t + 1.5);
  }
}

// ---- Stingers ---------------------------------------------------------------

export type StingerKind = 'prestige' | 'milestone' | 'era' | 'threat';

function playStinger(ac: AudioContext, kind: StingerKind) {
  if (!_layers) return;
  const dest = _layers.melody;
  const t = ac.currentTime + 0.06;
  switch (kind) {
    case 'prestige': {
      // 5-note rising climax → rich chord sustain
      [HZ.C4, HZ.Eb4, HZ.G4, HZ.Bb4, HZ.C5].forEach((f, i) =>
        synthTri(ac, dest, f, t + i * 0.28, 0.55, 0.62)
      );
      CHORDS[0].pad.forEach(f => synthTri(ac, dest, f * 2, t + 1.55, 2.4, 0.38));
      break;
    }
    case 'era': {
      // Low brass-like power swell
      synthBass(ac, dest, HZ.C3, t, 2.0, 0.55);
      synthTri(ac, dest, HZ.G3, t + 0.26, 1.6, 0.44);
      synthTri(ac, dest, HZ.C4, t + 0.62, 1.2, 0.38);
      break;
    }
    case 'milestone': {
      // Bright ascending 4-note fanfare
      [HZ.G4, HZ.C5, HZ.Eb5, HZ.G5].forEach((f, i) =>
        synthTri(ac, dest, f, t + i * 0.11, 0.58, 0.55)
      );
      break;
    }
    case 'threat': {
      // Dissonant tritone stab — pure danger
      synthTri(ac, dest, HZ.C4, t,        0.7, 0.55);
      synthTri(ac, dest, HZ.Fs2 * 8, t + 0.08, 0.52, 0.42); // F#5
      break;
    }
  }
}

// ---- Public API -------------------------------------------------------------

export type { StingerKind as MusicStingerKind };

export const music = {
  start() {
    if (!_enabled) return;
    startEngine();
  },

  stop() {
    stopEngine();
  },

  setEnabled(on: boolean) {
    _enabled = on;
    if (!on) {
      stopEngine();
    } else {
      const ac = getAudioCtx();
      if (ac) {
        // Restore master before re-starting so it doesn't re-fade from 0.
        if (_master) {
          _master.gain.cancelScheduledValues(ac.currentTime);
          _master.gain.setValueAtTime(BASE_VOL, ac.currentTime);
        }
        startEngine();
      }
    }
  },

  isEnabled() { return _enabled; },

  /**
   * Called periodically with a lightweight game-state snapshot.
   * Updates BPM step duration and crossfades layer gains on era changes.
   * Also adjusts tension (rival threat) and master brightness (market boom).
   */
  updateState(snapshot: {
    era: string;
    rivalThreat: number; // 0 = no threat, 1 = maximum
    marketBoom: boolean;
  }) {
    const { era, rivalThreat, marketBoom } = snapshot;
    const safeEra = era in ERA_GAINS ? era : 'BOOTSTRAPPING';

    if (safeEra !== _era) {
      _era = safeEra;
      _stepDur = 60 / (ERA_BPM[safeEra] ?? 88) / 4;
      const ac = getAudioCtx();
      if (ac && _layers) {
        const targets = ERA_GAINS[safeEra];
        const t = ac.currentTime;
        (Object.entries(targets) as [keyof EraGains, number][]).forEach(([k, v]) => {
          const g = (_layers as Record<string, GainNode>)[k];
          if (!g) return;
          g.gain.cancelScheduledValues(t);
          g.gain.setValueAtTime(g.gain.value, t);
          g.gain.linearRampToValueAtTime(v, t + 5.0);
        });
      }
    }

    // Tension layer: fade in with rival threat
    const ac2 = getAudioCtx();
    if (ac2 && _layers) {
      const targetTension = Math.min(1, rivalThreat) * 0.42;
      const t2 = ac2.currentTime;
      _layers.tension.gain.cancelScheduledValues(t2);
      _layers.tension.gain.setValueAtTime(_layers.tension.gain.value, t2);
      _layers.tension.gain.linearRampToValueAtTime(targetTension, t2 + 4.0);
    }

    // Market boom: small brightness nudge on master
    if (_master) {
      const acm = getAudioCtx();
      if (acm) {
        const target = marketBoom ? BASE_VOL * 1.18 : BASE_VOL;
        const tm = acm.currentTime;
        _master.gain.cancelScheduledValues(tm);
        _master.gain.setValueAtTime(_master.gain.value, tm);
        _master.gain.linearRampToValueAtTime(target, tm + 3.5);
      }
    }
  },

  /**
   * Duck music to ~6% of normal for `durationSec` seconds, then restore.
   * Used automatically by sting(); also callable for story beats.
   */
  duck(durationSec: number) {
    const ac = getAudioCtx();
    if (!ac || !_master || !_enabled) return;
    const t = ac.currentTime;
    _master.gain.cancelScheduledValues(t);
    _master.gain.setValueAtTime(_master.gain.value, t);
    _master.gain.linearRampToValueAtTime(BASE_VOL * 0.06, t + 0.28);
    const hold = Math.max(0.5, durationSec - 0.65);
    _master.gain.setValueAtTime(BASE_VOL * 0.06, t + hold);
    _master.gain.linearRampToValueAtTime(BASE_VOL, t + durationSec + 0.75);
  },

  /** Play a one-shot musical stinger; ducks the main mix for its duration. */
  sting(kind: StingerKind) {
    const ac = getAudioCtx();
    if (!ac || !_enabled) return;
    const durations: Record<StingerKind, number> = {
      prestige: 9, era: 5, milestone: 3, threat: 2.5,
    };
    music.duck(durations[kind]);
    playStinger(ac, kind);
  },
};
