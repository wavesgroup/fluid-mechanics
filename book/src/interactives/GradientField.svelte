<script lang="ts">
  import { onMount } from "svelte";
  import { formatTick, onThemeChange, readTheme, type Theme } from "./plot";
  import {
    DEFAULT_PROBE,
    FIELD_VIEW,
    autoScale,
    contourLevels,
    drawColorbar,
    drawHeatmap,
    isolinePaths,
    sampleRange,
    scaledTip,
    sequentialColor,
  } from "./field-plot";
  import { SCALAR_FIELDS } from "./fields";
  import {
    arrowParts,
    axisTicks,
    eventToWorld,
    fmt,
    vectorColors,
    worldToSvg,
    type Vec2,
  } from "./vectors";

  const view = FIELD_VIEW;
  const ticks = axisTicks(view);
  const origin = { x: 0, y: 0 };

  let fieldId = $state(SCALAR_FIELDS[0].id);
  let probe = $state<Vec2>({ ...DEFAULT_PROBE });
  let theme = $state<Theme | null>(null);
  let heatEl: HTMLCanvasElement | undefined;
  let cbEl: HTMLCanvasElement | undefined;
  let svgEl: SVGSVGElement | undefined;
  let pressing = $state(false);

  const field = $derived(SCALAR_FIELDS.find((f) => f.id === fieldId) ?? SCALAR_FIELDS[0]);
  const colors = $derived(
    theme ? vectorColors(theme) : { a: "#9b2c2c", b: "#1d6a8a", result: "#2d6a4f" },
  );
  const fg = $derived(theme?.fg ?? "#1c1915");
  const muted = $derived(theme?.muted ?? "#5e574c");
  const bg = $derived(theme?.bg ?? "#f7f3eb");

  const range = $derived(sampleRange(field.T, view));
  const levels = $derived(contourLevels(range.min, range.max, 7));
  const contours = $derived(isolinePaths(field.T, levels, view));
  const gradScale = $derived(autoScale(field.grad, view, 0.72));
  const Tval = $derived(field.T(probe.x, probe.y));
  const g = $derived(field.grad(probe.x, probe.y));
  const gMag = $derived(Math.hypot(g.x, g.y));
  const gTip = $derived(scaledTip(probe, g, gradScale, 0.95));
  const gArrow = $derived(gTip ? arrowParts(probe, gTip, view) : null);
  const probeSvg = $derived(worldToSvg(probe, view));
  const o = $derived(worldToSvg(origin, view));

  const callout = $derived.by(() => {
    if (gMag < 0.05) return "locally flat — ∇T ≈ 0";
    return "∇T points uphill, orthogonal to the isolines";
  });

  function colorAt(t: number) {
    return sequentialColor(t, theme ?? readTheme());
  }

  function paintHeat() {
    if (!theme) return;
    if (heatEl) drawHeatmap(heatEl, field.T, range.min, range.max, colorAt, view);
    if (cbEl) drawColorbar(cbEl, colorAt);
  }

  function setProbe(e: PointerEvent) {
    if (!svgEl) return;
    probe = eventToWorld(svgEl, e, view);
  }

  function onPointerDown(e: PointerEvent) {
    e.preventDefault();
    pressing = true;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setProbe(e);
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerType === "mouse" || pressing) setProbe(e);
  }

  function onPointerUp(e: PointerEvent) {
    pressing = false;
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }

  function onKey(e: KeyboardEvent) {
    const step = e.shiftKey ? 0.2 : 0.08;
    let dx = 0;
    let dy = 0;
    if (e.key === "ArrowLeft") dx = -step;
    else if (e.key === "ArrowRight") dx = step;
    else if (e.key === "ArrowUp") dy = step;
    else if (e.key === "ArrowDown") dy = -step;
    else return;
    e.preventDefault();
    probe = {
      x: Math.min(view.max, Math.max(view.min, probe.x + dx)),
      y: Math.min(view.max, Math.max(view.min, probe.y + dy)),
    };
  }

  $effect(() => {
    fieldId;
    range;
    theme;
    heatEl;
    cbEl;
    if (typeof document !== "undefined") paintHeat();
  });

  onMount(() => {
    theme = readTheme();
    paintHeat();
    return onThemeChange(() => {
      theme = readTheme();
    });
  });
