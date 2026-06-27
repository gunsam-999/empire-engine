// ============================================================================
// palette  -  tiny color toolkit for the "visual soul" layer.
//
// The whole app themes off a single `--accent` hex chosen at founding. Static
// styling can lean on CSS color-mix(), but the canvas/SVG atmosphere and the FX
// particles need real parsed RGB to build gradients and rgba() strings. This
// module is that bridge: parse a hex, derive harmonious companion tones, and
// produce alpha/blend strings  -  all pure, allocation-light, no dependencies.
// ============================================================================

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parse #rgb / #rrggbb (with or without #) into 0-255 channels. Fallback indigo. */
export function hexToRgb(hex: string): Rgb {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return { r: 99, g: 102, b: 241 };
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

export function rgbToHex({ r, g, b }: Rgb): string {
  const h = (clamp255(r) << 16) | (clamp255(g) << 8) | clamp255(b);
  return '#' + h.toString(16).padStart(6, '0');
}

/** rgba() string from a hex + alpha 0..1. */
export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

/** Linear blend of two hexes, t=0 -> a, t=1 -> b. */
export function mixHex(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  const k = Math.max(0, Math.min(1, t));
  return rgbToHex({
    r: x.r + (y.r - x.r) * k,
    g: x.g + (y.g - x.g) * k,
    b: x.b + (y.b - x.b) * k,
  });
}

// ---- HSL conversion (for hue rotation that keeps the accent's character) ----

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

/** Rotate hue by `deg` and optionally nudge saturation/lightness (multipliers). */
export function adjust(hex: string, deg: number, satMul = 1, lightMul = 1): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  return rgbToHex(
    hslToRgb({
      h: (hsl.h + deg + 360) % 360,
      s: Math.max(0, Math.min(1, hsl.s * satMul)),
      l: Math.max(0, Math.min(1, hsl.l * lightMul)),
    })
  );
}

// ---- Derived empire palette -------------------------------------------------

export interface Palette {
  /** The chosen accent. */
  accent: string;
  /** Analogous companion hue (+38°)  -  gives gradients a duotone richness. */
  secondary: string;
  /** Brighter, desaturated highlight for sparks/glints. */
  glow: string;
  /** Deep, near-background shade for shadows and gradient anchors. */
  deep: string;
}

const paletteCache = new Map<string, Palette>();

/** Build (and memoize) the derived companion tones for an accent. */
export function getPalette(accent: string): Palette {
  const cached = paletteCache.get(accent);
  if (cached) return cached;
  const p: Palette = {
    accent,
    secondary: adjust(accent, 38, 0.92, 1.05),
    glow: adjust(accent, -6, 0.7, 1.45),
    deep: adjust(accent, 12, 1.1, 0.34),
  };
  paletteCache.set(accent, p);
  return p;
}

// ============================================================================
// THREE-LAYER INDUSTRY COLOR SYSTEM
//
// Each industry's chromatic identity has three layers:
//   deepBase  — a near-black tinted version for the page / world background
//   surface   — a saturated mid-tone for card and panel surfaces
//   electric  — a near-neon bright accent for interactive elements and highlights
//
// These three layers together make the player's world feel distinctly theirs.
// The CSS custom properties --accent-deep, --accent, --accent-elec are set at
// runtime by applyIndustryTheme().
// ============================================================================

export interface IndustryLayers {
  /** Very dark, tinted base — bleeds into page background. */
  deepBase: string;
  /** Saturated mid-tone — used on frosted glass surfaces. */
  surface: string;
  /** Near-electric highlight — used on interactive elements, highlights. */
  electric: string;
  /** rgba() glow string for box-shadow / filter values. */
  glowRgba: string;
}

const layerCache = new Map<string, IndustryLayers>();

/** Derive the 3-layer identity from a raw accent hex. Memoized. */
export function getIndustryLayers(accent: string): IndustryLayers {
  const cached = layerCache.get(accent);
  if (cached) return cached;

  const layers: IndustryLayers = {
    // Deep base: rotate hue +12°, saturate 110%, darken to ~18% lightness
    deepBase: adjust(accent, 12, 1.1, 0.22),
    // Surface mid-tone: original hue, 90% saturation, 55% lightness
    surface:  adjust(accent,  0, 0.90, 0.55),
    // Electric: -8° hue, 115% saturation, 175% lightness (capped at 0.82)
    electric: adjust(accent, -8, 1.15, 1.75),
    glowRgba: withAlpha(accent, 0.38),
  };

  layerCache.set(accent, layers);
  return layers;
}

/**
 * Apply the full industry theme to the document root CSS variables.
 * Call this once when the player picks their industry / accent color.
 * Every glass surface, glow, and backdrop will update instantly.
 */
export function applyIndustryTheme(accent: string): void {
  const layers = getIndustryLayers(accent);
  const root = document.documentElement;
  root.style.setProperty('--accent',       accent);
  root.style.setProperty('--accent-deep',  layers.deepBase);
  root.style.setProperty('--accent-elec',  layers.electric);
  root.style.setProperty('--accent-glow',  layers.glowRgba);
  root.style.setProperty('--industry-deep', layers.deepBase);
}
