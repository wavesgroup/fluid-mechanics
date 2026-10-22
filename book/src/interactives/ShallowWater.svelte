<script lang="ts">
  import { onMount } from "svelte";
  import { onThemeChange, readTheme, type Theme } from "./plot";
  import { darkTheme, parseRgb } from "./field-plot";
  import { fmt, type Vec2 } from "./vectors";
  import { ShallowWaterGL, type Probe, type Stats } from "./shallow-water-gl";
  import {
    BUMP_FRAC,
    BUMP_R,
    EXPERIMENTS,
    F_MIN,
    LX,
    LY,
    NX,
    NY,
    DX,
    OMEGA,
    PEAK_DEFAULT_FRAC,
    PEAK_MIN_FRAC,
    PX_PER_M,
    R_MAX,
    R_MIN,
    VIEW_H,
    VIEW_W,
    clampPeak,
    divergingLut,
    fromView,
    isobathRadius,
    mountHeight,
    niceStep,
    timeLabel,
    toView,
    type ExperimentId,
    type Field,
    type Settings,
  } from "./shallow-water";

  /** Mean depth slider: log scale between these, in meters. */
  const H_LO = 10;
  const H_HI = 4000;
  /** Time scale, in model seconds, over which the inflow follows its slider. */
  const RAMP = 1e4;
  /** Seconds of animation over which the color scale relaxes downward. */
  const RANGE_RELAX = 1.5;
  /** Most time steps per frame; the GPU budget below may allow fewer. */
  const SPEED_MAX = 7;
  const ARROW_PX = 46;

  const copy = (s: Settings): Settings => ({ ...s, mount: { ...s.mount } });

  let expId = $state<ExperimentId>("seamount");
  let s = $state<Settings>(copy(EXPERIMENTS.seamount.settings));
  let speed = $state(5);
  let playing = $state(true);
  let theme = $state<Theme | null>(null);
  let selected = $state(false);
  let probe = $state<Vec2>({ x: 0.55 * LX, y: 0.5 * LY });
  let drag = $state<{ kind: "move" | "radius" | "probe"; dx: number; dy: number } | null>(null);
  let failed = $state<string | null>(null);
  let notice = $state<string | null>(null);

  // Read back from the GPU a few times a second, for the readouts.
  let reading = $state<Probe>({ u: 0, v: 0, eta: 0, depth: 100 });
  let shown = $state({ t: 0, range: 1, step: 0, U: 0, rate: 0, vmax: 1, steps: 32 });

  let rootEl: HTMLDivElement | undefined;
  let plotEl: HTMLDivElement | undefined;
  let svgEl: SVGSVGElement | undefined;
  let glEl: HTMLCanvasElement | undefined;
  let rampEl: HTMLCanvasElement | undefined;

  const f = $derived(s.fScaled * 1e-4);
  const rotating = $derived(Math.abs(f) >= F_MIN);
  const c = $derived(Math.sqrt(s.g * s.H));
  const Ld = $derived(c / Math.abs(f));
  const inflow = $derived(s.wallX ? 0 : s.U);
  const b0 = $derived(mountHeight(s));
  const delta = $derived(b0 / s.H);
  const peak = $derived(clampPeak(s.mount.peak, s.H));
  const mountShown = $derived(s.mountOn && b0 > 0);
  const Ro = $derived(inflow / (Math.abs(f) * s.mount.r));
  const latitude = $derived((Math.asin(Math.max(-1, Math.min(1, f / (2 * OMEGA)))) * 180) / Math.PI);

  const fg = $derived(theme?.fg ?? "#1c1915");
  const bg = $derived(theme?.bg ?? "#f7f3eb");
  const accent = $derived(theme?.accent ?? "#8a2e2e");

  const FIELDS: { id: Field; label: string; name: string }[] = [
    { id: "eta", label: "η", name: "surface height η" },
    { id: "u", label: "u", name: "eastward velocity u" },
    { id: "v", label: "v", name: "northward velocity v" },
  ];
  const unit = $derived(s.field === "eta" ? "m" : "m/s");
  /** The u field is drawn about the inflow, so its ticks are offset by it. */
  const offset = $derived(s.field === "u" ? shown.U : 0);

  function sci(x: number): { m: string; e: number } {
    if (!Number.isFinite(x) || x === 0) return { m: "0", e: 0 };
    const e = Math.floor(Math.log10(Math.abs(x)));
    return { m: (x / 10 ** e).toFixed(2), e };
  }

  /** Two significant figures, for the color bar and readouts. */
  function sig(x: number): string {
    if (!Number.isFinite(x)) return "—";
    if (x === 0) return "0";
    const a = Math.abs(x);
    const d = Math.max(0, Math.min(4, 1 - Math.floor(Math.log10(a))));
    return fmt(x, d);
  }

  function km(m: number): string {
    return `${Math.round(m / 1000)} km`;
  }

  const fText = $derived(sci(f));
  const latText = $derived(!rotating ? "≈ equator" : `≈ ${fmt(Math.abs(latitude), 1)}° ${latitude > 0 ? "N" : "S"}`);
  const hSlider = $derived((1000 * Math.log(s.H / H_LO)) / Math.log(H_HI / H_LO));

  const callout = $derived.by(() => {
    const ld = km(Ld);
    if (s.wallX && s.U > 0 && expId === "seamount")
      return "Walls on the left and right block the through-flow, so the inflow U is off. Make them periodic to let it run.";
    if (mountShown && inflow > 0) {
      if (!rotating)
        return `Without rotation the flow simply passes over the seamount, speeding up above the peak. Fr = U/c = ${fmt(inflow / c, 3)}.`;
      if (Ro < delta)
        return `Ro = U/(fR) = ${fmt(Ro, 2)} is smaller than the seamount's relative height δ = ${fmt(delta, 2)}: rotation steers the flow around the seamount and traps an anticyclone (a Taylor column) above it.`;
      return `Ro = U/(fR) = ${fmt(Ro, 2)} exceeds the relative height δ = ${fmt(delta, 2)}: the flow is too fast to be trapped, and the anticyclone over the seamount is swept downstream.`;
    }
    if (expId === "kelvin" && rotating)
      return `A Kelvin wave runs along the walls with the coast on its ${f > 0 ? "right (counterclockwise around the basin)" : "left (clockwise around the basin)"}, trapped within about a deformation radius, c/|f| = ${ld}, of the coast.`;
    if (expId === "dam") {
      if (rotating)
        return `Part of the step stays behind as a geostrophic jet along the front, about a deformation radius, c/|f| = ${ld}, wide. The rest leaves as gravity waves, which here slosh between the walls.`;
      if (s.nonlinear)
        return `The step collapses into two fronts that run apart at about c = √(gH) = ${fmt(c, 1)} m/s. The one running into shallower water steepens into a bore; the other spreads out.`;
      return `Linearized, the step splits into two identical fronts that run apart at c = √(gH) = ${fmt(c, 1)} m/s, neither steepening nor spreading.`;
    }
    if (!rotating) return `Without rotation every disturbance spreads as gravity waves at c = √(gH) = ${fmt(c, 1)} m/s.`;
    return `Waves radiate at c = √(gH) = ${fmt(c, 1)} m/s; rotation holds back, in geostrophic balance, whatever is wider than the deformation radius c/|f| = ${ld}.`;
  });

  // ---- Seamount geometry in the overlay ---------------------------------

  const mountView = $derived(toView(s.mount.x, s.mount.y));
  const rPx = $derived(s.mount.r * PX_PER_M);
  const isobaths = $derived([0.75, 0.5, 0.25].map((k) => isobathRadius(rPx, k)));
  /** Offsets of the seamount's periodic images that reach into the view. */
  const images = $derived.by(() => {
    const reach = isobaths[isobaths.length - 1];
    const xs = [0];
    const ys = [0];
    if (!s.wallX) {
      if (mountView.x - reach < 0) xs.push(VIEW_W);
      if (mountView.x + reach > VIEW_W) xs.push(-VIEW_W);
    }
    if (!s.wallY) {
      if (mountView.y - reach < 0) ys.push(VIEW_H);
      if (mountView.y + reach > VIEW_H) ys.push(-VIEW_H);
    }
    return xs.flatMap((x) => ys.map((y) => ({ x, y })));
  });

  const probeView = $derived(toView(probe.x, probe.y));
  const probeArrow = $derived.by(() => {
    const u = shown.U + reading.u;
    const v = reading.v;
    const sp = Math.hypot(u, v);
    const len = Math.min(70, (ARROW_PX * sp) / shown.vmax);
    if (!Number.isFinite(len) || len < 5) return null;
    const ux = u / sp;
    const uy = -v / sp;
    const tip = { x: probeView.x + ux * len, y: probeView.y + uy * len };
    const size = Math.min(9, len * 0.45);
    const b = { x: tip.x - ux * size, y: tip.y - uy * size };
    const w = size * 0.45;
    return {
      x2: b.x,
      y2: b.y,
      head: `${tip.x},${tip.y} ${b.x - uy * w},${b.y + ux * w} ${b.x + uy * w},${b.y - ux * w}`,
    };
  });

  // ---- Simulation -------------------------------------------------------

  let sim: ShallowWaterGL | null = null;
  let stats: Stats | null = null;
  let t = 0;
  let uEff = 0;
  let range = 0;
  let rangeField: Field | null = null;
  /** Steps per frame the GPU keeps up with; adapted from the frame cost. */
  let budget = 32;
  let rate = 0;
  let dirty = true;
  let bumps: { x: number; y: number; amp: number }[] = [];
  let sinceReadout = 0;

  function restart() {
    if (!sim) return;
    sim.load(EXPERIMENTS[expId].init(s.H));
    t = 0;
    uEff = 0;
    stats = null;
    rangeField = null;
    dirty = true;
  }

  function loadExperiment(id: ExperimentId) {
    expId = id;
    s = copy(EXPERIMENTS[id].settings);
    selected = false;
    notice = null;
    restart();
  }

  function dropBump(at: Vec2, sign: 1 | -1) {
    bumps.push({ x: at.x, y: at.y, amp: sign * BUMP_FRAC * s.H });
    dirty = true;
  }

  function floorFor(field: Field, cfg: Settings): number {
    return field === "eta" ? 1e-4 * cfg.H : 1e-4 * Math.sqrt(cfg.g * cfg.H);
  }

  function frame(wall: number) {
    if (!sim) return;
    const cfg = $state.snapshot(s) as Settings;
    let advanced = 0;
    const t0 = performance.now();
    if (playing) {
      const n = Math.min(2 ** speed, budget);
      const dt = ShallowWaterGL.maxDt(cfg, Math.max(uEff, cfg.U), stats);
      const target = cfg.wallX ? 0 : cfg.U;
      for (let k = 0; k < n; k++) {
        uEff += (target - uEff) * (1 - Math.exp(-dt / RAMP));
        if (cfg.wallX) uEff = 0;
        sim.step(cfg, uEff, dt);
      }
      t += n * dt;
      advanced = n * dt;
    }
    for (const b of bumps) sim.bump(cfg, b.x, b.y, BUMP_R, b.amp);
    bumps = [];

    stats = sim.stats(cfg);
    const c0 = Math.sqrt(cfg.g * cfg.H);
    if (stats.bad || stats.eta > 5 * cfg.H || Math.max(stats.u, stats.v) > 20 * c0) {
      notice = "The solution blew up, so it was restarted and paused. Try a smaller inflow, a deeper seamount peak, or the linear equations.";
      playing = false;
      restart();
      return;
    }
    const probed = sim.probe(cfg, probe.x, probe.y);

    if (playing) {
      const work = performance.now() - t0;
      const n = Math.min(2 ** speed, budget);
      if (work > 16 && n > 1) budget = Math.max(1, Math.floor(n * 0.75));
      else if (work < 9 && n === budget) budget = Math.min(2 ** SPEED_MAX, budget + Math.max(1, budget >> 3));
      if (wall > 0) rate += (advanced / wall - rate) * 0.1;
    }

    // Color scale: up at once, down slowly, so a decaying field is seen to decay.
    const want = Math.max(
      floorFor(cfg.field, cfg),
      cfg.field === "eta" ? stats.eta : cfg.field === "u" ? stats.u : stats.v,
    );
    if (rangeField !== cfg.field || want > range) range = want;
    else range += (want - range) * (1 - Math.exp(-wall / RANGE_RELAX));
    rangeField = cfg.field;
    const step = cfg.style === "filled" ? niceStep(range / 5) : 0;

    const ink = parseRgb(theme?.fg ?? "#1c1915") ?? [28, 25, 21];
    sim.render(cfg, {
      field: cfg.field === "eta" ? 0 : cfg.field === "u" ? 1 : 2,
      range,
      step,
      ink: [ink[0] / 255, ink[1] / 255, ink[2] / 255, theme && darkTheme(theme) ? 0.45 : 0.35],
    });

    sinceReadout += wall;
    if (sinceReadout > 0.07 || !playing) {
      sinceReadout = 0;
      reading = probed;
      shown = {
        t,
        range,
        step,
        U: uEff,
        rate: playing ? rate : shown.rate,
        vmax: Math.max(Math.abs(uEff) + stats.u, stats.v, 1e-3 * c0),
        steps: Math.min(2 ** speed, budget),
      };
    }
    dirty = false;
  }

  // ---- Seamount and probe interaction ------------------------------------

  const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

  function toModel(e: PointerEvent | MouseEvent): Vec2 {
    const m = svgEl?.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    const q = fromView(clamp(p.x, 0, VIEW_W), clamp(p.y, 0, VIEW_H));
    return { x: clamp(q.x, 0, LX), y: clamp(q.y, 0, LY) };
  }

  function grab(e: PointerEvent, kind: "move" | "radius") {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    selected = true;
    const p = toModel(e);
    drag = { kind, dx: s.mount.x - p.x, dy: s.mount.y - p.y };
    svgEl?.setPointerCapture(e.pointerId);
  }

  let lastTap = { t: -Infinity, x: 0, y: 0 };

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    selected = false;
    const p = toModel(e);
    const now = performance.now();
    if (now - lastTap.t < 400 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 15e3) {
      lastTap.t = -Infinity;
      dropBump(p, e.shiftKey || e.altKey ? -1 : 1);
      return;
    }
    lastTap = { t: now, x: p.x, y: p.y };
    probe = p;
    drag = { kind: "probe", dx: 0, dy: 0 };
    svgEl?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    const p = toModel(e);
    if (!drag) {
      if (e.pointerType === "mouse") probe = p;
      return;
    }
    if (drag.kind === "probe") probe = p;
    else if (drag.kind === "move") {
      s.mount.x = clamp(p.x + drag.dx, 0, LX);
      s.mount.y = clamp(p.y + drag.dy, 0, LY);
    } else {
      setRadius(Math.hypot(p.x - s.mount.x, p.y - s.mount.y));
    }
  }

  function onPointerUp(e: PointerEvent) {
    drag = null;
    if (svgEl?.hasPointerCapture(e.pointerId)) svgEl.releasePointerCapture(e.pointerId);
  }

  function setRadius(r: number) {
    s.mount.r = clamp(Math.round(r / 1000) * 1000, R_MIN, R_MAX);
  }

  /** Turn the seamount on, raising it again if it had been flattened. */
  function mountOn() {
    s.mountOn = true;
    if (s.mount.peak >= s.H) s.mount.peak = PEAK_DEFAULT_FRAC * s.H;
  }

  function setPeak(d: number) {
    s.mount.peak = clampPeak(d, s.H);
  }

  function onMarkerKey(e: KeyboardEvent) {
    const step = (e.shiftKey ? 20 : 5) * 1000;
    switch (e.key) {
      case "ArrowLeft":
        s.mount.x = clamp(s.mount.x - step, 0, LX);
        break;
      case "ArrowRight":
        s.mount.x = clamp(s.mount.x + step, 0, LX);
        break;
      case "ArrowUp":
        s.mount.y = clamp(s.mount.y + step, 0, LY);
        break;
      case "ArrowDown":
        s.mount.y = clamp(s.mount.y - step, 0, LY);
        break;
      case "+":
      case "=":
      case "PageUp":
        setPeak(peak - 0.05 * s.H);
        break;
      case "-":
      case "_":
      case "PageDown":
        setPeak(peak + 0.05 * s.H);
        break;
      case "]":
        setRadius(s.mount.r + 5e3);
        break;
      case "[":
        setRadius(s.mount.r - 5e3);
        break;
      default:
        return;
    }
    e.preventDefault();
  }

  const markerLabel = $derived(
    `Seamount: peak ${fmt(peak, 0)} m deep in water ${fmt(s.H, 0)} m deep, radius ${km(s.mount.r)}, at ${km(s.mount.x)} east, ${km(s.mount.y)} north. Arrow keys move it, plus and minus raise or lower the peak, brackets change the radius.`,
  );

  // ---- Color bar -----------------------------------------------------------

  let lut: Uint8Array | null = null;

  function paintRamp() {
    if (!rampEl || !lut) return;
    const ctx = rampEl.getContext("2d");
    if (!ctx) return;
    rampEl.width = 256;
    rampEl.height = 1;
    const img = ctx.createImageData(256, 1);
    for (let i = 0; i < 256; i++) {
      let x = (i / 255) * 2 - 1;
      if (shown.step > 0) {
        const w = (x * shown.range) / shown.step;
        x = ((Math.floor(w) + 0.5) * shown.step) / shown.range;
      }
      const k = Math.round(clamp(0.5 + 0.5 * x, 0, 1) * 255) * 4;
      img.data.set(lut.subarray(k, k + 4), i * 4);
    }
    ctx.putImageData(img, 0, 0);
  }

  $effect(() => {
    if (!theme) return;
    lut = divergingLut(theme);
    sim?.setLut(lut);
    dirty = true;
  });

  $effect(() => {
    shown.range;
    shown.step;
    theme;
    paintRamp();
  });

  // Anything the reader changes redraws a paused frame.
  $effect(() => {
    JSON.stringify(s);
    probe.x;
    probe.y;
    dirty = true;
  });

  // ---- Lifecycle -----------------------------------------------------------

  let visible = $state(true);
  let raf = 0;
  let last = 0;

  function loop(now: number) {
    const wall = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    if (playing || dirty) frame(wall);
    raf = requestAnimationFrame(loop);
  }

  $effect(() => {
    if (!visible || failed) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  });

  function start(): boolean {
    if (!glEl) return false;
    sim = ShallowWaterGL.create(glEl);
    if (!sim) {
      failed = "This simulation needs WebGL 2 with floating-point render targets, which this browser does not provide.";
      return false;
    }
    if (lut) sim.setLut(lut);
    restart();
    return true;
  }

  onMount(() => {
    theme = readTheme();
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) playing = false;

    const resize = new ResizeObserver(() => {
      if (!plotEl || !glEl) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = plotEl.clientWidth || VIEW_W;
      glEl.width = Math.round(w * dpr);
      glEl.height = Math.round(((w * VIEW_H) / VIEW_W) * dpr);
      dirty = true;
    });
    if (plotEl) resize.observe(plotEl);

    start();

    const lost = (e: Event) => {
      e.preventDefault();
      sim = null;
      failed = "The graphics context was lost. It will come back when the browser restores it.";
    };
    const restored = () => {
      failed = null;
      start();
    };
    glEl?.addEventListener("webglcontextlost", lost);
    glEl?.addEventListener("webglcontextrestored", restored);

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
      glEl?.removeEventListener("webglcontextlost", lost);
      glEl?.removeEventListener("webglcontextrestored", restored);
      sim?.dispose();
      sim = null;
    };
  });
