<script lang="ts">
  import { onMount } from "svelte";
  import { onThemeChange, readTheme, type Theme } from "./plot";
  import { fmt } from "./vectors";
  import { omega, wavenumber } from "./waves";
  import {
    A_MAX,
    A_STEP,
    FIGURE_COMPONENTS,
    G,
    K_MAX,
    K_MIN,
    K_STEP,
    MAX_COMPONENTS,
    X_MAX,
    groupOf,
    nextComponent,
    tickStep,
    type Component,
  } from "./wave-group";

  /**
   * The sea surface as a sum of wave components, each traveling at its own
   * speed (Fig. 10.5): the crests move at the phase speed, the groups they
   * form at the group speed.
   */

  type Row = Component & { id: number };

  const SPEEDS = [1, 2, 5, 10];
  const SPEED_DEFAULT = 5;
  const F_MIN = omega(G, K_MIN) / (2 * Math.PI);
  const F_MAX = omega(G, K_MAX) / (2 * Math.PI);

  let nextId = 1;
  const seed = (): Row[] => FIGURE_COMPONENTS.map((c) => ({ ...c, id: nextId++ }));

  let components = $state<Row[]>(seed());
  let speed = $state(SPEED_DEFAULT);
  let playing = $state(true);
  let theme = $state<Theme | null>(null);
  /** Time since the last restart, for the readout. */
  let shownT = $state(0);

  const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
  const frequency = (k: number) => omega(G, k) / (2 * Math.PI);

  const plain = $derived($state.snapshot(components) as Row[]);
  const group = $derived(groupOf(plain));
  const total = $derived(plain.reduce((sum, c) => sum + c.a, 0));
  /** Top of the elevation axis: the components can add up to `total`. */
  const yMax = $derived(1.25 * Math.max(total, 0.02));
  const yTicks = $derived.by(() => {
    const step = tickStep(Math.max(total, 0.02) / 2);
    const out: number[] = [];
    for (let n = -Math.floor(yMax / step); n * step <= yMax; n++) out.push(Number((n * step).toPrecision(6)));
    return out;
  });
  const X_TICKS = [0, 50, 100, 150, 200];

  const callout = $derived.by(() => {
    if (!group) return "With no amplitude in any component, the surface is flat.";
    if (!group.grouped)
      return "Components of a single wavenumber add up to one uniform wave train: it takes waves of different wavenumbers to form groups.";
    const ratio = fmt(group.cg / group.cp, 2);
    const lead = `The crests travel at the phase speed, and the groups at the group speed, ${ratio} of it:`;
    const life = "each crest appears at the rear of a group, runs through it, and fades away at its front.";
    if (plain.filter((c) => c.a > 0).length > 2)
      return `${lead} ${life} With more components the groups are shorter, with calmer water between them, and because every component travels at its own speed, they spread out with time.`;
    return `${lead} ${life}`;
  });

  const label = $derived(
    `Surface elevation over ${X_MAX} m as the sum of ${plain.length} wave component${plain.length === 1 ? "" : "s"}` +
      (group?.grouped
        ? `, forming groups that travel at ${fmt(group.cg, 2)} m/s while the crests travel at ${fmt(group.cp, 2)} m/s.`
        : "."),
  );

  // ---- Animation state, outside the reactive graph --------------------------

  /** ωt as accumulated so far for each component, by id, in [0, 2π). */
  const phases = new Map<number, number>();
  let t = 0;
  /** Where the markers moving at the phase and the group speed are, m. */
  let xp = 0;
  let xg = 0;
  let dirty = true;

  function restart() {
    phases.clear();
    t = 0;
    xp = 0;
    xg = 0;
    shownT = 0;
    dirty = true;
  }

  function add() {
    if (components.length >= MAX_COMPONENTS) return;
    const c = { ...nextComponent(plain), id: nextId++ };
    // In step with the others, as if it had been there since the start.
    phases.set(c.id, (omega(G, c.k) * t) % (2 * Math.PI));
    components.push(c);
  }

  function remove(id: number) {
    if (components.length <= 1) return;
    components = components.filter((c) => c.id !== id);
    phases.delete(id);
  }

  function reset() {
    components = seed();
    speed = SPEED_DEFAULT;
    restart();
  }

  /** A whole number of `period`s that covers the view, to bring a marker back by. */
  function lap(period: number | null): number {
    if (!period || !(period > 0) || period > X_MAX) return X_MAX;
    return Math.ceil(X_MAX / period) * period;
  }

  function advance(dt: number) {
    for (const c of plain) {
      phases.set(c.id, ((phases.get(c.id) ?? 0) + omega(G, c.k) * dt) % (2 * Math.PI));
    }
    t += dt;
    if (!group) return;
    // A marker that leaves on the right comes back on the left, on the crest
    // or the group that is in its place there.
    xp = (xp + group.cp * dt) % lap((2 * Math.PI) / group.k);
    xg = (xg + group.cg * dt) % lap(group.spacing);
  }

  // ---- Drawing ---------------------------------------------------------------

  let rootEl: HTMLDivElement | undefined;
  let plotEl: HTMLDivElement | undefined;
  let canvasEl: HTMLCanvasElement | undefined;
  let markPEl: SVGGElement | undefined;
  let markGEl: SVGGElement | undefined;

  // Laid out in CSS pixels at whatever width it is given, so the labels keep
  // their size.
  let width = $state(574);
  const PAD_L = 46;
  const PAD_R = 10;
  const HEAD = 23;
  const FOOT = 40;
  const layout = $derived.by(() => {
    const plotW = Math.max(40, width - PAD_L - PAD_R);
    const plotH = clamp(0.32 * plotW, 120, 300);
    return { plotW, plotH, bottom: HEAD + plotH, height: HEAD + plotH + FOOT };
  });
  const xAt = (x: number) => PAD_L + (x / X_MAX) * layout.plotW;
  const yAt = (eta: number) => HEAD + (0.5 - eta / (2 * yMax)) * layout.plotH;

  const fg = $derived(theme?.fg ?? "#1c1915");
  const muted = $derived(theme?.muted ?? "#5e574c");
  const rule = $derived(theme?.rule ?? "#d3c9b6");
  const accent = $derived(theme?.accent ?? "#8a2e2e");

  function place(el: SVGGElement | undefined, x: number, show: boolean) {
    if (!el) return;
    if (show && x >= 0 && x <= X_MAX) {
      el.setAttribute("transform", `translate(${xAt(x).toFixed(2)} ${HEAD})`);
      el.removeAttribute("display");
    } else el.setAttribute("display", "none");
  }

  function render() {
    const ctx = canvasEl?.getContext("2d");
    if (!canvasEl || !ctx || !theme) return;
    /** Canvas pixels per CSS pixel. */
    const px = canvasEl.width / width;
    const { plotW, plotH } = layout;
    const nx = Math.round(plotW * px);
    const ny = plotH * px;
    const x0 = Math.round(PAD_L * px);
    const y0 = HEAD * px;
    if (nx < 2) return;

    // The surface is the real part of Σ aᵢ exp[i(kᵢx − ωᵢt)], and the envelope
    // of its groups the magnitude of that sum.
    const list = plain;
    const ph = list.map((c) => phases.get(c.id) ?? 0);
    const Y = (eta: number) => (0.5 - eta / (2 * yMax)) * ny;
    const surface = new Path2D();
    const above = new Path2D();
    const below = new Path2D();
    for (let i = 0; i <= nx; i++) {
      const x = (i / nx) * X_MAX;
      let re = 0;
      let im = 0;
      for (let n = 0; n < list.length; n++) {
        const th = list[n].k * x - ph[n];
        re += list[n].a * Math.cos(th);
        im += list[n].a * Math.sin(th);
      }
      const env = Math.hypot(re, im);
      surface.lineTo(i, Y(re));
      above.lineTo(i, Y(env));
      below.lineTo(i, Y(-env));
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    ctx.save();
    ctx.translate(x0, y0);
    ctx.beginPath();
    ctx.rect(0, 0, nx, ny);
    ctx.clip();
    ctx.lineJoin = "round";
    if (group?.grouped) {
      ctx.strokeStyle = fg;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = px;
      ctx.setLineDash([5 * px, 4 * px]);
      ctx.stroke(above);
      ctx.stroke(below);
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.6 * px;
    ctx.stroke(surface);
    ctx.restore();

    place(markPEl, xp, group !== null);
    place(markGEl, xg, group?.grouped === true);
    dirty = false;
  }

  // Whatever the reader changes redraws a paused frame.
  $effect(() => {
    plain;
    theme;
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

<div class="interactive wave-interactive wave-groups" bind:this={rootEl}>
  <div class="wave-head">
    <p class="interactive-title">Wave groups</p>
    <p class="interactive-caption">
      The sea surface as a sum of wave components, each a linear wave in deep water traveling at its own speed.
      Set the amplitude <i>a</i> and the wavenumber <i>k</i> or the frequency <i>f</i> of each component, and add
      components to shape the groups.
    </p>
  </div>

  <div class="wave-main">
    <div class="field-plot wave-plot" bind:this={plotEl}>
      <canvas bind:this={canvasEl} class="field-heat" aria-hidden="true"></canvas>
      <svg viewBox="0 0 {width} {layout.height}" role="img" aria-label={label}>
        <text x={PAD_L} y={HEAD - 7} fill={fg} font-size="13">
          Surface elevation <tspan font-style="italic">η</tspan> (m)
        </text>
        {#each yTicks as y (y)}
          <line x1={PAD_L} x2={PAD_L + layout.plotW} y1={yAt(y)} y2={yAt(y)} stroke={rule} stroke-width="1" />
          <line x1={PAD_L - 4} x2={PAD_L} y1={yAt(y)} y2={yAt(y)} stroke={fg} stroke-width="1" />
          <text x={PAD_L - 7} y={yAt(y) + 4} text-anchor="end" fill={muted} font-size="12">
            {String(y).replace("-", "−")}
          </text>
        {/each}
        {#each X_TICKS as x (x)}
          <line x1={xAt(x)} x2={xAt(x)} y1={HEAD} y2={layout.bottom} stroke={rule} stroke-width="1" />
          <line x1={xAt(x)} x2={xAt(x)} y1={layout.bottom} y2={layout.bottom + 4} stroke={fg} stroke-width="1" />
          <text x={xAt(x)} y={layout.bottom + 17} text-anchor="middle" fill={muted} font-size="12">{x}</text>
        {/each}
        <rect x={PAD_L} y={HEAD} width={layout.plotW} height={layout.plotH} fill="none" stroke={fg} stroke-width="1" />
        <text x={PAD_L + layout.plotW / 2} y={layout.height - 7} text-anchor="middle" fill={fg} font-size="12.5">
          <tspan font-style="italic">x</tspan> (m)
        </text>
        <!-- Moved by render(), a frame at a time. -->
        <g bind:this={markGEl} display="none">
          <line y1="0" y2={layout.plotH} stroke={fg} stroke-width="1" stroke-dasharray="2 3" opacity="0.6" />
          <polygon points="-5,0 5,0 0,8" fill={fg} />
        </g>
        <g bind:this={markPEl} display="none">
          <line y1="0" y2={layout.plotH} stroke={accent} stroke-width="1" stroke-dasharray="2 3" opacity="0.7" />
          <polygon points="-5,0 5,0 0,8" fill={accent} />
        </g>
      </svg>
    </div>

    <div class="wave-legend" aria-hidden="true">
      <span class="wave-key"><i style:background={accent}></i>surface <em>η</em></span>
      {#if group?.grouped}
        <span class="wave-key"><i class="dashed" style:border-color={fg}></i>envelope of the groups</span>
      {/if}
      <span class="wave-key"><i class="mark" style:background={accent}></i><span>moves at <em>C</em><sub>p</sub></span></span>
      {#if group?.grouped}
        <span class="wave-key"><i class="mark" style:background={fg}></i><span>moves at <em>C</em><sub>g</sub></span></span>
      {/if}
    </div>
  </div>

  <div class="wave-side">
    <div class="wave-info">
      <p class="vector-callout" class:is-zero={!group?.grouped}>{callout}</p>

      <div class="readout">
        {#if group}
          <span>mean k, ω</span>
          <span>= {fmt(group.k, 3)} rad/m, {fmt(group.omega, 3)} rad/s</span>
          <span>C<sub>p</sub> = ω/k</span>
          <span>= {fmt(group.cp, 2)} m/s, speed of the crests</span>
          <span>C<sub>g</sub> = Δω/Δk</span>
          <span>
            {#if group.grouped}
              = {fmt(group.cg, 2)} m/s = {fmt(group.cg / group.cp, 2)} C<sub>p</sub>, speed of the groups
            {:else}
              = {fmt(group.cg, 2)} m/s as Δk → 0, but there are no groups
            {/if}
          </span>
          {#if plain.length === 2 && group.grouped && group.spacing}
            <span>2π/Δk</span>
            <span>= {fmt(group.spacing, 1)} m from one group to the next</span>
          {/if}
        {/if}
        <span>t</span>
        <span>= {fmt(shownT, 1)} s</span>
      </div>
    </div>

    <div class="wave-controls">
      <div class="group-rows" role="group" aria-label="Wave components">
        <div class="group-row group-heads" aria-hidden="true">
          <span></span>
          <span>Amplitude a</span>
          <span>Wavenumber k</span>
          <span>Frequency f = ω/2π</span>
          <span></span>
        </div>
        {#each components as c, i (c.id)}
          <div class="group-row">
            <span class="group-n" aria-hidden="true">{i + 1}</span>
            <label>
              <span>a<sub>{i + 1}</sub></span>
              <span>{fmt(c.a, 3)} m</span>
              <input
                type="range"
                min="0"
                max={A_MAX}
                step={A_STEP}
                aria-label="Amplitude of component {i + 1}, in meters"
                bind:value={c.a}
              />
            </label>
            <label>
              <span>k<sub>{i + 1}</sub></span>
              <span>{fmt(c.k, 2)} rad/m</span>
              <input
                type="range"
                min={K_MIN}
                max={K_MAX}
                step={K_STEP}
                aria-label="Wavenumber of component {i + 1}, in radians per meter"
                bind:value={c.k}
              />
            </label>
            <label>
              <span>f<sub>{i + 1}</sub></span>
              <span>{fmt(frequency(c.k), 3)} Hz</span>
              <input
                type="range"
                min={F_MIN}
                max={F_MAX}
                step="any"
                aria-label="Frequency of component {i + 1}, in hertz"
                value={frequency(c.k)}
                oninput={(e) => (c.k = clamp(wavenumber(G, Number(e.currentTarget.value)), K_MIN, K_MAX))}
              />
            </label>
            <button
              type="button"
              class="group-remove"
              aria-label="Remove component {i + 1}"
              title="Remove component {i + 1}"
              disabled={components.length <= 1}
              onclick={() => remove(c.id)}>×</button
            >
          </div>
        {/each}
      </div>

      <div class="wave-options">
        <div class="wave-group">
          <span class="wave-label">Components</span>
          <div class="vector-actions">
            <button type="button" disabled={components.length >= MAX_COMPONENTS} onclick={add}>Add component</button>
          </div>
        </div>
        <div class="wave-group">
          <span class="wave-label">Speed</span>
          <div class="vector-actions" role="group" aria-label="Animation speed">
            {#each SPEEDS as rate (rate)}
              <button
                type="button"
                aria-pressed={speed === rate}
                aria-label="{rate} times real time"
                onclick={() => (speed = rate)}
              >
                {rate}×
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
    Every component obeys <i>ω</i>² = <i>gk</i> with <i>g</i> = {G} m s<sup>−2</sup>, so its wavenumber and
    frequency set one another. A component added is one step further up in wavenumber and a little smaller
    than the last, and all are in phase at <i>x</i> = 0 when the animation starts or restarts.
    <i>C</i><sub>p</sub> is that of the mean wavenumber and frequency, weighted by <i>a</i>²;
    <i>C</i><sub>g</sub> is Δ<i>ω</i>/Δ<i>k</i> for two components, and for more the slope of <i>ω</i> against
    <i>k</i> through them, weighted the same way. At 1× the animation runs in real time.
  </p>
</div>
