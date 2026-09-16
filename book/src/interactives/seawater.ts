/**
 * Seawater density: the linear equation of state used in the text, and the
 * full UNESCO (EOS-80) polynomial it approximates.
 *
 * Pressure is carried in pascals everywhere in this module. EOS-80 wants sea
 * pressure in bars (0 at the surface), so the conversion lives in one place.
 */

/** Sea-level pressure, the reference pressure p0 of the linear equation. */
export const P_SURFACE = 1e5;

/** Coefficients of the linear equation of state, as given in the exercises. */
export const LINEAR = {
  rho0: 1027,
  T0: 10,
  S0: 35,
  p0: P_SURFACE,
  betaT: 1.67e-4,
  betaS: 7.8e-4,
  betaP: 4.4e-10,
};

/**
 * rho = rho0 [1 - betaT (T - T0) + betaS (S - S0) + betaP (p - p0)],
 * with T in degrees Celsius, S in g/kg, and p in pascals.
 */
export function densityLinear(S: number, T: number, p: number): number {
  const c = LINEAR;
  return (
    c.rho0 *
    (1 - c.betaT * (T - c.T0) + c.betaS * (S - c.S0) + c.betaP * (p - c.p0))
  );
}

/** Density of seawater at one standard atmosphere (UNESCO 1983, Eq. 14). */
function densityAtSurface(S: number, T: number): number {
  const rhoW =
    999.842594 +
    6.793952e-2 * T -
    9.09529e-3 * T ** 2 +
    1.001685e-4 * T ** 3 -
    1.120083e-6 * T ** 4 +
    6.536332e-9 * T ** 5;
  const A =
    8.24493e-1 -
    4.0899e-3 * T +
    7.6438e-5 * T ** 2 -
    8.2467e-7 * T ** 3 +
    5.3875e-9 * T ** 4;
  const B = -5.72466e-3 + 1.0227e-4 * T - 1.6546e-6 * T ** 2;
  const C = 4.8314e-4;
  return rhoW + A * S + B * S ** 1.5 + C * S ** 2;
}

/** Secant bulk modulus K(S, T, p), with p the sea pressure in bars. */
function bulkModulus(S: number, T: number, pBar: number): number {
  const kw =
    19652.21 +
    148.4206 * T -
    2.327105 * T ** 2 +
    1.360477e-2 * T ** 3 -
    5.155288e-5 * T ** 4;
  const k0 =
    kw +
    S * (54.6746 - 0.603459 * T + 1.09987e-2 * T ** 2 - 6.167e-5 * T ** 3) +
    S ** 1.5 * (7.944e-2 + 1.6483e-2 * T - 5.3009e-4 * T ** 2);

  const aw = 3.239908 + 1.43713e-3 * T + 1.16092e-4 * T ** 2 - 5.77905e-7 * T ** 3;
  const a =
    aw +
    S * (2.2838e-3 - 1.0981e-5 * T - 1.6078e-6 * T ** 2) +
    1.91075e-4 * S ** 1.5;

  const bw = 8.50935e-5 - 6.12293e-6 * T + 5.2787e-8 * T ** 2;
  const b = bw + S * (-9.9348e-7 + 2.0816e-8 * T + 9.1697e-10 * T ** 2);

  return k0 + a * pBar + b * pBar ** 2;
}

/**
 * The full UNESCO 1983 (EOS-80) equation of state, with T in degrees Celsius
 * (IPTS-68), S the practical salinity, and p the absolute pressure in pascals.
 */
export function densityUnesco(S: number, T: number, p: number): number {
  const pBar = (p - P_SURFACE) / 1e5;
  const rho0 = densityAtSurface(S, T);
  if (pBar <= 0) return rho0;
  return rho0 / (1 - pBar / bulkModulus(S, T, pBar));
}

/**
 * Depth of a pressure surface, using the crude hydrostatic estimate
 * p - p0 = rho g z that students can do in their head, not the full
 * pressure-to-depth polynomial.
 */
export function depthOf(p: number): number {
  return (p - P_SURFACE) / (1027 * 9.81);
}
