<script lang="ts">
  import { onMount } from "svelte";
  import { onThemeChange, readTheme, svgLineChart } from "./plot";

  let delta = $state(0.05);
  let tauW = $state(0.01);
  const rho = 1e3;
  const nu = 1e-6;
  let svg = $state("");

  function u(z: number) {
    return ((tauW * z) / (rho * nu)) * (1 - z / (2 * delta));
  }

  function draw() {
    const theme = readTheme();
    const z = Array.from({ length: 300 }, (_, i) => (i / 299) * 2 * delta);
    const vel = z.map(u);
    const zn = z.map((zi) => zi / (2 * delta));
    svg = svgLineChart({
      theme,
      title: "Laminar channel flow",
      xlabel: "ū (m/s)",
      ylabel: "z / (2δ)",
      xlim: [0, Math.max(0.25, Math.max(...vel) * 1.05)],
      ylim: [0, 1],
      invertY: true,
      series: [{ x: vel, y: zn, color: theme.accent, width: 2.5 }],
    });
  }

  onMount(() => {
    draw();
    return onThemeChange(draw);
  });

  $effect(() => {
    delta;
    tauW;
    if (typeof document !== "undefined") draw();
  });
</script>

<div class="interactive">
  <p class="interactive-title">Laminar channel flow</p>
  {@html svg}
  <div class="controls">
    <label>
      <span>Channel half-width δ</span>
      <span>{delta.toFixed(3)} m</span>
      <input type="range" min="0.01" max="0.2" step="0.005" bind:value={delta} />
    </label>
    <label>
      <span>Wall stress τ<sub>w</sub></span>
      <span>{tauW.toFixed(3)} N/m²</span>
      <input type="range" min="0.002" max="0.05" step="0.001" bind:value={tauW} />
    </label>
    <button
      type="button"
      onclick={() => {
        delta = 0.05;
        tauW = 0.01;
      }}>Reset to figure</button
    >
  </div>
</div>
