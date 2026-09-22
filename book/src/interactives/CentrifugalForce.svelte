<script lang="ts">
  import { onMount } from "svelte";
  import { onThemeChange, readTheme, type Theme } from "./plot";
  import { fmt, vectorColors, type Vec2 } from "./vectors";
  import { arc, clamp, equipotentialRadius, gravityAt, pathThrough, polar, radians } from "./rotation";
  import RotationArrow from "./RotationArrow.svelte";

  const origin = { x: 160, y: 245 };
  const radius = 105;
  const forceScale = 150;
  let latitude = $state(45);
  let q = $state(0.2);
  let theme = $state<Theme | null>(null);
  const colors = $derived(theme ? vectorColors(theme) : { a: "#9b2c2c", b: "#1d6a8a", result: "#2d6a4f" });
  const muted = $derived(theme?.muted ?? "#5e574c");
  const rule = $derived(theme?.rule ?? "#d3c9b6");
  const theta = $derived(latitude * radians);
  const point = $derived(polar(origin, radius, theta));
  const forces = $derived(gravityAt(theta, q));
  const gravityTip = $derived({ x: point.x + forceScale * forces.gravity.x, y: point.y - forceScale * forces.gravity.y });
  const radialTip = $derived(polar(point, -forceScale, theta));
  const centrifugalTip = $derived({ x: point.x + forceScale * forces.centrifugal, y: point.y });
  const omegaTip = $derived({ x: origin.x, y: origin.y - 190 * Math.sqrt(q / 0.24) });
  const horizontalTip = $derived(polar(point, forceScale * forces.horizontal, theta + Math.PI / 2));
  const surface = $derived(pathThrough(Array.from({ length: 241 }, (_, i) => {
    const angle = i * Math.PI / 120;
    return polar(origin, radius * equipotentialRadius(angle, theta, q), angle);
  }), true));

  function dragPosition(p: Vec2) {
    latitude = clamp(Math.atan2(origin.y - p.y, Math.max(0, p.x - origin.x)) / radians, -90, 90);
  }
  function stepPosition(s: Vec2) { latitude = clamp(latitude - s.y + s.x, -90, 90); }
  function dragOmega(p: Vec2) { q = 0.24 * clamp((origin.y - p.y) / 190, 0, 1) ** 2; }
  function stepOmega(s: Vec2) { q = clamp(q + (s.x - s.y) * 0.005, 0, 0.24); }
  function dragC(p: Vec2) { q = clamp((p.x - point.x) / (forceScale * Math.cos(theta)), 0, 0.24); }
  function reset() { latitude = 45; q = 0.2; }

  onMount(() => {
    theme = readTheme();
    return onThemeChange(() => theme = readTheme());
  });
</script>

