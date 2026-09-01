<script lang="ts">
  import { onMount } from "svelte";
  import { onThemeChange, readTheme, type Theme } from "./plot";
  import {
    DEFAULT_VIEW,
    type Vec2,
    type Vec3,
    arrowParts,
    eventToSvg,
    fmt,
    project3dToWorld,
    projectOntoSvgAxis,
    vectorColors,
    worldToSvg,
  } from "./vectors";

  type Axis = "x" | "y" | "z";
  type Face = "in" | "out";
  type HandleId = `${Axis}${Face}`;

  type Fluxes = {
    xin: number;
    xout: number;
    yin: number;
    yout: number;
    zin: number;
    zout: number;
  };

  const HANDLES: { id: HandleId; axis: Axis; face: Face; label: string }[] = [
    { id: "xin", axis: "x", face: "in", label: "ρu in" },
    { id: "xout", axis: "x", face: "out", label: "ρu out" },
    { id: "yin", axis: "y", face: "in", label: "ρv in" },
    { id: "yout", axis: "y", face: "out", label: "ρv out" },
    { id: "zin", axis: "z", face: "in", label: "ρw in" },
    { id: "zout", axis: "z", face: "out", label: "ρw out" },
  ];

  const DEFAULT_FLUX: Fluxes = {
    xin: 1.15,
    xout: 1.55,
    yin: 0.9,
    yout: 0.9,
    zin: 0.75,
    zout: 0.75,
  };

  const view = { ...DEFAULT_VIEW, pad: 48, min: -3.6, max: 3.6 };
  const H = 1.05;
  const ARROW_SCALE = 0.7;
  const FLUX_MAX = 2.5;
  const MIN_ARROW = 0.28;
  const PITCH_MAX = 1.15;
  const ORBIT_SENS = 0.007;
  /** 15° yaw turns the isometric's 45° xy diagonal into a 30° view from +x. */
  const DEFAULT_YAW = Math.PI / 12;
  const DEFAULT_PITCH = 0;
  const origin: Vec3 = { x: 0, y: 0, z: 0 };

  let flux = $state<Fluxes>({ ...DEFAULT_FLUX });
  let yaw = $state(DEFAULT_YAW);
  let pitch = $state(DEFAULT_PITCH);
  let theme = $state<Theme | null>(null);
  let svgEl: SVGSVGElement | undefined;
  let dragging: HandleId | null = $state(null);
  let orbiting = $state(false);
  let lastPtr = { x: 0, y: 0 };

  const colors = $derived(
    theme ? vectorColors(theme) : { a: "#9b2c2c", b: "#1d6a8a", result: "#2d6a4f" },
  );
  const fg = $derived(theme?.fg ?? "#1c1915");
  const muted = $derived(theme?.muted ?? "#5e574c");
  const rule = $derived(theme?.rule ?? "#d3c9b6");

  const axisColor = $derived({ x: colors.a, y: colors.b, z: colors.result });

  const divX = $derived(flux.xout - flux.xin);
  const divY = $derived(flux.yout - flux.yin);
  const divZ = $derived(flux.zout - flux.zin);
  const div = $derived(divX + divY + divZ);
  const drhoDt = $derived(-div);

  const callout = $derived.by(() => {
    if (Math.abs(drhoDt) < 0.05) return "steady — mass in balances mass out";
    if (drhoDt > 0) return "convergence — density increasing";
    return "divergence — density decreasing";
  });

  const cubeFill = $derived.by(() => {
    const t = Math.min(1, Math.abs(drhoDt) / 1.2);
    if (Math.abs(drhoDt) < 0.05) return { color: colors.result, opacity: 0.1 };
    if (drhoDt > 0) return { color: colors.a, opacity: 0.12 + 0.22 * t };
    return { color: colors.b, opacity: 0.12 + 0.22 * t };
  });

  function set(p: Vec3, axis: Axis, value: number): Vec3 {
    return { x: p.x, y: p.y, z: p.z, [axis]: value };
  }

  function add3(a: Vec3, b: Vec3): Vec3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  }

  function scale3(a: Vec3, s: number): Vec3 {
    return { x: a.x * s, y: a.y * s, z: a.z * s };
  }

  function dot3(a: Vec3, b: Vec3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  function axisHat(axis: Axis): Vec3 {
    return { x: axis === "x" ? 1 : 0, y: axis === "y" ? 1 : 0, z: axis === "z" ? 1 : 0 };
  }

  /** Object → view: yaw around z, then pitch around x. Identity is the original isometric. */
  function rotate3(p: Vec3): Vec3 {
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const x1 = cy * p.x - sy * p.y;
    const y1 = sy * p.x + cy * p.y;
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    return {
      x: x1,
      y: cp * y1 - sp * p.z,
      z: sp * y1 + cp * p.z,
    };
  }

  function toWorld(p: Vec3): Vec2 {
    return project3dToWorld(rotate3(p));
  }

  function toSvg(p: Vec3) {
    return worldToSvg(toWorld(p), view);
  }

  /**
   * Direction from a cube point toward the viewer, in object space.
   * After yaw/pitch, the isometric map hides the (x + y − z) axis; the near
   * side of that axis is (−x, −y, +z) in view space.
   */
  function camObject(): Vec3 {
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const y1 = -cp + sp;
    const z1 = cp + sp;
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    return {
      x: -cy + sy * y1,
      y: sy + cy * y1,
      z: z1,
    };
  }

  function faceCenter(axis: Axis, face: Face): Vec3 {
    return set(origin, axis, face === "in" ? -H : H);
  }

  function clampFlux(v: number): number {
    return Math.min(FLUX_MAX, Math.max(-FLUX_MAX, v));
  }

  function joinTerms(values: number[]): string {
    return values
      .map((v, i) => {
        const mag = fmt(Math.abs(v));
        if (i === 0) return v < 0 ? `−${mag}` : mag;
        return v < 0 ? ` − ${mag}` : ` + ${mag}`;
      })
      .join("");
  }

  function svgArrow(from: { x: number; y: number }, to: { x: number; y: number }, head = 8) {
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
    return {
      line: { x1: from.x, y1: from.y, x2: base.x, y2: base.y },
      head: `${to.x},${to.y} ${base.x + nx * hw},${base.y + ny * hw} ${base.x - nx * hw},${base.y - ny * hw}`,
      tip: to,
    };
  }

  const cube = $derived.by(() => {
    const c = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
    const nnn = c(-H, -H, -H);
    const pnn = c(H, -H, -H);
    const npn = c(-H, H, -H);
    const ppn = c(H, H, -H);
    const nnp = c(-H, -H, H);
    const pnp = c(H, -H, H);
    const npp = c(-H, H, H);
    const ppp = c(H, H, H);
    const cam = camObject();
    const front = (n: Vec3) => dot3(n, cam) > 1e-6;
    const pts = (verts: Vec3[]) => verts.map((p) => toSvg(p)).map((p) => `${p.x},${p.y}`).join(" ");
    const edge = (a: Vec3, b: Vec3) => {
      const A = toSvg(a);
      const B = toSvg(b);
      return { x1: A.x, y1: A.y, x2: B.x, y2: B.y };
    };
    const faces = [
      { n: c(1, 0, 0), verts: [pnn, ppn, ppp, pnp] },
      { n: c(-1, 0, 0), verts: [npn, npp, nnp, nnn] },
      { n: c(0, 1, 0), verts: [npn, ppn, ppp, npp] },
      { n: c(0, -1, 0), verts: [nnn, nnp, pnp, pnn] },
      { n: c(0, 0, 1), verts: [nnp, pnp, ppp, npp] },
      { n: c(0, 0, -1), verts: [nnn, pnn, ppn, npn] },
    ];
    const visible = faces
      .filter((f) => front(f.n))
      .map((f) => {
        const mid = f.verts.reduce((s, v) => add3(s, v), c(0, 0, 0));
        return { pts: pts(f.verts), toward: dot3(scale3(mid, 0.25), cam) };
      })
      .sort((a, b) => a.toward - b.toward);
    const segs = [
      { a: nnn, b: pnn, n1: c(0, -1, 0), n2: c(0, 0, -1) },
      { a: nnn, b: npn, n1: c(-1, 0, 0), n2: c(0, 0, -1) },
      { a: nnn, b: nnp, n1: c(-1, 0, 0), n2: c(0, -1, 0) },
      { a: pnn, b: ppn, n1: c(1, 0, 0), n2: c(0, 0, -1) },
      { a: pnn, b: pnp, n1: c(1, 0, 0), n2: c(0, -1, 0) },
      { a: npn, b: ppn, n1: c(0, 1, 0), n2: c(0, 0, -1) },
      { a: npn, b: npp, n1: c(0, 1, 0), n2: c(-1, 0, 0) },
      { a: nnp, b: pnp, n1: c(0, -1, 0), n2: c(0, 0, 1) },
      { a: nnp, b: npp, n1: c(-1, 0, 0), n2: c(0, 0, 1) },
      { a: pnp, b: ppp, n1: c(1, 0, 0), n2: c(0, 0, 1) },
      { a: npp, b: ppp, n1: c(0, 1, 0), n2: c(0, 0, 1) },
      { a: ppn, b: ppp, n1: c(1, 0, 0), n2: c(0, 1, 0) },
    ];
    const hidden: ReturnType<typeof edge>[] = [];
    const solid: ReturnType<typeof edge>[] = [];
    for (const s of segs) {
      const line = edge(s.a, s.b);
      if (!front(s.n1) && !front(s.n2)) hidden.push(line);
      else solid.push(line);
    }
    return { visible, hidden, solid };
  });

  const gizmo = $derived.by(() => {
    const from = { x: view.pad + 10, y: view.size - view.pad - 6 };
    const k = 26;
    const axis = (hat: Vec3, name: string, color: string) => {
      const d = project3dToWorld(rotate3(hat));
      const to = { x: from.x + d.x * k, y: from.y - d.y * k };
      const arr = svgArrow(from, to, 7);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const n = Math.hypot(dx, dy) || 1;
      return {
        ...arr,
        color,
        name,
        lab: { x: to.x + (dx / n) * 11, y: to.y + (dy / n) * 11 },
      };
    };
    const items = [
      axis({ x: 1, y: 0, z: 0 }, "x", axisColor.x),
      axis({ x: 0, y: 1, z: 0 }, "y", axisColor.y),
      axis({ x: 0, y: 0, z: 1 }, "z", axisColor.z),
    ];
    items.sort((a, b) => a.line.y1 + a.line.y2 - (b.line.y1 + b.line.y2));
    return items;
  });

  type ArrowDraw = {
    id: HandleId;
    color: string;
    parts: ReturnType<typeof arrowParts>;
    handle: { x: number; y: number };
    label: { x: number; y: number; text: string };
    aria: string;
  };

  const arrows = $derived.by((): ArrowDraw[] => {
    const out: ArrowDraw[] = [];
    for (const h of HANDLES) {
      const f = flux[h.id];
      const center = faceCenter(h.axis, h.face);
      const hat = axisHat(h.axis);
      const outSign = h.face === "out" ? 1 : -1;
      const outward = scale3(hat, outSign);
      const len = Math.max(MIN_ARROW, Math.abs(f) * ARROW_SCALE);
      const outer = add3(center, scale3(outward, len));
      const flowSign = f >= 0 ? 1 : -1;
      const flowDotOut = flowSign * outSign;
      const from = flowDotOut >= 0 ? center : outer;
      const to = flowDotOut >= 0 ? outer : center;
      const handle = toSvg(outer);
      const dx = handle.x - toSvg(center).x;
      const dy = handle.y - toSvg(center).y;
      const n = Math.hypot(dx, dy) || 1;
      const name = h.axis === "x" ? "ρu" : h.axis === "y" ? "ρv" : "ρw";
      out.push({
        id: h.id,
        color: axisColor[h.axis],
        parts: arrowParts(toWorld(from), toWorld(to), view, 10),
        handle,
        label: {
          x: handle.x + (dx / n) * 16,
          y: handle.y + (dy / n) * 16,
          text: name,
        },
        aria: `${h.label}, value ${fmt(f)}. Drag or use arrow keys to resize.`,
      });
    }
    return out;
  });

  function fluxFromPointer(e: PointerEvent, id: HandleId): number {
    if (!svgEl) return flux[id];
    const spec = HANDLES.find((h) => h.id === id);
    if (!spec) return flux[id];
    const center = faceCenter(spec.axis, spec.face);
    const originSvg = toSvg(center);
    const axisEnd = add3(center, axisHat(spec.axis));
    const t = projectOntoSvgAxis(eventToSvg(svgEl, e, view), originSvg, toSvg(axisEnd));
    const raw = spec.face === "out" ? t / ARROW_SCALE : -t / ARROW_SCALE;
    return clampFlux(raw);
  }

  function apply(id: HandleId, value: number) {
    flux = { ...flux, [id]: clampFlux(value) };
  }

  function startDrag(e: PointerEvent, id: HandleId) {
    e.preventDefault();
    e.stopPropagation();
    dragging = id;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    apply(id, fluxFromPointer(e, id));
  }

  function moveDrag(e: PointerEvent) {
    if (!dragging) return;
    apply(dragging, fluxFromPointer(e, dragging));
  }

  function endDrag(e: PointerEvent) {
    if (!dragging) return;
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    dragging = null;
  }

  function startOrbit(e: PointerEvent) {
    if (dragging) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    orbiting = true;
    lastPtr = { x: e.clientX, y: e.clientY };
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* capture not available */
    }
  }

  function moveOrbit(e: PointerEvent) {
    if (!orbiting) return;
    const dx = e.clientX - lastPtr.x;
    const dy = e.clientY - lastPtr.y;
    lastPtr = { x: e.clientX, y: e.clientY };
    yaw -= dx * ORBIT_SENS;
    pitch = Math.min(PITCH_MAX, Math.max(-PITCH_MAX, pitch + dy * ORBIT_SENS));
  }

  function endOrbit(e: PointerEvent) {
    if (!orbiting) return;
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    orbiting = false;
  }

  function onKey(e: KeyboardEvent, id: HandleId) {
    const step = e.shiftKey ? 0.5 : 0.1;
    let d = 0;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") d = -step;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") d = step;
    else return;
    e.preventDefault();
    apply(id, flux[id] + d);
  }

  function reset() {
    flux = { ...DEFAULT_FLUX };
    yaw = DEFAULT_YAW;
    pitch = DEFAULT_PITCH;
  }

  function steady() {
    flux = {
      xin: flux.xin,
      xout: flux.xin,
      yin: flux.yin,
      yout: flux.yin,
      zin: flux.zin,
      zout: flux.zin,
    };
  }

  function converge() {
    flux = {
      xin: 1.5,
      xout: 0.7,
      yin: 1.1,
      yout: 0.5,
      zin: 0.95,
      zout: 0.4,
    };
  }

  function diverge() {
    flux = {
      xin: 0.7,
      xout: 1.5,
      yin: 0.5,
      yout: 1.1,
      zin: 0.4,
      zout: 0.95,
    };
  }

  onMount(() => {
    theme = readTheme();
    return onThemeChange(() => {
      theme = readTheme();
    });
  });
