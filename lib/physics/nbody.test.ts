import { describe, expect, it } from "vitest";
import { gravityDerivative, packState } from "./nbody";
import { phaseSpaceDistance } from "./invariants";
import { precomputePeriod } from "./trajectory";
import type { GravitySystem } from "./types";

const pair = (distance: number) =>
  packState([
    { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } },
    { position: { x: distance, y: 0 }, velocity: { x: 0, y: 0 } },
  ]);

describe("gravityDerivative", () => {
  it("la derivada de la posición es la velocidad", () => {
    const system: GravitySystem = { G: 1, masses: [1] };
    const out = new Float64Array(4);
    gravityDerivative(system, Float64Array.from([3, 4, 5, 6]), out);
    expect([out[0], out[1]]).toEqual([5, 6]);
    expect([out[2], out[3]]).toEqual([0, 0]); // un cuerpo solo no se acelera
  });

  it("aplica a = G·m/r² hacia el otro cuerpo", () => {
    const system: GravitySystem = { G: 2, masses: [3, 5] };
    const out = new Float64Array(8);
    gravityDerivative(system, pair(4), out);
    expect(out[2]).toBeCloseTo((2 * 5) / 16, 14); // el cuerpo 0 cae hacia +x
    expect(out[6]).toBeCloseTo((-2 * 3) / 16, 14); // el cuerpo 1 cae hacia −x
  });

  it("sigue la ley de la inversa del cuadrado: doble distancia, un cuarto de aceleración", () => {
    const system: GravitySystem = { G: 1, masses: [1, 1] };
    const near = new Float64Array(8);
    const far = new Float64Array(8);
    gravityDerivative(system, pair(1), near);
    gravityDerivative(system, pair(2), far);
    expect(far[2] / near[2]).toBeCloseTo(0.25, 14);
  });

  it("cumple la tercera ley de Newton: Σ m·a = 0", () => {
    const system: GravitySystem = { G: 1, masses: [1, 2.5, 0.3, 7] };
    const state = Float64Array.from([
      0.1, -0.4, 0, 0, 1.3, 0.2, 0, 0, -0.7, 0.9, 0, 0, 0.4, 1.1, 0, 0,
    ]);
    const out = new Float64Array(state.length);
    gravityDerivative(system, state, out);
    let fx = 0;
    let fy = 0;
    system.masses.forEach((m, i) => {
      fx += m * out[i * 4 + 2];
      fy += m * out[i * 4 + 3];
    });
    expect(Math.abs(fx)).toBeLessThan(1e-14);
    expect(Math.abs(fy)).toBeLessThan(1e-14);
  });

  it("con suavizado ε la aceleración es finita incluso en contacto", () => {
    const system: GravitySystem = { G: 1, masses: [1, 1], softening: 0.1 };
    const out = new Float64Array(8);
    gravityDerivative(system, pair(0), out);
    expect(out.every(Number.isFinite)).toBe(true);
  });

  it("una órbita circular de dos cuerpos cierra tras T = 2π·r/v", () => {
    // Dos masas iguales separadas d = 2 giran alrededor del centro (r = 1).
    // Gm²/d² = m·v²/r  ⇒  v² = G·m·r/d² = 1/4  ⇒  v = 1/2, T = 2π·r/v = 4π.
    const initial = packState([
      { position: { x: -1, y: 0 }, velocity: { x: 0, y: -0.5 } },
      { position: { x: 1, y: 0 }, velocity: { x: 0, y: 0.5 } },
    ]);
    const traj = precomputePeriod({ G: 1, masses: [1, 1] }, initial, 4 * Math.PI, {
      intervals: 256,
      substeps: 8,
    });
    const last = traj.states.subarray(256 * 8, 257 * 8);
    expect(phaseSpaceDistance(initial, last)).toBeLessThan(1e-10);
  });
});
