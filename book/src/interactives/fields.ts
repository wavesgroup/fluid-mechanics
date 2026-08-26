import type { Vec2 } from "./vectors";

export type ScalarPreset = {
  id: string;
  label: string;
  formula: string;
  T: (x: number, y: number) => number;
  grad: (x: number, y: number) => Vec2;
};

export type VectorPreset = {
  id: string;
  label: string;
  formula: string;
  u: (x: number, y: number) => Vec2;
  div: (x: number, y: number) => number;
  curl: (x: number, y: number) => number;
};

const SIGMA = 0.8;
const SIGMA2 = SIGMA * SIGMA;

export const SCALAR_FIELDS: ScalarPreset[] = [
  {
    id: "hill",
    label: "Hill",
    formula: "T = exp(−(x² + y²) / (2σ²))",
    T: (x, y) => Math.exp(-(x * x + y * y) / (2 * SIGMA2)),
    grad: (x, y) => {
      const T = Math.exp(-(x * x + y * y) / (2 * SIGMA2));
      return { x: (-T * x) / SIGMA2, y: (-T * y) / SIGMA2 };
    },
  },
  {
    id: "waves",
    label: "Waves",
    formula: "T = sin(x) cos(y)",
    T: (x, y) => Math.sin(x) * Math.cos(y),
    grad: (x, y) => ({
      x: Math.cos(x) * Math.cos(y),
      y: -Math.sin(x) * Math.sin(y),
    }),
  },
  {
    id: "ramp",
    label: "Ramp",
    formula: "T = x",
    T: (x) => x,
    grad: () => ({ x: 1, y: 0 }),
  },
  {
    id: "saddle",
    label: "Saddle",
    formula: "T = x² − y²",
    T: (x, y) => x * x - y * y,
    grad: (x, y) => ({ x: 2 * x, y: -2 * y }),
  },
  {
    id: "bowl",
    label: "Bowl",
    formula: "T = x² + y²",
    T: (x, y) => x * x + y * y,
    grad: (x, y) => ({ x: 2 * x, y: 2 * y }),
  },
];

export const VECTOR_FIELDS: VectorPreset[] = [
  {
    id: "source",
    label: "Source",
    formula: "u = (x, y)",
    u: (x, y) => ({ x, y }),
    div: () => 2,
    curl: () => 0,
  },
  {
    id: "vortex",
    label: "Vortex",
    formula: "u = (−y, x)",
    u: (x, y) => ({ x: -y, y: x }),
    div: () => 0,
    curl: () => 2,
  },
  {
    id: "shear",
    label: "Shear",
    formula: "u = (y, 0)",
    u: (_x, y) => ({ x: y, y: 0 }),
    div: () => 0,
    curl: () => -1,
  },
  {
    id: "strain",
    label: "Strain",
    formula: "u = (x, −y)",
    u: (x, y) => ({ x, y: -y }),
    div: () => 0,
    curl: () => 0,
  },
  {
    id: "gauss-vortex",
    label: "Gaussian vortex",
    formula: "u = exp(−r²) (−y, x)",
    u: (x, y) => {
      const g = Math.exp(-(x * x + y * y));
      return { x: -y * g, y: x * g };
    },
    div: () => 0,
    curl: (x, y) => {
      const r2 = x * x + y * y;
      return 2 * (1 - r2) * Math.exp(-r2);
    },
  },
  {
    id: "source-vortex",
    label: "Source + vortex",
    formula: "u = (x − y, x + y)",
    u: (x, y) => ({ x: x - y, y: x + y }),
    div: () => 2,
    curl: () => 2,
  },
];
