<script lang="ts">
  import { onMount } from "svelte";
  import { onThemeChange, readTheme, type Theme } from "./plot";
  import {
    DEFAULT_VIEW,
    INSET_VIEW,
    type Vec2,
    type Vec3,
    add,
    angle,
    angleArcPath,
    angleLabelPos,
    arrowParts,
    axisTicks,
    clampVec,
    crossZ,
    eventToWorld,
    fitInView,
    fmt,
    fmtDeg,
    labelPos,
    norm,
    parallelTo,
    perpendicular,
    project3dToWorld,
    vectorColors,
    withMinLength,
    worldToSvg,
  } from "./vectors";

  const A_DEFAULT: Vec2 = { x: 2, y: 0.5 };
  const B_DEFAULT: Vec2 = { x: 0.5, y: 2 };
  const view = DEFAULT_VIEW;
  const inset = INSET_VIEW;
  const origin = { x: 0, y: 0 };
  const ticks = axisTicks(view);

  let a = $state<Vec2>({ ...A_DEFAULT });
  let b = $state<Vec2>({ ...B_DEFAULT });
  let theme = $state<Theme | null>(null);
  let svgEl: SVGSVGElement | undefined;
  let dragging: "a" | "b" | null = $state(null);

  const colors = $derived(
    theme ? vectorColors(theme) : { a: "#9b2c2c", b: "#1d6a8a", result: "#2d6a4f" },
  );
  const fg = $derived(theme?.fg ?? "#1c1915");
  const muted = $derived(theme?.muted ?? "#5e574c");
  const rule = $derived(theme?.rule ?? "#d3c9b6");
  const bg = $derived(theme?.bg ?? "#f7f3eb");

  const o = $derived(worldToSvg(origin, view));
  const na = $derived(norm(a));
  const nb = $derived(norm(b));
  const cz = $derived(crossZ(a, b));
  const th = $derived(angle(a, b));
  const mag = $derived(Math.abs(cz));
  const sinForm = $derived(na * nb * Math.sin(th));
  const parallel = $derived(mag < 0.05);
  const orthogonal = $derived(Math.abs(Math.cos(th)) < 0.04);

  const aArrow = $derived(arrowParts(origin, a, view));
  const bArrow = $derived(arrowParts(origin, b, view));
  const aTip = $derived(worldToSvg(a, view));
  const bTip = $derived(worldToSvg(b, view));
  const sum = $derived(add(a, b));
  const para = $derived([origin, a, sum, b].map((p) => worldToSvg(p, view)));
  const paraPts = $derived(para.map((p) => `${p.x},${p.y}`).join(" "));
  const aLabel = $derived(labelPos(a, view));
  const bLabel = $derived(labelPos(b, view));
  const arc = $derived(angleArcPath(a, b, view));
  const thetaPos = $derived(angleLabelPos(a, b, view));
  const outOfPage = $derived(cz > 0.05);
  const intoPage = $derived(cz < -0.05);

  const relation = $derived.by(() => {
    if (parallel) return "parallel ⇒ a × b = 0";
    if (orthogonal) return "orthogonal ⇒ |a × b| is largest";
    if (outOfPage) return "out of the page ⊙  (right-hand rule)";
    return "into the page ⊗  (right-hand rule)";
  });

  const scene3 = $derived.by(() => {
    const a3: Vec3 = { x: a.x, y: a.y, z: 0 };
    const b3: Vec3 = { x: b.x, y: b.y, z: 0 };
    const c3: Vec3 = { x: 0, y: 0, z: cz };
    const ab: Vec3 = { x: a.x + b.x, y: a.y + b.y, z: 0 };
    // Same world units as the 2D plot: the plane/axes mark ±3, and a×b is not
    // rescaled to fit that box, so its length can exceed |a| and |b|.
    const s = 2.05 / Math.abs(view.max);
    const sc = (p: Vec3): Vec3 => ({ x: p.x * s, y: p.y * s, z: p.z * s });
    const A = sc(a3);
    const B = sc(b3);
    const C = sc(c3);
    const AB = sc(ab);
    const to = (p: Vec3) => project3dToWorld(p);
    const plane = 2.05;
    const planeWorld = [
      to({ x: -plane, y: -plane, z: 0 }),
      to({ x: plane, y: -plane, z: 0 }),
      to({ x: plane, y: plane, z: 0 }),
      to({ x: -plane, y: plane, z: 0 }),
    ];
    const axis = 2.05;
    return {
      planePts: planeWorld.map((p) => worldToSvg(p, inset)),
      paraPts: [to({ x: 0, y: 0, z: 0 }), to(A), to(AB), to(B)].map((p) => worldToSvg(p, inset)),
      xAxis: arrowParts(origin, to({ x: axis, y: 0, z: 0 }), inset, 8),
      yAxis: arrowParts(origin, to({ x: 0, y: axis, z: 0 }), inset, 8),
      zAxis: arrowParts(origin, to({ x: 0, y: 0, z: axis }), inset, 8),
      aArr: arrowParts(origin, to(A), inset, 10),
      bArr: arrowParts(origin, to(B), inset, 10),
      cArr: arrowParts(origin, to(C), inset, 10),
      aLab: labelPos(to(A), inset, 12),
      bLab: labelPos(to(B), inset, 12),
      cLab: labelPos(to(C), inset, 12),
      xLab: labelPos(to({ x: axis, y: 0, z: 0 }), inset, 11),
      yLab: labelPos(to({ x: 0, y: axis, z: 0 }), inset, 11),
      zLab: labelPos(to({ x: 0, y: 0, z: axis }), inset, 11),
      showC: mag > 0.08,
    };
  });

  function apply(which: "a" | "b", v: Vec2) {
    const next = withMinLength(clampVec(v, view.min, view.max));
    if (which === "a") a = next;
    else b = next;
  }

  function startDrag(e: PointerEvent, which: "a" | "b") {
    e.preventDefault();
    e.stopPropagation();
    dragging = which;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    if (svgEl) apply(which, eventToWorld(svgEl, e, view));
  }

  function moveDrag(e: PointerEvent) {
    if (!dragging || !svgEl) return;
    apply(dragging, eventToWorld(svgEl, e, view));
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

  function onKey(e: KeyboardEvent, which: "a" | "b") {
    const step = e.shiftKey ? 0.5 : 0.1;
    let dx = 0;
    let dy = 0;
    if (e.key === "ArrowLeft") dx = -step;
    else if (e.key === "ArrowRight") dx = step;
    else if (e.key === "ArrowUp") dy = step;
    else if (e.key === "ArrowDown") dy = -step;
    else return;
    e.preventDefault();
    const cur = which === "a" ? a : b;
    apply(which, { x: cur.x + dx, y: cur.y + dy });
  }

  function reset() {
    a = { ...A_DEFAULT };
    b = { ...B_DEFAULT };
  }

  function makeOrthogonal() {
    a = fitInView(perpendicular(b, a), view.min, view.max);
  }

  function makeParallel() {
    a = fitInView(parallelTo(b, a), view.min, view.max);
  }

  function swap() {
    const nextA = { x: b.x, y: b.y };
    const nextB = { x: a.x, y: a.y };
    a = nextA;
    b = nextB;
  }

  onMount(() => {
    theme = readTheme();
    return onThemeChange(() => {
      theme = readTheme();
    });
  });
</script>

<div class="interactive">
  <p class="interactive-title">Cross product</p>
  <p class="interactive-caption">
    Both vectors lie in the <em>x</em>-<em>y</em> plane, so
    <em>a</em> × <em>b</em> is along <em>z</em>. Drag either tip; the parallelogram
    area equals |<em>a</em> × <em>b</em>|. Thumb along <em>a</em>, index along
    <em>b</em>, middle finger along <em>a</em> × <em>b</em>.
  </p>
  <div class="vector-stage with-inset">
    <svg
      bind:this={svgEl}
      class="vector-canvas"
      class:is-dragging={dragging !== null}
      viewBox="0 0 {view.size} {view.size}"
      role="img"
      aria-label="Two draggable vectors, the parallelogram they span, and the cross product along z"
    >
      {#each ticks as t}
        {@const x = worldToSvg({ x: t, y: 0 }, view)}
        {@const y = worldToSvg({ x: 0, y: t }, view)}
        <line x1={x.x} y1={view.pad} x2={x.x} y2={view.size - view.pad} stroke={rule} stroke-width="1" />
        <line x1={view.pad} y1={y.y} x2={view.size - view.pad} y2={y.y} stroke={rule} stroke-width="1" />
        <text x={x.x} y={o.y + 14} text-anchor="middle" fill={muted} font-size="11">{t}</text>
        <text x={o.x - 8} y={y.y + 4} text-anchor="end" fill={muted} font-size="11">{t}</text>
      {/each}
      <line x1={view.pad} y1={o.y} x2={view.size - view.pad} y2={o.y} stroke={fg} stroke-width="1.2" />
      <line x1={o.x} y1={view.pad} x2={o.x} y2={view.size - view.pad} stroke={fg} stroke-width="1.2" />
      <text x={view.size - view.pad + 4} y={o.y - 6} fill={muted} font-size="12">x</text>
      <text x={o.x + 6} y={view.pad - 6} fill={muted} font-size="12">y</text>

      <polygon points={paraPts} fill={colors.result} opacity="0.18" stroke={colors.result} stroke-width="1.2" />

      <path d={arc} fill="none" stroke={muted} stroke-width="1.4" />
      <text x={thetaPos.x} y={thetaPos.y} text-anchor="middle" dominant-baseline="middle" fill={muted} font-size="12"
        >θ</text
      >

      <g transform="translate({o.x} {o.y})">
        <circle r="10" fill={bg} stroke={fg} stroke-width="1.4" />
        {#if outOfPage}
          <circle r="3.1" fill={colors.result} />
        {:else if intoPage}
          <line x1="-5" y1="-5" x2="5" y2="5" stroke={colors.result} stroke-width="1.6" />
          <line x1="5" y1="-5" x2="-5" y2="5" stroke={colors.result} stroke-width="1.6" />
        {/if}
      </g>

      <line {...bArrow.line} stroke={colors.b} stroke-width="2.4" stroke-linecap="round" />
      <polygon points={bArrow.head} fill={colors.b} />
      <line {...aArrow.line} stroke={colors.a} stroke-width="2.4" stroke-linecap="round" />
      <polygon points={aArrow.head} fill={colors.a} />

      <text x={aLabel.x} y={aLabel.y} text-anchor="middle" dominant-baseline="middle" fill={colors.a} font-size="15" font-style="italic"
        >a</text
      >
      <text x={bLabel.x} y={bLabel.y} text-anchor="middle" dominant-baseline="middle" fill={colors.b} font-size="15" font-style="italic"
        >b</text
      >

      <circle
        class="vec-hit"
        cx={bTip.x}
        cy={bTip.y}
        r="16"
        tabindex="0"
        role="button"
        aria-label="Vector b tip, drag or use arrow keys"
        onpointerdown={(e) => startDrag(e, "b")}
        onpointermove={moveDrag}
        onpointerup={endDrag}
        onpointercancel={endDrag}
        onkeydown={(e) => onKey(e, "b")}
      />
      <circle class="vec-tip" cx={bTip.x} cy={bTip.y} r="5.5" fill={colors.b} />
      <circle
        class="vec-hit"
        cx={aTip.x}
        cy={aTip.y}
        r="16"
        tabindex="0"
        role="button"
        aria-label="Vector a tip, drag or use arrow keys"
        onpointerdown={(e) => startDrag(e, "a")}
        onpointermove={moveDrag}
        onpointerup={endDrag}
        onpointercancel={endDrag}
        onkeydown={(e) => onKey(e, "a")}
      />
      <circle class="vec-tip" cx={aTip.x} cy={aTip.y} r="5.5" fill={colors.a} />
    </svg>
    <div class="vector-inset">
      <p class="inset-label">3D view</p>
      <svg viewBox="0 0 {inset.size} {inset.size}" role="img" aria-label="Orthographic view of a, b, and a cross b">
        <polygon
          points={scene3.planePts.map((p) => `${p.x},${p.y}`).join(" ")}
          fill={rule}
          opacity="0.28"
          stroke={rule}
          stroke-width="1"
        />
        <polygon
          points={scene3.paraPts.map((p) => `${p.x},${p.y}`).join(" ")}
          fill={colors.result}
          opacity="0.22"
          stroke={colors.result}
          stroke-width="1"
        />
        <line {...scene3.xAxis.line} stroke={muted} stroke-width="1.2" />
        <polygon points={scene3.xAxis.head} fill={muted} />
        <line {...scene3.yAxis.line} stroke={muted} stroke-width="1.2" />
        <polygon points={scene3.yAxis.head} fill={muted} />
        <line {...scene3.zAxis.line} stroke={muted} stroke-width="1.2" />
        <polygon points={scene3.zAxis.head} fill={muted} />
        <text x={scene3.xLab.x} y={scene3.xLab.y} text-anchor="middle" fill={muted} font-size="11">x</text>
        <text x={scene3.yLab.x} y={scene3.yLab.y} text-anchor="middle" fill={muted} font-size="11">y</text>
        <text x={scene3.zLab.x} y={scene3.zLab.y} text-anchor="middle" fill={muted} font-size="11">z</text>
        <line {...scene3.bArr.line} stroke={colors.b} stroke-width="2.2" stroke-linecap="round" />
        <polygon points={scene3.bArr.head} fill={colors.b} />
        <line {...scene3.aArr.line} stroke={colors.a} stroke-width="2.2" stroke-linecap="round" />
        <polygon points={scene3.aArr.head} fill={colors.a} />
        {#if scene3.showC}
          <line {...scene3.cArr.line} stroke={colors.result} stroke-width="2.4" stroke-linecap="round" />
          <polygon points={scene3.cArr.head} fill={colors.result} />
          <text
            x={scene3.cLab.x}
            y={scene3.cLab.y}
            text-anchor="middle"
            dominant-baseline="middle"
            fill={colors.result}
            font-size="12"
            font-style="italic">a × b</text
          >
        {/if}
        <text
          x={scene3.aLab.x}
          y={scene3.aLab.y}
          text-anchor="middle"
          dominant-baseline="middle"
          fill={colors.a}
          font-size="13"
          font-style="italic">a</text
        >
        <text
          x={scene3.bLab.x}
          y={scene3.bLab.y}
          text-anchor="middle"
          dominant-baseline="middle"
          fill={colors.b}
          font-size="13"
          font-style="italic">b</text
        >
      </svg>
    </div>
  </div>
  <p class="vector-callout" class:is-zero={parallel}>{relation}</p>
  <div class="readout" aria-live="polite">
    <span>a</span><span>= ({fmt(a.x)}, {fmt(a.y)}, 0.00)</span>
    <span>b</span><span>= ({fmt(b.x)}, {fmt(b.y)}, 0.00)</span>
    <span>a × b</span><span>= (0.00, 0.00, {fmt(cz)})</span>
    <span>|a × b|</span><span>= {fmt(mag)}  (parallelogram area)</span>
    <span>|a|, |b|, θ</span><span>= {fmt(na)}, {fmt(nb)}, {fmtDeg(th)}</span>
    <span>|a| |b| sin θ</span><span>= {fmt(sinForm)}</span>
  </div>
  <div class="controls vector-actions">
    <button type="button" onclick={reset}>Reset</button>
    <button type="button" onclick={makeOrthogonal}>Make orthogonal</button>
    <button type="button" onclick={makeParallel}>Make parallel</button>
    <button type="button" onclick={swap}>Swap a ↔ b</button>
  </div>
</div>
