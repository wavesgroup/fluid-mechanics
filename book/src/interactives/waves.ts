/**
 * A linear, progressive surface gravity wave in deep water, as derived in the
 * waves chapter:
 *
 *   η = a cos(kx − ωt)                 φ = (a g / ω) e^{kz} sin(kx − ωt)
 *   u = ∂φ/∂x = a ω e^{kz} cos(kx − ωt)
 *   w = ∂φ/∂z = a ω e^{kz} sin(kx − ωt)        with ω² = g k.
 *
 * Everything here takes the phase ωt as it has accumulated so far, rather
 * than the time, so the wave does not jump when ω changes under it.
 */

import { divergingColor } from "./field-plot";
import type { Theme } from "./plot";

/** The cross-section shown, in meters: one wavelength wide at k = 1 rad/m. */
export const X_MAX = 2 * Math.PI;
export const Z_TOP = 0.25;
export const Z_BOT = -1;

export type Wave = {
  /** Amplitude, m. */
  a: number;
  /** Wavenumber, rad/m. */
  k: number;
  /** Gravitational acceleration, m/s². */
  g: number;
};

/** The wave of the book's static figures. */
export const FIGURE_WAVE: Wave = { a: 0.1, k: 1, g: 9.8 };

export const A_MAX = 0.2;
export const K_MIN = 0.5;
export const K_MAX = 4;
export const G_MIN = 1;
export const G_MAX = 25;

/** Steepness ak at which a deep-water wave breaks (the Stokes limit). */
export const AK_BREAKING = 0.443;

/** Angular frequency, rad/s, from the deep-water dispersion relation. */
export function omega(g: number, k: number): number {
  return Math.sqrt(g * k);
}

/** The wavenumber, rad/m, of a wave of frequency f = ω/2π, in Hz. */
export function wavenumber(g: number, f: number): number {
  const om = 2 * Math.PI * f;
  return (om * om) / g;
}

export type FieldId = "phi" | "u" | "w";

/** Magnitude of a field at the mean water level, z = 0. */
export function amplitude(wave: Wave, field: FieldId): number {
  const om = omega(wave.g, wave.k);
  if (field === "phi") return om > 0 ? (wave.a * wave.g) / om : 0;
  return wave.a * om;
}

export function elevation(wave: Wave, phase: number, x: number): number {
  return wave.a * Math.cos(wave.k * x - phase);
}

/** Round numbers a color scale may end on, within a decade. */
const NICE = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

/** The smallest round number no smaller than `x`, for the top of a color scale. */
export function niceCeil(x: number): number {
  if (!(x > 0) || !Number.isFinite(x)) return 1;
  const e = Math.floor(Math.log10(x));
  const m = x / 10 ** e;
  return (NICE.find((n) => m <= n * 1.0001) ?? 10) * 10 ** e;
}

/**
 * Top of the color scale for a field: its largest value anywhere in the
 * water, which is under the crest, rounded up.
 */
export function colorRange(wave: Wave, field: FieldId): number {
  const top = amplitude(wave, field) * Math.exp(wave.k * wave.a);
  return Math.max(0.01, niceCeil(top));
}

// ---- Filled contours ------------------------------------------------------

/** Color bands across the scale, as in the book's static figures. */
export const BANDS = 20;
const LUT_PER_BAND = 64;
const LUT_SIZE = BANDS * LUT_PER_BAND;

/**
 * Packed colors (as a little-endian Uint32 of canvas pixels) for values from
 * the bottom to the top of the scale, constant across each band.
 */
