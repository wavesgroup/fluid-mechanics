/**
 * Marching squares on a rectangular grid, stitched into continuous polylines so
 * each contour can carry an inline label the way a hand-drawn figure does.
 *
 * `field-plot.ts` also marches squares, but it emits loose segments on the
 * square vector-field view; contours of a T-S diagram need whole lines on a
 * grid with independent x and y ranges.
 */

import { MS_PAIRS } from "./field-plot";

export type Pt = { x: number; y: number };

export type Contour = { level: number; points: Pt[] };

export type Grid = {
  /** Row-major, `ny` rows of `nx` values, row j at y = y0 + j dy. */
  values: Float64Array;
  nx: number;
  ny: number;
  x0: number;
  dx: number;
  y0: number;
  dy: number;
};

/** Sample `fn` on a regular grid spanning [xmin, xmax] x [ymin, ymax]. */
export function sampleGrid(
  fn: (x: number, y: number) => number,
  xmin: number,
  xmax: number,
  ymin: number,
  ymax: number,
  nx: number,
  ny: number,
): Grid {
  const dx = (xmax - xmin) / (nx - 1);
  const dy = (ymax - ymin) / (ny - 1);
  const values = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const y = ymin + j * dy;
    for (let i = 0; i < nx; i++) {
      values[j * nx + i] = fn(xmin + i * dx, y);
    }
  }
  return { values, nx, ny, x0: xmin, dx, y0: ymin, dy };
}

/** Levels at a fixed `step`, covering the grid's range. */
export function levelsFor(grid: Grid, step: number, max = 64): number[] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of grid.values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (!Number.isFinite(lo) || hi - lo < step) return [];
  const first = Math.ceil(lo / step) * step;
  const out: number[] = [];
  for (let v = first; v <= hi && out.length < max; v += step) {
    // Snap: repeated addition of e.g. 0.5 drifts enough to show in labels.
    out.push(Math.round(v / step) * step);
  }
  return out;
}

/** Contours of `grid` at each level, as polylines in grid coordinates. */
export function contours(grid: Grid, levels: number[]): Contour[] {
  const { values, nx, ny, x0, dx, y0, dy } = grid;
  const out: Contour[] = [];
  // Naming each crossing by the grid edge it sits on is what makes the
  // stitching below reliable: two cells meeting at an edge produce one key,
  // not two floating-point coordinates to be matched with a tolerance.
  const hKey = (i: number, j: number) => 2 * (j * nx + i);
  const vKey = (i: number, j: number) => 2 * (j * nx + i) + 1;

  for (const level of levels) {
    const pts = new Map<number, Pt>();
    const segs: [number, number][] = [];

    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const bl = values[j * nx + i];
        const br = values[j * nx + i + 1];
        const tl = values[(j + 1) * nx + i];
        const tr = values[(j + 1) * nx + i + 1];
        const lo = Math.min(bl, br, tl, tr);
        const hi = Math.max(bl, br, tl, tr);
        if (level < lo || level > hi) continue;

        const idx =
          (bl >= level ? 1 : 0) |
          (br >= level ? 2 : 0) |
          (tr >= level ? 4 : 0) |
          (tl >= level ? 8 : 0);
        const pairs = MS_PAIRS[idx];
        if (!pairs.length) continue;

        const crossing = (edge: number): number => {
          const t = (a: number, b: number) => (level - a) / (b - a || 1e-15);
          let key: number;
          let p: Pt;
          switch (edge) {
            case 0: {
              key = hKey(i, j);
              const u = t(bl, br);
              p = { x: x0 + (i + u) * dx, y: y0 + j * dy };
              break;
            }
            case 1: {
              key = vKey(i + 1, j);
              const u = t(br, tr);
              p = { x: x0 + (i + 1) * dx, y: y0 + (j + u) * dy };
              break;
            }
            case 2: {
              key = hKey(i, j + 1);
              const u = t(tl, tr);
              p = { x: x0 + (i + u) * dx, y: y0 + (j + 1) * dy };
              break;
            }
            default: {
              key = vKey(i, j);
              const u = t(bl, tl);
              p = { x: x0 + i * dx, y: y0 + (j + u) * dy };
              break;
            }
          }
          if (!pts.has(key)) pts.set(key, p);
          return key;
        };

        for (const [from, to] of pairs) segs.push([crossing(from), crossing(to)]);
      }
    }

    for (const points of stitch(segs, pts)) out.push({ level, points });
  }
  return out;
}

/** Join segments end to end into the longest runs their shared ends allow. */
function stitch(segs: [number, number][], pts: Map<number, Pt>): Pt[][] {
  const at = new Map<number, number[]>();
  segs.forEach(([a, b], k) => {
    for (const key of [a, b]) {
      const list = at.get(key);
      if (list) list.push(k);
      else at.set(key, [k]);
    }
  });

  const used = new Array(segs.length).fill(false);
  const lines: Pt[][] = [];

  const step = (from: number, key: number): [number, number] | null => {
    for (const k of at.get(key) ?? []) {
      if (used[k] || k === from) continue;
      const [a, b] = segs[k];
      return [k, a === key ? b : a];
    }
    return null;
  };

  for (let k = 0; k < segs.length; k++) {
    if (used[k]) continue;
    used[k] = true;
    const [a, b] = segs[k];
    const keys = [a, b];

    let cur = k;
    let end = b;
    for (;;) {
      const next = step(cur, end);
      if (!next) break;
      used[next[0]] = true;
      cur = next[0];
      end = next[1];
      keys.push(end);
      if (end === a) break; // closed loop
    }

    if (end !== a) {
      cur = k;
      let start = a;
      for (;;) {
        const next = step(cur, start);
        if (!next) break;
        used[next[0]] = true;
        cur = next[0];
        start = next[1];
        keys.unshift(start);
      }
    }

    const points = keys.map((key) => pts.get(key)!).filter(Boolean);
    if (points.length > 1) lines.push(points);
  }
  return lines;
}

/** Cumulative arc length of a polyline, and its total. */
function arcLengths(points: Pt[]): { cum: number[]; total: number } {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  return { cum, total: cum[cum.length - 1] };
}

export type LabelSite = { at: Pt; angleDeg: number; head: Pt[]; tail: Pt[] };

/**
 * Split `points` at arc-length fraction `f`, leaving a gap of `gap` units for a
 * label sitting along the line. Returns null if the line is too short to hold
 * one.
 */
export function labelSite(points: Pt[], f: number, gap: number): LabelSite | null {
  const { cum, total } = arcLengths(points);
  if (total < gap * 1.8) return null;

  const target = Math.min(Math.max(total * f, gap * 0.9), total - gap * 0.9);
  const cut = (s: number): { p: Pt; i: number } => {
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const t = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1e-15);
    return {
      p: {
        x: points[i - 1].x + t * (points[i].x - points[i - 1].x),
        y: points[i - 1].y + t * (points[i].y - points[i - 1].y),
      },
      i,
    };
  };

  const a = cut(target - gap / 2);
  const b = cut(target + gap / 2);
  const mid = cut(target).p;
  const angle = (Math.atan2(b.p.y - a.p.y, b.p.x - a.p.x) * 180) / Math.PI;

  return {
    at: mid,
    angleDeg: angle > 90 ? angle - 180 : angle < -90 ? angle + 180 : angle,
    head: [...points.slice(0, a.i), a.p],
    tail: [b.p, ...points.slice(b.i)],
  };
}

export function toPath(points: Pt[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`;
  }
  return d;
}
