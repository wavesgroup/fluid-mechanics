import type { Theme } from "./plot";

export type Vec2 = { x: number; y: number };
export type Vec3 = { x: number; y: number; z: number };

export type PlotView = {
  size: number;
  pad: number;
  min: number;
  max: number;
};

export const DEFAULT_VIEW: PlotView = { size: 520, pad: 36, min: -3, max: 3 };
export const INSET_VIEW: PlotView = { size: 260, pad: 28, min: -4.6, max: 4.6 };

export const MIN_LENGTH = 0.2;

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function scale(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, y: a.y * s };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function crossZ(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

export function norm(a: Vec2): number {
  return Math.hypot(a.x, a.y);
}

export function normalize(a: Vec2): Vec2 {
  const n = norm(a);
  if (n < 1e-12) return { x: 1, y: 0 };
  return { x: a.x / n, y: a.y / n };
}

/** Interior angle between a and b, in [0, π]. */
export function angle(a: Vec2, b: Vec2): number {
  const na = norm(a);
  const nb = norm(b);
  if (na < 1e-12 || nb < 1e-12) return 0;
  const c = Math.min(1, Math.max(-1, dot(a, b) / (na * nb)));
  return Math.acos(c);
}

/** Projection of a onto b. */
export function project(a: Vec2, b: Vec2): Vec2 {
  const denom = dot(b, b);
  if (denom < 1e-12) return { x: 0, y: 0 };
  return scale(b, dot(a, b) / denom);
}

export function clampVec(v: Vec2, min: number, max: number): Vec2 {
  return {
    x: Math.min(max, Math.max(min, v.x)),
    y: Math.min(max, Math.max(min, v.y)),
  };
}

/** Scale into the plot square without shearing (for presets). */
export function fitInView(v: Vec2, min: number, max: number): Vec2 {
  const limit = Math.min(Math.abs(min), Math.abs(max));
  const m = Math.max(Math.abs(v.x), Math.abs(v.y));
  if (m <= limit) return withMinLength(v);
  return withMinLength(scale(v, limit / m));
}

export function withMinLength(v: Vec2, min = MIN_LENGTH): Vec2 {
  const n = norm(v);
  if (n >= min) return v;
  if (n < 1e-12) return { x: min, y: 0 };
  return scale(v, min / n);
}

export function perpendicular(b: Vec2, a: Vec2): Vec2 {
  const n = norm(a) || 1;
  const p1 = scale(normalize({ x: -b.y, y: b.x }), n);
  const p2 = scale(normalize({ x: b.y, y: -b.x }), n);
  return dot(a, p1) >= dot(a, p2) ? p1 : p2;
}

export function parallelTo(b: Vec2, a: Vec2): Vec2 {
  const n = norm(a) || 1;
  const u = normalize(b);
  return dot(a, u) >= 0 ? scale(u, n) : scale(u, -n);
}

export function worldToSvg(v: Vec2, view: PlotView): { x: number; y: number } {
  const inner = view.size - 2 * view.pad;
  const span = view.max - view.min;
  return {
    x: view.pad + ((v.x - view.min) / span) * inner,
    y: view.pad + ((view.max - v.y) / span) * inner,
  };
}

export function svgToWorld(p: { x: number; y: number }, view: PlotView): Vec2 {
  const inner = view.size - 2 * view.pad;
  const span = view.max - view.min;
  return {
    x: view.min + ((p.x - view.pad) / inner) * span,
    y: view.max - ((p.y - view.pad) / inner) * span,
  };
}

export function eventToWorld(svg: SVGSVGElement, e: PointerEvent, view: PlotView): Vec2 {
  const rect = svg.getBoundingClientRect();
  const p = {
    x: ((e.clientX - rect.left) / rect.width) * view.size,
    y: ((e.clientY - rect.top) / rect.height) * view.size,
  };
  return clampVec(svgToWorld(p, view), view.min, view.max);
}

export function axisTicks(view: PlotView): number[] {
  const ticks: number[] = [];
  for (let i = Math.ceil(view.min); i <= Math.floor(view.max); i++) {
    if (i !== 0) ticks.push(i);
  }
  return ticks;
}

export type ArrowParts = {
  line: { x1: number; y1: number; x2: number; y2: number };
  head: string;
};

export function arrowParts(fromW: Vec2, toW: Vec2, view: PlotView, head = 12): ArrowParts {
  const from = worldToSvg(fromW, view);
  const to = worldToSvg(toW, view);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const back = Math.min(head, len * 0.4);
  const base = { x: to.x - ux * back, y: to.y - uy * back };
  const nx = -uy;
  const ny = ux;
  const hw = back * 0.42;
  const p1 = { x: base.x + nx * hw, y: base.y + ny * hw };
  const p2 = { x: base.x - nx * hw, y: base.y - ny * hw };
  return {
    line: { x1: from.x, y1: from.y, x2: base.x, y2: base.y },
    head: `${to.x},${to.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`,
  };
}

/** SVG path for the shorter arc from a to b around the origin. */
export function angleArcPath(a: Vec2, b: Vec2, view: PlotView, radiusPx = 32): string {
  const o = worldToSvg({ x: 0, y: 0 }, view);
  const angA = Math.atan2(a.y, a.x);
  const angB = Math.atan2(b.y, b.x);
  let delta = angB - angA;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  const pA = {
    x: o.x + radiusPx * Math.cos(angA),
    y: o.y - radiusPx * Math.sin(angA),
  };
  const pB = {
    x: o.x + radiusPx * Math.cos(angB),
    y: o.y - radiusPx * Math.sin(angB),
  };
  const sweep = delta >= 0 ? 1 : 0;
  return `M ${pA.x} ${pA.y} A ${radiusPx} ${radiusPx} 0 0 ${sweep} ${pB.x} ${pB.y}`;
}

export function angleLabelPos(a: Vec2, b: Vec2, view: PlotView, radiusPx = 46): { x: number; y: number } {
  const o = worldToSvg({ x: 0, y: 0 }, view);
  const angA = Math.atan2(a.y, a.x);
  const angB = Math.atan2(b.y, b.x);
  let delta = angB - angA;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  const mid = angA + delta / 2;
  return {
    x: o.x + radiusPx * Math.cos(mid),
    y: o.y - radiusPx * Math.sin(mid),
  };
}

/** Small right-angle mark at the foot of the perpendicular from tip onto `along`. */
export function rightAngleMark(
  tip: Vec2,
  foot: Vec2,
  along: Vec2,
  view: PlotView,
  size = 9,
): string | null {
  const f = worldToSvg(foot, view);
  const t = worldToSvg(tip, view);
  const b = worldToSvg(add(foot, along), view);
  const v1x = t.x - f.x;
  const v1y = t.y - f.y;
  const v2x = b.x - f.x;
  const v2y = b.y - f.y;
  const n1 = Math.hypot(v1x, v1y);
  const n2 = Math.hypot(v2x, v2y);
  if (n1 < 8 || n2 < 8) return null;
  const u1x = (v1x / n1) * size;
  const u1y = (v1y / n1) * size;
  const u2x = (v2x / n2) * size;
  const u2y = (v2y / n2) * size;
  return `M ${f.x + u1x} ${f.y + u1y} L ${f.x + u1x + u2x} ${f.y + u1y + u2y} L ${f.x + u2x} ${f.y + u2y}`;
}

export function labelPos(tip: Vec2, view: PlotView, offsetPx = 16): { x: number; y: number } {
  const o = worldToSvg({ x: 0, y: 0 }, view);
  const p = worldToSvg(tip, view);
  const dx = p.x - o.x;
  const dy = p.y - o.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: p.x + (dx / len) * offsetPx, y: p.y + (dy / len) * offsetPx };
}

const C30 = Math.cos(Math.PI / 6);
const S30 = Math.sin(Math.PI / 6);

/** Isometric map: x right-up, y left-up, z up. Origin stays at (0, 0). */
export function project3dToWorld(p: Vec3): Vec2 {
  return {
    x: (p.x - p.y) * C30,
    y: p.z + (p.x + p.y) * S30,
  };
}

export function fmt(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) < 0.5 * 10 ** -digits) return (0).toFixed(digits);
  return n.toFixed(digits);
}

export function fmtDeg(rad: number): string {
  return `${fmt((rad * 180) / Math.PI, 1)}°`;
}

export type VectorColors = {
  a: string;
  b: string;
  result: string;
};

function parseRgb(c: string): [number, number, number] | null {
  const hex = c.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = c.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
}

function luminance(c: string): number {
  const rgb = parseRgb(c);
  if (!rgb) return 0.5;
  const lin = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export function vectorColors(theme: Theme): VectorColors {
  if (luminance(theme.bg) < 0.4) {
    return { a: "#e07a5f", b: "#7eb8a4", result: "#e9c46a" };
  }
  return { a: "#9b2c2c", b: "#1d6a8a", result: "#2d6a4f" };
}
