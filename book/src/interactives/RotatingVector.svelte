<script lang="ts">
  import { onMount } from "svelte";
  import { onThemeChange, readTheme, type Theme } from "./plot";
  import { fmt, vectorColors, type Vec2 } from "./vectors";
  import { clamp, pathThrough, radians } from "./rotation";
  import RotationArrow from "./RotationArrow.svelte";

  const origin = { x: 240, y: 330 };
  const scale = 78;
  const flatten = 0.32;
  let magnitude = $state(1.8);
  let theta = $state(35);
  let lambda = $state(-35);
  let omega = $state(0.8);
  let playing = $state(false);
  let theme = $state<Theme | null>(null);
  const colors = $derived(theme ? vectorColors(theme) : { a: "#9b2c2c", b: "#1d6a8a", result: "#2d6a4f" });
  const muted = $derived(theme?.muted ?? "#5e574c");
  const rule = $derived(theme?.rule ?? "#d3c9b6");
  const radius = $derived(magnitude * Math.cos(theta * radians));
  const height = $derived(magnitude * Math.sin(theta * radians));
  const phase = $derived(lambda * radians);
  const rate = $derived(omega * radius);

  function project(x: number, y: number, z: number): Vec2 {
    return { x: origin.x + scale * x, y: origin.y - scale * (flatten * y + z) };
  }
  const tip = $derived(project(radius * Math.cos(phase), radius * Math.sin(phase), height));
  const foot = $derived(project(radius * Math.cos(phase), radius * Math.sin(phase), 0));
  const center = $derived(project(0, 0, height));
  const omegaTip = $derived({ x: origin.x, y: origin.y - omega * 185 });
  const tangent = $derived({ x: -Math.sin(phase), y: Math.cos(phase) });
  // C and dC/dt have different units; each uses a fixed drawing scale.
  const rateTip = $derived({ x: tip.x + 48 * rate * tangent.x, y: tip.y - 48 * flatten * rate * tangent.y });
  const mStart = $derived({ x: tip.x, y: tip.y + 25 });
  const mTip = $derived({ x: mStart.x + 52 * tangent.x, y: mStart.y - 52 * flatten * tangent.y });
  const thetaArc = $derived(pathThrough(Array.from({ length: 33 }, (_, i) => {
    const t = theta * radians * i / 32;
    return project(0.55 * Math.cos(t) * Math.cos(phase), 0.55 * Math.cos(t) * Math.sin(phase), 0.55 * Math.sin(t));
  })));
  const thetaLabel = $derived(project(0.72 * Math.cos(theta * radians / 2) * Math.cos(phase), 0.72 * Math.cos(theta * radians / 2) * Math.sin(phase), 0.72 * Math.sin(theta * radians / 2)));
  const lambdaArc = $derived(pathThrough(Array.from({ length: 65 }, (_, i) => {
    const t = phase * i / 64;
    return project(0.85 * Math.cos(t), 0.85 * Math.sin(t), 0);
  })));
  const lambdaLabel = $derived(project(1.06 * Math.cos(phase / 2), 1.06 * Math.sin(phase / 2), 0));

  function dragC(point: Vec2) {
    playing = false;
    const x = (point.x - origin.x) / scale;
    const y = (center.y - point.y) / (scale * flatten);
    const nextRadius = clamp(Math.hypot(x, y), 0, Math.sqrt(Math.max(0, 2.2 ** 2 - height ** 2)));
    const nextMagnitude = clamp(Math.hypot(nextRadius, height), 0.5, 2.2);
    const nextTheta = Math.atan2(height, nextRadius) / radians;
    if (nextRadius > 0.01) lambda = Math.atan2(y, x) / radians;
    magnitude = nextMagnitude;
    theta = nextTheta;
  }

  function stepC(step: Vec2) {
    playing = false;
    lambda = (lambda + step.x * 2 + 540) % 360 - 180;
    theta = clamp(theta - step.y, 0, 90);
  }

  function reset() {
    playing = false;
    magnitude = 1.8;
    theta = 35;
    lambda = -35;
    omega = 0.8;
  }

  onMount(() => {
    theme = readTheme();
    return onThemeChange(() => theme = readTheme());
  });

  $effect(() => {
    if (!playing) return;
    let frame: number;
    let previous = 0;
    function animate(time: number) {
      const dt = previous ? Math.min((time - previous) / 1000, 0.05) : 0;
      previous = time;
      lambda = (lambda + omega * dt / radians + 180) % 360 - 180;
      frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  });
</script>

<div class="interactive rotation-interactive">
  <p class="interactive-title">Rate of change of a rotating vector</p>
  <p class="interactive-caption">Drag the tip of C around its horizontal orbit, or drag Ω up and down to change the rotation rate. Use θ to tilt C. Focus a tip and use the arrow keys for keyboard control.</p>
  <div class="vector-stage">
    <svg class="vector-canvas" viewBox="0 0 480 420" role="group" aria-label="Rotating vector C, its perpendicular component, rotation angles, and tangent derivative">
      <line x1={origin.x} y1="40" x2={origin.x} y2="375" stroke={rule} stroke-dasharray="4 4" />
      <line x1={origin.x - 185} y1={origin.y} x2={origin.x + 190} y2={origin.y} stroke={rule} />
      <line x1={origin.x} y1={origin.y - 58} x2={origin.x} y2={origin.y + 58} stroke={rule} />
      <text x="446" y="347" fill={muted} font-size="12">λ = 0</text>
      <ellipse cx={center.x} cy={center.y} rx={radius * scale} ry={radius * scale * flatten} fill="none" stroke={colors.b} stroke-width="1.6" />
      <line x1={tip.x} y1={tip.y} x2={foot.x} y2={foot.y} stroke={rule} stroke-dasharray="4 4" />
      <line x1={origin.x} y1={origin.y} x2={foot.x} y2={foot.y} stroke={muted} stroke-dasharray="4 4" />
      <path d={thetaArc} fill="none" stroke={colors.a} stroke-width="1.4" />
      <text x={thetaLabel.x} y={thetaLabel.y} fill={colors.a} font-size="14">θ</text>
      <path d={lambdaArc} fill="none" stroke={muted} stroke-width="1.3" />
      <text x={lambdaLabel.x} y={lambdaLabel.y + 12} fill={muted} font-size="14">λ</text>
      <RotationArrow from={center} to={tip} color={colors.b} label="C⊥" labelAt={{ x: (center.x + tip.x) / 2, y: (center.y + tip.y) / 2 - 12 }} width={1.7} />
      {#if radius > 0.2}
        <path d={pathThrough([
          project(0, 0, height + 0.16),
          project(0.16 * Math.cos(phase), 0.16 * Math.sin(phase), height + 0.16),
          project(0.16 * Math.cos(phase), 0.16 * Math.sin(phase), height),
        ])} fill="none" stroke={colors.b} stroke-width="1" />
      {/if}
      {#if rate > 0.001}
        <RotationArrow from={tip} to={rateTip} color={colors.result} label="Ω × C" labelAt={{ x: clamp(rateTip.x, 32, 448), y: rateTip.y - 17 }} />
        <RotationArrow from={mStart} to={mTip} color={muted} label="m" width={1.2} dashed />
      {/if}
      <RotationArrow from={origin} to={omegaTip} color={colors.b} label="Ω" labelAt={{ x: omegaTip.x - 18, y: omegaTip.y - 5 }}
        onmove={(p) => { playing = false; omega = clamp((origin.y - p.y) / 185, 0, 1.5); }}
        onstep={(s) => { playing = false; omega = clamp(omega - s.y * 0.02 + s.x * 0.02, 0, 1.5); }}
        description="Angular velocity Ω: drag vertically or use arrow keys to change its magnitude" />
      <RotationArrow from={origin} to={tip} color={colors.a} label="C" labelAt={{ x: (origin.x + tip.x) / 2 + 16, y: (origin.y + tip.y) / 2 }} onmove={dragC} onstep={stepC}
        description="Vector C: drag in the orbit plane; left and right change azimuth, up and down change inclination" />
      <text x={origin.x - 17} y={origin.y + 20} fill={muted} font-size="14">O</text>
    </svg>
  </div>
  <p class="vector-callout" class:is-zero={rate < 0.001}>
    {#if omega === 0}No rotation ⇒ dC/dt = 0.
    {:else if radius < 0.001}C is parallel to Ω ⇒ Ω × C = 0.
    {:else}Ω × C is tangent to the orbit and perpendicular to both vectors. The dashed unit tangent m is offset for clarity.{/if}
  </p>
  <div class="readout" aria-live={playing ? "off" : "polite"}>
    <span>|C⊥|</span><span>= |C| cos θ = {fmt(radius)}</span>
    <span>|(dC/dt)ᵢ|</span><span>= Ω |C| cos θ = {fmt(rate)}</span>
    <span>(dC/dt)ᵣ</span><span>= 0 (C is fixed in the rotating frame)</span>
  </div>
  <div class="controls rotation-controls">
    <label>Magnitude |C| <span>{fmt(magnitude)}</span><input type="range" min="0.5" max="2.2" step="0.01" bind:value={magnitude} /></label>
    <label>Inclination θ <span>{fmt(theta, 1)}°</span><input type="range" min="0" max="90" step="1" bind:value={theta} /></label>
    <label>Azimuth λ <span>{fmt(lambda, 0)}°</span><input type="range" min="-180" max="180" step="1" bind:value={lambda} oninput={() => playing = false} /></label>
    <label>Angular speed Ω <span>{fmt(omega)} rad/s</span><input type="range" min="0" max="1.5" step="0.01" bind:value={omega} /></label>
  </div>
  <div class="controls vector-actions">
    <button type="button" onclick={() => playing = !playing} disabled={!playing && (omega === 0 || radius < 0.001)}>{playing ? "Pause" : "Rotate C"}</button>
    <button type="button" onclick={() => { playing = false; theta = 90; }}>C ∥ Ω</button>
    <button type="button" onclick={() => { playing = false; theta = 0; }}>C ⟂ Ω</button>
    <button type="button" onclick={reset}>Reset</button>
  </div>
</div>
