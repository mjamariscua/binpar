import { describe, expect, it } from "vitest";
import { maxPositionGap } from "./invariants";
import { packState } from "./nbody";
import { finalState, precomputePeriod, sampleState, stateAt, wrapTime } from "./trajectory";
import type { GravitySystem } from "./types";

// Binaria circular de masas iguales: solución exacta conocida para comparar.
const system: GravitySystem = { G: 1, masses: [1, 1] };
const PERIOD = 4 * Math.PI;
const initial = packState([
  { position: { x: -1, y: 0 }, velocity: { x: 0, y: -0.5 } },
  { position: { x: 1, y: 0 }, velocity: { x: 0, y: 0.5 } },
]);
/** Posición exacta del cuerpo 1 en t: gira con ω = 2π/T sobre la circunferencia unidad. */
const exactBody1 = (t: number) => ({
  x: Math.cos((2 * Math.PI * t) / PERIOD),
  y: Math.sin((2 * Math.PI * t) / PERIOD),
});

const precompute = (intervals: number) =>
  precomputePeriod(system, initial, PERIOD, { intervals, substeps: 4096 / intervals });

describe("precomputePeriod", () => {
  const traj = precompute(64);

  it("guarda intervals + 1 muestras, la primera en t = 0 y la última en t = T", () => {
    expect(traj.states.length).toBe(65 * 8);
    expect(sampleState(traj, 0)).toEqual(initial);
    expect(traj.sampleDt * traj.intervals).toBeCloseTo(PERIOD, 14);
    expect(maxPositionGap(finalState(traj), initial)).toBeLessThan(1e-10);
  });

  it("no modifica el estado inicial recibido", () => {
    expect(initial[0]).toBe(-1);
  });
});

describe("wrapTime", () => {
  it("lleva cualquier t a [0, T), también hacia atrás", () => {
    expect(wrapTime(2.5, 10)).toBe(2.5);
    expect(wrapTime(12.5, 10)).toBe(2.5);
    expect(wrapTime(-7.5, 10)).toBe(2.5);
    expect(wrapTime(10, 10)).toBe(0);
  });
});

describe("stateAt", () => {
  const traj = precompute(64);
  const out = new Float64Array(8);

  it("en los instantes de muestra devuelve la muestra guardada", () => {
    for (const k of [0, 1, 17, 63]) {
      stateAt(traj, k * traj.sampleDt, out);
      expect(maxPositionGap(out, sampleState(traj, k))).toBeLessThan(1e-13);
    }
  });

  it("es periódica: t, t + T y t − T dan el mismo estado", () => {
    const a = Float64Array.from(stateAt(traj, 1.234, out));
    const b = Float64Array.from(stateAt(traj, 1.234 + PERIOD, out));
    const c = Float64Array.from(stateAt(traj, 1.234 - PERIOD, out));
    expect(maxPositionGap(a, b)).toBeLessThan(1e-12);
    expect(maxPositionGap(a, c)).toBeLessThan(1e-12);
  });

  it("entre muestras sigue la solución exacta y también interpola la velocidad", () => {
    const t = 10.5 * traj.sampleDt;
    stateAt(traj, t, out);
    const exact = exactBody1(t);
    expect(Math.hypot(out[4] - exact.x, out[5] - exact.y)).toBeLessThan(1e-6);
    // |v| = 1/2 en la binaria circular.
    expect(Math.hypot(out[6], out[7])).toBeCloseTo(0.5, 6);
  });

  it("Hermite es de orden 4: con la mitad de muestras el error crece ~16×", () => {
    const midpointError = (intervals: number) => {
      const tr = precompute(intervals);
      const t = 3.5 * tr.sampleDt;
      stateAt(tr, t, out);
      const exact = exactBody1(t);
      return Math.hypot(out[4] - exact.x, out[5] - exact.y);
    };
    const ratio = midpointError(16) / midpointError(32);
    expect(ratio).toBeGreaterThan(12);
    expect(ratio).toBeLessThan(20);
  });
});
