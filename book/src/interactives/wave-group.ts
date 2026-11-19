/**
 * A sum of linear deep-water wave components, each traveling at its own
 * phase speed, as in the wave groups section of the waves chapter:
 *
 *   η = Σ aᵢ cos(kᵢ x − ωᵢ t),   ωᵢ² = g kᵢ.
 */

import { omega } from "./waves";

/** Gravitational acceleration, m/s². */
export const G = 9.8;

/** The stretch of sea surface shown, m. */
export const X_MAX = 200;

export const A_MAX = 0.2;
export const A_STEP = 0.005;
export const K_MIN = 0.5;
export const K_MAX = 2;
export const K_STEP = 0.01;
export const MAX_COMPONENTS = 8;

export type Component = {
  /** Amplitude, m. */
  a: number;
  /** Wavenumber, rad/m. */
  k: number;
};

/** The two waves of the book's static figure. */
export const FIGURE_COMPONENTS: Component[] = [
  { a: 0.1, k: 1 },
  { a: 0.1, k: 1.1 },
];

/** Each new component has this fraction of the amplitude of the one before. */
const TAPER = 0.8;

/**
 * A component to add after the others: one step further up in wavenumber,
 * by the step between the last two, and a little smaller, as the shorter
 * waves of a wind sea are.
 */
export function nextComponent(list: Component[]): Component {
  const last = list[list.length - 1];
  if (!last) return { ...FIGURE_COMPONENTS[0] };
  const before = list[list.length - 2];
  const gap = before ? Math.abs(last.k - before.k) : 0;
  const dk = gap >= K_STEP ? gap : 0.1 * last.k;
  const k = Math.min(K_MAX, Math.round((last.k + dk) / K_STEP) * K_STEP);
  const a = Math.max(A_STEP, Math.round((TAPER * last.a) / A_STEP) * A_STEP);
  return { a: Number(a.toFixed(3)), k: Number(k.toFixed(2)) };
}

export type Group = {
  /** Mean wavenumber and angular frequency, weighted by a². */
  k: number;
  omega: number;
  /** Speed of the crests, ω/k, m/s. */
  cp: number;
  /** Speed of the groups, m/s. */
  cg: number;
  /** Whether the components differ in wavenumber, so that there are groups. */
  grouped: boolean;
  /** Distance between groups, m, where the pattern repeats in x. */
  spacing: number | null;
};

/**
 * The carrier wave and the group speed of a set of components. The group
 * speed is the slope of ω against k through the components, weighted by a²:
 * Δω/Δk for two of them, and close to ∂ω/∂k at the mean wavenumber for more.
 */
export function groupOf(list: Component[]): Group | null {
  let s = 0;
  let sk = 0;
  let sw = 0;
  for (const c of list) {
    const w = c.a * c.a;
    s += w;
    sk += w * c.k;
    sw += w * omega(G, c.k);
  }
  if (!(s > 0)) return null;
  const k = sk / s;
  const om = sw / s;
  let varK = 0;
  let cov = 0;
  for (const c of list) {
    const w = c.a * c.a;
    varK += w * (c.k - k) ** 2;
    cov += w * (c.k - k) * (omega(G, c.k) - om);
  }
  const grouped = varK > 1e-8 * s;

  // The pattern of two components, or of any number evenly spaced in k,
  // repeats every 2π/Δk.
  const ks = [...new Set(list.filter((c) => c.a > 0).map((c) => c.k))].sort((p, q) => p - q);
  let gap = Infinity;
  for (let i = 1; i < ks.length; i++) gap = Math.min(gap, ks[i] - ks[i - 1]);

  return {
    k,
    omega: om,
    cp: om / k,
    cg: grouped ? cov / varK : G / (2 * om),
    grouped,
    spacing: Number.isFinite(gap) ? (2 * Math.PI) / gap : null,
  };
}

/** A 1-2-5 number close to `x`, for the spacing of axis ticks. */
export function tickStep(x: number): number {
  if (!(x > 0) || !Number.isFinite(x)) return 1;
  const e = Math.floor(Math.log10(x));
  const m = x / 10 ** e;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * 10 ** e;
}
