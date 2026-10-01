/**
 * Geostrophic flow around Gaussian highs and lows of a surface height η: the
 * sea surface in the ocean, or a constant-pressure surface in the atmosphere.
 * Hydrostatic balance turns a height gradient into a pressure gradient,
 * ∇p = ρ g ∇η, so the geostrophic velocity is u_g = (g / f) k × ∇η.
 *
 * Everything lives in plot pixels (x right, y down, as in the SVG); a regime
 * only sets how many km a pixel is and how many meters a unit amplitude is,
 * so switching regimes rescales the numbers but leaves the picture alone.
 */

import type { Contour, Grid } from "./contour";
import { darkTheme, parseRgb, type RGB } from "./field-plot";
import type { Theme } from "./plot";

export const W = 800;
export const H = 500;

/** Velocity grid spacing in plot pixels. */
export const CELL = 4;
export const NX = W / CELL + 1;
export const NY = Math.ceil(H / CELL) + 1;

export const OMEGA = 7.292e-5;

/** Below this |f| (in s⁻¹) there is no meaningful geostrophic balance. */
export const F_MIN = 0.05e-4;

export type Feature = {
  id: number;
  /** Center in plot pixels. */
  x: number;
  y: number;
  /** e-folding radius in plot pixels. */
  r: number;
  /** Amplitude in units of the regime's `ampScale`; positive is a high. */
  a: number;
};

export type Regime = {
  id: "ocean" | "atmosphere";
  label: string;
  surface: string;
  kmPerPx: number;
  /** Meters of η per unit amplitude. */
  ampScale: number;
  ampDigits: number;
  rho: number;
  /** Speed at the top of the color scale, m/s. */
  speedMax: number;
  /** Model seconds per second of animation. */
  timeScale: number;
  timeLabel: string;
  /** Kilometers shown by the scale bar. */
  scaleKm: number;
};

export const REGIMES: Record<Regime["id"], Regime> = {
  ocean: {
    id: "ocean",
    label: "Ocean",
    surface: "sea-surface height",
    kmPerPx: 1,
    ampScale: 1,
    ampDigits: 2,
    rho: 1025,
    speedMax: 0.6,
    timeScale: 2 * 86400,
    timeLabel: "2 days",
    scaleKm: 100,
  },
  atmosphere: {
    id: "atmosphere",
    label: "Atmosphere",
    surface: "geopotential height",
    kmPerPx: 10,
    ampScale: 300,
    ampDigits: 0,
    rho: 1.2,
    speedMax: 18,
    timeScale: 16 * 3600,
    timeLabel: "16 hours",
    scaleKm: 1000,
  },
};

/** Amplitude and radius limits, in the units of `Feature`. */
export const A_MAX = 1;
export const R_MIN = 30;
export const R_MAX = 200;

/** Isobar interval, in units of amplitude. */
export const CONTOUR_STEP = 0.1;

export const DEFAULT_FEATURES: Omit<Feature, "id">[] = [
  { x: 275, y: 250, r: 85, a: -0.4 },
  { x: 525, y: 250, r: 85, a: 0.4 },
];

/** η (amplitude units) and its gradient per plot pixel, y pointing down. */
export function heightAt(features: Feature[], x: number, y: number) {
  let eta = 0;
  let ex = 0;
  let ey = 0;
  for (const f of features) {
    const dx = x - f.x;
    const dy = y - f.y;
    const r2 = f.r * f.r;
    const e = f.a * Math.exp(-(dx * dx + dy * dy) / (2 * r2));
    eta += e;
    ex -= (e * dx) / r2;
    ey -= (e * dy) / r2;
  }
  return { eta, ex, ey };
}

/**
 * Meters per second of geostrophic speed per unit amplitude gradient (per
 * pixel). Velocity is east = k · ey, north = k · ex: y points down on screen,
 * so ∂η/∂(north) = −ey and u_g = −(g/f) ∂η/∂(north) = (g/f) ey.
 */
