import type { Theme } from "./plot";
import {
  arrowParts,
  type ArrowParts,
  type PlotView,
  type Vec2,
  worldToSvg,
} from "./vectors";

export const FIELD_VIEW: PlotView = { size: 520, pad: 42, min: -2, max: 2 };

export const DEFAULT_PROBE: Vec2 = { x: 0.7, y: 0.55 };

export type RGB = [number, number, number];

function parseRgb(c: string): RGB | null {
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

function mix(a: RGB, b: RGB, t: number): RGB {
  const u = Math.min(1, Math.max(0, t));
  return [
    a[0] + (b[0] - a[0]) * u,
    a[1] + (b[1] - a[1]) * u,
    a[2] + (b[2] - a[2]) * u,
  ];
}

export function rgbCss(c: RGB): string {
  return `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`;
}

function darkTheme(theme: Theme): boolean {
  return luminance(theme.bg) < 0.4;
}

export function sequentialColor(t: number, theme: Theme): RGB {
  const accent = parseRgb(theme.accent) ?? [138, 46, 46];
  const bg = parseRgb(theme.bg) ?? [247, 243, 235];
  const muted = parseRgb(theme.muted) ?? [94, 87, 76];
  const u = Math.min(1, Math.max(0, t));
  if (darkTheme(theme)) {
    const low = mix(bg, muted, 0.45);
    const mid: RGB = mix(muted, [212, 160, 96], 0.7);
    const high: RGB = mix([212, 160, 96], [245, 224, 192], 0.55);
    if (u < 0.5) return mix(low, mid, u * 2);
    return mix(mid, high, (u - 0.5) * 2);
  }
  const low = mix(bg, [255, 255, 255], 0.35);
  const mid = mix([232, 196, 122], accent, 0.15);
  if (u < 0.5) return mix(low, mid, u * 2);
  return mix(mid, accent, (u - 0.5) * 2);
}

export function divergingColor(t: number, theme: Theme): RGB {
  const bg = parseRgb(theme.bg) ?? [247, 243, 235];
  const u = Math.min(1, Math.max(0, t));
  const cool: RGB = darkTheme(theme) ? [91, 155, 204] : [43, 108, 168];
  const warm: RGB = darkTheme(theme) ? [224, 122, 95] : [176, 48, 48];
  const mid = mix(bg, [128, 128, 128], darkTheme(theme) ? 0.08 : 0.04);
  if (u < 0.5) return mix(cool, mid, u * 2);
  return mix(mid, warm, (u - 0.5) * 2);
}

export function drawColorbar(canvas: HTMLCanvasElement, colorAt: (t: number) => RGB): void {
  const dpr = Math.min(2, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
  const w = 12;
  const h = 256;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (let i = 0; i < h; i++) {
    const c = colorAt(1 - i / (h - 1));
    ctx.fillStyle = rgbCss(c);
    ctx.fillRect(0, i, w, 1);
  }
}

export function sampleRange(
  fn: (x: number, y: number) => number,
  view: PlotView = FIELD_VIEW,
  n = 48,
): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  const span = view.max - view.min;
  for (let j = 0; j <= n; j++) {
    const y = view.min + (j / n) * span;
    for (let i = 0; i <= n; i++) {
      const x = view.min + (i / n) * span;
      const v = fn(x, y);
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!Number.isFinite(min)) return { min: -1, max: 1 };
  if (min === max) {
    if (min === 0) return { min: -1, max: 1 };
    const pad = Math.abs(min) * 0.15 || 0.5;
    return { min: min - pad, max: max + pad };
  }
  return { min, max };
}

export function symmetricRange(min: number, max: number, floor = 1): { min: number; max: number } {
  const m = Math.max(Math.abs(min), Math.abs(max), floor);
  return { min: -m, max: m };
}

export function contourLevels(min: number, max: number, count = 7): number[] {
  if (max - min < 1e-9) return [];
  const levels: number[] = [];
  for (let i = 1; i <= count; i++) {
    levels.push(min + (i / (count + 1)) * (max - min));
  }
  return levels;
}

function lerpPt(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  v0: number,
  v1: number,
  level: number,
): Vec2 {
  const t = (level - v0) / (v1 - v0 || 1e-15);
  const u = Math.min(1, Math.max(0, t));
  return { x: x0 + u * (x1 - x0), y: y0 + u * (y1 - y0) };
}

const MS_PAIRS: [number, number][][] = [
  [],
  [[0, 3]],
  [[0, 1]],
  [[3, 1]],
  [[1, 2]],
  [
    [0, 1],
    [3, 2],
  ],
  [[0, 2]],
  [[3, 2]],
  [[2, 3]],
  [[0, 2]],
  [
    [0, 3],
    [1, 2],
  ],
  [[1, 2]],
  [[3, 1]],
  [[0, 1]],
  [[0, 3]],
  [],
];

export function isolinePaths(
  fn: (x: number, y: number) => number,
  levels: number[],
  view: PlotView = FIELD_VIEW,
  n = 40,
): string[] {
  const span = view.max - view.min;
  const vals: number[][] = [];
  for (let j = 0; j <= n; j++) {
    const row: number[] = [];
    const y = view.min + (j / n) * span;
    for (let i = 0; i <= n; i++) {
      row.push(fn(view.min + (i / n) * span, y));
    }
    vals.push(row);
  }

  return levels.map((level) => {
    const segs: string[] = [];
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x0 = view.min + (i / n) * span;
        const x1 = view.min + ((i + 1) / n) * span;
        const y0 = view.min + (j / n) * span;
        const y1 = view.min + ((j + 1) / n) * span;
        const bl = vals[j][i];
        const br = vals[j][i + 1];
        const tl = vals[j + 1][i];
        const tr = vals[j + 1][i + 1];
        const idx =
          (bl >= level ? 1 : 0) |
          (br >= level ? 2 : 0) |
          (tr >= level ? 4 : 0) |
          (tl >= level ? 8 : 0);
        if (idx === 0 || idx === 15) continue;
        const edge = (e: number): Vec2 => {
          switch (e) {
            case 0:
              return lerpPt(x0, y0, x1, y0, bl, br, level);
            case 1:
              return lerpPt(x1, y0, x1, y1, br, tr, level);
            case 2:
              return lerpPt(x0, y1, x1, y1, tl, tr, level);
            default:
              return lerpPt(x0, y0, x0, y1, bl, tl, level);
          }
        };
        for (const [e0, e1] of MS_PAIRS[idx]) {
          const a = worldToSvg(edge(e0), view);
          const b = worldToSvg(edge(e1), view);
          segs.push(`M ${a.x.toFixed(2)} ${a.y.toFixed(2)} L ${b.x.toFixed(2)} ${b.y.toFixed(2)}`);
        }
      }
    }
    return segs.join(" ");
  });
}

