<script lang="ts">
  import { onMount } from "svelte";
  import { onThemeChange, readTheme, type Theme } from "./plot";
  import { contours } from "./contour";
  import { darkTheme } from "./field-plot";
  import { fmt, vectorColors, type Vec2 } from "./vectors";
  import {
    A_MAX,
    CELL,
    DEFAULT_FEATURES,
    F_MIN,
    H,
    NX,
    NY,
    OMEGA,
    R_MAX,
    R_MIN,
    REGIMES,
    W,
    computeFlow,
    contourPath,
    freeSpot,
    heightAt,
    isobarLevels,
    sampleFlow,
    speedRamp,
    velocityFactor,
    type Feature,
    type FlowGrid,
    type Regime,
  } from "./geostrophic";

  const F_DEFAULT = 1; // in units of 1e-4 s^-1
  const G_DEFAULT = 9.81;
  const PROBE_DEFAULT = { x: W / 2, y: H / 2 };
  const MAX_FEATURES = 6;

  /** Arrow length, in plot pixels, of the regime's top-of-scale speed. */
  const ARROW_PX = 70;
  const ARROW_MAX = 120;

  const PARTICLES = 1500;
  const TRAIL = 28;
  const ALPHA_BINS = 8;
  /** Largest particle step per 60 Hz frame, so f → 0 cannot fling them off. */
  const MAX_STEP = 3;

  let nextId = 1;
  const seed = (): Feature[] => DEFAULT_FEATURES.map((f) => ({ ...f, id: nextId++ }));

  let features = $state<Feature[]>(seed());
  let selectedId = $state<number | null>(null);
  let fScaled = $state(F_DEFAULT);
  let g = $state(G_DEFAULT);
  let regimeId = $state<Regime["id"]>("ocean");
  let probe = $state<Vec2>({ ...PROBE_DEFAULT });
  let playing = $state(true);
  let theme = $state<Theme | null>(null);
  let drag = $state<{ kind: "move" | "radius" | "probe"; id: number; dx: number; dy: number } | null>(null);

  let rootEl: HTMLDivElement | undefined;
  let plotEl: HTMLDivElement | undefined;
  let svgEl: SVGSVGElement | undefined;
  let heatEl: HTMLCanvasElement | undefined;
  let flowEl: HTMLCanvasElement | undefined;
  let rampEl: HTMLCanvasElement | undefined;

  const regime = $derived(REGIMES[regimeId]);
  const f = $derived(fScaled * 1e-4);
  const balanced = $derived(Math.abs(f) >= F_MIN);
  const k = $derived(velocityFactor(regime, f, g));
  const plain = $derived($state.snapshot(features) as Feature[]);
  const flow = $derived(computeFlow(plain, k));
  const isobars = $derived(
    contours(flow.eta, isobarLevels(flow.eta)).map((c, i) => ({
      key: `${c.level}-${i}`,
      high: c.level > 0,
      d: contourPath(c),
    })),
  );
  const selected = $derived(features.find((q) => q.id === selectedId) ?? null);
  const ramp = $derived(theme ? speedRamp(theme) : null);

  const fg = $derived(theme?.fg ?? "#1c1915");
  const muted = $derived(theme?.muted ?? "#5e574c");
  const bg = $derived(theme?.bg ?? "#f7f3eb");
  const accent = $derived(theme?.accent ?? "#8a2e2e");
  const colors = $derived(
    theme ? vectorColors(theme) : { a: "#9b2c2c", b: "#1d6a8a", result: "#2d6a4f" },
  );

  // Physical quantities at the probe.
  const at = $derived(heightAt(plain, probe.x, probe.y));
  const etaM = $derived(at.eta * regime.ampScale);
  const pPrime = $derived((regime.rho * g * etaM) / 100); // hPa
  const u = $derived(k * at.ey);
  const v = $derived(k * at.ex);
  const speed = $derived(Math.hypot(u, v));
  /** |∇η| in m/m. */
  const gradEta = $derived((Math.hypot(at.ex, at.ey) * regime.ampScale) / (regime.kmPerPx * 1000));
  const pgf = $derived(g * gradEta);
  const latitude = $derived((Math.asin(Math.max(-1, Math.min(1, f / (2 * OMEGA)))) * 180) / Math.PI);

  type Arrow = { x2: number; y2: number; head: string; label: Vec2 };

  function arrow(from: Vec2, vec: Vec2, scale: number, cap: number): Arrow | null {
    let len = Math.hypot(vec.x, vec.y) * scale;
    if (!Number.isFinite(len) || len < 4) return null;
    const ux = vec.x / Math.hypot(vec.x, vec.y);
    const uy = vec.y / Math.hypot(vec.x, vec.y);
    len = Math.min(len, cap);
    const tip = { x: from.x + ux * len, y: from.y + uy * len };
    const size = Math.min(10, len * 0.45);
    const base = { x: tip.x - ux * size, y: tip.y - uy * size };
    const w = size * 0.45;
    return {
      x2: base.x,
      y2: base.y,
      head: `${tip.x},${tip.y} ${base.x - uy * w},${base.y + ux * w} ${base.x + uy * w},${base.y - ux * w}`,
      label: { x: tip.x + ux * 16, y: tip.y + uy * 16 },
    };
  }

  // Both forces share one scale -- a speed at the top of the colour scale at
  // f = 10⁻⁴ s⁻¹ draws as ARROW_PX -- so their balance reads directly. Capping
  // them at the same length keeps them equal when f is large.
  const forceScale = $derived(ARROW_PX / (1e-4 * regime.speedMax));
  const forceCap = $derived(Math.min(ARROW_MAX, pgf * forceScale));
  const pgfArrow = $derived(
    arrow(probe, { x: -at.ex, y: -at.ey }, (forceCap / Math.hypot(at.ex, at.ey)) || 0, ARROW_MAX),
  );
  const cfArrow = $derived(
    balanced ? arrow(probe, { x: at.ex, y: at.ey }, (forceCap / Math.hypot(at.ex, at.ey)) || 0, ARROW_MAX) : null,
  );
  const uArrow = $derived(
    balanced ? arrow(probe, { x: u, y: -v }, ARROW_PX / regime.speedMax, ARROW_MAX) : null,
  );

  const callout = $derived.by(() => {
    if (!features.length) return "Add a high or a low: without a pressure gradient there is no flow.";
    if (!balanced)
      return "f ≈ 0, as at the equator: no Coriolis force balances the pressure gradient, so there is no geostrophic flow.";
    if (f > 0)
      return "f > 0 (Northern Hemisphere): flow follows the isobars, anticlockwise (cyclonic) around lows and clockwise (anticyclonic) around highs.";
    return "f < 0 (Southern Hemisphere): flow follows the isobars, clockwise (cyclonic) around lows and anticlockwise (anticyclonic) around highs.";
  });

  function sci(x: number): { m: string; e: number } {
    if (!Number.isFinite(x) || x === 0) return { m: "0", e: 0 };
    const e = Math.floor(Math.log10(Math.abs(x)));
    return { m: (x / 10 ** e).toFixed(2), e };
  }

  const fText = $derived(sci(f));
  const pgfText = $derived(sci(pgf));
  const latText = $derived(
    !balanced ? "≈ equator" : `≈ ${fmt(Math.abs(latitude), 1)}° ${latitude > 0 ? "N" : "S"}`,
  );
  const speedDigits = $derived(regime.speedMax < 5 ? 2 : 1);

  function signed(x: number, digits: number): string {
    const s = fmt(x, digits);
    return x > 0 && Number(s) !== 0 ? `+${s}` : s;
  }

  // ---- Features ------------------------------------------------------------

  function addFeature(sign: 1 | -1, at?: Vec2) {
    if (features.length >= MAX_FEATURES) return;
    const spot = at ?? freeSpot(plain);
    const feat = { id: nextId++, x: spot.x, y: spot.y, r: 70, a: 0.4 * sign };
    features.push(feat);
    selectedId = feat.id;
  }

  function removeSelected() {
    if (selectedId === null) return;
    features = features.filter((q) => q.id !== selectedId);
    selectedId = null;
  }

  function reset() {
    features = seed();
    selectedId = null;
    fScaled = F_DEFAULT;
    g = G_DEFAULT;
    probe = { ...PROBE_DEFAULT };
  }

  const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

  function setAmplitude(feat: Feature, a: number) {
    feat.a = clamp(Math.round(a * 100) / 100, -A_MAX, A_MAX);
  }

  function setRadius(feat: Feature, r: number) {
    feat.r = clamp(Math.round(r), R_MIN, R_MAX);
  }

  // ---- Pointer and keyboard ----------------------------------------------

  function toPlot(e: PointerEvent | MouseEvent): Vec2 {
    const m = svgEl?.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: clamp(p.x, 0, W), y: clamp(p.y, 0, H) };
  }

  function grab(e: PointerEvent, kind: "move" | "radius", feat: Feature) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    selectedId = feat.id;
    const p = toPlot(e);
    drag = { kind, id: feat.id, dx: feat.x - p.x, dy: feat.y - p.y };
    svgEl?.setPointerCapture(e.pointerId);
  }

  // Double taps are caught here rather than with `dblclick`, which touch
  // screens do not send and which the preventDefault below can suppress.
  let lastTap = { t: -Infinity, x: 0, y: 0 };

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    selectedId = null;
    const p = toPlot(e);
    const now = performance.now();
    if (now - lastTap.t < 400 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 12) {
      lastTap.t = -Infinity;
      addFeature(e.shiftKey || e.altKey ? -1 : 1, p);
      return;
    }
    lastTap = { t: now, x: p.x, y: p.y };
    probe = p;
    drag = { kind: "probe", id: -1, dx: 0, dy: 0 };
    svgEl?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    const p = toPlot(e);
    if (!drag) {
      if (e.pointerType === "mouse") probe = p;
      return;
    }
    if (drag.kind === "probe") {
      probe = p;
      return;
    }
    const feat = features.find((q) => q.id === drag!.id);
    if (!feat) return;
    if (drag.kind === "move") {
      feat.x = clamp(p.x + drag.dx, 0, W);
      feat.y = clamp(p.y + drag.dy, 0, H);
    } else {
      setRadius(feat, Math.hypot(p.x - feat.x, p.y - feat.y));
    }
  }

  function onPointerUp(e: PointerEvent) {
    drag = null;
    if (svgEl?.hasPointerCapture(e.pointerId)) svgEl.releasePointerCapture(e.pointerId);
  }

  function onMarkerKey(e: KeyboardEvent, feat: Feature) {
    const step = e.shiftKey ? 20 : 5;
    switch (e.key) {
      case "ArrowLeft":
        feat.x = clamp(feat.x - step, 0, W);
        break;
      case "ArrowRight":
        feat.x = clamp(feat.x + step, 0, W);
        break;
      case "ArrowUp":
        feat.y = clamp(feat.y - step, 0, H);
        break;
      case "ArrowDown":
        feat.y = clamp(feat.y + step, 0, H);
        break;
      case "+":
      case "=":
      case "PageUp":
        setAmplitude(feat, feat.a + 0.05);
        break;
      case "-":
      case "_":
      case "PageDown":
        setAmplitude(feat, feat.a - 0.05);
        break;
      case "]":
        setRadius(feat, feat.r + 5);
        break;
      case "[":
        setRadius(feat, feat.r - 5);
        break;
      case "Delete":
      case "Backspace":
        removeSelected();
        break;
      default:
        return;
    }
    e.preventDefault();
    probe = { x: feat.x + feat.r, y: feat.y };
  }

  function markerLabel(feat: Feature): string {
    const kind = feat.a >= 0 ? "High" : "Low";
    const km = (n: number) => Math.round(n * regime.kmPerPx);
    return `${kind}: amplitude ${signed(feat.a * regime.ampScale, regime.ampDigits)} m, radius ${km(feat.r)} km, at ${km(feat.x)} km east, ${km(H - feat.y)} km north. Arrow keys move it, plus and minus change the amplitude, brackets change the radius, Delete removes it.`;
  }

  // ---- Speed colour map ----------------------------------------------------

  let offscreen: HTMLCanvasElement | null = null;

  function paintHeat(grid: FlowGrid, lut: Uint8ClampedArray, max: number, on: boolean) {
    if (!heatEl) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (heatEl.width !== Math.round(W * dpr)) {
      heatEl.width = Math.round(W * dpr);
      heatEl.height = Math.round(H * dpr);
    }
    offscreen ??= Object.assign(document.createElement("canvas"), { width: NX, height: NY });
    const octx = offscreen.getContext("2d");
    const ctx = heatEl.getContext("2d");
    if (!octx || !ctx) return;
    const img = octx.createImageData(NX, NY);
    for (let i = 0; i < NX * NY; i++) {
      const t = on ? Math.min(1, grid.speed[i] / max) : 0;
      const c = Math.round(t * 255) * 3;
      img.data[i * 4] = lut[c];
      img.data[i * 4 + 1] = lut[c + 1];
      img.data[i * 4 + 2] = lut[c + 2];
      img.data[i * 4 + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    // Grid node i sits at x = i·CELL, so centre each image pixel on its node.
    ctx.drawImage(offscreen, -CELL / 2, -CELL / 2, NX * CELL, NY * CELL);
  }

  function paintRamp(lut: Uint8ClampedArray) {
    if (!rampEl) return;
    const ctx = rampEl.getContext("2d");
    if (!ctx) return;
    rampEl.width = 256;
    rampEl.height = 1;
    const img = ctx.createImageData(256, 1);
    for (let i = 0; i < 256; i++) {
      img.data[i * 4] = lut[i * 3];
      img.data[i * 4 + 1] = lut[i * 3 + 1];
      img.data[i * 4 + 2] = lut[i * 3 + 2];
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  $effect(() => {
    if (ramp) {
      paintHeat(flow, ramp, regime.speedMax, balanced);
      paintRamp(ramp);
    }
  });

  // ---- Particles -----------------------------------------------------------

  // Each particle keeps its last TRAIL positions in a ring shared by all
  // particles, so a trail is redrawn from scratch every frame and never leaves
  // the ghosting a fading canvas does.
  const px = new Float32Array(PARTICLES * TRAIL);
  const py = new Float32Array(PARTICLES * TRAIL);
  const len = new Uint8Array(PARTICLES);
  const life = new Uint16Array(PARTICLES);
  const maxLife = new Uint16Array(PARTICLES);
  /** Local speed as a fraction of the colour scale, to fade still water. */
  const vis = new Float32Array(PARTICLES);
  let head = 0;
  let cssWidth = W;

  function spawn(i: number, at: number) {
    px[i * TRAIL + at] = Math.random() * W;
    py[i * TRAIL + at] = Math.random() * H;
    len[i] = 1;
    life[i] = 0;
    maxLife[i] = 60 + Math.floor(Math.random() * 120);
  }

  function seedParticles() {
    for (let i = 0; i < PARTICLES; i++) {
      spawn(i, head);
      // Stagger ages so particles don't all respawn on the same frame.
      life[i] = Math.floor(Math.random() * maxLife[i]);
    }
  }

  function advance(dt: number) {
    const grid = flow;
    const pxPerMs = regime.timeScale / (regime.kmPerPx * 1000);
    const cap = MAX_STEP * dt * 60;
    const prev = head;
    head = (head + 1) % TRAIL;
    for (let i = 0; i < PARTICLES; i++) {
      const x = px[i * TRAIL + prev];
      const y = py[i * TRAIL + prev];
      life[i]++;
      if (life[i] > maxLife[i]) {
        spawn(i, head);
        continue;
      }
      const [ue, vn] = sampleFlow(grid, x, y);
      vis[i] = Math.min(1, Math.hypot(ue, vn) / (0.15 * regime.speedMax));
      let dx = ue * pxPerMs * dt;
      let dy = -vn * pxPerMs * dt;
      const step = Math.hypot(dx, dy);
      if (step > cap) {
        dx *= cap / step;
        dy *= cap / step;
      }
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx > W || ny < 0 || ny > H) {
        spawn(i, head);
        continue;
      }
      px[i * TRAIL + head] = nx;
      py[i * TRAIL + head] = ny;
      if (len[i] < TRAIL) len[i]++;
    }
  }

  function draw() {
    if (!flowEl) return;
    const ctx = flowEl.getContext("2d");
    if (!ctx) return;
    const s = flowEl.width / W;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, flowEl.width, flowEl.height);
    if (!balanced) return;
    ctx.setTransform(s, 0, 0, s, 0, 0);

    const paths = Array.from({ length: ALPHA_BINS }, () => new Path2D());
    const fade = 12;
    for (let i = 0; i < PARTICLES; i++) {
      const n = len[i];
      if (n < 2) continue;
      const env = Math.min(1, life[i] / fade, (maxLife[i] - life[i]) / fade) * vis[i];
      for (let sgm = 0; sgm < n - 1; sgm++) {
        const a = ((head - sgm) % TRAIL + TRAIL) % TRAIL;
        const b = (a - 1 + TRAIL) % TRAIL;
        const alpha = (1 - sgm / (TRAIL - 1)) * env;
        const bin = Math.min(ALPHA_BINS - 1, Math.floor(alpha * ALPHA_BINS));
        if (bin <= 0) continue;
        const path = paths[bin];
        path.moveTo(px[i * TRAIL + a], py[i * TRAIL + a]);
        path.lineTo(px[i * TRAIL + b], py[i * TRAIL + b]);
      }
    }
    ctx.strokeStyle = fg;
    ctx.lineCap = "butt";
    ctx.lineWidth = 1.3 * (W / cssWidth);
    // Dark ink on a light map reads heavier than light ink on a dark one.
    const top = theme && darkTheme(theme) ? 0.9 : 0.7;
    for (let b = 1; b < ALPHA_BINS; b++) {
      ctx.globalAlpha = (top * (b + 0.5)) / ALPHA_BINS;
      ctx.stroke(paths[b]);
    }
    ctx.globalAlpha = 1;
  }

  /** A still frame of trails for the current flow, for when motion is paused. */
  function snapshot() {
    seedParticles();
    for (let i = 0; i < PARTICLES; i++) {
      life[i] = Math.max(life[i], TRAIL);
      maxLife[i] = Math.max(maxLife[i], life[i] + TRAIL + 12);
    }
    for (let t = 0; t < TRAIL; t++) advance(1 / 60);
    draw();
  }

  let visible = $state(true);
  let raf = 0;
  let last = 0;

  function frame(now: number) {
    const dt = Math.min(1 / 30, Math.max(0, (now - last) / 1000));
    last = now;
    advance(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }

  $effect(() => {
    const run = playing && visible && balanced;
    if (!run) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  });

  // While paused, keep the still trails in step with the flow being edited;
  // with no balance, this clears them.
  $effect(() => {
    flow;
    theme;
    if (!playing || !balanced) snapshot();
  });

  onMount(() => {
    theme = readTheme();
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) playing = false;
    seedParticles();

    const resize = new ResizeObserver(() => {
      if (!plotEl || !flowEl) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cssWidth = plotEl.clientWidth || W;
      flowEl.width = Math.round(cssWidth * dpr);
      flowEl.height = Math.round(((cssWidth * H) / W) * dpr);
      draw();
    });
    if (plotEl) resize.observe(plotEl);

    const seen = new IntersectionObserver((entries) => {
      visible = entries.some((en) => en.isIntersecting);
    });
    if (rootEl) seen.observe(rootEl);

    const stopTheme = onThemeChange(() => {
      theme = readTheme();
    });
    return () => {
      resize.disconnect();
      seen.disconnect();
      stopTheme();
      cancelAnimationFrame(raf);
    };
  });
</script>

<div class="interactive geostrophic-interactive" bind:this={rootEl}>
  <p class="interactive-title">Geostrophic flow around highs and lows</p>
  <p class="interactive-caption">
    Drag a high (H) or a low (L) to move it, or drag the ring of the selected one to resize it.
    Double-click or double-tap the map to add a high (shift-double-click for a low). Colour shows the geostrophic
    speed |<strong>u</strong><sub>g</sub>|, particles drift with the flow, and the arrows at the
    probe show the velocity and the two forces it balances.
  </p>

  <div class="field-plot geo-plot" bind:this={plotEl}>
    <canvas bind:this={heatEl} class="field-heat" aria-hidden="true"></canvas>
    <canvas bind:this={flowEl} class="field-heat" aria-hidden="true"></canvas>
    <!-- `application` is the closest ARIA role for a 2-D probe surface: the
         highs and lows inside it are the focusable controls. -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <svg
      bind:this={svgEl}
      class="vector-canvas"
      class:is-dragging={drag !== null && drag.kind !== "probe"}
      viewBox="0 0 {W} {H}"
      role="application"
      aria-label="Map of geostrophic flow. Colour is speed; lines are isobars. Tab to a high or low to move or resize it."
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointercancel={onPointerUp}
    >
      {#each isobars as c (c.key)}
        <path
          d={c.d}
          fill="none"
          stroke={fg}
          stroke-width="1.1"
          stroke-dasharray={c.high ? undefined : "5 3"}
          opacity="0.4"
        />
      {/each}

      <g class="geo-scale" transform="translate(18 {H - 20})">
        <line x1="0" y1="0" x2={regime.scaleKm / regime.kmPerPx} y2="0" stroke={fg} stroke-width="2" />
        <line x1="0" y1="-4" x2="0" y2="4" stroke={fg} stroke-width="2" />
        <line x1={regime.scaleKm / regime.kmPerPx} y1="-4" x2={regime.scaleKm / regime.kmPerPx} y2="4" stroke={fg} stroke-width="2" />
        <text x={regime.scaleKm / regime.kmPerPx / 2} y="-8" text-anchor="middle" fill={fg} stroke={bg} class="halo" font-size="14">
          {regime.scaleKm} km
        </text>
      </g>

      {#if selected}
        <circle
          cx={selected.x}
          cy={selected.y}
          r={selected.r}
          fill="none"
          stroke={accent}
          stroke-width="1.5"
          stroke-dasharray="6 4"
        />
      {/if}

      <g class="geo-probe" pointer-events="none">
        {#if pgfArrow}
          <line x1={probe.x} y1={probe.y} x2={pgfArrow.x2} y2={pgfArrow.y2} stroke={colors.a} stroke-width="2.5" stroke-linecap="round" />
          <polygon points={pgfArrow.head} fill={colors.a} />
        {/if}
        {#if cfArrow}
          <line x1={probe.x} y1={probe.y} x2={cfArrow.x2} y2={cfArrow.y2} stroke={colors.b} stroke-width="2.5" stroke-linecap="round" />
          <polygon points={cfArrow.head} fill={colors.b} />
        {/if}
        {#if uArrow}
          <line x1={probe.x} y1={probe.y} x2={uArrow.x2} y2={uArrow.y2} stroke={fg} stroke-width="3" stroke-linecap="round" />
          <polygon points={uArrow.head} fill={fg} />
          <text x={uArrow.label.x} y={uArrow.label.y + 5} text-anchor="middle" fill={fg} stroke={bg} class="halo" font-size="16" font-style="italic" font-weight="600">
            u<tspan baseline-shift="sub" font-size="0.7em">g</tspan>
          </text>
        {/if}
        <circle cx={probe.x} cy={probe.y} r="4.5" fill={bg} stroke={fg} stroke-width="1.8" />
      </g>

      {#each features as feat (feat.id)}
        {@const isSel = feat.id === selectedId}
        <g class="geo-marker">
          <circle cx={feat.x} cy={feat.y} r="15" fill={bg} fill-opacity="0.9" stroke={isSel ? accent : fg} stroke-width={isSel ? 2.5 : 1.5} />
          <text x={feat.x} y={feat.y + 6} text-anchor="middle" fill={isSel ? accent : fg} font-size="17" font-weight="700">
            {feat.a >= 0 ? "H" : "L"}
          </text>
          <circle
            class="vec-hit"
            cx={feat.x}
            cy={feat.y}
            r="22"
            role="button"
            tabindex="0"
            aria-label={markerLabel(feat)}
            aria-pressed={isSel}
            onpointerdown={(e) => grab(e, "move", feat)}
            onfocus={() => (selectedId = feat.id)}
            onkeydown={(e) => onMarkerKey(e, feat)}
          />
        </g>
        {#if isSel}
          <circle class="geo-handle" cx={feat.x + feat.r} cy={feat.y} r="6" fill={bg} stroke={accent} stroke-width="2" />
          <circle
            class="vec-hit geo-radius-hit"
            cx={feat.x + feat.r}
            cy={feat.y}
            r="16"
            role="presentation"
            onpointerdown={(e) => grab(e, "radius", feat)}
          />
        {/if}
      {/each}
    </svg>
  </div>

  <div class="geo-legend" aria-hidden="true">
    <span class="geo-ramp">
      <span>|u<sub>g</sub>|</span>
      <span class="geo-ramp-bar">
        <canvas bind:this={rampEl}></canvas>
        <span class="geo-ticks">
          <span>0</span>
          <span>{fmt(regime.speedMax / 2, speedDigits)}</span>
          <span>≥ {fmt(regime.speedMax, speedDigits)} m/s</span>
        </span>
      </span>
    </span>
    <span class="geo-key"><i style:background={fg}></i><em>u</em><sub>g</sub> velocity</span>
    <span class="geo-key"><i style:background={colors.a}></i>pressure gradient −∇<em>p</em>/<em>ρ</em></span>
    <span class="geo-key"><i style:background={colors.b}></i>Coriolis −<em>f</em> <strong>k</strong>×<strong>u</strong><sub>g</sub></span>
    <span class="geo-key"><i class="dashed" style:border-color={fg}></i>isobars (dashed: low)</span>
  </div>

  <p class="vector-callout" class:is-zero={!balanced || !features.length}>{callout}</p>

  <div class="readout" aria-live="polite">
    <span>η, p′ = ρgη</span>
    <span>= {signed(etaM, regime.ampDigits + 1)} m, {signed(pPrime, 1)} hPa</span>
    <span>(u<sub>g</sub>, v<sub>g</sub>)</span>
    <span>
      {#if balanced}= ({fmt(u, speedDigits)}, {fmt(v, speedDigits)}) m/s, |u<sub>g</sub>| = {fmt(speed, speedDigits)} m/s{:else}undefined (f ≈ 0){/if}
    </span>
    <span>|∇p|/ρ = g|∇η|</span>
    <span>= {pgfText.m} × 10<sup>{pgfText.e}</sup> m s<sup>−2</sup>{#if balanced}&nbsp;= f |u<sub>g</sub>|{/if}</span>
  </div>

  <div class="controls rotation-controls">
    <label>
      <span>Coriolis f</span>
      <span>{#if Math.abs(f) < 1e-9}0{:else}{fText.m} × 10<sup>{fText.e}</sup>{/if} s<sup>−1</sup> ({latText})</span>
      <input type="range" min="-1.45" max="1.45" step="0.01" bind:value={fScaled} />
    </label>
    <label>
      <span>Gravity g</span>
      <span>{fmt(g, 2)} m s<sup>−2</sup></span>
      <input type="range" min="1" max="25" step="0.01" bind:value={g} />
    </label>
    <label>
      <span>Amplitude η₀ {selected ? (selected.a >= 0 ? "(high)" : "(low)") : ""}</span>
      <span>{selected ? `${signed(selected.a * regime.ampScale, regime.ampDigits)} m` : "select H or L"}</span>
      <input
        type="range"
        min={-A_MAX}
        max={A_MAX}
        step="0.01"
        disabled={!selected}
        value={selected?.a ?? 0}
        oninput={(e) => selected && setAmplitude(selected, Number(e.currentTarget.value))}
      />
    </label>
    <label>
      <span>Radius</span>
      <span>{selected ? `${Math.round(selected.r * regime.kmPerPx)} km` : "select H or L"}</span>
      <input
        type="range"
        min={R_MIN}
        max={R_MAX}
        step="1"
        disabled={!selected}
        value={selected?.r ?? R_MIN}
        oninput={(e) => selected && setRadius(selected, Number(e.currentTarget.value))}
      />
    </label>
  </div>

  <div class="controls vector-actions" role="group" aria-label="Highs, lows, and setting">
    <button type="button" disabled={features.length >= MAX_FEATURES} onclick={() => addFeature(1)}>Add high</button>
    <button type="button" disabled={features.length >= MAX_FEATURES} onclick={() => addFeature(-1)}>Add low</button>
    <button type="button" disabled={!selected} onclick={removeSelected}>Remove</button>
    <span class="geo-sep" aria-hidden="true"></span>
    {#each Object.values(REGIMES) as r (r.id)}
      <button type="button" aria-pressed={regimeId === r.id} onclick={() => (regimeId = r.id)}>{r.label}</button>
    {/each}
    <span class="geo-sep" aria-hidden="true"></span>
    <button type="button" aria-pressed={!playing} onclick={() => (playing = !playing)}>{playing ? "Pause" : "Play"}</button>
    <button type="button" onclick={reset}>Reset</button>
  </div>
  <p class="geo-note">
    {regime.label}: H and L are anomalies η of the {regime.surface}, so p′ = ρgη with ρ = {regime.rho} kg m<sup>−3</sup>.
    One second of animation is about {regime.timeLabel}.
  </p>
</div>
