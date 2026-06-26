// Seeded RNG (mulberry32) + small helpers.

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick a random element using a 0..1 random source (defaults to Math.random). */
export function pick<T>(arr: T[], rng: () => number = Math.random): T {
  if (arr.length === 0) throw new Error('pick() called on empty array');
  return arr[Math.floor(rng() * arr.length)];
}

/** Random float in [min, max). */
export function range(min: number, max: number, rng: () => number = Math.random): number {
  return min + (max - min) * rng();
}

/** Random integer in [min, max] inclusive. */
export function rangeInt(min: number, max: number, rng: () => number = Math.random): number {
  return Math.floor(range(min, max + 1, rng));
}

/** True with probability p. */
export function chance(p: number, rng: () => number = Math.random): boolean {
  return rng() < p;
}
