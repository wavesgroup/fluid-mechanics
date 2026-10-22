/**
 * A WebGL 2 solver for the rotating shallow water equations over a seamount,
 *
 *   ∂u/∂t + u·∇u − f v = −g ∂η/∂x
 *   ∂v/∂t + u·∇v + f u = −g ∂η/∂y
 *   ∂η/∂t + ∇·(h u) = 0,    h = H_b(x, y) + η,
 *
 * written for the departure (u′, v, η′) from a uniform inflow U. With
 * rotation, U is held in geostrophic balance by a steady cross-stream tilt
 * of the surface, −fUy/g; that tilt cancels f U in the v equation and is
 * left out of h, a small error when it is much shallower than H. Without the
 * nonlinear terms the equations are linearized about U: disturbances are still
 * carried along by U, but not by their own velocity.
 *
 * Every grid cell is one RGBA32F texel holding (u′, v, η′) on an Arakawa C
 * grid -- u on the cell's west face, v on its south face, η at its center --
 * and a time step is three full-screen passes of Wicker-Skamarock RK3, with
 * centered pressure gradients and divergences and third-order upwind-biased
 * advection, whose implicit hyperdiffusion keeps the nonlinear runs smooth,
 * followed by a weak divergence damping of grid-scale gravity waves.
 * Walls are free-slip and impermeable; the seamount is evaluated analytically
 * in the shader, so dragging it costs nothing.
 */

import { DX, DY, H_MIN_FRAC, LX, LY, NX, NY, mountHeight, type Settings } from "./shallow-water";

/** Reduction blocks, in cells, for the field maxima read back each frame. */
const BLOCK = 8;
const RX = Math.ceil(NX / BLOCK);
const RY = Math.ceil(NY / BLOCK);

/**
 * Strength of the divergence damping per time step: a wave two cells long
 * loses about 13% of its amplitude each step, one eight cells long 0.3%, and
 * one thirty cells long 0.002%. Stable below 1/32.
 */
const DAMPING = 0.01;

/** Coefficient of the bulk viscosity at fronts, of order one as usual. */
const BULK = 3;

export type Stats = {
  /** Largest |u′|, |v|, |η′| over the domain. */
  u: number;
  v: number;
  eta: number;
  /** True if any value is not finite. */
  bad: boolean;
};

export type Probe = { u: number; v: number; eta: number; depth: number };

export type View = {
  field: 0 | 1 | 2;
  /** Half-range of the color scale, about zero. */
  range: number;
  /** Contour interval for filled contours; 0 for a heat map. */
  step: number;
  /** Contour line color, 0-1, and opacity. */
  ink: [number, number, number, number];
};

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

/** Grid access with boundary conditions, and the bottom depth. */
const COMMON = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

uniform sampler2D uQ;
uniform ivec2 uN;
uniform vec2 uD;
uniform ivec2 uWall;
uniform float uH;
uniform vec4 uMount;

// Index of a cell-centered quantity: mirrored at a wall (zero normal
// gradient), wrapped when periodic. Stencils reach at most two cells out.
int cIdx(int i, int n, int wall) {
  if (wall == 1) return i < 0 ? -1 - i : (i >= n ? 2 * n - 1 - i : i);
  return i < 0 ? i + n : (i >= n ? i - n : i);
}

// u at the west face of cell (i, j): zero on a wall, odd about it.
float qu(int i, int j) {
  j = cIdx(j, uN.y, uWall.y);
  if (uWall.x == 1) {
    if (i == 0 || i == uN.x) return 0.0;
    if (i < 0) return -texelFetch(uQ, ivec2(-i, j), 0).r;
    if (i > uN.x) return -texelFetch(uQ, ivec2(2 * uN.x - i, j), 0).r;
  } else {
    i = i < 0 ? i + uN.x : (i >= uN.x ? i - uN.x : i);
  }
  return texelFetch(uQ, ivec2(i, j), 0).r;
}

