<script lang="ts">
  import { onMount } from "svelte";
  import { onThemeChange, readTheme, type Theme } from "./plot";
  import { contours, labelSite, levelsFor, sampleGrid, toPath, type Pt } from "./contour";
  import { LINEAR, P_SURFACE, densityLinear, densityUnesco, depthOf } from "./seawater";

  // Salinity and temperature ranges of Fig. 1.3 in Vallis (2017).
  const S_MIN = 32;
  const S_MAX = 38;
  const T_MIN = 0;
  const T_MAX = 30;

  const W = 640;
  const H = 420;
  const PAD = { l: 54, r: 18, t: 20, b: 46 };

  /** Contour interval in kg m^-3. */
  const D_SIGMA = 1;
  /** Grid for marching squares: fine enough to look smooth, cheap enough to drag. */
  const NS = 97;
  const NT = 97;

  const P_MIN = P_SURFACE;
  const P_MAX = 1.005e8;
  const P_STEP = 1e5;
  const P_DEFAULT = P_SURFACE;

  let p = $state(P_DEFAULT);
  let useLinear = $state(false);
  let probe = $state<Pt>({ x: LINEAR.S0, y: LINEAR.T0 });
  let theme = $state<Theme | null>(null);
  let svgEl: SVGSVGElement | undefined;
  let dragging = $state(false);

  const fg = $derived(theme?.fg ?? "#1c1915");
  const muted = $derived(theme?.muted ?? "#5e574c");
  const rule = $derived(theme?.rule ?? "#d3c9b6");
  const bg = $derived(theme?.bg ?? "#f7f3eb");
  const line = $derived(theme?.accent ?? "#8a2e2e");

  const sTicks = [32, 33, 34, 35, 36, 37, 38];
  const tTicks = [0, 5, 10, 15, 20, 25, 30];

  const x = (s: number) => PAD.l + ((s - S_MIN) / (S_MAX - S_MIN)) * (W - PAD.l - PAD.r);
  const y = (t: number) => H - PAD.b - ((t - T_MIN) / (T_MAX - T_MIN)) * (H - PAD.t - PAD.b);

  const density = $derived(useLinear ? densityLinear : densityUnesco);
  const rhoProbe = $derived(density(probe.x, probe.y, p));
  const depth = $derived(depthOf(p));

  type Labelled = { level: number; head: string; tail: string; at: Pt; angle: number };

  const isopycnals = $derived.by(() => {
    const rho = density;
    const grid = sampleGrid(
      (s, t) => rho(s, t, p) - 1000,
      S_MIN,
      S_MAX,
      T_MIN,
      T_MAX,
      NS,
      NT,
    );

    // Label in pixel space so the gap left in the line matches the text box.
    const placed: Pt[] = [];
    const out: Labelled[] = [];
    for (const c of contours(grid, levelsFor(grid, D_SIGMA))) {
      const pts = c.points.map((q) => ({ x: x(q.x), y: y(q.y) }));
      let site = null;
      for (const f of [0.5, 0.34, 0.66, 0.2, 0.8]) {
        const s = labelSite(pts, f, 28);
        if (!s) break;
        if (placed.every((q) => Math.hypot(q.x - s.at.x, q.y - s.at.y) > 30)) {
          site = s;
          break;
        }
      }
      if (site) {
        placed.push(site.at);
        out.push({
          level: c.level,
          head: toPath(site.head),
          tail: toPath(site.tail),
          at: site.at,
          angle: site.angleDeg,
        });
      } else {
        out.push({ level: c.level, head: toPath(pts), tail: "", at: { x: 0, y: 0 }, angle: 0 });
      }
    }
    return out;
  });

  function powerOfTen(v: number): { mantissa: string; exponent: number } {
    const exponent = Math.floor(Math.log10(v));
    return { mantissa: (v / 10 ** exponent).toFixed(1), exponent };
  }

  const pText = $derived(powerOfTen(p));
  const depthText = $derived(
    depth < 950 ? `${Math.round(depth / 10) * 10} m` : `${(depth / 1000).toFixed(2)} km`,
  );

  function clamp(v: number, lo: number, hi: number) {
    return Math.min(hi, Math.max(lo, v));
  }

  function setProbe(e: PointerEvent) {
    if (!svgEl) return;
    const box = svgEl.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const py = ((e.clientY - box.top) / box.height) * H;
    probe = {
      x: clamp(
        S_MIN + ((px - PAD.l) / (W - PAD.l - PAD.r)) * (S_MAX - S_MIN),
        S_MIN,
        S_MAX,
      ),
      y: clamp(
        T_MIN + ((H - PAD.b - py) / (H - PAD.t - PAD.b)) * (T_MAX - T_MIN),
        T_MIN,
        T_MAX,
      ),
    };
  }

  function onPointerDown(e: PointerEvent) {
    e.preventDefault();
    dragging = true;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setProbe(e);
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerType === "mouse" || dragging) setProbe(e);
  }

  function onPointerUp(e: PointerEvent) {
    dragging = false;
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }

  function onKey(e: KeyboardEvent) {
    const fine = e.shiftKey;
    let ds = 0;
    let dt = 0;
    if (e.key === "ArrowLeft") ds = fine ? -0.1 : -0.5;
    else if (e.key === "ArrowRight") ds = fine ? 0.1 : 0.5;
    else if (e.key === "ArrowUp") dt = fine ? 0.5 : 2;
    else if (e.key === "ArrowDown") dt = fine ? -0.5 : -2;
    else return;
    e.preventDefault();
    probe = {
      x: clamp(probe.x + ds, S_MIN, S_MAX),
      y: clamp(probe.y + dt, T_MIN, T_MAX),
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
  <p class="interactive-title">Equation of state for seawater</p>
  <p class="interactive-caption">
    Contours of &sigma; = &rho; &minus; 1000 (kg m<sup>&minus;3</sup>). Drag the pressure
    slider to squeeze the water column, and hover or tap the diagram to read a value.
  </p>

  <!-- `application` is the closest ARIA role for a focusable 2-D probe: it makes
       screen readers pass the arrow keys through to onKey instead of using them
       to browse. No interactive role fits a surface like this, so the two
       non-interactive-element rules are silenced deliberately. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <svg
    bind:this={svgEl}
    class="vector-canvas eos-canvas"
    viewBox="0 0 {W} {H}"
    role="application"
    tabindex="0"
    aria-label="Contours of seawater density against salinity and temperature at the selected pressure. Hover, tap, or use the arrow keys to read a value."
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
    onkeydown={onKey}
  >
    {#each sTicks as s}
      <line x1={x(s)} x2={x(s)} y1={PAD.t} y2={H - PAD.b} stroke={rule} stroke-width="1" />
      <text x={x(s)} y={H - PAD.b + 17} text-anchor="middle" fill={muted} font-size="13">{s}</text>
    {/each}
    {#each tTicks as t}
      <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke={rule} stroke-width="1" />
      <text x={PAD.l - 9} y={y(t) + 4} text-anchor="end" fill={muted} font-size="13">{t}</text>
    {/each}

    {#each isopycnals as c (c.level)}
      <path d={c.head} fill="none" stroke={line} stroke-width="1.7" stroke-linejoin="round" />
      {#if c.tail}
        <path d={c.tail} fill="none" stroke={line} stroke-width="1.7" stroke-linejoin="round" />
        <text
          x={c.at.x}
          y={c.at.y + 4}
          text-anchor="middle"
          fill={line}
          font-size="14"
          transform="rotate({c.angle} {c.at.x} {c.at.y})">{c.level}</text
        >
      {/if}
    {/each}

    <line
      x1={x(probe.x)}
      x2={x(probe.x)}
      y1={PAD.t}
      y2={H - PAD.b}
      stroke={fg}
      stroke-width="1"
      stroke-dasharray="3 3"
      opacity="0.5"
    />
    <line
      x1={PAD.l}
      x2={W - PAD.r}
      y1={y(probe.y)}
      y2={y(probe.y)}
      stroke={fg}
      stroke-width="1"
      stroke-dasharray="3 3"
      opacity="0.5"
    />
    <circle cx={x(probe.x)} cy={y(probe.y)} r="5" fill={bg} stroke={fg} stroke-width="2" />

    <rect
      x={PAD.l}
      y={PAD.t}
      width={W - PAD.l - PAD.r}
      height={H - PAD.t - PAD.b}
      fill="none"
      stroke={fg}
      stroke-width="1.2"
    />
    <text x={(PAD.l + W - PAD.r) / 2} y={H - 10} text-anchor="middle" fill={fg} font-size="14">
      Salinity (g kg⁻¹)
    </text>
    <text
      x="16"
      y={(PAD.t + H - PAD.b) / 2}
      text-anchor="middle"
      fill={fg}
      font-size="14"
      transform="rotate(-90 16 {(PAD.t + H - PAD.b) / 2})">Temperature (°C)</text
    >
  </svg>

  <div class="controls">
    <label>
      <span>Pressure p</span>
      <span>{pText.mantissa} × 10<sup>{pText.exponent}</sup> Pa &nbsp;(≈ {depthText})</span>
      <input type="range" min={P_MIN} max={P_MAX} step={P_STEP} bind:value={p} />
    </label>
  </div>

  <div class="readout" aria-live="polite">
    <span>S, T</span><span>= {probe.x.toFixed(1)} g/kg, {probe.y.toFixed(1)} °C</span>
    <span>ρ</span><span>= {rhoProbe.toFixed(2)} kg/m³</span>
    <span>σ</span><span>= {(rhoProbe - 1000).toFixed(2)} kg/m³</span>
  </div>

  <div class="controls vector-actions" role="group" aria-label="Equation of state">
    <button type="button" aria-pressed={!useLinear} onclick={() => (useLinear = false)}>
      Full (UNESCO)
    </button>
    <button type="button" aria-pressed={useLinear} onclick={() => (useLinear = true)}>
      Linear
    </button>
  </div>
</div>
