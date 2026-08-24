<script lang="ts">
  import { onMount } from "svelte";
  import { onThemeChange, readTheme, svgLineChart } from "./plot";

  let stable = $state(true);
  let logAbsN2 = $state(-6);
  let z0 = $state(0.1);
  let svg = $state("");
  const duration = 6 * 3600;

  function parcel(zInit: number, N2: number, t: number) {
    if (N2 > 0) return zInit * Math.cos(Math.sqrt(N2) * t);
    const N = Math.sqrt(Math.abs(N2));
    return zInit * Math.cosh(N * t);
  }

  function draw() {
    const theme = readTheme();
    const n2 = (stable ? 1 : -1) * 10 ** logAbsN2;
    const t = Array.from({ length: 500 }, (_, i) => (i / 499) * duration);
    const hours = t.map((ti) => ti / 3600);
    const z = t.map((ti) => parcel(z0, n2, ti));
    svg = svgLineChart({
      theme,
      title: "Parcel oscillation",
      xlabel: "Time (h)",
      ylabel: "δz (m)",
      xlim: [0, 6],
      series: [{ x: hours, y: z, color: theme.accent, width: 2.2 }],
    });
  }

  onMount(() => {
    draw();
    return onThemeChange(draw);
  });

  $effect(() => {
    stable;
    logAbsN2;
    z0;
    if (typeof document !== "undefined") draw();
  });
</script>

<div class="interactive">
  <p class="interactive-title">Parcel oscillation</p>
  {@html svg}
  <div class="controls">
    <label>
      <span>Stratification</span>
      <span>
        <button type="button" onclick={() => (stable = true)} aria-pressed={stable}>Stable</button>
        <button type="button" onclick={() => (stable = false)} aria-pressed={!stable}>Unstable</button>
      </span>
    </label>
    <label>
      <span>|N²|</span>
      <span>{(10 ** logAbsN2).toExponential(0)} s⁻²</span>
      <input type="range" min="-8" max="-4" step="0.1" bind:value={logAbsN2} />
    </label>
    <label>
      <span>Initial displacement δz₀</span>
      <span>{z0.toFixed(2)} m</span>
      <input type="range" min="-0.2" max="0.2" step="0.01" bind:value={z0} />
    </label>
    <button
      type="button"
      onclick={() => {
        stable = true;
        logAbsN2 = -6;
        z0 = 0.1;
      }}>Reset to figure</button
    >
  </div>
</div>