</script>

<div class="interactive">
  <p class="interactive-title">Eulerian continuity</p>
  <p class="interactive-caption">
    Drag any mass-flux arrow to resize it. Drag elsewhere to rotate the view.
    The cube is a unit volume (Δ<em>x</em> = Δ<em>y</em> = Δ<em>z</em> = 1);
    positive arrows point in the + axis direction. The local density tendency is
    minus the sum of the three face-pair contributions.
  </p>
  <div class="vector-stage">
    <svg
      bind:this={svgEl}
      class="vector-canvas orbit-canvas"
      class:is-dragging={dragging !== null || orbiting}
      viewBox="0 0 {view.size} {view.size}"
      aria-label="Rotatable control volume with draggable mass-flux arrows. Drag the background to rotate; drag an arrow tip to change flux."
    >
      <rect
        class="orbit-hit"
        x="0"
        y="0"
        width={view.size}
        height={view.size}
        role="button"
        tabindex="0"
        aria-label="Drag to rotate the coordinate system"
        onpointerdown={startOrbit}
        onpointermove={moveOrbit}
        onpointerup={endOrbit}
        onpointercancel={endOrbit}
      />
      {#each cube.hidden as e}
        <line {...e} stroke={rule} stroke-width="1.15" stroke-dasharray="6 5" pointer-events="none" />
      {/each}
      {#each cube.visible as face}
        <polygon points={face.pts} fill={cubeFill.color} opacity={cubeFill.opacity} pointer-events="none" />
      {/each}
      {#each cube.solid as e}
        <line {...e} stroke={fg} stroke-width="1.35" pointer-events="none" />
      {/each}

      {#each gizmo as g}
        <line {...g.line} stroke={g.color} stroke-width="1.6" pointer-events="none" />
        <polygon points={g.head} fill={g.color} pointer-events="none" />
        <text
          x={g.lab.x}
          y={g.lab.y}
          text-anchor="middle"
          dominant-baseline="middle"
          fill={g.color}
          font-size="13"
          pointer-events="none">{g.name}</text
        >
      {/each}

      {#each arrows as a}
        <line {...a.parts.line} stroke={a.color} stroke-width="2.4" stroke-linecap="round" pointer-events="none" />
        <polygon points={a.parts.head} fill={a.color} pointer-events="none" />
        {#if a.label.text}
          <text
            x={a.label.x}
            y={a.label.y}
            text-anchor="middle"
            dominant-baseline="middle"
            fill={a.color}
            font-size="13"
            font-style="italic"
            pointer-events="none">{a.label.text}</text
          >
        {/if}
      {/each}

      {#each arrows as a}
        <circle
          class="vec-hit"
          cx={a.handle.x}
          cy={a.handle.y}
          r="16"
          tabindex="0"
          role="button"
          aria-label={a.aria}
          onpointerdown={(e) => startDrag(e, a.id)}
          onpointermove={moveDrag}
          onpointerup={endDrag}
          onpointercancel={endDrag}
          onkeydown={(e) => onKey(e, a.id)}
        />
        <circle class="vec-tip" cx={a.handle.x} cy={a.handle.y} r="5.5" fill={a.color} />
      {/each}
    </svg>
  </div>
  <p class="vector-callout" class:is-zero={Math.abs(drhoDt) < 0.05}>{callout}</p>
  <div class="readout" aria-live="polite">
    <span>(ρu)<sub>in</sub>, (ρu)<sub>out</sub></span><span>= {fmt(flux.xin)}, {fmt(flux.xout)}</span>
    <span>∂(ρu)/∂x</span><span>= {fmt(divX)}</span>
    <span>(ρv)<sub>in</sub>, (ρv)<sub>out</sub></span><span>= {fmt(flux.yin)}, {fmt(flux.yout)}</span>
    <span>∂(ρv)/∂y</span><span>= {fmt(divY)}</span>
    <span>(ρw)<sub>in</sub>, (ρw)<sub>out</sub></span><span>= {fmt(flux.zin)}, {fmt(flux.zout)}</span>
    <span>∂(ρw)/∂z</span><span>= {fmt(divZ)}</span>
    <span>∇ · (ρu)</span><span>= {fmt(div)}</span>
    <span>∂ρ/∂t</span><span>= −({joinTerms([divX, divY, divZ])}) = {fmt(drhoDt)}</span>
  </div>
  <div class="controls vector-actions">
    <button type="button" onclick={reset}>Reset</button>
    <button type="button" onclick={steady}>Steady</button>
    <button type="button" onclick={converge}>Converge</button>
    <button type="button" onclick={diverge}>Diverge</button>
  </div>
</div>
