import { describe, expect, it } from "vitest";
import {
  angularMomentum,
  centerOfMass,
  linearMomentum,
  maxPositionGap,
  phaseSpaceDistance,
  totalEnergy,
} from "./invariants";
import { packState } from "./nbody";
import type { GravitySystem } from "./types";

const system: GravitySystem = { G: 1, masses: [1, 3] };

describe("invariantes", () => {
  it("energía: dos masas en reposo a distancia 2 ⇒ E = −G·m₁·m₂/2", () => {
    const state = packState([
      { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } },
      { position: { x: 2, y: 0 }, velocity: { x: 0, y: 0 } },
    ]);
    expect(totalEnergy(system, state)).toBeCloseTo(-1.5, 15);
  });

  it("energía: suma la cinética ½·m·v²", () => {
    const state = packState([
      { position: { x: 0, y: 0 }, velocity: { x: 3, y: 4 } }, // ½·1·25
      { position: { x: 1e12, y: 0 }, velocity: { x: 0, y: 0 } }, // potencial ≈ 0
    ]);
    expect(totalEnergy(system, state)).toBeCloseTo(12.5, 10);
  });

  it("momento angular: Σ m·(x·vy − y·vx)", () => {
    const state = packState([
      { position: { x: 1, y: 0 }, velocity: { x: 0, y: 2 } }, // 1·(1·2) = 2
      { position: { x: 0, y: 1 }, velocity: { x: 1, y: 0 } }, // 3·(−1·1) = −3
    ]);
    expect(angularMomentum(system, state)).toBe(-1);
  });

  it("momento lineal y centro de masas ponderan por la masa", () => {
    const state = packState([
      { position: { x: 0, y: 0 }, velocity: { x: 3, y: 0 } },
      { position: { x: 4, y: 8 }, velocity: { x: -1, y: 1 } },
    ]);
    expect(linearMomentum(system, state)).toEqual({ x: 0, y: 3 });
    expect(centerOfMass(system, state)).toEqual({ x: 3, y: 6 });
  });

  it("distancias entre estados", () => {
    const a = Float64Array.from([0, 0, 0, 0, 1, 1, 0, 0]);
    const b = Float64Array.from([3, 4, 0, 0, 1, 1, 0, 1]);
    expect(maxPositionGap(a, b)).toBe(5);
    expect(phaseSpaceDistance(a, b)).toBeCloseTo(Math.sqrt(26), 15);
  });
});
