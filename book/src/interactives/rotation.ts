import type { Vec2 } from "./vectors";

export const radians = Math.PI / 180;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Points in SVG coordinates; a positive angle is counterclockwise. */
export function polar(origin: Vec2, radius: number, angle: number): Vec2 {
  return { x: origin.x + radius * Math.cos(angle), y: origin.y - radius * Math.sin(angle) };
}

export function pathThrough(points: Vec2[], closed = false): string {
  return points.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ") + (closed ? " Z" : "");
}

export function arc(origin: Vec2, radius: number, start: number, end: number): string {
  return pathThrough(Array.from({ length: 41 }, (_, i) => polar(origin, radius, start + (end - start) * i / 40)));
}

/** Effective gravity at r = R = 1, in units of GM/R²; q = Ω²R³/GM. */
export function gravityAt(latitude: number, q: number) {
  const c = Math.cos(latitude);
  const s = Math.sin(latitude);
  const centrifugal = q * c;
  const gravity = { x: -c + centrifugal, y: -s };
  const magnitude = Math.hypot(gravity.x, gravity.y);
  return {
    centrifugal,
    gravity,
    magnitude,
    horizontal: -centrifugal * s,
    vertical: -1 + q * c * c,
    // Outward vertical is opposite effective gravity.
    verticalAngle: Math.atan2(-gravity.y, -gravity.x),
  };
}

/**
 * Inner, closed equipotential through the selected point on the unit sphere:
 * Φ = −1/r − q r² cos²(latitude)/2. For q ≤ 0.24 the inner root is
 * bracketed by [0.5, 1.5] at every latitude, including either pole.
 */
export function equipotentialRadius(latitude: number, selectedLatitude: number, q: number): number {
  const level = 1 + q * Math.cos(selectedLatitude) ** 2 / 2;
  let lo = 0.5;
  let hi = 1.5;
  for (let i = 0; i < 42; i++) {
    const r = (lo + hi) / 2;
    const value = 1 / r + q * r * r * Math.cos(latitude) ** 2 / 2;
    if (value > level) lo = r;
    else hi = r;
  }
  return (lo + hi) / 2;
}
