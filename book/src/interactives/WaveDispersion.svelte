<script lang="ts">
  import { onMount } from "svelte";
  import { onThemeChange, readTheme, svgLineChart } from "./plot";

  const g = 9.8;
  let h = $state(20);
  const hDefault = 20;
  let svg = $state("");

  function omega(k: number, depth: number) {
    return Math.sqrt(g * k * Math.tanh(k * depth));
  }

  function draw() {
    const theme = readTheme();
    const k = Array.from({ length: 400 }, (_, i) => 1e-2 * 10 ** ((i / 399) * 4));
    const f = k.map((ki) => omega(ki, h) / (2 * Math.PI));
    const fDeep = k.map((ki) => Math.sqrt(g * ki) / (2 * Math.PI));
    svg = svgLineChart({
      theme,
      title: "Wave dispersion",
      xlabel: "Frequency (Hz)",
      ylabel: "Wavenumber (rad/m)",
      xlim: [0, 5],
      ylim: [0, 100],
      series: [
        { x: fDeep, y: k, color: theme.muted, dashed: true, width: 1.25 },
        { x: f, y: k, color: theme.accent, width: 2.2 },
      ],
    });
  }

  onMount(() => {
    draw();
    return onThemeChange(draw);
  });

  $effect(() => {
    h;
    if (typeof document !== "undefined") draw();
  });
</script>

<div class="interactive">
  <p class="interactive-title">Wave dispersion</p>
  {@html svg}
  <div class="controls">
    <label>
      <span>Depth h</span>
      <span>{h.toFixed(1)} m</span>
      <input type="range" min="0.5" max="1000" step="0.5" bind:value={h} />
    </label>
    <button type="button" onclick={() => (h = hDefault)}>Reset to figure</button>
  </div>
</div>
