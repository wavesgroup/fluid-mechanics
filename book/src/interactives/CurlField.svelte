<script lang="ts">
  import { onMount } from "svelte";
  import { formatTick, onThemeChange, readTheme, type Theme } from "./plot";
  import {
    DEFAULT_PROBE,
    FIELD_VIEW,
    autoScale,
    divergingColor,
    drawColorbar,
    drawHeatmap,
    makeQuiver,
    sampleRange,
    scaledTip,
    symmetricRange,
  } from "./field-plot";
  import { VECTOR_FIELDS } from "./fields";
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
  const WHEEL_R = 16;
  const CURL_EPS = 0.01;

  let fieldId = $state(VECTOR_FIELDS[1].id);
  let probe = $state<Vec2>({ ...DEFAULT_PROBE });
  let theme = $state<Theme | null>(null);
  let heatEl: HTMLCanvasElement | undefined;
  let cbEl: HTMLCanvasElement | undefined;
  let svgEl: SVGSVGElement | undefined;
  let pressing = $state(false);
  let wheelAngle = $state(0);

  const field = $derived(VECTOR_FIELDS.find((f) => f.id === fieldId) ?? VECTOR_FIELDS[1]);
  const colors = $derived(
    theme ? vectorColors(theme) : { a: "#9b2c2c", b: "#1d6a8a", result: "#2d6a4f" },
  );
  const fg = $derived(theme?.fg ?? "#1c1915");
  const muted = $derived(theme?.muted ?? "#5e574c");
  const bg = $derived(theme?.bg ?? "#f7f3eb");

  const rawRange = $derived(sampleRange(field.curl, view));
  const range = $derived(symmetricRange(rawRange.min, rawRange.max));
  const quiver = $derived(makeQuiver(field.u, view));
  const uScale = $derived(autoScale(field.u, view, 0.7));
  const u = $derived(field.u(probe.x, probe.y));
  const curl = $derived(field.curl(probe.x, probe.y));
  const uTip = $derived(scaledTip(probe, u, uScale, 0.9));
  const uArrow = $derived(uTip ? arrowParts(probe, uTip, view) : null);
  const probeSvg = $derived(worldToSvg(probe, view));
  const o = $derived(worldToSvg(origin, view));
  const ccw = $derived(curl > CURL_EPS);
  const cw = $derived(curl < -CURL_EPS);
  const wheelDeg = $derived((wheelAngle * 180) / Math.PI);

  const callout = $derived.by(() => {
    if (ccw) return "counterclockwise — curl out of the page ⊙";
    if (cw) return "clockwise — curl into the page ⊗";
    return "irrotational — the paddle wheel does not spin";
  });

  function colorAt(t: number) {
    return divergingColor(t, theme ?? readTheme());
  }

  function paintHeat() {
    if (!theme) return;
    if (heatEl) drawHeatmap(heatEl, field.curl, range.min, range.max, colorAt, view);
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
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const c = field.curl(probe.x, probe.y);
      if (Math.abs(c) > CURL_EPS) wheelAngle -= c * dt * 0.85;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const stopTheme = onThemeChange(() => {
      theme = readTheme();
    });
    return () => {
      cancelAnimationFrame(raf);
      stopTheme();
    };
  });
</script>

<div class="interactive">
  <p class="interactive-title">Curl</p>
  <p class="interactive-caption">
    Arrows are <em>u</em>; color is (∇×<em>u</em>)<sub>z</sub>. The paddle wheel
    spins with the local rotation. Try shear: curl without obvious circling.
    {field.formula}.
  </p>
  <div class="field-stage">
    <div class="field-plot">
      <canvas bind:this={heatEl} class="field-heat" width={view.size} height={view.size}></canvas>
      <!-- `application` is the closest ARIA role for a focusable 2-D probe: it
           makes screen readers pass the arrow keys through to onKey instead of
           using them to browse. No interactive role fits a surface like this, so
           the two non-interactive-element rules are silenced deliberately. -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <svg
        bind:this={svgEl}
        class="vector-canvas field-overlay"
        viewBox="0 0 {view.size} {view.size}"
        role="application"
        tabindex="0"
        aria-label="Vector field with curl colormap. Hover, tap, or use the arrow keys to show curl and a spinning paddle wheel."
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
        <line x1={view.pad} y1={o.y} x2={view.size - view.pad} y2={o.y} stroke={fg} stroke-width="1.1" opacity="0.35" />
        <line x1={o.x} y1={view.pad} x2={o.x} y2={view.size - view.pad} stroke={fg} stroke-width="1.1" opacity="0.35" />
        <text x={view.size - view.pad + 4} y={o.y - 6} fill={muted} font-size="12">x</text>
        <text x={o.x + 6} y={view.pad - 6} fill={muted} font-size="12">y</text>

        {#each quiver as q}
          <line {...q.line} stroke={fg} stroke-width="1.35" stroke-linecap="round" opacity="0.82" />
          <polygon points={q.head} fill={fg} opacity="0.82" />
        {/each}

        {#if uArrow}
          <line {...uArrow.line} stroke={colors.result} stroke-width="2.5" stroke-linecap="round" />
          <polygon points={uArrow.head} fill={colors.result} />
        {/if}

        <g transform="translate({probeSvg.x} {probeSvg.y})">
          <circle r={WHEEL_R + 1} fill={bg} opacity="0.88" stroke={fg} stroke-width="1.3" />
          <g transform="rotate({wheelDeg})">
            <line x1="-13" y1="0" x2="13" y2="0" stroke={colors.a} stroke-width="2.4" stroke-linecap="round" />
            <line x1="0" y1="-13" x2="0" y2="13" stroke={colors.a} stroke-width="2.4" stroke-linecap="round" />
            <rect x="-13" y="-3.2" width="6" height="6.4" fill={colors.a} rx="0.8" />
            <rect x="7" y="-3.2" width="6" height="6.4" fill={colors.a} rx="0.8" />
            <rect x="-3.2" y="-13" width="6.4" height="6" fill={colors.a} rx="0.8" />
            <rect x="-3.2" y="7" width="6.4" height="6" fill={colors.a} rx="0.8" />
          </g>
          {#if ccw}
            <circle r="3.2" fill={colors.result} />
          {:else if cw}
            <line x1="-4.2" y1="-4.2" x2="4.2" y2="4.2" stroke={colors.result} stroke-width="1.6" />
            <line x1="4.2" y1="-4.2" x2="-4.2" y2="4.2" stroke={colors.result} stroke-width="1.6" />
          {/if}
        </g>
      </svg>
    </div>
    <div class="field-colorbar" aria-hidden="true">
      <span class="cb-label">(∇×u)z</span>
      <span>{formatTick(range.max)}</span>
      <canvas bind:this={cbEl} class="cb-ramp" width="12" height="256"></canvas>
      <span>{formatTick(range.min)}</span>
    </div>
  </div>
  <p class="vector-callout" class:is-zero={Math.abs(curl) < CURL_EPS}>{callout}</p>
  <div class="readout" aria-live="polite">
    <span>(x, y)</span><span>= ({fmt(probe.x)}, {fmt(probe.y)})</span>
    <span>u</span><span>= ({fmt(u.x)}, {fmt(u.y)})</span>
    <span>(∇×u)z</span><span>= {fmt(curl, 3)}</span>
  </div>
  <div class="controls vector-actions" role="group" aria-label="Vector field presets">
    {#each VECTOR_FIELDS as f}
      <button type="button" aria-pressed={fieldId === f.id} onclick={() => (fieldId = f.id)}>{f.label}</button>
    {/each}
  </div>
</div>
