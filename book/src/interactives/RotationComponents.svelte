<script lang="ts">
  import { onMount } from "svelte";
  import { onThemeChange, readTheme, type Theme } from "./plot";
  import { fmt, vectorColors, type Vec2 } from "./vectors";
  import { arc, clamp, polar, radians } from "./rotation";
  import RotationArrow from "./RotationArrow.svelte";

  const origin = { x: 155, y: 278 };
  const disk = { x: 200, y: 315 };
  const radius = 92;
  const scale = 80;
  let latitude = $state(45);
  let omega = $state(1);
  let theme = $state<Theme | null>(null);
  const colors = $derived(theme ? vectorColors(theme) : { a: "#9b2c2c", b: "#1d6a8a", result: "#2d6a4f" });
  const muted = $derived(theme?.muted ?? "#5e574c");
  const rule = $derived(theme?.rule ?? "#d3c9b6");
  const theta = $derived(latitude * radians);
  const point = $derived(polar(origin, radius, theta));
  const omegaY = $derived(omega * Math.cos(theta));
  const omegaZ = $derived(omega * Math.sin(theta));
  const yTip = $derived(polar(point, scale * omegaY, theta + Math.PI / 2));
  const zTip = $derived(polar(point, scale * omegaZ, theta));
  const localOmega = $derived({ x: point.x, y: point.y - scale * omega });
  const omegaTip = $derived({ x: origin.x, y: origin.y - 137 * omega });
  const diskOmega = $derived({ x: disk.x, y: disk.y - 137 * omega });
  const kTip = $derived(polar(point, 56, theta));
  const jTip = $derived(polar(point, 63, theta + Math.PI / 2));
  const tangentBack = $derived(polar(point, -65, theta + Math.PI / 2));

  function dragPosition(p: Vec2) { latitude = clamp(Math.atan2(origin.y - p.y, Math.max(0, p.x - origin.x)) / radians, -90, 90); }
  function stepPosition(s: Vec2) { latitude = clamp(latitude - s.y + s.x, -90, 90); }
  function stepOmega(s: Vec2) { omega = clamp(omega + (s.x - s.y) * 0.02, 0, 1.5); }
  function reset() { latitude = 45; omega = 1; }

  onMount(() => {
    theme = readTheme();
    return onThemeChange(() => theme = readTheme());
  });
</script>