export function velocityFactor(regime: Regime, f: number, g: number): number {
  if (Math.abs(f) < F_MIN) return 0;
  return (g * regime.ampScale) / (f * regime.kmPerPx * 1000);
}

export type FlowGrid = {
  /** Height in amplitude units, for contouring. */
  eta: Grid;
  /** Eastward and northward velocity in m/s, row-major like `eta.values`. */
  u: Float32Array;
  v: Float32Array;
  speed: Float32Array;
};

export function computeFlow(features: Feature[], k: number): FlowGrid {
  const n = NX * NY;
  const values = new Float64Array(n);
  const u = new Float32Array(n);
  const v = new Float32Array(n);
  const speed = new Float32Array(n);
  for (let j = 0; j < NY; j++) {
    const y = j * CELL;
    for (let i = 0; i < NX; i++) {
      const h = heightAt(features, i * CELL, y);
      const idx = j * NX + i;
      values[idx] = h.eta;
      u[idx] = k * h.ey;
      v[idx] = k * h.ex;
      speed[idx] = Math.hypot(u[idx], v[idx]);
    }
  }
  return {
    eta: { values, nx: NX, ny: NY, x0: 0, dx: CELL, y0: 0, dy: CELL },
    u,
    v,
    speed,
  };
}

/** Bilinear velocity at a plot point, in m/s (east, north). */
export function sampleFlow(grid: FlowGrid, x: number, y: number): [number, number] {
  const gx = Math.min(NX - 1.001, Math.max(0, x / CELL));
  const gy = Math.min(NY - 1.001, Math.max(0, y / CELL));
  const i = Math.floor(gx);
  const j = Math.floor(gy);
  const s = gx - i;
  const t = gy - j;
  const a = j * NX + i;
  const b = a + NX;
  const lerp = (f: Float32Array) =>
    (f[a] * (1 - s) + f[a + 1] * s) * (1 - t) + (f[b] * (1 - s) + f[b + 1] * s) * t;
  return [lerp(grid.u), lerp(grid.v)];
}

/** Levels at every `step` except zero, where the far field would scribble. */
export function isobarLevels(grid: Grid, step = CONTOUR_STEP): number[] {
  let lo = 0;
  let hi = 0;
  for (const v of grid.values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const out: number[] = [];
  for (let k = Math.ceil(lo / step); k <= Math.floor(hi / step); k++) {
    if (k !== 0) out.push(k * step);
  }
  return out;
}

export function contourPath(c: Contour): string {
  let d = "";
  c.points.forEach((p, i) => {
    d += `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  });
  return d;
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/**
 * Speed color ramp, starting from the plot background so still water fades
 * into the page. The top end stays mid-tone in every theme so the particles,
 * drawn in the text color, keep their contrast against the fastest flow.
 */
export function speedRamp(theme: Theme): Uint8ClampedArray {
  const bg = parseRgb(theme.bg) ?? [247, 243, 235];
  const stops: RGB[] = darkTheme(theme)
    ? [bg, [28, 62, 84], [26, 105, 120], [62, 140, 112], [156, 140, 58], [184, 96, 52]]
    : [mix(bg, [255, 255, 255], 0.3), [214, 234, 228], [140, 199, 196], [236, 196, 120], [226, 132, 88], [190, 78, 98]];
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (stops.length - 1);
    const k = Math.min(stops.length - 2, Math.floor(t));
    const c = mix(stops[k], stops[k + 1], t - k);
    lut[i * 3] = c[0];
    lut[i * 3 + 1] = c[1];
    lut[i * 3 + 2] = c[2];
  }
  return lut;
}

/** A spot for a new feature, as far as possible from the others and the edges. */
export function freeSpot(features: Feature[]): { x: number; y: number } {
  let best = { x: W / 2, y: H / 2 };
  let bestScore = -Infinity;
  for (let y = 80; y <= H - 80; y += 20) {
    for (let x = 80; x <= W - 80; x += 20) {
      let score = Math.min(x, W - x, y, H - y) * 0.6;
      for (const f of features) score = Math.min(score, Math.hypot(x - f.x, y - f.y));
      if (score > bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }
  }
  return best;
}