<div class="interactive rotation-interactive">
  <p class="interactive-title">Centrifugal acceleration and effective gravity</p>
  <p class="interactive-caption">Drag r’s tip along either sphere to change latitude. Drag Ω vertically or C horizontally to change the rotation strength. Both panels show the same forces; their local vertical and horizontal axes differ. Arrow keys also move the handles.</p>
  <div class="vector-stage rotation-panels">
    {#each [false, true] as effective}
      {@const vertical = effective ? forces.verticalAngle : theta}
      {@const zTip = polar(point, 58, vertical)}
      {@const tangentA = polar(point, 67, vertical + Math.PI / 2)}
      {@const tangentB = polar(point, -67, vertical + Math.PI / 2)}
      {@const squareA = polar(point, 11, vertical)}
      {@const squareB = polar(squareA, 11, vertical + Math.PI / 2)}
      {@const squareC = polar(point, 11, vertical + Math.PI / 2)}
      <svg class="vector-canvas" viewBox="0 0 400 450" role="group" aria-label={effective ? "Effective-gravity coordinates with a surface of constant geopotential" : "Spherical coordinates with a nonzero horizontal component of effective gravity"}>
        <text x="18" y="27" fill={muted} font-size="13">{effective ? "(b) Vertical opposite to g" : "(a) Radial vertical"}</text>
        <circle cx={origin.x} cy={origin.y} r={radius} fill="none" stroke={colors.b} stroke-width="1.7" />
        {#if effective}
          <path d={surface} fill="none" stroke={colors.result} stroke-width="1.7" stroke-dasharray="6 5" />
          <line x1="25" y1="394" x2="50" y2="394" stroke={colors.result} stroke-dasharray="6 5" />
          <text x="58" y="398" fill={muted} font-size="12">constant geopotential Φ</text>
        {/if}
        <line x1={origin.x} y1="45" x2={origin.x} y2={origin.y + radius} stroke={rule} stroke-dasharray="4 4" />
        <line x1={origin.x} y1={origin.y} x2={origin.x + radius} y2={origin.y} stroke={rule} />
        <path d={arc(origin, 30, 0, theta)} fill="none" stroke={muted} />
        <text x={polar(origin, 43, theta / 2).x} y={polar(origin, 43, theta / 2).y + 4} fill={muted} font-size="13">θ</text>
        <line x1={tangentA.x} y1={tangentA.y} x2={tangentB.x} y2={tangentB.y} stroke={muted} stroke-width="1.5" />
        <path d={pathThrough([squareA, squareB, squareC])} stroke={muted} fill="none" />
        <RotationArrow from={point} to={zTip} color={muted} label="z" labelAt={{ x: zTip.x + 12, y: zTip.y + 4 }} width={1.5} />
        <RotationArrow from={point} to={radialTip} color={muted} label="g₀" labelAt={{ x: radialTip.x - 17, y: radialTip.y + 9 }} width={1.5} dashed />
        <RotationArrow from={point} to={gravityTip} color={colors.result} label="g" labelAt={{ x: gravityTip.x + 17, y: gravityTip.y + 9 }} />
        {#if !effective && Math.abs(forces.horizontal) > 0.002}
          <RotationArrow from={point} to={horizontalTip} color={colors.result} label="gₕ" labelAt={{ x: horizontalTip.x + 23, y: horizontalTip.y + 19 }} width={1.6} />
        {/if}
        <RotationArrow from={origin} to={omegaTip} color={colors.b} label="Ω" labelAt={{ x: omegaTip.x - 17, y: omegaTip.y }} onmove={dragOmega} onstep={stepOmega}
          description={`Angular velocity Ω in ${effective ? "effective-gravity" : "spherical"} coordinates: drag vertically or use arrow keys`} />
        <RotationArrow from={origin} to={point} color={muted} label="r" labelAt={{ x: (origin.x + point.x) / 2 - 12, y: (origin.y + point.y) / 2 - 8 }} width={1.3} onmove={dragPosition} onstep={stepPosition}
          description={`Position vector r in ${effective ? "effective-gravity" : "spherical"} coordinates: drag around the sphere or use arrow keys to change latitude`} />
        <!-- Keep nearby r and C handles independently reachable when C is short. -->
        <RotationArrow from={point} to={centrifugalTip} color={colors.a} label="C" labelAt={{ x: centrifugalTip.x + 16, y: centrifugalTip.y - 9 }}
          hitRadius={Math.min(18, forceScale * forces.centrifugal * 0.45)}
          onmove={Math.abs(Math.cos(theta)) > 0.02 && q > 0 ? dragC : undefined} onstep={stepOmega}
          description={`Centrifugal acceleration C in ${effective ? "effective-gravity" : "spherical"} coordinates: drag horizontally or use arrow keys`} />
        <text x="200" y="430" text-anchor="middle" fill={colors.result} font-size="13">{effective ? "gₕ = 0 by definition" : `gₕ / g₀ = ${fmt(forces.horizontal, 3)}`}</text>
      </svg>
    {/each}
  </div>
  <p class="vector-callout">g = g₀ + C. Effective gravity points inward; the local upward vertical is opposite to g. Rotation is exaggerated to make the tilt visible.</p>
  <div class="readout" aria-live="polite">
    <span>|C| / g₀</span><span>= q cos θ = {fmt(forces.centrifugal, 3)}</span>
    <span>Radial gₕ / g₀</span><span>= −q sin θ cos θ = {fmt(forces.horizontal, 3)}</span>
    <span>Modified gₕ</span><span>= 0</span>
    <span>Vertical tilt</span><span>= {fmt(Math.abs(forces.verticalAngle - theta) / radians, 1)}°</span>
  </div>
  <div class="controls rotation-controls">
    <label>Latitude θ <span>{fmt(latitude, 1)}°</span><input type="range" min="-90" max="90" step="1" bind:value={latitude} /></label>
    <label>Rotation strength q = Ω²R/g₀ <span>{fmt(q, 3)}</span><input type="range" min="0" max="0.24" step="0.001" bind:value={q} /></label>
  </div>
  <div class="controls vector-actions">
    <button type="button" onclick={() => latitude = 0}>Equator</button>
    <button type="button" onclick={() => latitude = 90}>North pole</button>
    <button type="button" onclick={() => q = 0}>No rotation</button>
    <button type="button" onclick={reset}>Reset</button>
  </div>
</div>