export function bandLut(theme: Theme): Uint32Array {
  const lut = new Uint32Array(LUT_SIZE);
  for (let b = 0; b < BANDS; b++) {
    const c = divergingColor((b + 0.5) / BANDS, theme);
    const packed =
      ((255 << 24) | (Math.round(c[2]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[0])) >>> 0;
    lut.fill(packed, b * LUT_PER_BAND, (b + 1) * LUT_PER_BAND);
  }
  return lut;
}

/** CSS color of the band holding `t`, a fraction of the way up the scale. */
export function bandColor(t: number, theme: Theme): [number, number, number] {
  const b = Math.min(BANDS - 1, Math.max(0, Math.floor(t * BANDS)));
  return divergingColor((b + 0.5) / BANDS, theme);
}

/** Scratch rows and columns for `paintField`, kept between frames. */
let colBuf = new Float64Array(0);
let surfBuf = new Float64Array(0);
let rowBuf = new Float64Array(0);

/**
 * Paint a field over the whole cross-section into `out`, an nx × ny image:
 * banded colors in the water, nothing above the surface. Each field is a
 * function of x times e^{kz}, so a pixel costs one multiplication.
 */
export function paintField(
  out: Uint32Array,
  nx: number,
  ny: number,
  wave: Wave,
  field: FieldId,
  phase: number,
  range: number,
  lut: Uint32Array,
): void {
  if (colBuf.length < nx) {
    colBuf = new Float64Array(nx);
    surfBuf = new Float64Array(nx);
  }
  if (rowBuf.length < ny) rowBuf = new Float64Array(ny);

  const { a, k } = wave;
  const span = Z_TOP - Z_BOT;
  // Half the lookup table per unit of value / range.
  const gain = (amplitude(wave, field) / range) * (LUT_SIZE / 2);
  for (let i = 0; i < nx; i++) {
    const th = k * ((i + 0.5) / nx) * X_MAX - phase;
    colBuf[i] = gain * (field === "u" ? Math.cos(th) : Math.sin(th));
    // The surface, in pixels down from the top.
    surfBuf[i] = ((Z_TOP - a * Math.cos(th)) / span) * ny;
  }
  for (let j = 0; j < ny; j++) rowBuf[j] = Math.exp(k * (Z_TOP - ((j + 0.5) / ny) * span));

  const mid = LUT_SIZE / 2;
  const last = LUT_SIZE - 1;
  for (let j = 0; j < ny; j++) {
    const e = rowBuf[j];
    const row = j * nx;
    for (let i = 0; i < nx; i++) {
      // How much of this pixel is under water.
      const wet = j + 1 - surfBuf[i];
      if (wet <= 0) {
        out[row + i] = 0;
        continue;
      }
      let idx = (mid + colBuf[i] * e) | 0;
      if (idx < 0) idx = 0;
      else if (idx > last) idx = last;
      const color = lut[idx];
      out[row + i] = wet >= 1 ? color : ((color & 0x00ffffff) | (((wet * 255) | 0) << 24)) >>> 0;
    }
  }
}

// ---- Material particles ---------------------------------------------------

/** Mean positions of the seeded particles, m, from the surface down. */
export const SEED_X = [1, 3, 5, 7].map((n) => (n * Math.PI) / 4);
export const SEED_Z = [0, -0.25, -0.5, -0.75];

/** Trail points kept per wave period, and periods kept. */
export const TRAIL_PER_PERIOD = 40;
export const TRAIL_PERIODS = 12;
export const TRAIL = TRAIL_PER_PERIOD * TRAIL_PERIODS;

/** Phase between trail points, rad. */
const TRAIL_STEP = (2 * Math.PI) / TRAIL_PER_PERIOD;
/** Phase a particle may advance in one Runge-Kutta step, rad. */
const MAX_PHASE_STEP = 0.04;
/** How far out of view, in m, a particle goes before it is brought back. */
const WRAP_PAD = 0.5;
/** Consecutive trail points further apart than this, in m, are not joined. */
export const TRAIL_BREAK = 1;

/**
 * Particles moving with the water, each at the velocity of the wave where the
 * particle is, with a trail of where it has been.
 */
export class Particles {
  readonly n = SEED_X.length * SEED_Z.length;
  /** Mean position at release, about which the first-order orbit turns. */
  readonly x0 = new Float64Array(this.n);
  readonly z0 = new Float64Array(this.n);
  readonly x = new Float64Array(this.n);
  readonly z = new Float64Array(this.n);
  /** Trails, one ring of TRAIL points per particle, all written in step. */
  readonly tx = new Float32Array(this.n * TRAIL);
  readonly tz = new Float32Array(this.n * TRAIL);
  /** Index of the newest trail point, and how many there are. */
  head = 0;
  count = 0;
  /** Phase gone by since the newest trail point. */
  private since = 0;

  constructor() {
    let i = 0;
    for (const z of SEED_Z) {
      for (const x of SEED_X) {
        this.x0[i] = x;
        this.z0[i] = z;
        i++;
      }
    }
  }

  /**
   * Release every particle where the wave, at this phase, has carried it from
   * its mean position: the first-order displacements (ζ, ξ) of the chapter.
   */
  release(wave: Wave, phase: number): void {
    const { a, k } = wave;
    for (let i = 0; i < this.n; i++) {
      const r = a * Math.exp(k * this.z0[i]);
      const th = k * this.x0[i] - phase;
      this.x[i] = this.x0[i] - r * Math.sin(th);
      this.z[i] = this.z0[i] + r * Math.cos(th);
    }
    this.head = 0;
    this.count = 0;
    this.since = 0;
    this.mark();
  }

  private mark(): void {
    this.head = (this.head + 1) % TRAIL;
    if (this.count < TRAIL) this.count++;
    for (let i = 0; i < this.n; i++) {
      this.tx[i * TRAIL + this.head] = this.x[i];
      this.tz[i * TRAIL + this.head] = this.z[i];
    }
  }

  /** Carry the particles along as the phase advances from `phase` by `dPhase`. */
  advance(wave: Wave, phase: number, dPhase: number): void {
    const { a, k } = wave;
    const om = omega(wave.g, k);
    if (!(dPhase > 0) || !(om > 0)) return;
    const steps = Math.ceil(dPhase / MAX_PHASE_STEP);
    const dp = dPhase / steps;
    const h = dp / om;
    const U = a * om;
    const length = (2 * Math.PI) / k;
    // A particle that has drifted out of view comes back in from the left, a
    // whole number of wavelengths upstream, where the flow is the same.
    const back = Math.ceil((X_MAX + 2 * WRAP_PAD) / length) * length;

    for (let s = 0; s < steps; s++) {
      const p0 = phase + s * dp;
      const p1 = p0 + dp / 2;
      const p2 = p0 + dp;
      for (let i = 0; i < this.n; i++) {
        const x = this.x[i];
        const z = this.z[i];
        // Fourth-order Runge-Kutta on dx/dt = u(x, z, t), dz/dt = w(x, z, t).
        let e = U * Math.exp(k * z);
        let th = k * x - p0;
        const ax = e * Math.cos(th);
        const az = e * Math.sin(th);
        e = U * Math.exp(k * (z + (h / 2) * az));
        th = k * (x + (h / 2) * ax) - p1;
        const bx = e * Math.cos(th);
        const bz = e * Math.sin(th);
        e = U * Math.exp(k * (z + (h / 2) * bz));
        th = k * (x + (h / 2) * bx) - p1;
        const cx = e * Math.cos(th);
        const cz = e * Math.sin(th);
        e = U * Math.exp(k * (z + h * cz));
        th = k * (x + h * cx) - p2;
        const dx = e * Math.cos(th);
        const dz = e * Math.sin(th);
        let nx = x + (h / 6) * (ax + 2 * bx + 2 * cx + dx);
        const nz = z + (h / 6) * (az + 2 * bz + 2 * cz + dz);
        // Water stays under the surface drawn. Only a wave too steep to exist
        // tests this: past ak ≈ 0.57 the crest moves faster than the wave, and
        // without it a particle there would climb the exponential forever.
        this.z[i] = Math.min(nz, a * Math.cos(k * nx - p2));
        if (nx > X_MAX + WRAP_PAD) nx -= back;
        this.x[i] = nx;
      }
      this.since += dp;
      if (this.since >= TRAIL_STEP) {
        this.since -= TRAIL_STEP;
        this.mark();
      }
    }
  }
}
