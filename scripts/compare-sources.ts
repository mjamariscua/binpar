/**
 * Compara las condiciones iniciales publicadas por distintas fuentes para la
 * misma órbita: hueco de cierre en el T que publica cada una y mejor retorno
 * real (instante en que el estado vuelve más cerca del inicial).
 * Respalda la elección de fuentes explicada en docs/orbitas.md.
 *
 *   pnpm orbits:sources
 */
import { phaseSpaceDistance, totalEnergy } from "@/lib/physics/invariants";
import { packState } from "@/lib/physics/nbody";
import { precomputePeriod, sampleState, stateAt } from "@/lib/physics/trajectory";
import type { StateVector } from "@/lib/physics/types";
import { isoscelesCollinear } from "@/lib/orbits/catalog";

interface Candidate {
  readonly label: string;
  readonly vx: number;
  readonly vy: number;
  readonly period: number;
}

const CANDIDATES: readonly Candidate[] = [
  { label: "Butterfly I · arXiv:1312.6796 (15 díg.)", vx: 0.306892758965492, vy: 0.125506782829762, period: 6.23564136316479 },
  { label: "Butterfly I · PRL 2013 (5 díg.)", vx: 0.30689, vy: 0.12551, period: 6.2356 },
  { label: "Butterfly I · Li & Liao 2017 (10 díg.)", vx: 0.3068934205, vy: 0.1255065670, period: 6.2346748391 },
  { label: "Goggles · arXiv:1312.6796 (15 díg.)", vx: 0.0833000564575194, vy: 0.127889282226563, period: 10.4668176954385 },
  { label: "Goggles · PRL 2013 (5 díg.)", vx: 0.0833, vy: 0.12789, period: 10.4668 },
  { label: "Goggles · Li & Liao 2017 (10 díg.)", vx: 0.0833000718, vy: 0.1278892555, period: 10.4648495256 },
  { label: "Moth I · PRL 2013 (5 díg.)", vx: 0.46444, vy: 0.39606, period: 14.8939 },
  { label: "Moth I · Li & Liao 2017 (10 díg.)", vx: 0.4644451728, vy: 0.3960600146, period: 14.8943051743 },
  { label: "Yin-Yang I (a) · arXiv:1312.6796 (15 díg.)", vx: 0.513938054919243, vy: 0.304736003875733, period: 17.328369755004 },
  { label: "Yin-Yang I (b) · arXiv:1312.6796 (15 díg.)", vx: 0.282698682308198, vy: 0.327208786129952, period: 10.9625630756217 },
  { label: "Yin-Yang I (b) · Li & Liao 2017 (10 díg.)", vx: 0.2827020949, vy: 0.3272089716, period: 10.9633031497 },
];

const SYSTEM = { G: 1, masses: [1, 1, 1] } as const;
/** Se integra un 3 % más allá del T publicado para encontrar el retorno real aunque llegue tarde. */
const SPAN = 1.03;
const STEPS = 1 << 21;
const INTERVALS = 1 << 14;

function goldenMin(f: (t: number) => number, lo: number, hi: number): { t: number; value: number } {
  const g = (Math.sqrt(5) - 1) / 2;
  let a = lo;
  let b = hi;
  for (let i = 0; i < 80; i++) {
    const c = b - g * (b - a);
    const d = a + g * (b - a);
    if (f(c) < f(d)) b = d;
    else a = c;
  }
  const t = (a + b) / 2;
  return { t, value: f(t) };
}

console.log(`RK4 con ${STEPS} pasos en ${SPAN}·T. Distancias en el espacio de fases.\n`);
console.log("fuente".padEnd(44), "hueco en T publicado", "  mejor retorno", "   en t", "        |ΔE/E| máx");

for (const c of CANDIDATES) {
  const initial: StateVector = packState(isoscelesCollinear(c.vx, c.vy));
  const traj = precomputePeriod(SYSTEM, initial, SPAN * c.period, {
    intervals: INTERVALS,
    substeps: STEPS / INTERVALS,
  });
  const out = new Float64Array(initial.length);
  const distanceAt = (t: number) => phaseSpaceDistance(stateAt(traj, t, out), initial);

  // Muestra más cercana al estado inicial en la parte final, refinada con
  // búsqueda de sección áurea sobre la interpolación de Hermite.
  let best = 0;
  let bestDistance = Infinity;
  for (let k = Math.floor(INTERVALS * 0.95); k <= INTERVALS; k++) {
    const d = phaseSpaceDistance(sampleState(traj, k), initial);
    if (d < bestDistance) {
      bestDistance = d;
      best = k;
    }
  }
  const lo = Math.max(0, best - 1) * traj.sampleDt;
  const hi = Math.min(INTERVALS, best + 1) * traj.sampleDt;
  const refined = goldenMin(distanceAt, lo, Math.min(hi, traj.period * (1 - 1e-12)));

  const e0 = totalEnergy(SYSTEM, initial);
  let drift = 0;
  for (let k = 0; k <= INTERVALS; k++) {
    drift = Math.max(drift, Math.abs(totalEnergy(SYSTEM, sampleState(traj, k)) / e0 - 1));
  }

  console.log(
    c.label.padEnd(44),
    distanceAt(c.period).toExponential(1).padStart(20),
    refined.value.toExponential(1).padStart(15),
    refined.t.toFixed(6).padStart(11),
    drift.toExponential(1).padStart(18),
  );
}
