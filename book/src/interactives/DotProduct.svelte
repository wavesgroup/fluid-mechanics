<script lang="ts">
  import { onMount } from "svelte";
  import { onThemeChange, readTheme, type Theme } from "./plot";
  import {
    DEFAULT_VIEW,
    type Vec2,
    add,
    angle,
    angleArcPath,
    angleLabelPos,
    arrowParts,
    axisTicks,
    clampVec,
    dot,
    eventToWorld,
    fitInView,
    fmt,
    fmtDeg,
    labelPos,
    norm,
    parallelTo,
    perpendicular,
    project,
    rightAngleMark,
    vectorColors,
    withMinLength,
    worldToSvg,
  } from "./vectors";

  const A_DEFAULT: Vec2 = { x: 2, y: 1 };
  const B_DEFAULT: Vec2 = { x: 1, y: 2 };
  const view = DEFAULT_VIEW;
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

  const o = $derived(worldToSvg(origin, view));
  const na = $derived(norm(a));
  const nb = $derived(norm(b));
  const d = $derived(dot(a, b));
  const th = $derived(angle(a, b));
  const proj = $derived(project(a, b));
  const cosForm = $derived(na * nb * Math.cos(th));
  const orthogonal = $derived(Math.abs(d) < 0.05);

  const aArrow = $derived(arrowParts(origin, a, view));
  const bArrow = $derived(arrowParts(origin, b, view));
  const aTip = $derived(worldToSvg(a, view));
  const projPt = $derived(worldToSvg(proj, view));
  const aLabel = $derived(labelPos(a, view));
  const bLabel = $derived(labelPos(b, view));
  const projLabel = $derived(labelPos(add(proj, { x: 0.02, y: 0.02 }), view, 12));
  const arc = $derived(angleArcPath(a, b, view));
  const thetaPos = $derived(angleLabelPos(a, b, view));
  const square = $derived(rightAngleMark(a, proj, b, view));

  const relation = $derived.by(() => {
    if (orthogonal) return "orthogonal ⇒ a · b = 0";
    if (d > 0) return "acute (positive)";
    return "obtuse (negative)";
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

  onMount(() => {
    theme = readTheme();
    return onThemeChange(() => {
      theme = readTheme();
    });
  });
</script>

<div class="interactive">
  <p class="interactive-title">Dot product</p>
  <p class="interactive-caption">
    Drag either tip. The dashed drop is the perpendicular from <em>a</em> onto
    <em>b</em>; the highlighted segment is that projection.
  </p>
  <div class="vector-stage">
    <svg
      bind:this={svgEl}
      class="vector-canvas"
      class:is-dragging={dragging !== null}
      viewBox="0 0 {view.size} {view.size}"
      role="img"
      aria-label="Two draggable vectors and the projection of a onto b"
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

      <path d={arc} fill="none" stroke={muted} stroke-width="1.4" />
      <text x={thetaPos.x} y={thetaPos.y} text-anchor="middle" dominant-baseline="middle" fill={muted} font-size="12"
        >θ</text
      >

      <line
        x1={o.x}
        y1={o.y}
        x2={projPt.x}
        y2={projPt.y}
        stroke={colors.result}
        stroke-width="7"
        stroke-linecap="round"
        opacity="0.28"
      />
      <line
        x1={aTip.x}
        y1={aTip.y}
        x2={projPt.x}
        y2={projPt.y}
        stroke={colors.result}
        stroke-width="1.5"
        stroke-dasharray="5 4"
      />
      {#if square}
        <path d={square} fill="none" stroke={colors.result} stroke-width="1.4" />
      {/if}

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
      {#if norm(proj) > 0.25}
        <text
          x={projLabel.x}
          y={projLabel.y}
          text-anchor="middle"
          dominant-baseline="middle"
          fill={colors.result}
          font-size="11"
          >proj</text
        >
      {/if}

      <circle
        class="vec-hit"
        cx={worldToSvg(b, view).x}
        cy={worldToSvg(b, view).y}
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
      <circle class="vec-tip" cx={worldToSvg(b, view).x} cy={worldToSvg(b, view).y} r="5.5" fill={colors.b} />
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
  </div>
  <p class="vector-callout" class:is-zero={orthogonal}>{relation}</p>
  <div class="readout" aria-live="polite">
    <span>a</span><span>= ({fmt(a.x)}, {fmt(a.y)})</span>
    <span>b</span><span>= ({fmt(b.x)}, {fmt(b.y)})</span>
    <span>a · b</span><span>= {fmt(d)}</span>
    <span class="readout-sub"></span>
    <span class="readout-sub">= {fmt(a.x)}×{fmt(b.x)} + {fmt(a.y)}×{fmt(b.y)}</span>
    <span>|a|, |b|, θ</span><span>= {fmt(na)}, {fmt(nb)}, {fmtDeg(th)}</span>
    <span>|a| |b| cos θ</span><span>= {fmt(cosForm)}</span>
  </div>
  <div class="controls vector-actions">
    <button type="button" onclick={reset}>Reset</button>
    <button type="button" onclick={makeOrthogonal}>Make orthogonal</button>
    <button type="button" onclick={makeParallel}>Make parallel</button>
  </div>
</div>