</script>

<div class="interactive">
  <p class="interactive-title">Gradient</p>
  <p class="interactive-caption">
    Hover or tap to probe <em>T</em>. The arrow is ∇<em>T</em>: it points toward
    the steepest increase and is orthogonal to the isolines. {field.formula}.
  </p>
  <div class="field-stage">
    <div class="field-plot">
      <canvas bind:this={heatEl} class="field-heat" width={view.size} height={view.size}></canvas>
      <svg
        bind:this={svgEl}
        class="vector-canvas field-overlay"
        viewBox="0 0 {view.size} {view.size}"
        role="img"
        tabindex="0"
        aria-label="Scalar field with filled contours. Hover or tap to show the value and gradient."
        onpointerdown={onPointerDown}
        onpointermove={onPointerMove}
        onpointerup={onPointerUp}
        onpointercancel={onPointerUp}
        onkeydown={onKey}
      >
        {#each ticks as t}
          {@const x = worldToSvg({ x: t, y: 0 }, view)}
          {@const y = worldToSvg({ x: 0, y: t }, view)}
          <text x={x.x} y={o.y + 14} text-anchor="middle" fill={muted} font-size="11">{t}</text>
          <text x={o.x - 8} y={y.y + 4} text-anchor="end" fill={muted} font-size="11">{t}</text>
        {/each}
        <line x1={view.pad} y1={o.y} x2={view.size - view.pad} y2={o.y} stroke={fg} stroke-width="1.1" opacity="0.45" />
        <line x1={o.x} y1={view.pad} x2={o.x} y2={view.size - view.pad} stroke={fg} stroke-width="1.1" opacity="0.45" />
        <text x={view.size - view.pad + 4} y={o.y - 6} fill={muted} font-size="12">x</text>
        <text x={o.x + 6} y={view.pad - 6} fill={muted} font-size="12">y</text>

        {#each contours as d}
          {#if d}
            <path {d} fill="none" stroke={fg} stroke-width="1" opacity="0.28" />
          {/if}
        {/each}

        {#if gArrow}
          <line {...gArrow.line} stroke={colors.a} stroke-width="2.5" stroke-linecap="round" />
          <polygon points={gArrow.head} fill={colors.a} />
        {/if}
        <circle cx={probeSvg.x} cy={probeSvg.y} r="8" fill={bg} stroke={colors.a} stroke-width="2" />
        <circle cx={probeSvg.x} cy={probeSvg.y} r="3" fill={colors.a} />
      </svg>
    </div>
    <div class="field-colorbar" aria-hidden="true">
      <span class="cb-label">T</span>
      <span>{formatTick(range.max)}</span>
      <canvas bind:this={cbEl} class="cb-ramp" width="12" height="256"></canvas>
      <span>{formatTick(range.min)}</span>
    </div>
  </div>
  <p class="vector-callout" class:is-zero={gMag < 0.05}>{callout}</p>
  <div class="readout" aria-live="polite">
    <span>(x, y)</span><span>= ({fmt(probe.x)}, {fmt(probe.y)})</span>
    <span>T</span><span>= {fmt(Tval, 3)}</span>
    <span>∇T</span><span>= ({fmt(g.x, 3)}, {fmt(g.y, 3)})</span>
    <span>|∇T|</span><span>= {fmt(gMag, 3)}</span>
  </div>
  <div class="controls vector-actions" role="group" aria-label="Scalar field presets">
    {#each SCALAR_FIELDS as f}
      <button type="button" aria-pressed={fieldId === f.id} onclick={() => (fieldId = f.id)}>{f.label}</button>
    {/each}
  </div>
</div>