// v at the south face of cell (i, j).
float qv(int i, int j) {
  i = cIdx(i, uN.x, uWall.x);
  if (uWall.y == 1) {
    if (j == 0 || j == uN.y) return 0.0;
    if (j < 0) return -texelFetch(uQ, ivec2(i, -j), 0).g;
    if (j > uN.y) return -texelFetch(uQ, ivec2(i, 2 * uN.y - j), 0).g;
  } else {
    j = j < 0 ? j + uN.y : (j >= uN.y ? j - uN.y : j);
  }
  return texelFetch(uQ, ivec2(i, j), 0).g;
}

float qe(int i, int j) {
  return texelFetch(uQ, ivec2(cIdx(i, uN.x, uWall.x), cIdx(j, uN.y, uWall.y)), 0).b;
}

// Nearest periodic image of a displacement.
vec2 wrapD(vec2 d) {
  vec2 L = vec2(uN) * uD;
  if (uWall.x == 0) d.x -= L.x * floor(d.x / L.x + 0.5);
  if (uWall.y == 0) d.y -= L.y * floor(d.y / L.y + 0.5);
  return d;
}

// Resting depth: H less a Gaussian seamount (center, e-folding radius, height).
float depthAt(vec2 p) {
  vec2 d = wrapD(p - uMount.xy);
  return uH - uMount.w * exp(-dot(d, d) / (uMount.z * uMount.z));
}

// Bilinear samples at a point in meters, each on its own staggered lattice.
float sampleE(vec2 p) {
  vec2 g = p / uD - 0.5;
  ivec2 i = ivec2(floor(g));
  vec2 t = g - vec2(i);
  return mix(mix(qe(i.x, i.y), qe(i.x + 1, i.y), t.x),
             mix(qe(i.x, i.y + 1), qe(i.x + 1, i.y + 1), t.x), t.y);
}

float sampleU(vec2 p) {
  vec2 g = p / uD - vec2(0.0, 0.5);
  ivec2 i = ivec2(floor(g));
  vec2 t = g - vec2(i);
  return mix(mix(qu(i.x, i.y), qu(i.x + 1, i.y), t.x),
             mix(qu(i.x, i.y + 1), qu(i.x + 1, i.y + 1), t.x), t.y);
}

float sampleV(vec2 p) {
  vec2 g = p / uD - vec2(0.5, 0.0);
  ivec2 i = ivec2(floor(g));
  vec2 t = g - vec2(i);
  return mix(mix(qv(i.x, i.y), qv(i.x + 1, i.y), t.x),
             mix(qv(i.x, i.y + 1), qv(i.x + 1, i.y + 1), t.x), t.y);
}
`;

/** One RK stage: base + dt · F(uQ). */
const STEP = `${COMMON}
uniform sampler2D uBase;
uniform float uDt;
uniform float uG;
uniform float uF;
uniform float uU;
uniform float uNl;
uniform float uHMin;
out vec4 outQ;

// Upwind-biased third-order first difference at c, times the grid spacing.
float up3(float a, float m2, float m1, float c, float p1, float p2) {
  return a >= 0.0
    ? (m2 - 6.0 * m1 + 3.0 * c + 2.0 * p1) / 6.0
    : (-2.0 * m1 - 3.0 * c + 6.0 * p1 - p2) / 6.0;
}

// Upwind-biased third-order value on the face between m1 and p1.
float face3(float a, float m2, float m1, float p1, float p2) {
  return a >= 0.0
    ? (-m2 + 5.0 * m1 + 2.0 * p1) / 6.0
    : (2.0 * m1 + 5.0 * p1 - p2) / 6.0;
}

// Volume fluxes h u through the west face and h v through the south face.
// Linearized, only U carries η; the thickness H_b carries the full velocity.
float fluxX(int i, int j) {
  float u = qu(i, j);
  float a = uU + uNl * u;
  float e = face3(a, qe(i - 2, j), qe(i - 1, j), qe(i, j), qe(i + 1, j));
  float hb = depthAt(vec2(float(i) * uD.x, (float(j) + 0.5) * uD.y));
  return hb * (uU + u) + e * a;
}

float fluxY(int i, int j) {
  float v = qv(i, j);
  float a = uNl * v;
  float e = face3(a, qe(i, j - 2), qe(i, j - 1), qe(i, j), qe(i, j + 1));
  float hb = depthAt(vec2((float(i) + 0.5) * uD.x, float(j) * uD.y));
  return hb * v + e * a;
}

