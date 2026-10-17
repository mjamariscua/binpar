/**
 * Informe reproducible de las seis órbitas: error de cierre tras un periodo,
 * deriva de energía, coste de precomputar y error de interpolación, para
 * varias resoluciones. De aquí salen los valores de `integration` del catálogo
 * y la tabla de docs/orbitas.md.
 *
 *   pnpm orbits:report
 */
import { maxPositionGap, phaseSpaceDistance, totalEnergy } from "@/lib/physics/invariants";
import {
  finalState,
  initialState,
  precomputePeriod,
  sampleState,
  stateAt,
} from "@/lib/physics/trajectory";
import { ORBITS, initialStateOf } from "@/lib/orbits/catalog";

/** Pasos de RK4 por periodo que se prueban: de 2¹⁴ a 2²⁰. */
const STEPS = [1 << 14, 1 << 16, 1 << 18, 1 << 19, 1 << 20];
const INTERVALS = [512, 1024, 2048, 4096, 8192];

const fmt = (x: number) => x.toExponential(1).padStart(8);

for (const orbit of ORBITS) {
  const { intervals, substeps } = orbit.integration;
  const catalogSteps = intervals * substeps;
  const e0 = totalEnergy(orbit.system, initialStateOf(orbit));
  console.log(`\n${orbit.name}  (T = ${orbit.period}, E = ${e0.toFixed(6)})`);
  console.log("    pasos/T   cierre fase   cierre pos   |ΔE/E| máx     ms");

  for (const steps of [...new Set([...STEPS, catalogSteps])].sort((a, b) => a - b)) {
    const start = performance.now();
    const traj = precomputePeriod(orbit.system, initialStateOf(orbit), orbit.period, {
      intervals,
      substeps: Math.max(1, Math.round(steps / intervals)),
    });
    const ms = performance.now() - start;
    let drift = 0;
    for (let k = 0; k <= traj.intervals; k++) {
      const e = totalEnergy(orbit.system, sampleState(traj, k));
      drift = Math.max(drift, Math.abs((e - e0) / e0));
    }
    const closure = phaseSpaceDistance(initialState(traj), finalState(traj));
    const gap = maxPositionGap(initialState(traj), finalState(traj));
    const marker = steps === catalogSteps ? "  ← catálogo" : "";
    console.log(
      `  ${String(steps).padStart(9)}   ${fmt(closure)}     ${fmt(gap)}    ${fmt(drift)}  ${ms.toFixed(0).padStart(5)}${marker}`,
    );
  }

  // Error de interpolar entre muestras: stateAt() en el punto medio de cada
  // intervalo frente a una integración que guarda justo ese punto (mismo paso h).
  const parts: string[] = [];
  for (const n of INTERVALS) {
    const coarse = precomputePeriod(orbit.system, initialStateOf(orbit), orbit.period, {
      intervals: n,
      substeps: catalogSteps / n,
    });
    const fine = precomputePeriod(orbit.system, initialStateOf(orbit), orbit.period, {
      intervals: n * 2,
      substeps: catalogSteps / n / 2,
    });
    const out = new Float64Array(initialStateOf(orbit).length);
    let worst = 0;
    for (let k = 0; k < n; k++) {
      stateAt(coarse, (k + 0.5) * coarse.sampleDt, out);
      worst = Math.max(worst, maxPositionGap(out, sampleState(fine, 2 * k + 1)));
    }
    parts.push(`${n}${n === intervals ? "*" : ""}: ${worst.toExponential(1)}`);
  }
  console.log(`  interpolación, error posicional máx. (* = catálogo)\n    ${parts.join("   ")}`);
}
