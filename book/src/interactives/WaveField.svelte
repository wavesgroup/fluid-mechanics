<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { onThemeChange, readTheme, type Theme } from "./plot";
  import { darkTheme, rgbCss } from "./field-plot";
  import { fmt } from "./vectors";
  import {
    AK_BREAKING,
    A_MAX,
    BANDS,
    FIGURE_WAVE,
    G_MAX,
    G_MIN,
    K_MAX,
    K_MIN,
    Particles,
    TRAIL,
    TRAIL_BREAK,
    TRAIL_PERIODS,
    X_MAX,
    Z_BOT,
    Z_TOP,
    bandColor,
    bandLut,
    colorRange,
    omega,
    paintField,
    wavenumber,
    type FieldId,
    type Wave,
  } from "./waves";

  /**
   * The cross-section under a deep-water wave, colored by the velocity
   * potential (Fig. 10.1) or, in two panels, by the velocity components
   * (Fig. 10.3), the latter with particles that move with the water.
   */
  let { kind }: { kind: "potential" | "velocities" } = $props();

  type Panel = { field: FieldId; name: string; symbol: string };
  const panels = $derived<Panel[]>(
    kind === "potential"
      ? [{ field: "phi", name: "Velocity potential", symbol: "φ" }]
      : [
          { field: "u", name: "Horizontal velocity", symbol: "u" },
          { field: "w", name: "Vertical velocity", symbol: "w" },
        ],
  );
  const hasParticles = $derived(kind === "velocities");
  const title = $derived(kind === "potential" ? "Wave velocity potential" : "Wave velocities");

  // ---- Layout ----------------------------------------------------------------

  // The drawing is laid out in CSS pixels at whatever width it is given, so
  // its labels keep their size while the panels take up the rest; x and z
  // share one scale.
  let width = $state(574);
  const PAD_L = 46;
  const PAD_R = 10;
  /** Room above each panel for its title, between panels, and for the x axis. */
  const HEAD = 23;
  const GAP = 4;
  const FOOT = 40;
  const layout = $derived.by(() => {
    const plotW = Math.max(40, width - PAD_L - PAD_R);
    const pxPerM = plotW / X_MAX;
    const plotH = (Z_TOP - Z_BOT) * pxPerM;
    const top = (p: number) => HEAD + p * (plotH + HEAD + GAP);
    return { plotW, pxPerM, plotH, top, height: top(panels.length - 1) + plotH + FOOT };
  });
  const xAt = (x: number) => PAD_L + x * layout.pxPerM;
  const zAt = (z: number, p: number) => layout.top(p) + (Z_TOP - z) * layout.pxPerM;
  /** Width over height of the whole drawing at a typical size, for the page layout. */
  const aspect = $derived(kind === "potential" ? 3.7 : 2.1);

  const X_TICKS = [0, 1, 2, 3, 4, 5, 6];
  const Z_TICKS = [-1, -0.75, -0.5, -0.25, 0, 0.25];
  const Z_LABELS = [-1, -0.5, 0];

  // ---- The wave -------------------------------------------------------------

  const SPEEDS = [
    { rate: 0.25, label: "¼×" },
    { rate: 0.5, label: "½×" },
    { rate: 1, label: "1×" },
    { rate: 2, label: "2×" },
  ];

  let a = $state(FIGURE_WAVE.a);
  let k = $state(FIGURE_WAVE.k);
  let g = $state(FIGURE_WAVE.g);
  /** The frequency last set by the reader, if it was set after k: kept as g changes. */
  let fHeld = $state<number | null>(null);
  let particlesOn = $state(true);
  let speed = $state(1);
  let playing = $state(true);
  let theme = $state<Theme | null>(null);
  /** Time since the last restart, for the readout. */
  let shownT = $state(0);

  const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

  const wave = $derived<Wave>({ a, k, g });
  const om = $derived(omega(g, k));
  const f = $derived(om / (2 * Math.PI));
  const fMin = $derived(omega(g, K_MIN) / (2 * Math.PI));
  const fMax = $derived(omega(g, K_MAX) / (2 * Math.PI));
  const period = $derived((2 * Math.PI) / om);
  const wavelength = $derived((2 * Math.PI) / k);
  const cp = $derived(om / k);
  const steepness = $derived(a * k);
  const range = $derived(colorRange(wave, panels[0].field));
  const unit = $derived(kind === "potential" ? "m² s⁻¹" : "m s⁻¹");
  const tracing = $derived(hasParticles && particlesOn);

  function setK(value: number) {
    k = value;
    fHeld = null;
  }

  function setF(value: number) {
    fHeld = value;
    k = clamp(wavenumber(g, value), K_MIN, K_MAX);
  }

  function setG(value: number) {
    g = value;
    if (fHeld !== null) k = clamp(wavenumber(value, fHeld), K_MIN, K_MAX);
  }

  /** A number on the color bar: a 1-2-5 value, so two digits always do. */
  function tick(x: number): string {
    return String(Number(x.toPrecision(2))).replace("-", "−");
  }

  const callout = $derived.by(() => {
    const ak = fmt(steepness, 2);
    if (a === 0) return "With no amplitude there is no wave, and the water is at rest.";
    if (steepness > AK_BREAKING) {
      // Where a ω e^(ka) exceeds ω/k, the water at the crest outruns the wave.
      const surf = tracing && steepness * Math.exp(steepness) > 1 ? " Particles at the crest now move faster than the wave and ride along with it." : "";
      return `ak = ${ak}: steeper than a deep-water wave can be, as it breaks near ak ≈ 0.44. The linear solution assumes ak ≪ 1, so this picture is far outside what it can describe.${surf}`;
    }
    if (steepness > 0.2) {
      const tail = tracing ? ", but the drift of the particles, which grows as (ak)², is plain to see" : "";
      return `ak = ${ak}: a steep wave. The linear solution assumes ak ≪ 1 and is less accurate here${tail}.`;
    }
    if (kind === "potential")
      return `ak = ${ak}: a small-amplitude wave. The potential is largest at the surface on the front face of the wave and smallest on its back face, and it decays exponentially with depth.`;
    if (tracing)
      return `ak = ${ak}: a small-amplitude wave. Particles circle in orbits that shrink exponentially with depth, moving forward under the crests and backward under the troughs. The orbits do not quite close, so each particle drifts slowly in the direction of the wave, fastest at the surface.`;
    return `ak = ${ak}: a small-amplitude wave. u is in phase with the surface, forward under the crests and backward under the troughs; w leads it by a quarter of a wavelength, upward on the front face of the wave.`;
  });

  const label = $derived(
    `Cross-section of a deep-water wave of amplitude ${fmt(a, 3)} m and wavenumber ${fmt(k, 2)} rad/m, traveling from left to right. ` +
      (kind === "potential"
        ? "Color shows the velocity potential, positive under the front face of the wave, negative under its back face, and decaying with depth."
        : "Color shows the horizontal velocity in the top panel and the vertical velocity in the bottom panel, both decaying with depth." +
          (particlesOn ? " Particles moving with the water trace nearly circular orbits that drift slowly to the right." : "")),
  );

  // ---- Animation state, outside the reactive graph --------------------------

  /** ωt as accumulated so far, kept in [0, 2π). */
  let phase = 0;
  let t = 0;
  let dirty = true;
  const particles = new Particles();

  function restart() {
    phase = 0;
    t = 0;
    shownT = 0;
    if (tracing) particles.release(wave, phase);
    dirty = true;
  }

  function reset() {
    a = FIGURE_WAVE.a;
    k = FIGURE_WAVE.k;
    g = FIGURE_WAVE.g;
    fHeld = null;
    particlesOn = true;
    speed = 1;
    restart();
  }

  // A change to the wave releases the particles afresh, so that their trails
  // always belong to the wave shown. The wave itself carries on.
  $effect(() => {
    wave;
    if (tracing) {
      untrack(() => {
        particles.release(wave, phase);
        t = 0;
        shownT = 0;
      });
    }
    dirty = true;
  });

  function advance(dt: number) {
    const dPhase = om * dt;
    if (tracing) particles.advance(wave, phase, dPhase);
    phase = (phase + dPhase) % (2 * Math.PI);
    t += dt;
  }

  // ---- Drawing ---------------------------------------------------------------

  let rootEl: HTMLDivElement | undefined;
  let plotEl: HTMLDivElement | undefined;
  let canvasEl: HTMLCanvasElement | undefined;
  let rampEl: HTMLCanvasElement | undefined;
  let lut: Uint32Array | null = null;
  let image: ImageData | null = null;
  let pixels: Uint32Array | null = null;

  const fg = $derived(theme?.fg ?? "#1c1915");
  const muted = $derived(theme?.muted ?? "#5e574c");
  const bg = $derived(theme?.bg ?? "#f7f3eb");

  const TRAIL_BINS = 6;

  function render() {
    const ctx = canvasEl?.getContext("2d");
    if (!canvasEl || !ctx || !theme || !lut) return;
    const { plotW, plotH, top } = layout;
    /** Canvas pixels per CSS pixel. */
    const px = canvasEl.width / width;
    const nx = Math.round(plotW * px);
    const ny = Math.round(plotH * px);
    if (nx < 2 || ny < 2) return;
    if (!image || !pixels || image.width !== nx || image.height !== ny) {
      image = ctx.createImageData(nx, ny);
      pixels = new Uint32Array(image.data.buffer);
    }
    const w = wave;
    const x0 = Math.round(PAD_L * px);
    /** Canvas pixels per meter. */
    const m = nx / X_MAX;
    // Particles and trails grow a little with the drawing.
    const dot = Math.min(3.6, Math.max(1.7, 0.028 * layout.pxPerM)) * px;
    const thin = Math.min(1.6, Math.max(1, 0.011 * layout.pxPerM)) * px;
    const X = (x: number) => x * m;
    const Z = (z: number) => (Z_TOP - z) * m;

    // Lines shared by the panels, in pixels from a panel's top left corner.
    const surface = new Path2D();
    for (let i = 0; i <= nx; i += 2) {
      const x = (i / nx) * X_MAX;
      surface.lineTo(i, Z(w.a * Math.cos(w.k * x - phase)));
    }
    const orbits = new Path2D();
    const dots = new Path2D();
    const trails = Array.from({ length: TRAIL_BINS }, () => new Path2D());
    if (tracing) {
      const q = particles;
      for (let i = 0; i < q.n; i++) {
        // The closed orbit of the first-order displacements, about the mean
        // position the particle was released from.
        const r = w.a * Math.exp(w.k * q.z0[i]) * m;
        if (r > 0.5) {
          orbits.moveTo(X(q.x0[i]) + r, Z(q.z0[i]));
          orbits.arc(X(q.x0[i]), Z(q.z0[i]), r, 0, 2 * Math.PI);
        }
        dots.moveTo(X(q.x[i]) + dot, Z(q.z[i]));
        dots.arc(X(q.x[i]), Z(q.z[i]), dot, 0, 2 * Math.PI);

        // The trail, from the particle back through its newest points to its
        // oldest, in runs of fading ink.
        let lastX = q.x[i];
        let lastZ = q.z[i];
        let bin = 0;
        trails[0].moveTo(X(lastX), Z(lastZ));
        for (let n = 0; n < q.count; n++) {
          const at = i * TRAIL + ((q.head - n + TRAIL) % TRAIL);
          const tx = q.tx[at];
          const tz = q.tz[at];
          const b = Math.min(TRAIL_BINS - 1, Math.floor((n * TRAIL_BINS) / TRAIL));
          if (Math.abs(tx - lastX) > TRAIL_BREAK) {
            // The particle was brought back from the far side here.
            trails[b].moveTo(X(tx), Z(tz));
          } else {
            if (b !== bin) trails[b].moveTo(X(lastX), Z(lastZ));
            trails[b].lineTo(X(tx), Z(tz));
          }
          bin = b;
          lastX = tx;
          lastZ = tz;
        }
      }
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    ctx.lineJoin = "round";
    const dark = darkTheme(theme);
    panels.forEach((panel, p) => {
      const y0 = Math.round(top(p) * px);
      paintField(pixels!, nx, ny, w, panel.field, phase, range, lut!);
      ctx.putImageData(image!, x0, y0);

      ctx.save();
      ctx.translate(x0, y0);
      ctx.beginPath();
      ctx.rect(0, 0, nx, ny);
      ctx.clip();

      ctx.strokeStyle = fg;
      ctx.fillStyle = fg;
      // Mean water level.
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = px;
      ctx.setLineDash([5 * px, 4 * px]);
      ctx.beginPath();
      ctx.moveTo(0, Z(0));
      ctx.lineTo(nx, Z(0));
      ctx.stroke();
      ctx.setLineDash([]);

      if (tracing) {
        ctx.globalAlpha = dark ? 0.5 : 0.4;
        ctx.stroke(orbits);
        ctx.lineWidth = thin;
        ctx.lineCap = "round";
        for (let b = TRAIL_BINS - 1; b >= 0; b--) {
          ctx.globalAlpha = 0.9 - (0.65 * b) / (TRAIL_BINS - 1);
          ctx.stroke(trails[b]);
        }
        ctx.lineCap = "butt";
      }

      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.6 * px;
      ctx.stroke(surface);

      if (tracing) {
        ctx.fill(dots);
        ctx.strokeStyle = bg;
        ctx.lineWidth = px;
        ctx.stroke(dots);
      }
      ctx.restore();
    });
    dirty = false;
  }

  function paintRamp() {
    const ctx = rampEl?.getContext("2d");
    if (!rampEl || !ctx || !theme) return;
    rampEl.width = BANDS;
    rampEl.height = 1;
    for (let b = 0; b < BANDS; b++) {
      ctx.fillStyle = rgbCss(bandColor((b + 0.5) / BANDS, theme));
      ctx.fillRect(b, 0, 1, 1);
    }
  }

  $effect(() => {
    if (!theme) return;
    lut = bandLut(theme);
    paintRamp();
    dirty = true;
  });

  // Whatever else the reader changes redraws a paused frame.
  $effect(() => {
    range;
    tracing;
    dirty = true;
  });

  // ---- Lifecycle -------------------------------------------------------------

  let visible = $state(true);
  let raf = 0;
  let last = 0;
  let sinceReadout = 0;

  function loop(now: number) {
    const wall = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    if (playing) {
      advance(wall * speed);
      sinceReadout += wall;
      if (sinceReadout > 0.1) {
        sinceReadout = 0;
        shownT = t;
      }
    }
    if (playing || dirty) render();
    raf = requestAnimationFrame(loop);
  }

  $effect(() => {
    if (!visible) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  });

  onMount(() => {
    theme = readTheme();
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) playing = false;

    const resize = new ResizeObserver(() => {
      if (!plotEl || !canvasEl) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = plotEl.clientWidth || width;
      canvasEl.width = Math.round(width * dpr);
      canvasEl.height = Math.round(layout.height * dpr);
      // Sizing a canvas clears it, so draw now rather than a frame later.
      render();
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

<div class="interactive wave-interactive wave-{kind}" bind:this={rootEl} style:--wave-aspect={aspect}>
  <div class="wave-head">
    <p class="interactive-title">{title}</p>
    <p class="interactive-caption">
      {#if kind === "potential"}
        The velocity potential <i>φ</i> of a linear wave in deep water, under its surface <i>η</i>. Set the
        amplitude <i>a</i>, the wavenumber <i>k</i> or the frequency <i>f</i>, and gravity <i>g</i>, and watch the
        potential travel with the wave.
      {:else}
        The velocities <i>u</i> = ∂<i>φ</i>/∂<i>x</i> and <i>w</i> = ∂<i>φ</i>/∂<i>z</i> under a linear wave in deep
        water. Particles move with the water and leave a trail behind them: their orbits do not quite close, so
        they drift slowly with the wave.
      {/if}
    </p>
  </div>

  <div class="wave-main">
    <div class="field-plot wave-plot" bind:this={plotEl}>
      <canvas bind:this={canvasEl} class="field-heat" aria-hidden="true"></canvas>
      <svg viewBox="0 0 {width} {layout.height}" role="img" aria-label={label}>
        {#each panels as panel, p (panel.field)}
          {@const y = layout.top(p)}
          {@const bottom = y + layout.plotH}
          <text x={PAD_L} y={y - 7} fill={fg} font-size="13">
            {panel.name} <tspan font-style="italic">{panel.symbol}</tspan> ({unit})
          </text>
          {#if p === 0 && width >= 460}
            <text x={width - PAD_R} y={y - 7} text-anchor="end" fill={muted} font-size="12">
              wave travels → at {fmt(cp, 2)} m s⁻¹
            </text>
          {/if}
          {#each Z_TICKS as z (z)}
            <line x1={PAD_L - 4} x2={PAD_L} y1={zAt(z, p)} y2={zAt(z, p)} stroke={fg} stroke-width="1" />
          {/each}
          {#each Z_LABELS as z (z)}
            <text x={PAD_L - 7} y={zAt(z, p) + 4} text-anchor="end" fill={muted} font-size="12">{tick(z)}</text>
          {/each}
          {#each X_TICKS as x (x)}
            <line x1={xAt(x)} x2={xAt(x)} y1={bottom} y2={bottom + 4} stroke={fg} stroke-width="1" />
            {#if p === panels.length - 1}
              <text x={xAt(x)} y={bottom + 17} text-anchor="middle" fill={muted} font-size="12">{x}</text>
            {/if}
          {/each}
          <rect x={PAD_L} {y} width={layout.plotW} height={layout.plotH} fill="none" stroke={fg} stroke-width="1" />
          <text
            x="12"
            y={y + layout.plotH / 2}
            text-anchor="middle"
            fill={fg}
            font-size="12.5"
            transform="rotate(-90 12 {y + layout.plotH / 2})"
          >
            <tspan font-style="italic">z</tspan> (m)
          </text>
        {/each}
        <text x={PAD_L + layout.plotW / 2} y={layout.height - 7} text-anchor="middle" fill={fg} font-size="12.5">
          <tspan font-style="italic">x</tspan> (m)
        </text>
      </svg>
    </div>

    <div class="wave-legend" aria-hidden="true">
      <span class="wave-ramp">
        <span><i>{panels.map((q) => q.symbol).join(", ")}</i></span>
        <span class="wave-ramp-bar">
          <canvas bind:this={rampEl}></canvas>
          <span class="wave-ticks">
            <span>{tick(-range)}</span>
            <span>0</span>
            <span>{tick(range)} {unit}</span>
          </span>
        </span>
      </span>
      <span class="wave-key"><i style:background={fg}></i>surface <em>η</em></span>
      <span class="wave-key"><i class="dashed" style:border-color={fg}></i>mean water level</span>
      {#if tracing}
        <span class="wave-key"><i class="dot" style:background={fg}></i>particles and their trails</span>
        <span class="wave-key"><i class="ring" style:border-color={fg}></i>first-order orbits</span>
      {/if}
    </div>
  </div>

  <div class="wave-side">
    <div class="wave-info">
      <p class="vector-callout" class:is-zero={steepness > AK_BREAKING}>{callout}</p>

      <div class="readout">
        <span>ω = √(gk)</span>
        <span>= {fmt(om, 2)} rad/s, T = 2π/ω = {fmt(period, 2)} s</span>
        <span>L = 2π/k</span>
        <span>= {fmt(wavelength, 2)} m, C<sub>p</sub> = ω/k = {fmt(cp, 2)} m/s</span>
        {#if kind === "potential"}
          <span>ag/ω</span>
          <span>= {fmt((a * g) / om, 3)} m²/s, largest φ at z = 0</span>
        {:else}
          <span>aω</span>
          <span>= {fmt(a * om, 3)} m/s, largest u, w at z = 0</span>
          <span>a²ωk</span>
          <span>= {fmt(a * a * om * k, 3)} m/s, Stokes drift at z = 0</span>
        {/if}
        <span>1/k</span>
        <span>= {fmt(1 / k, 2)} m, e-folding depth</span>
        <span>t</span>
        <span>= {fmt(shownT, 1)} s{#if tracing}&nbsp;since release{/if}</span>
      </div>
    </div>

    <div class="wave-controls">
      <div class="controls rotation-controls">
        <label>
          <span>Amplitude a</span>
          <span>{fmt(a, 3)} m (ak = {fmt(steepness, 2)})</span>
          <input type="range" min="0" max={A_MAX} step="0.005" bind:value={a} />
        </label>
        <label>
          <span>Gravity g</span>
          <span>{fmt(g, 2)} m s<sup>−2</sup></span>
          <input
            type="range"
            min={G_MIN}
            max={G_MAX}
            step="0.01"
            value={g}
            oninput={(e) => setG(Number(e.currentTarget.value))}
          />
        </label>
        <label>
          <span>Wavenumber k</span>
          <span>{fmt(k, 2)} rad m<sup>−1</sup> (L = {fmt(wavelength, 2)} m)</span>
          <input
            type="range"
            min={K_MIN}
            max={K_MAX}
            step="0.01"
            value={k}
            oninput={(e) => setK(Number(e.currentTarget.value))}
          />
        </label>
        <label>
          <span>Frequency f = ω/2π</span>
          <span>{fmt(f, 3)} Hz (T = {fmt(period, 2)} s)</span>
          <input
            type="range"
            min={fMin}
            max={fMax}
            step="any"
            value={f}
            oninput={(e) => setF(Number(e.currentTarget.value))}
          />
        </label>
      </div>

      <div class="wave-options">
        {#if hasParticles}
          <div class="wave-group">
            <span class="wave-label">Particles</span>
            <div class="vector-actions" role="group" aria-label="Particles">
              <button type="button" aria-pressed={particlesOn} onclick={() => (particlesOn = true)}>On</button>
              <button type="button" aria-pressed={!particlesOn} onclick={() => (particlesOn = false)}>Off</button>
            </div>
          </div>
        {/if}
        <div class="wave-group">
          <span class="wave-label">Speed</span>
          <div class="vector-actions" role="group" aria-label="Animation speed">
            {#each SPEEDS as q (q.rate)}
              <button
                type="button"
                aria-pressed={speed === q.rate}
                aria-label="{q.rate} times real time"
                onclick={() => (speed = q.rate)}
              >
                {q.label}
              </button>
            {/each}
          </div>
        </div>
        <div class="wave-group">
          <span class="wave-label">Run</span>
          <div class="vector-actions" role="group" aria-label="Run">
            <button type="button" aria-pressed={!playing} onclick={() => (playing = !playing)}>
              {playing ? "Pause" : "Play"}
            </button>
            <button type="button" onclick={restart}>Restart</button>
            <button type="button" onclick={reset}>Reset to figure</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <p class="wave-note">
    In deep water <i>ω</i>² = <i>gk</i>, so <i>k</i> and <i>f</i> set one another; changing <i>g</i> keeps
    whichever of the two was set last. The color scale follows the wave, in {BANDS} bands of
    {tick(range / (BANDS / 2))} {unit}.
    {#if tracing}
      Each particle moves at the velocity of the linear solution at the particle’s own position; the thin
      circles are the closed orbits of the first-order displacements, about where the particles started.
      Trails keep the last {TRAIL_PERIODS} periods, a particle that drifts out on the right comes back in on
      the left, and changing the wave releases the particles again.
    {/if}
    At 1× the animation runs in real time.
  </p>
</div>