void main() {
  ivec2 ij = ivec2(gl_FragCoord.xy);
  int i = ij.x;
  int j = ij.y;
  vec4 q0 = texelFetch(uBase, ij, 0);

  float u = qu(i, j);
  float vAtU = 0.25 * (qv(i - 1, j) + qv(i, j) + qv(i - 1, j + 1) + qv(i, j + 1));
  float ax = uU + uNl * u;
  float ay = uNl * vAtU;
  float adv = ax * up3(ax, qu(i - 2, j), qu(i - 1, j), u, qu(i + 1, j), qu(i + 2, j)) / uD.x
            + ay * up3(ay, qu(i, j - 2), qu(i, j - 1), u, qu(i, j + 1), qu(i, j + 2)) / uD.y;
  float du = -adv + uF * vAtU - uG * (qe(i, j) - qe(i - 1, j)) / uD.x;

  float v = qv(i, j);
  float uAtV = 0.25 * (qu(i, j - 1) + qu(i + 1, j - 1) + qu(i, j) + qu(i + 1, j));
  ax = uU + uNl * uAtV;
  ay = uNl * v;
  adv = ax * up3(ax, qv(i - 2, j), qv(i - 1, j), v, qv(i + 1, j), qv(i + 2, j)) / uD.x
      + ay * up3(ay, qv(i, j - 2), qv(i, j - 1), v, qv(i, j + 1), qv(i, j + 2)) / uD.y;
  float dv = -adv - uF * uAtV - uG * (qe(i, j) - qe(i, j - 1)) / uD.y;

  float de = -(fluxX(i + 1, j) - fluxX(i, j)) / uD.x - (fluxY(i, j + 1) - fluxY(i, j)) / uD.y;

  vec4 q = q0 + uDt * vec4(du, dv, de, 0.0);
  if (uWall.x == 1 && i == 0) q.r = 0.0;
  if (uWall.y == 1 && j == 0) q.g = 0.0;
  // Never let a column run dry: the equations have no meaning there.
  q.b = max(q.b, uHMin - depthAt((vec2(ij) + 0.5) * uD));
  outQ = q;
}`;

/** Divergence of each cell, in grid units (velocity), into the spare channel. */
const DIV = `${COMMON}
out vec4 outQ;
void main() {
  ivec2 ij = ivec2(gl_FragCoord.xy);
  vec4 q = texelFetch(uQ, ij, 0);
  q.a = qu(ij.x + 1, ij.y) - qu(ij.x, ij.y) + qv(ij.x, ij.y + 1) - qv(ij.x, ij.y);
  outQ = q;
}`;

/**
 * Two dampers of divergent motion alone, applied once per step, which leave
 * balanced, rotational flow untouched. The centered wave terms would
 * otherwise leave a train of wiggles behind every steep front.
 *
 * Biharmonic divergence damping, u ← u − γ ∇(∇²D) in grid units, removes
 * gravity waves near the grid scale. A von Neumann-Richtmyer bulk viscosity,
 * u ← u + C Δt/Δx ∇(min(D, 0) D), acts only where the flow converges sharply,
 * and so spreads a bore over a few cells instead of letting it overshoot.
 */
const DAMP = `${COMMON}
uniform float uGamma;
uniform float uBulk;
out vec4 outQ;
float dv(int i, int j) {
  return texelFetch(uQ, ivec2(cIdx(i, uN.x, uWall.x), cIdx(j, uN.y, uWall.y)), 0).a;
}
float lap(int i, int j) {
  return dv(i + 1, j) + dv(i - 1, j) + dv(i, j + 1) + dv(i, j - 1) - 4.0 * dv(i, j);
}
float bulk(int i, int j) {
  float d = dv(i, j);
  return min(d, 0.0) * d;
}
void main() {
  ivec2 ij = ivec2(gl_FragCoord.xy);
  int i = ij.x;
  int j = ij.y;
  vec4 q = texelFetch(uQ, ij, 0);
  float l = lap(i, j);
  float b = bulk(i, j);
  q.r += -uGamma * (l - lap(i - 1, j)) - uBulk * (b - bulk(i - 1, j));
  q.g += -uGamma * (l - lap(i, j - 1)) - uBulk * (b - bulk(i, j - 1));
  if (uWall.x == 1 && i == 0) q.r = 0.0;
  if (uWall.y == 1 && j == 0) q.g = 0.0;
  outQ = q;
}`;

/** Add a Gaussian bump (x, y, radius, height) to η. */
const BUMP = `${COMMON}
uniform vec4 uBump;
uniform float uHMin;
out vec4 outQ;
void main() {
  ivec2 ij = ivec2(gl_FragCoord.xy);
  vec4 q = texelFetch(uQ, ij, 0);
  vec2 p = (vec2(ij) + 0.5) * uD;
  vec2 d = wrapD(p - uBump.xy);
  q.b += uBump.w * exp(-dot(d, d) / (uBump.z * uBump.z));
  q.b = max(q.b, uHMin - depthAt(p));
  outQ = q;
}`;

/** Largest |u′|, |v|, |η′| per block; w flags anything not finite. */
const REDUCE = `${COMMON}
out vec4 outQ;
void main() {
  ivec2 b = ivec2(gl_FragCoord.xy) * ${BLOCK};
  vec4 m = vec4(0.0);
  for (int dj = 0; dj < ${BLOCK}; dj++) {
    for (int di = 0; di < ${BLOCK}; di++) {
      ivec2 ij = b + ivec2(di, dj);
      if (ij.x >= uN.x || ij.y >= uN.y) continue;
      vec3 q = abs(texelFetch(uQ, ij, 0).rgb);
      // NaN fails every comparison, so it lands here too.
      if (!all(lessThan(q, vec3(1e20)))) m.w = 1.0;
      else m.xyz = max(m.xyz, q);
    }
  }
  outQ = m;
}`;

/** (u′, v, η′, resting depth) at one point. */
const PROBE = `${COMMON}
uniform vec2 uP;
out vec4 outQ;
void main() {
  outQ = vec4(sampleU(uP), sampleV(uP), sampleE(uP), depthAt(uP));
}`;

/** Color the chosen field over the whole domain. */
const DISPLAY = `${COMMON}
uniform int uField;
uniform float uRange;
uniform float uStep;
uniform vec4 uInk;
uniform sampler2D uLut;
in vec2 vUv;
out vec4 outColor;

