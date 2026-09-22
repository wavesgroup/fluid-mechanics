<script lang="ts">
  import type { Vec2 } from "./vectors";

  let {
    from, to, color, label = "", labelAt, width = 2.4, dashed = false,
    onmove, onstep, description = "", hitRadius = 18,
  }: {
    from: Vec2;
    to: Vec2;
    color: string;
    label?: string;
    labelAt?: Vec2;
    width?: number;
    dashed?: boolean;
    onmove?: (point: Vec2) => void;
    onstep?: (step: Vec2) => void;
    description?: string;
    hitRadius?: number;
  } = $props();

  let pointer: number | null = $state(null);
  const arrow = $derived.by(() => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    const ux = dx / (length || 1);
    const uy = dy / (length || 1);
    const size = Math.min(9, length * 0.4);
    const base = { x: to.x - ux * size, y: to.y - uy * size };
    return {
      length, base,
      head: `${to.x},${to.y} ${base.x - uy * size * 0.42},${base.y + ux * size * 0.42} ${base.x + uy * size * 0.42},${base.y - ux * size * 0.42}`,
    };
  });
  const textAt = $derived(labelAt ?? { x: to.x + 12, y: to.y - 10 });

  function move(e: PointerEvent) {
    if (pointer !== e.pointerId) return;
    const svg = (e.currentTarget as SVGElement).ownerSVGElement;
    const matrix = svg?.getScreenCTM();
    if (matrix) onmove?.(new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse()));
  }

  function start(e: PointerEvent) {
    if (e.button !== 0 || pointer !== null) return;
    e.preventDefault();
    pointer = e.pointerId;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    move(e);
  }

  function end(e: PointerEvent) {
    if (pointer !== e.pointerId) return;
    pointer = null;
    const target = e.currentTarget as Element;
    if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId);
  }

  function key(e: KeyboardEvent) {
    const step = e.shiftKey ? 5 : 1;
    const directions: Record<string, Vec2> = {
      ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step },
    };
    if (!directions[e.key]) return;
    e.preventDefault();
    onstep?.(directions[e.key]);
  }
</script>

{#if arrow.length > 0.1}
  <line x1={from.x} y1={from.y} x2={arrow.base.x} y2={arrow.base.y} stroke={color} stroke-width={width} stroke-dasharray={dashed ? "5 4" : undefined} stroke-linecap="round" />
  <polygon points={arrow.head} fill={color} />
{/if}
{#if label}
  <text x={textAt.x} y={textAt.y} fill={color} text-anchor="middle" dominant-baseline="middle" font-size="14" font-style="italic">{#if label.includes("_")}{label.split("_")[0]}<tspan baseline-shift="sub" font-size="0.75em">{label.split("_")[1][0]}</tspan>{label.split("_")[1].slice(1)}{:else}{label}{/if}</text>
{/if}
{#if onmove}
  <circle
    class="vec-hit"
    class:is-dragging={pointer !== null}
    cx={to.x} cy={to.y} r={hitRadius} tabindex="0" role="button"
    aria-label={description}
    onpointerdown={start} onpointermove={move} onpointerup={end}
    onpointercancel={end} onlostpointercapture={() => pointer = null} onkeydown={key}
  />
  <circle class="vec-tip" cx={to.x} cy={to.y} r={Math.min(5, hitRadius)} fill={color} />
{/if}

<style>
  .is-dragging { cursor: grabbing; }
  line, polygon, text { pointer-events: none; }
</style>