<div class="interactive rotation-interactive">
  <p class="interactive-title">Rotation components: sphere and disk</p>
  <p class="interactive-caption">Drag r’s tip along the sphere to move between hemispheres. Drag either Ω handle vertically to change the angular speed in both panels. The colored arrows are Ω’s projections onto local north j and local up k. Arrow keys also move the handles.</p>
  <div class="vector-stage rotation-panels">
    <svg class="vector-canvas" viewBox="0 0 400 485" role="group" aria-label="Rotation vector on a sphere, decomposed into local northward and vertical components">
      <text x="18" y="27" fill={muted} font-size="13">(a) Rotating sphere</text>
      <circle cx={origin.x} cy={origin.y} r={radius} fill="none" stroke={colors.b} stroke-width="1.7" />
      <line x1={origin.x} y1="40" x2={origin.x} y2={origin.y + radius} stroke={rule} stroke-dasharray="4 4" />
      <line x1={origin.x} y1={origin.y} x2={origin.x + radius} y2={origin.y} stroke={rule} />
      <path d={arc(origin, 30, 0, theta)} fill="none" stroke={muted} />
      <text x={polar(origin, 44, theta / 2).x} y={polar(origin, 44, theta / 2).y + 4} fill={muted} font-size="13">θ</text>
      <line x1={tangentBack.x} y1={tangentBack.y} x2={point.x} y2={point.y} stroke={muted} stroke-width="1.3" />
      <RotationArrow from={point} to={jTip} color={muted} label="j" labelAt={{ x: jTip.x - 13, y: jTip.y + 4 }} width={1.2} />
      <RotationArrow from={point} to={kTip} color={muted} label="k" labelAt={{ x: kTip.x + 12, y: kTip.y + 10 }} width={1.2} />
      <line x1={yTip.x} y1={yTip.y} x2={localOmega.x} y2={localOmega.y} stroke={colors.result} stroke-dasharray="4 4" />
      <line x1={zTip.x} y1={zTip.y} x2={localOmega.x} y2={localOmega.y} stroke={colors.a} stroke-dasharray="4 4" />
      <RotationArrow from={point} to={localOmega} color={colors.b} label="Ω" labelAt={{ x: localOmega.x + (Math.abs(omegaY) < 0.001 ? -24 : 13), y: localOmega.y - 11 }} width={1.7} />
      {#if Math.abs(omegaY) > 0.001}
        <RotationArrow from={point} to={yTip} color={colors.a} label="Ω_y j" labelAt={{ x: yTip.x - 17, y: yTip.y - 13 }} />
      {/if}
      {#if Math.abs(omegaZ) > 0.001}
        <RotationArrow from={point} to={zTip} color={colors.result} label="Ω_z k" labelAt={{ x: zTip.x + 21, y: zTip.y - 13 }} />
      {/if}
      <RotationArrow from={origin} to={omegaTip} color={colors.b} label="Ω" labelAt={{ x: omegaTip.x - 17, y: omegaTip.y }}
        onmove={(p) => omega = clamp((origin.y - p.y) / 137, 0, 1.5)} onstep={stepOmega}
        description="Sphere angular velocity Ω: drag vertically or use arrow keys to change the magnitude" />
      <RotationArrow from={origin} to={point} color={muted} label="r" labelAt={{ x: (origin.x + point.x) / 2 - 12, y: (origin.y + point.y) / 2 - 8 }} width={1.3} dashed onmove={dragPosition} onstep={stepPosition}
        description="Position vector r: drag around the sphere or use arrow keys to change latitude" />
      <text x="200" y="467" text-anchor="middle" fill={muted} font-size="13">Ω = Ω<tspan baseline-shift="sub" font-size="0.75em">y</tspan> j + Ω<tspan baseline-shift="sub" font-size="0.75em">z</tspan> k</text>
    </svg>
    <svg class="vector-canvas" viewBox="0 0 400 485" role="group" aria-label="Rotating disk with rotation vector parallel to its local vertical everywhere">
      <text x="18" y="27" fill={muted} font-size="13">(b) Rotating disk</text>
      <ellipse cx={disk.x} cy={disk.y} rx="155" ry="43" fill="none" stroke={colors.b} stroke-width="1.7" />
      <line x1="45" y1={disk.y} x2="355" y2={disk.y} stroke={rule} stroke-dasharray="4 4" />
      <RotationArrow from={{ x: 278, y: 321 }} to={{ x: 278, y: 251 }} color={muted} label="k" labelAt={{ x: 293, y: 254 }} width={1.7} />
      <RotationArrow from={disk} to={diskOmega} color={colors.b} label="Ω = Ω_z k" labelAt={{ x: diskOmega.x, y: diskOmega.y - 20 }}
        onmove={(p) => omega = clamp((disk.y - p.y) / 137, 0, 1.5)} onstep={stepOmega}
        description="Disk angular velocity Ω: drag vertically or use arrow keys to change the magnitude" />
      <text x="200" y="467" text-anchor="middle" fill={muted} font-size="13">Ω<tspan baseline-shift="sub" font-size="0.75em">y</tspan> = 0, Ω<tspan baseline-shift="sub" font-size="0.75em">z</tspan> = Ω everywhere</text>
    </svg>
  </div>
  <p class="vector-callout" class:is-zero={Math.abs(omegaZ) < 0.001}>
    {#if omega === 0}No rotation ⇒ both components vanish.
    {:else if Math.abs(latitude) < 0.01}At the equator, Ω is entirely horizontal: Ω<sub>z</sub> = 0.
    {:else if Math.abs(latitude) > 89.99}At a pole, Ω has no horizontal component. {latitude > 0 ? "It points along local up." : "It points opposite local up."}
    {:else if latitude < 0}In the Southern Hemisphere, Ω<sub>z</sub> is negative: the vertical component points opposite local up.
    {:else}In the Northern Hemisphere, Ω<sub>z</sub> is positive: the vertical component points along local up.{/if}
  </p>
  <div class="readout" aria-live="polite">
    <span>Sphere Ω<sub>y</sub></span><span>= Ω cos θ = {fmt(omegaY)} rad/s</span>
    <span>Sphere Ω<sub>z</sub></span><span>= Ω sin θ = {fmt(omegaZ)} rad/s</span>
    <span>Disk (Ω<sub>y</sub>, Ω<sub>z</sub>)</span><span>= (0.00, {fmt(omega)}) rad/s</span>
  </div>
  <div class="controls rotation-controls">
    <label>Latitude θ <span>{fmt(latitude, 1)}°</span><input type="range" min="-90" max="90" step="1" bind:value={latitude} /></label>
    <label>Angular speed Ω <span>{fmt(omega)} rad/s</span><input type="range" min="0" max="1.5" step="0.01" bind:value={omega} /></label>
  </div>
  <div class="controls vector-actions">
    <button type="button" onclick={() => latitude = -90}>South pole</button>
    <button type="button" onclick={() => latitude = 0}>Equator</button>
    <button type="button" onclick={() => latitude = 90}>North pole</button>
    <button type="button" onclick={reset}>Reset</button>
  </div>
</div>