export function drawHeatmap(
  canvas: HTMLCanvasElement,
  fn: (x: number, y: number) => number,
  vmin: number,
  vmax: number,
  colorAt: (t: number) => RGB,
  view: PlotView = FIELD_VIEW,
): void {
  const dpr = Math.min(2, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
  const res = 168;
  const inner = view.size - 2 * view.pad;
  canvas.width = Math.round(view.size * dpr);
  canvas.height = Math.round(view.size * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, view.size, view.size);

  const img = ctx.createImageData(res, res);
  const span = view.max - view.min;
  const dv = vmax - vmin || 1;
  for (let j = 0; j < res; j++) {
    const y = view.max - (j / (res - 1)) * span;
    for (let i = 0; i < res; i++) {
      const x = view.min + (i / (res - 1)) * span;
      const t = (fn(x, y) - vmin) / dv;
      const c = colorAt(Math.min(1, Math.max(0, t)));
      const k = (j * res + i) * 4;
      img.data[k] = c[0];
      img.data[k + 1] = c[1];
      img.data[k + 2] = c[2];
      img.data[k + 3] = 255;
    }
  }
  const off = document.createElement("canvas");
  off.width = res;
  off.height = res;
  off.getContext("2d")!.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(off, view.pad, view.pad, inner, inner);
}

export function autoScale(
  vecAt: (x: number, y: number) => Vec2,
  view: PlotView,
  targetLen: number,
  n = 16,
): number {
  const span = view.max - view.min;
  const mags: number[] = [];
  for (let j = 0; j <= n; j++) {
    const y = view.min + (j / n) * span;
    for (let i = 0; i <= n; i++) {
      const x = view.min + (i / n) * span;
      const v = vecAt(x, y);
      const mag = Math.hypot(v.x, v.y);
      if (mag > 1e-8) mags.push(mag);
    }
  }
  mags.sort((a, b) => a - b);
  if (!mags.length) return 1;
  const v = mags[Math.floor(mags.length * 0.85)] || 1;
  return targetLen / v;
}

export function scaledTip(from: Vec2, vec: Vec2, scale: number, maxLen: number): Vec2 | null {
  const mag = Math.hypot(vec.x, vec.y);
  if (mag < 1e-8) return null;
  const len = Math.min(maxLen, mag * scale);
  return { x: from.x + (vec.x / mag) * len, y: from.y + (vec.y / mag) * len };
}

export type QuiverItem = ArrowParts & { mag: number };

export function makeQuiver(
  vecAt: (x: number, y: number) => Vec2,
  view: PlotView = FIELD_VIEW,
  n = 11,
  maxLen = 0.34,
): QuiverItem[] {
  const span = view.max - view.min;
  const inset = span * 0.08;
  const scale = autoScale(vecAt, view, maxLen, n);
  const out: QuiverItem[] = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = view.min + inset + (i / (n - 1)) * (span - 2 * inset);
      const y = view.min + inset + (j / (n - 1)) * (span - 2 * inset);
      const v = vecAt(x, y);
      const tip = scaledTip({ x, y }, v, scale, maxLen);
      if (!tip) continue;
      out.push({ ...arrowParts({ x, y }, tip, view, 7), mag: Math.hypot(v.x, v.y) });
    }
  }
  return out;
}
