export type Theme = {
  fg: string;
  muted: string;
  accent: string;
  rule: string;
  bg: string;
};

export function readTheme(el: Element = document.documentElement): Theme {
  const s = getComputedStyle(el.closest("html") ?? document.documentElement);
  return {
    fg: s.getPropertyValue("--fg").trim() || "#1c1915",
    muted: s.getPropertyValue("--muted").trim() || "#5e574c",
    accent: s.getPropertyValue("--accent").trim() || "#8a2e2e",
    rule: s.getPropertyValue("--rule").trim() || "#d3c9b6",
    bg: s.getPropertyValue("--plot-bg").trim() || s.getPropertyValue("--bg").trim(),
  };
}

export function onThemeChange(cb: () => void): () => void {
  const handler = () => cb();
  document.documentElement.addEventListener("themechange", handler);
  return () => document.documentElement.removeEventListener("themechange", handler);
}

function niceNum(range: number, round: boolean) {
  const exp = Math.floor(Math.log10(range));
  const f = range / 10 ** exp;
  let nf: number;
  if (round) {
    nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  } else {
    nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  }
  return nf * 10 ** exp;
}

function ticks(min: number, max: number, count = 5): number[] {
  const range = niceNum(max - min || 1, false);
  const step = niceNum(range / (count - 1), true);
  const start = Math.ceil(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step * 0.01; v += step) out.push(v);
  return out;
}

export function formatTick(v: number): string {
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 1000 || (a < 0.01 && a > 0)) return v.toExponential(0);
  if (Number.isInteger(v)) return String(v);
  return v.toPrecision(3).replace(/\.?0+$/, "");
}

function escapeXml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

type Series = {
  x: number[];
  y: number[];
  color?: string;
  width?: number;
  dashed?: boolean;
};

export function svgLineChart(opts: {
  series: Series[];
  xlabel: string;
  ylabel: string;
  title?: string;
  xlim?: [number, number];
  ylim?: [number, number];
  width?: number;
  height?: number;
  theme: Theme;
  invertY?: boolean;
}): string {
  const width = opts.width ?? 640;
  const height = opts.height ?? 360;
  const padL = 52;
  const padR = 16;
  const padT = 16;
  const padB = 44;
  const { theme } = opts;

  let xmin = opts.xlim?.[0];
  let xmax = opts.xlim?.[1];
  let ymin = opts.ylim?.[0];
  let ymax = opts.ylim?.[1];
  if (xmin == null || xmax == null || ymin == null || ymax == null) {
    const xs = opts.series.flatMap((s) => s.x);
    const ys = opts.series.flatMap((s) => s.y);
    xmin ??= Math.min(...xs);
    xmax ??= Math.max(...xs);
    ymin ??= Math.min(...ys);
    ymax ??= Math.max(...ys);
  }
  if (xmin === xmax) {
    xmin -= 1;
    xmax += 1;
  }
  if (ymin === ymax) {
    ymin -= 1;
    ymax += 1;
  }

  const xTo = (x: number) => padL + ((x - xmin) / (xmax - xmin)) * (width - padL - padR);
  const yTo = (y: number) => {
    const t = (y - ymin) / (ymax - ymin);
    return opts.invertY ? padT + t * (height - padT - padB) : padT + (1 - t) * (height - padT - padB);
  };

  const xt = ticks(xmin, xmax);
  const yt = ticks(ymin, ymax);

  const grid: string[] = [];
  for (const x of xt) {
    grid.push(
      `<line x1="${xTo(x)}" x2="${xTo(x)}" y1="${padT}" y2="${height - padB}" stroke="${theme.rule}" stroke-width="1"/>`,
    );
  }
  for (const y of yt) {
    grid.push(
      `<line x1="${padL}" x2="${width - padR}" y1="${yTo(y)}" y2="${yTo(y)}" stroke="${theme.rule}" stroke-width="1"/>`,
    );
  }

  const axes = `
    <line x1="${padL}" x2="${width - padR}" y1="${height - padB}" y2="${height - padB}" stroke="${theme.fg}" />
    <line x1="${padL}" x2="${padL}" y1="${padT}" y2="${height - padB}" stroke="${theme.fg}" />
  `;

  const labels: string[] = [];
  for (const x of xt) {
    labels.push(
      `<text x="${xTo(x)}" y="${height - padB + 16}" text-anchor="middle" fill="${theme.muted}" font-size="11">${formatTick(x)}</text>`,
    );
  }
  for (const y of yt) {
    labels.push(
      `<text x="${padL - 8}" y="${yTo(y) + 4}" text-anchor="end" fill="${theme.muted}" font-size="11">${formatTick(y)}</text>`,
    );
  }
  labels.push(
    `<text x="${(padL + width - padR) / 2}" y="${height - 10}" text-anchor="middle" fill="${theme.fg}" font-size="12">${opts.xlabel}</text>`,
  );
  labels.push(
    `<text x="16" y="${(padT + height - padB) / 2}" text-anchor="middle" fill="${theme.fg}" font-size="12" transform="rotate(-90 16 ${(padT + height - padB) / 2})">${opts.ylabel}</text>`,
  );

  const lines = opts.series.map((s) => {
    const d = s.x.map((x, i) => `${i === 0 ? "M" : "L"} ${xTo(x)} ${yTo(s.y[i])}`).join(" ");
    const dash = s.dashed ? 'stroke-dasharray="5 4"' : "";
    return `<path d="${d}" fill="none" stroke="${s.color || theme.accent}" stroke-width="${s.width ?? 2}" ${dash} />`;
  });

  const title = escapeXml(opts.title || `${opts.xlabel} versus ${opts.ylabel}`);
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
    <title>${title}</title>
    ${grid.join("")}
    ${axes}
    ${lines.join("")}
    ${labels.join("")}
  </svg>`;
}
