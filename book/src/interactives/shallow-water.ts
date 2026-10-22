/**
 * Domain, experiments, and plotting helpers for the shallow water simulation.
 * The solver itself runs on the GPU, in `shallow-water-gl.ts`.
 *
 * The model is a doubly periodic or walled rectangle on an Arakawa C grid:
 * η at cell centers, u on the west face and v on the south face of each cell,
 * all three stored in one texel. It solves for departures from a uniform
 * inflow U, so u below is always the perturbation u − U.
 */

import { divergingColor, type RGB } from "./field-plot";
import type { Theme } from "./plot";

/** Grid cells. */
export const NX = 256;
export const NY = 160;

/** Domain size in meters. */
export const LX = 1000e3;
export const LY = 625e3;
export const DX = LX / NX;
export const DY = LY / NY;

/** SVG overlay size; 0.8 px per km both ways. */
export const VIEW_W = 800;
export const VIEW_H = 500;
export const PX_PER_M = VIEW_W / LX;

export const OMEGA = 7.292e-5;

/** Below this |f| (in s⁻¹) rotation is too weak to matter here. */
export const F_MIN = 0.05e-4;

/** Thinnest water column the solver allows, as a fraction of H. */
export const H_MIN_FRAC = 0.02;

/** Seamount limits: peak depth as a fraction of H, and radius in meters. */
export const PEAK_MIN_FRAC = 0.1;
export const R_MIN = 20e3;
export const R_MAX = 150e3;

/** Bumps dropped on the water: height as a fraction of H, and radius. */
export const BUMP_FRAC = 0.1;
export const BUMP_R = 30e3;

export type Field = "eta" | "u" | "v";
export type Style = "heat" | "filled";

export type Seamount = {
  /** Center, meters from the southwest corner. */
  x: number;
  y: number;
  /** e-folding radius in meters: the bottom is H − b₀ exp(−r²/R²). */
  r: number;
  /** Depth of the water above the peak, in meters. */
  peak: number;
};

export type Settings = {
  g: number;
  H: number;
  /** Coriolis parameter in units of 10⁻⁴ s⁻¹. */
  fScaled: number;
  U: number;
  wallX: boolean;
  wallY: boolean;
  nonlinear: boolean;
  mountOn: boolean;
  mount: Seamount;
  field: Field;
  style: Style;
};

export type ExperimentId = "seamount" | "bump" | "dam" | "kelvin";

export type Experiment = {
  id: ExperimentId;
  label: string;
  settings: Settings;
  /** Initial η at the cell centers, row-major from the south. */
  init: (H: number) => Float32Array;
};

/** A seamount rising to this fraction of the depth below the surface. */
export const PEAK_DEFAULT_FRAC = 0.4;

function base(over: Partial<Settings>): Settings {
  const H = over.H ?? 100;
  return {
    g: 9.81,
    H,
    fScaled: 1,
    U: 0,
    wallX: false,
    wallY: false,
    nonlinear: true,
    mountOn: false,
    mount: { x: 300e3, y: LY / 2, r: 50e3, peak: PEAK_DEFAULT_FRAC * H },
    field: "eta",
    style: "heat",
    ...over,
  };
}

function fill(fn: (x: number, y: number) => number): Float32Array {
  const eta = new Float32Array(NX * NY);
  for (let j = 0; j < NY; j++) {
    const y = (j + 0.5) * DY;
    for (let i = 0; i < NX; i++) eta[j * NX + i] = fn((i + 0.5) * DX, y);
  }
  return eta;
}

const gauss = (x: number, y: number, x0: number, y0: number, r: number) =>
  Math.exp(-((x - x0) ** 2 + (y - y0) ** 2) / (r * r));

export const EXPERIMENTS: Record<ExperimentId, Experiment> = {
  seamount: {
    id: "seamount",
    label: "Seamount",
    settings: base({ U: 0.5, wallY: true, mountOn: true, style: "filled" }),
    init: () => new Float32Array(NX * NY),
  },
  bump: {
    id: "bump",
    label: "Bump",
    settings: base({}),
    init: (H) => fill((x, y) => BUMP_FRAC * H * gauss(x, y, LX / 2, LY / 2, 50e3)),
  },
  dam: {
    id: "dam",
    label: "Dam break",
    settings: base({ fScaled: 0, wallX: true }),
    init: (H) => fill((x) => -BUMP_FRAC * H * Math.tanh((x - LX / 2) / (4 * DX))),
  },
  kelvin: {
    id: "kelvin",
    label: "Kelvin wave",
    settings: base({ H: 25, wallX: true, wallY: true }),
    init: (H) => fill((x, y) => 2 * BUMP_FRAC * H * gauss(x, y, 0.3 * LX, 0, 60e3)),
  },
};

/** Height of the seamount above the flat bottom, b₀ = H − peak depth. */
export function mountHeight(s: Settings): number {
  return s.mountOn ? Math.max(0, s.H - clampPeak(s.mount.peak, s.H)) : 0;
}

export function clampPeak(peak: number, H: number): number {
  return Math.min(H, Math.max(PEAK_MIN_FRAC * H, peak));
}

/**
 * Radii of the isobaths where the seamount has risen a fraction `k` of its
 * height: b₀ exp(−r²/R²) = k b₀.
 */
export function isobathRadius(r: number, k: number): number {
  return r * Math.sqrt(Math.log(1 / k));
}

/** Plot position (SVG, y down) of a point in meters. */
export function toView(x: number, y: number): { x: number; y: number } {
  return { x: x * PX_PER_M, y: VIEW_H - y * PX_PER_M };
}

export function fromView(x: number, y: number): { x: number; y: number } {
  return { x: x / PX_PER_M, y: (VIEW_H - y) / PX_PER_M };
}

/** A 1-2-5 step close to `x`. */
export function niceStep(x: number): number {
  if (!(x > 0) || !Number.isFinite(x)) return 1;
  const e = Math.floor(Math.log10(x));
  const m = x / 10 ** e;
  const n = m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10;
  return n * 10 ** e;
}

/** 256-entry RGBA color map, from cool (negative) to warm (positive). */
export function divergingLut(theme: Theme): Uint8Array {
  const lut = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const c: RGB = divergingColor(i / 255, theme);
    lut[i * 4] = c[0];
    lut[i * 4 + 1] = c[1];
    lut[i * 4 + 2] = c[2];
    lut[i * 4 + 3] = 255;
  }
  return lut;
}

/** Model time as a short label: seconds up to days. */
export function timeLabel(t: number): string {
  if (t < 3600) return `${Math.round(t / 60)} min`;
  if (t < 2 * 86400) return `${(t / 3600).toFixed(1)} h`;
  return `${(t / 86400).toFixed(1)} days`;
}
