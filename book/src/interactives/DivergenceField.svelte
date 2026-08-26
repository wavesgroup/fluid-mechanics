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
  const BOX = 0.32;

  let fieldId = $state(VECTOR_FIELDS[0].id);
  let probe = $state<Vec2>({ ...DEFAULT_PROBE });
  let theme = $state<Theme | null>(null);
  let heatEl: HTMLCanvasElement | undefined;
  let cbEl: HTMLCanvasElement | undefined;
  let svgEl: SVGSVGElement | undefined;
  let pressing = $state(false);

  const field = $derived(VECTOR_FIELDS.find((f) => f.id === fieldId) ?? VECTOR_FIELDS[0]);
  const colors = $derived(
    theme ? vectorColors(theme) : { a: "#9b2c2c", b: "#1d6a8a", result: "#2d6a4f" },
  );
  const fg = $derived(theme?.fg ?? "#1c1915");
  const muted = $derived(theme?.muted ?? "#5e574c");
  const bg = $derived(theme?.bg ?? "#f7f3eb");

  const rawRange = $derived(sampleRange(field.div, view));
  const range = $derived(symmetricRange(rawRange.min, rawRange.max));
  const quiver = $derived(makeQuiver(field.u, view));
  const uScale = $derived(autoScale(field.u, view, 0.7));
  const u = $derived(field.u(probe.x, probe.y));
  const div = $derived(field.div(probe.x, probe.y));
  const uTip = $derived(scaledTip(probe, u, uScale, 0.9));
  const uArrow = $derived(uTip ? arrowParts(probe, uTip, view) : null);
  const probeSvg = $derived(worldToSvg(probe, view));
  const o = $derived(worldToSvg(origin, view));

  const boxPts = $derived.by(() => {
    const corners = [
      { x: probe.x - BOX, y: probe.y - BOX },
      { x: probe.x + BOX, y: probe.y - BOX },
      { x: probe.x + BOX, y: probe.y + BOX },
      { x: probe.x - BOX, y: probe.y + BOX },
    ];
    return corners.map((p) => worldToSvg(p, view)).map((p) => `${p.x},${p.y}`).join(" ");
  });

  const faces = $derived.by(() => {
    const specs = [
      {
        mid: { x: probe.x + BOX, y: probe.y },
        n: { x: 1, y: 0 },
        flux: field.u(probe.x + BOX, probe.y).x,
      },
      {
        mid: { x: probe.x - BOX, y: probe.y },
        n: { x: -1, y: 0 },
        flux: -field.u(probe.x - BOX, probe.y).x,
      },
      {
        mid: { x: probe.x, y: probe.y + BOX },
        n: { x: 0, y: 1 },
        flux: field.u(probe.x, probe.y + BOX).y,
      },
      {
        mid: { x: probe.x, y: probe.y - BOX },
        n: { x: 0, y: -1 },
        flux: -field.u(probe.x, probe.y - BOX).y,
      },
    ];
    const out: { parts: ReturnType<typeof arrowParts>; out: boolean }[] = [];
    for (const s of specs) {
      const len = Math.min(0.26, 0.07 + Math.abs(s.flux) * 0.14);
      if (Math.abs(s.flux) < 0.04) continue;
      const dir = s.flux >= 0 ? 1 : -1;
      out.push({
        parts: arrowParts(
          s.mid,
          { x: s.mid.x + s.n.x * dir * len, y: s.mid.y + s.n.y * dir * len },
          view,
          6,
        ),
        out: s.flux >= 0,
      });
    }
    return out;
  });

  const callout = $derived.by(() => {
    if (div > 0.15) return "source — arrows spread, net flux out of the square";
    if (div < -0.15) return "sink — arrows converge, net flux into the square";
    return "non-divergent — flux in balances flux out";
  });

  function colorAt(t: number) {
    return divergingColor(t, theme ?? readTheme());
  }

  function paintHeat() {
    if (!theme) return;
    if (heatEl) drawHeatmap(heatEl, field.div, range.min, range.max, colorAt, view);
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
  <p class="interactive-title">Divergence</p>
  <p class="interactive-caption">
    Arrows are <em>u</em>; color is ∇·<em>u</em> (warm = source, cool = sink).
    The square shows flux through each face. {field.formula}.
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
        aria-label="Vector field with divergence colormap. Hover or tap to show divergence and local flux."
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

        <polygon points={boxPts} fill={colors.result} opacity="0.14" stroke={fg} stroke-width="1.4" />
        {#each faces as face}
          <line
            {...face.parts.line}
            stroke={face.out ? colors.a : colors.b}
            stroke-width="2.2"
            stroke-linecap="round"
          />
          <polygon points={face.parts.head} fill={face.out ? colors.a : colors.b} />
        {/each}

        {#if uArrow}
          <line {...uArrow.line} stroke={colors.result} stroke-width="2.5" stroke-linecap="round" />
          <polygon points={uArrow.head} fill={colors.result} />
        {/if}
        <circle cx={probeSvg.x} cy={probeSvg.y} r="5.5" fill={bg} stroke={colors.result} stroke-width="2" />
      </svg>
    </div>
    <div class="field-colorbar" aria-hidden="true">
      <span class="cb-label">∇·u</span>
      <span>{formatTick(range.max)}</span>
      <canvas bind:this={cbEl} class="cb-ramp" width="12" height="256"></canvas>
      <span>{formatTick(range.min)}</span>
    </div>
  </div>
  <p class="vector-callout" class:is-zero={Math.abs(div) < 0.15}>{callout}</p>
  <div class="readout" aria-live="polite">
    <span>(x, y)</span><span>= ({fmt(probe.x)}, {fmt(probe.y)})</span>
    <span>u</span><span>= ({fmt(u.x)}, {fmt(u.y)})</span>
    <span>∇·u</span><span>= {fmt(div, 3)}</span>
  </div>
  <div class="controls vector-actions" role="group" aria-label="Vector field presets">
    {#each VECTOR_FIELDS as f}
      <button type="button" aria-pressed={fieldId === f.id} onclick={() => (fieldId = f.id)}>{f.label}</button>
    {/each}
  </div>
</div>