vec3 lut(float s) {
  float t = 0.5 + 0.5 * clamp(s / uRange, -1.0, 1.0);
  return texture(uLut, vec2((t * 255.0 + 0.5) / 256.0, 0.5)).rgb;
}

void main() {
  vec2 p = vUv * vec2(uN) * uD;
  float s = uField == 0 ? sampleE(p) : (uField == 1 ? sampleU(p) : sampleV(p));
  vec3 col;
  if (uStep > 0.0) {
    float w = s / uStep;
    col = lut((floor(w) + 0.5) * uStep);
    // Lines along the band edges, about a pixel wide at any zoom. Water that
    // is perfectly still sits on the zero level but has no line through it.
    float fw = fwidth(w);
    float d = fw > 1e-6 ? abs(fract(w + 0.5) - 0.5) / fw : 1e6;
    col = mix(col, uInk.rgb, (1.0 - smoothstep(0.5, 1.3, d)) * uInk.a);
  } else {
    col = lut(s);
  }
  outColor = vec4(col, 1.0);
}`;

type Program = {
  prog: WebGLProgram;
  loc: (name: string) => WebGLUniformLocation | null;
};

export class ShallowWaterGL {
  readonly gl: WebGL2RenderingContext;
  private quad: WebGLVertexArrayObject;
  private buf: WebGLBuffer;
  private tex: WebGLTexture[] = [];
  private fbo: WebGLFramebuffer[] = [];
  private cur = 0;
  private redTex: WebGLTexture;
  private redFbo: WebGLFramebuffer;
  private probeTex: WebGLTexture;
  private probeFbo: WebGLFramebuffer;
  private lutTex: WebGLTexture;
  private progs: Record<"step" | "div" | "damp" | "bump" | "reduce" | "probe" | "display", Program>;
  private redBuf = new Float32Array(RX * RY * 4);
  private probeBuf = new Float32Array(4);

  /** Returns null when WebGL 2 or float render targets are unavailable. */
  static create(canvas: HTMLCanvasElement): ShallowWaterGL | null {
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, preserveDrawingBuffer: true });
    if (!gl || !gl.getExtension("EXT_color_buffer_float")) return null;
    try {
      return new ShallowWaterGL(gl);
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  private constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.progs = {
      step: this.program(STEP),
      div: this.program(DIV),
      damp: this.program(DAMP),
      bump: this.program(BUMP),
      reduce: this.program(REDUCE),
      probe: this.program(PROBE),
      display: this.program(DISPLAY),
    };

    this.buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    // One triangle that covers the viewport.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    this.quad = gl.createVertexArray()!;
    gl.bindVertexArray(this.quad);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    for (let k = 0; k < 3; k++) {
      const [t, f] = this.target(NX, NY);
      this.tex.push(t);
      this.fbo.push(f);
    }
    [this.redTex, this.redFbo] = this.target(RX, RY);
    [this.probeTex, this.probeFbo] = this.target(1, 1);

    this.lutTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(256 * 4));

    const status = (() => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo[0]);
      return gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    })();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (status !== gl.FRAMEBUFFER_COMPLETE) throw new Error("Float render targets are not supported");
  }

  private program(frag: string): Program {
    const gl = this.gl;
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error(`Shader compile failed: ${gl.getShaderInfoLog(s)}`);
      }
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(prog, 0, "aPos");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(`Program link failed: ${gl.getProgramInfoLog(prog)}`);
    }
    const cache = new Map<string, WebGLUniformLocation | null>();
    return {
      prog,
      loc: (name) => {
        if (!cache.has(name)) cache.set(name, gl.getUniformLocation(prog, name));
        return cache.get(name)!;
      },
    };
  }

  private target(w: number, h: number): [WebGLTexture, WebGLFramebuffer] {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, null);
    const f = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return [t, f];
  }

  /** Bind a program, the grid uniforms, and the state texture as uQ. */
  private use(p: Program, s: Settings, q: number) {
    const gl = this.gl;
    gl.useProgram(p.prog);
    gl.uniform2i(p.loc("uN"), NX, NY);
    gl.uniform2f(p.loc("uD"), DX, DY);
    gl.uniform2i(p.loc("uWall"), s.wallX ? 1 : 0, s.wallY ? 1 : 0);
    gl.uniform1f(p.loc("uH"), s.H);
    gl.uniform4f(p.loc("uMount"), s.mount.x, s.mount.y, s.mount.r, mountHeight(s));
    gl.uniform1f(p.loc("uHMin"), H_MIN_FRAC * s.H);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex[q]);
    gl.uniform1i(p.loc("uQ"), 0);
  }

  private draw(fbo: WebGLFramebuffer | null, w: number, h: number) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, w, h);
    gl.bindVertexArray(this.quad);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** Replace the state with η (cell centers) and the fluid at rest. */
  load(eta: Float32Array) {
    const gl = this.gl;
    const data = new Float32Array(NX * NY * 4);
    for (let k = 0; k < NX * NY; k++) data[k * 4 + 2] = eta[k];
    gl.bindTexture(gl.TEXTURE_2D, this.tex[this.cur]);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, NX, NY, gl.RGBA, gl.FLOAT, data);
  }

  /** Advance one time step of length dt with inflow U (zero across walls). */
  step(s: Settings, U: number, dt: number) {
    const gl = this.gl;
    const p = this.progs.step;
    const a = this.cur;
    const b = (a + 1) % 3;
    const c = (a + 2) % 3;
    const stage = (from: number, to: number, h: number) => {
      this.use(p, s, from);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.tex[a]);
      gl.uniform1i(p.loc("uBase"), 1);
      gl.uniform1f(p.loc("uDt"), h);
      gl.uniform1f(p.loc("uG"), s.g);
      gl.uniform1f(p.loc("uF"), s.fScaled * 1e-4);
      gl.uniform1f(p.loc("uU"), s.wallX ? 0 : U);
      gl.uniform1f(p.loc("uNl"), s.nonlinear ? 1 : 0);
      this.draw(this.fbo[to], NX, NY);
    };
    stage(a, b, dt / 3);
    stage(b, c, dt / 2);
    stage(c, b, dt);

    this.use(this.progs.div, s, b);
    this.draw(this.fbo[a], NX, NY);
    this.use(this.progs.damp, s, a);
    gl.uniform1f(this.progs.damp.loc("uGamma"), DAMPING);
    // Linearized, fronts never steepen, and the equations stay linear.
    gl.uniform1f(this.progs.damp.loc("uBulk"), s.nonlinear ? (BULK * dt) / DX : 0);
    this.draw(this.fbo[c], NX, NY);
    this.cur = c;
  }

  /** Drop a Gaussian bump of height `amp` (negative for a dip). */
  bump(s: Settings, x: number, y: number, r: number, amp: number) {
    const gl = this.gl;
    const p = this.progs.bump;
    const to = (this.cur + 1) % 3;
    this.use(p, s, this.cur);
    gl.uniform4f(p.loc("uBump"), x, y, r, amp);
    this.draw(this.fbo[to], NX, NY);
    this.cur = to;
  }

  stats(s: Settings): Stats {
    const gl = this.gl;
    this.use(this.progs.reduce, s, this.cur);
    this.draw(this.redFbo, RX, RY);
    gl.readPixels(0, 0, RX, RY, gl.RGBA, gl.FLOAT, this.redBuf);
    const out: Stats = { u: 0, v: 0, eta: 0, bad: false };
    const r = this.redBuf;
    for (let k = 0; k < RX * RY; k++) {
      if (r[k * 4 + 3] > 0 || !Number.isFinite(r[k * 4] + r[k * 4 + 1] + r[k * 4 + 2])) out.bad = true;
      out.u = Math.max(out.u, r[k * 4]);
      out.v = Math.max(out.v, r[k * 4 + 1]);
      out.eta = Math.max(out.eta, r[k * 4 + 2]);
    }
    return out;
  }

  probe(s: Settings, x: number, y: number): Probe {
    const gl = this.gl;
    const p = this.progs.probe;
    this.use(p, s, this.cur);
    gl.uniform2f(p.loc("uP"), Math.min(LX, Math.max(0, x)), Math.min(LY, Math.max(0, y)));
    this.draw(this.probeFbo, 1, 1);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, this.probeBuf);
    const [u, v, eta, depth] = this.probeBuf;
    return { u, v, eta, depth };
  }

  setLut(lut: Uint8Array) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 1, gl.RGBA, gl.UNSIGNED_BYTE, lut);
  }

  /** Draw the field into the canvas at its current pixel size. */
  render(s: Settings, view: View) {
    const gl = this.gl;
    const p = this.progs.display;
    this.use(p, s, this.cur);
    gl.uniform1i(p.loc("uField"), view.field);
    gl.uniform1f(p.loc("uRange"), view.range);
    gl.uniform1f(p.loc("uStep"), view.step);
    gl.uniform4f(p.loc("uInk"), ...view.ink);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    gl.uniform1i(p.loc("uLut"), 1);
    this.draw(null, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }

  /** Largest stable time step for gravity waves plus advection. */
  static maxDt(s: Settings, U: number, st: Stats | null): number {
    const h = s.H + (st ? st.eta : 0);
    const speed = Math.sqrt(s.g * h) + (s.wallX ? 0 : Math.abs(U)) + (st ? Math.max(st.u, st.v) : 0);
    return (0.4 * Math.min(DX, DY)) / speed;
  }

  dispose() {
    const gl = this.gl;
    for (const t of [...this.tex, this.redTex, this.probeTex, this.lutTex]) gl.deleteTexture(t);
    for (const f of [...this.fbo, this.redFbo, this.probeFbo]) gl.deleteFramebuffer(f);
    for (const p of Object.values(this.progs)) gl.deleteProgram(p.prog);
    gl.deleteBuffer(this.buf);
    gl.deleteVertexArray(this.quad);
  }
}