</script>

<div class="interactive swe-interactive" bind:this={rootEl}>
  <div class="swe-head">
    <p class="interactive-title">Shallow water simulation</p>
    <p class="interactive-caption">
      Pick an experiment and change anything while it runs. Drag the seamount (▲) to move it, or drag
      the ring of the selected one to resize it. Double-click or double-tap the water to drop a bump
      (shift-double-click for a dip), and move the pointer to read the flow at the probe.
    </p>
  </div>

  <div class="swe-main">
    <div class="field-plot swe-plot" bind:this={plotEl}>
      <canvas bind:this={glEl} class="field-heat" aria-hidden="true"></canvas>
      {#if failed}
        <p class="swe-failed">{failed}</p>
      {/if}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <svg
        bind:this={svgEl}
        class="vector-canvas"
        class:is-dragging={drag !== null && drag.kind !== "probe"}
        viewBox="0 0 {VIEW_W} {VIEW_H}"
        role="application"
        aria-label="Map of the {FIELDS.find((q) => q.id === s.field)?.name}. Tab to the seamount to move or resize it."
        onpointerdown={onPointerDown}
        onpointermove={onPointerMove}
        onpointerup={onPointerUp}
        onpointercancel={onPointerUp}
      >
        {#if mountShown}
          {#each images as im (`${im.x},${im.y}`)}
            {#each isobaths as r, k (k)}
              <circle
                cx={mountView.x + im.x}
                cy={mountView.y + im.y}
                {r}
                fill="none"
                stroke={fg}
                stroke-width="1"
                opacity={0.25 + 0.15 * (2 - k)}
                pointer-events="none"
              />
            {/each}
          {/each}
        {/if}

        {#if s.wallX}
          <line x1="1.5" y1="0" x2="1.5" y2={VIEW_H} class="swe-wall" stroke={fg} />
          <line x1={VIEW_W - 1.5} y1="0" x2={VIEW_W - 1.5} y2={VIEW_H} class="swe-wall" stroke={fg} />
        {:else if inflow > 0}
          {#each [0.2, 0.5, 0.8] as k (k)}
            <g class="swe-inflow" transform="translate(6 {k * VIEW_H})">
              <line x1="0" y1="0" x2="22" y2="0" stroke={fg} stroke-width="2" />
              <polygon points="30,0 21,-5 21,5" fill={fg} />
            </g>
          {/each}
          <text x="10" y={0.5 * VIEW_H - 10} fill={fg} stroke={bg} class="halo" font-size="15" font-style="italic">U</text>
        {/if}
        {#if s.wallY}
          <line x1="0" y1="1.5" x2={VIEW_W} y2="1.5" class="swe-wall" stroke={fg} />
          <line x1="0" y1={VIEW_H - 1.5} x2={VIEW_W} y2={VIEW_H - 1.5} class="swe-wall" stroke={fg} />
        {/if}

        <g class="swe-scale" transform="translate(18 {VIEW_H - 20})">
          <line x1="0" y1="0" x2={100e3 * PX_PER_M} y2="0" stroke={fg} stroke-width="2" />
          <line x1="0" y1="-4" x2="0" y2="4" stroke={fg} stroke-width="2" />
          <line x1={100e3 * PX_PER_M} y1="-4" x2={100e3 * PX_PER_M} y2="4" stroke={fg} stroke-width="2" />
          <text x={50e3 * PX_PER_M} y="-8" text-anchor="middle" fill={fg} stroke={bg} class="halo" font-size="14">100 km</text>
        </g>

        <g pointer-events="none">
          {#if probeArrow}
            <line x1={probeView.x} y1={probeView.y} x2={probeArrow.x2} y2={probeArrow.y2} stroke={fg} stroke-width="2.5" stroke-linecap="round" />
            <polygon points={probeArrow.head} fill={fg} />
          {/if}
          <circle cx={probeView.x} cy={probeView.y} r="4.5" fill={bg} stroke={fg} stroke-width="1.8" />
        </g>

        {#if s.mountOn}
          {#if selected}
            <circle cx={mountView.x} cy={mountView.y} r={rPx} fill="none" stroke={accent} stroke-width="1.5" stroke-dasharray="6 4" pointer-events="none" />
          {/if}
          <g class="swe-marker">
            <circle cx={mountView.x} cy={mountView.y} r="14" fill={bg} fill-opacity="0.9" stroke={selected ? accent : fg} stroke-width={selected ? 2.5 : 1.5} />
            <polygon
              points="{mountView.x - 7},{mountView.y + 5} {mountView.x},{mountView.y - 7} {mountView.x + 7},{mountView.y + 5}"
              fill={selected ? accent : fg}
            />
            <circle
              class="vec-hit"
              cx={mountView.x}
              cy={mountView.y}
              r="22"
              role="button"
              tabindex="0"
              aria-label={markerLabel}
              aria-pressed={selected}
              onpointerdown={(e) => grab(e, "move")}
              onfocus={() => (selected = true)}
              onkeydown={onMarkerKey}
            />
          </g>
          {#if selected}
            <circle class="swe-handle" cx={mountView.x + rPx} cy={mountView.y} r="6" fill={bg} stroke={accent} stroke-width="2" />
            <circle
              class="vec-hit swe-radius-hit"
              cx={mountView.x + rPx}
              cy={mountView.y}
              r="16"
              role="presentation"
              onpointerdown={(e) => grab(e, "radius")}
            />
          {/if}
        {/if}
      </svg>
    </div>

    <div class="swe-legend" aria-hidden="true">
      <span class="swe-ramp">
        <span><em>{FIELDS.find((q) => q.id === s.field)?.label}</em></span>
        <span class="swe-ramp-bar">
          <canvas bind:this={rampEl}></canvas>
          <span class="swe-ticks">
            <span>{sig(offset - shown.range)}</span>
            <span>{sig(offset)}</span>
            <span>{sig(offset + shown.range)} {unit}</span>
          </span>
        </span>
      </span>
      {#if mountShown}
        <span class="swe-key"><i class="ring" style:border-color={fg}></i>isobaths at ¼, ½, ¾ of the seamount height</span>
      {/if}
      {#if s.wallX || s.wallY}
        <span class="swe-key"><i style:background={fg}></i>walls</span>
      {/if}
      <span class="swe-key"><i class="arrow" style:background={fg}></i>velocity at the probe</span>
    </div>
  </div>

  <div class="swe-side">
    {#if notice}
      <p class="vector-callout is-zero">{notice}</p>
    {:else}
      <p class="vector-callout">{callout}</p>
    {/if}

    <div class="swe-eqs" aria-label="Equations solved">
      <p>
        ∂<i>u</i>/∂<i>t</i>
        <span class:is-off={!s.nonlinear}>+ <i>u</i>&#8202;∂<i>u</i>/∂<i>x</i> + <i>v</i>&#8202;∂<i>u</i>/∂<i>y</i></span>
        − <i>f</i>&#8202;<i>v</i> = −<i>g</i>&#8202;∂<i>η</i>/∂<i>x</i>
      </p>
      <p>
        ∂<i>v</i>/∂<i>t</i>
        <span class:is-off={!s.nonlinear}>+ <i>u</i>&#8202;∂<i>v</i>/∂<i>x</i> + <i>v</i>&#8202;∂<i>v</i>/∂<i>y</i></span>
        + <i>f</i>&#8202;<i>u</i> = −<i>g</i>&#8202;∂<i>η</i>/∂<i>y</i>
      </p>
      <p>
        ∂<i>η</i>/∂<i>t</i> + ∂(<i>hu</i>)/∂<i>x</i> + ∂(<i>hv</i>)/∂<i>y</i> = 0,
        <span class="swe-eq-gap"><i>h</i> = <i>H</i><sub>b</sub>(<i>x</i>,&#8201;<i>y</i>) <span class:is-off={!s.nonlinear}>+ <i>η</i></span></span>
      </p>
      {#if !s.nonlinear}
        <p class="swe-eq-note">
          Linearized about the inflow: products of disturbances are dropped, but <i>U</i> still carries them
          downstream, through <i>U</i>&#8202;∂/∂<i>x</i> and the flux <i>U</i><i>η</i>.
        </p>
      {/if}
    </div>

    <div class="readout">
      <span>(u, v)</span>
      <span>= ({fmt(shown.U + reading.u, 2)}, {fmt(reading.v, 2)}) m/s</span>
      <span>η, h</span>
      <span>= {sig(reading.eta)} m, {fmt(reading.depth + reading.eta, reading.depth < 100 ? 1 : 0)} m</span>
      <span>c = √(gH)</span>
      <span>= {fmt(c, 1)} m/s, L<sub>d</sub> = c/|f| = {rotating ? km(Ld) : "∞"}</span>
      {#if inflow > 0}
        <span>Fr, Ro</span>
        <span>= U/c = {fmt(inflow / c, 3)}{#if mountShown && rotating}, U/(|f|R) = {fmt(Ro, 2)}{/if}</span>
      {/if}
      <span>t</span>
      <span>= {timeLabel(shown.t)}</span>
    </div>

    <div class="swe-options">
      <div class="swe-group swe-wide">
        <span class="swe-label">Experiment</span>
        <div class="vector-actions" role="group" aria-label="Experiment">
          {#each Object.values(EXPERIMENTS) as ex (ex.id)}
            <button type="button" aria-pressed={expId === ex.id} onclick={() => loadExperiment(ex.id)}>{ex.label}</button>
          {/each}
        </div>
      </div>
      <div class="swe-group">
        <span class="swe-label">Field</span>
        <div class="vector-actions" role="group" aria-label="Field shown">
          {#each FIELDS as q (q.id)}
            <button type="button" aria-pressed={s.field === q.id} aria-label={q.name} onclick={() => (s.field = q.id)}><em>{q.label}</em></button>
          {/each}
        </div>
      </div>
      <div class="swe-group">
        <span class="swe-label">Plot</span>
        <div class="vector-actions" role="group" aria-label="Plot style">
          <button type="button" aria-pressed={s.style === "heat"} onclick={() => (s.style = "heat")}>Heat map</button>
          <button type="button" aria-pressed={s.style === "filled"} onclick={() => (s.style = "filled")}>Filled contours</button>
        </div>
      </div>
      <div class="swe-group">
        <span class="swe-label">Left and right edges</span>
        <div class="vector-actions" role="group" aria-label="Left and right boundaries">
          <button type="button" aria-pressed={!s.wallX} onclick={() => (s.wallX = false)}>Periodic</button>
          <button type="button" aria-pressed={s.wallX} onclick={() => (s.wallX = true)}>Walls</button>
        </div>
      </div>
      <div class="swe-group">
        <span class="swe-label">Top and bottom edges</span>
        <div class="vector-actions" role="group" aria-label="Top and bottom boundaries">
          <button type="button" aria-pressed={!s.wallY} onclick={() => (s.wallY = false)}>Periodic</button>
          <button type="button" aria-pressed={s.wallY} onclick={() => (s.wallY = true)}>Walls</button>
        </div>
      </div>
      <div class="swe-group">
        <span class="swe-label">Nonlinear terms</span>
        <div class="vector-actions" role="group" aria-label="Nonlinear terms">
          <button type="button" aria-pressed={s.nonlinear} onclick={() => (s.nonlinear = true)}>On</button>
          <button type="button" aria-pressed={!s.nonlinear} onclick={() => (s.nonlinear = false)}>Off</button>
        </div>
      </div>
      <div class="swe-group">
        <span class="swe-label">Seamount</span>
        <div class="vector-actions" role="group" aria-label="Seamount">
          <button type="button" aria-pressed={s.mountOn} onclick={mountOn}>On</button>
          <button type="button" aria-pressed={!s.mountOn} onclick={() => ((s.mountOn = false), (selected = false))}>Off</button>
        </div>
      </div>
    </div>

    <div class="controls rotation-controls">
      <label>
        <span>Gravity g</span>
        <span>{fmt(s.g, 2)} m s<sup>−2</sup></span>
        <input type="range" min="1" max="25" step="0.01" bind:value={s.g} />
      </label>
      <label>
        <span>Mean depth H</span>
        <span>{fmt(s.H, s.H < 100 ? 1 : 0)} m</span>
        <input
          type="range"
          min="0"
          max="1000"
          step="1"
          value={hSlider}
          oninput={(e) => {
            const H = H_LO * (H_HI / H_LO) ** (Number(e.currentTarget.value) / 1000);
            s.mount.peak *= H / s.H;
            s.H = H;
          }}
        />
      </label>
      <label>
        <span>Coriolis f</span>
        <span>{#if !rotating}0{:else}{fText.m} × 10<sup>{fText.e}</sup>{/if} s<sup>−1</sup> ({latText})</span>
        <input type="range" min="-1.45" max="1.45" step="0.01" bind:value={s.fScaled} />
      </label>
      <label>
        <span>Inflow U</span>
        <span>{s.wallX ? "blocked by walls" : `${fmt(s.U, 2)} m/s`}</span>
        <input type="range" min="0" max="2" step="0.01" disabled={s.wallX} bind:value={s.U} />
      </label>
      <label>
        <span>Seamount peak depth</span>
        <span>{s.mountOn ? `${fmt(peak, peak < 100 ? 1 : 0)} m (δ = ${fmt(delta, 2)})` : "seamount off"}</span>
        <input
          type="range"
          min={PEAK_MIN_FRAC * s.H}
          max={s.H}
          step={s.H / 500}
          disabled={!s.mountOn}
          value={peak}
          oninput={(e) => setPeak(Number(e.currentTarget.value))}
        />
      </label>
      <label>
        <span>Seamount radius R</span>
        <span>{s.mountOn ? km(s.mount.r) : "seamount off"}</span>
        <input
          type="range"
          min={R_MIN}
          max={R_MAX}
          step="1000"
          disabled={!s.mountOn}
          value={s.mount.r}
          oninput={(e) => setRadius(Number(e.currentTarget.value))}
        />
      </label>
      <label>
        <span>Speed</span>
        <span>
          {2 ** speed} step{speed ? "s" : ""} per frame{#if playing && shown.steps < 2 ** speed}&nbsp;(GPU keeps up with {shown.steps}){/if}
        </span>
        <input type="range" min="0" max={SPEED_MAX} step="1" bind:value={speed} />
      </label>
    </div>

    <div class="controls vector-actions" role="group" aria-label="Run">
      <button type="button" onclick={() => dropBump(probe, 1)}>Drop bump at probe</button>
      <button type="button" onclick={() => dropBump(probe, -1)}>Drop dip</button>
      <span class="swe-sep" aria-hidden="true"></span>
      <button type="button" aria-pressed={!playing} onclick={() => ((playing = !playing), (notice = null))}>{playing ? "Pause" : "Play"}</button>
      <button type="button" onclick={() => ((notice = null), restart())}>Restart</button>
    </div>
  </div>

  <p class="swe-note">
    The domain is {LX / 1000} × {LY / 1000} km, solved on a {NX} × {NY} grid ({fmt(DX / 1000, 1)} km cells) on the GPU.
    Bumps are {fmt(BUMP_FRAC * 100, 0)}% of H high. With an inflow and rotation, η leaves out the steady tilt −fUy/g that
    holds U in geostrophic balance.
    {#if shown.rate > 0}One second of animation is about {timeLabel(shown.rate)} of model time.{/if}
    Choosing an experiment loads its setup; Restart runs it again with the current settings.
  </p>
</div>
