// ============================================================================
// AudioEngine — fully procedural sound, zero audio files.
//
// Every effect is synthesized on the fly with the Web Audio API: oscillators +
// gain envelopes + a touch of filtering. That keeps the bundle tiny, themes the
// sound to the moment, and means there are no assets to ship or license.
//
// Design:
//   • Lazy AudioContext — created on the first play() call, which is always
//     downstream of a user gesture (a tap), so autoplay policy is satisfied.
//   • One shared master gain kept low (gentle, never harsh) with a soft limiter
//     via a DynamicsCompressor so stacked SFX during a buy-spree don't clip.
//   • A global `enabled` flag mirrors the Settings "Sound effects" switch; while
//     off, play() returns immediately and never touches the context.
//   • Voices are tiny note/blip/sweep/chord builders sharing one envelope helper.
//
// Public API:
//   sfx.setEnabled(on)         // sync from settings.sound
//   sfx.play('buy')            // fire a named effect
//   sfx.resume()               // nudge the context after a gesture (optional)
// ============================================================================

export type Sfx =
  | 'tap'
  | 'buy'
  | 'buyBig'
  | 'sell'
  | 'levelup'
  | 'research'
  | 'milestone'
  | 'era'
  | 'prestige'
  | 'error'
  | 'toggle'
  | 'tierUnlock'
  | 'rivalAlert'
  | 'echelonUp'
  | 'companionUp'
  | 'fanfare';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let lastAt = 0; // throttle identical rapid triggers

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.16;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 12;
    comp.attack.value = 0.003;
    comp.release.value = 0.18;
    master.connect(comp);
    comp.connect(ctx.destination);
  }
  return ctx;
}

/** One enveloped oscillator note. t is the start offset from "now" in seconds. */
function note(
  ac: AudioContext,
  freq: number,
  t: number,
  dur: number,
  type: OscillatorType,
  peak: number,
  glideTo?: number
) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  const start = ac.currentTime + t;
  osc.frequency.setValueAtTime(freq, start);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), start + dur);
  // Fast attack, exponential-ish decay for a plucky, satisfying body.
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g);
  g.connect(master as GainNode);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

// Note frequencies (equal temperament) for arpeggios/chords.
const N = {
  C4: 261.63,
  E4: 329.63,
  G4: 392.0,
  A4: 440.0,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  C6: 1046.5,
};

/** Expose the shared AudioContext so MusicEngine can attach its own sub-graph. */
export function getAudioCtx(): AudioContext | null {
  return ensure();
}

function render(ac: AudioContext, name: Sfx) {
  switch (name) {
    case 'tap':
      note(ac, 320, 0, 0.05, 'triangle', 0.5);
      break;
    case 'toggle':
      note(ac, 440, 0, 0.05, 'square', 0.35, 560);
      break;
    case 'buy':
      // Plucky two-tone confirm.
      note(ac, 300, 0, 0.07, 'triangle', 0.6, 360);
      note(ac, 600, 0.02, 0.09, 'sine', 0.4);
      break;
    case 'buyBig':
      note(ac, 200, 0, 0.1, 'sawtooth', 0.45, 300);
      note(ac, N.C5, 0.03, 0.12, 'triangle', 0.5);
      note(ac, N.E5, 0.06, 0.12, 'sine', 0.35);
      break;
    case 'sell':
      note(ac, N.C5, 0, 0.08, 'sine', 0.5);
      note(ac, N.G5, 0.05, 0.1, 'sine', 0.4);
      break;
    case 'research':
      note(ac, N.A4, 0, 0.1, 'sine', 0.4, N.C5);
      note(ac, N.E5, 0.08, 0.14, 'triangle', 0.35);
      break;
    case 'levelup':
      [N.C5, N.E5, N.G5].forEach((f, i) => note(ac, f, i * 0.06, 0.16, 'triangle', 0.45));
      break;
    case 'milestone':
      // Bright ascending fanfare with a sparkle tail.
      [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => note(ac, f, i * 0.07, 0.22, 'triangle', 0.5));
      note(ac, N.G5, 0.3, 0.3, 'sine', 0.3);
      break;
    case 'prestige':
      // Deep swell then rising shimmer — a "rebirth".
      note(ac, 110, 0, 0.5, 'sawtooth', 0.35, 220);
      [N.C4, N.G4, N.C5, N.E5, N.G5].forEach((f, i) =>
        note(ac, f, 0.12 + i * 0.08, 0.4, 'triangle', 0.32)
      );
      break;
    case 'era':
      // Low brass-ish horn swell to mark an era change.
      note(ac, 146.83, 0, 0.6, 'sawtooth', 0.32, 196);
      note(ac, 293.66, 0.04, 0.55, 'triangle', 0.28);
      break;
    case 'error':
      note(ac, 160, 0, 0.12, 'square', 0.3, 110);
      break;
    case 'tierUnlock':
      // Dramatic ascent — unlock gates opening.
      note(ac, N.G4, 0,    0.08, 'triangle', 0.45, N.G5);
      note(ac, N.C5, 0.06, 0.14, 'triangle', 0.50);
      note(ac, N.E5, 0.12, 0.18, 'sine',     0.45);
      note(ac, N.G5, 0.18, 0.32, 'sine',     0.38);
      break;
    case 'rivalAlert':
      // Tense, dissonant — danger is near.
      note(ac, 185, 0,    0.09, 'square',   0.38, 130);
      note(ac, 245, 0.04, 0.12, 'sawtooth', 0.30, 190);
      break;
    case 'echelonUp':
      // Triumphant 4-note major arpeggio with shimmer tail.
      [N.C5, N.E5, N.G5, N.C6].forEach((f, i) =>
        note(ac, f, i * 0.065, 0.22, 'triangle', 0.44)
      );
      note(ac, N.C6, 0.24, 0.55, 'sine', 0.26);
      break;
    case 'companionUp':
      // Warm and emotional — trust deepening.
      note(ac, N.E4, 0,    0.22, 'sine', 0.38);
      note(ac, N.G4, 0.07, 0.22, 'sine', 0.36);
      note(ac, N.C5, 0.14, 0.28, 'sine', 0.32);
      break;
    case 'fanfare':
      // Full celebration — biggest possible moment.
      [N.C5, N.E5, N.G5, N.C6].forEach((f, i) =>
        note(ac, f, i * 0.07, 0.28, 'triangle', 0.50)
      );
      note(ac, N.G5, 0.30, 0.44, 'sine', 0.30);
      note(ac, N.C6, 0.36, 0.65, 'sine', 0.26);
      break;
  }
}

export const sfx = {
  setEnabled(on: boolean) {
    enabled = on;
  },
  isEnabled() {
    return enabled;
  },
  /** Resume the context after a gesture (call from a tap if previously suspended). */
  resume() {
    const ac = ensure();
    if (ac && ac.state === 'suspended') void ac.resume();
  },
  play(name: Sfx) {
    if (!enabled) return;
    const ac = ensure();
    if (!ac) return;
    if (ac.state === 'suspended') void ac.resume();
    // Throttle: never fire two SFX within 18ms (rapid max-buy taps).
    const now = ac.currentTime;
    if (now - lastAt < 0.018) return;
    lastAt = now;
    try {
      render(ac, name);
    } catch {
      /* a closed/again-suspended context can throw — ignore. */
    }
  },
};
