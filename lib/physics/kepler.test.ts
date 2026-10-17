import { describe, expect, it } from "vitest";
import { centralGravity, circularSpeed, classifyOrbit, escapeSpeed } from "./kepler";
import { createRK4 } from "./rk4";

const GM = 1;
const R = 1;
/** Satélite en (0, r) con velocidad horizontal v (tangencial). */
const launch = (r: number, v: number) => Float64Array.from([0, r, -v, 0]);

describe("velocidades características", () => {
  it("la de escape es √2 veces la circular", () => {
    expect(escapeSpeed(GM, 2) / circularSpeed(GM, 2)).toBeCloseTo(Math.SQRT2, 14);
    expect(circularSpeed(4, 1)).toBe(2);
  });
});

describe("classifyOrbit", () => {
  it("a velocidad circular: circular, e = 0, periapsis = apoapsis = r", () => {
    const o = classifyOrbit(launch(2, circularSpeed(GM, 2)), GM, R);
    expect(o.kind).toBe("circular");
    expect(o.eccentricity).toBeLessThan(1e-12);
    expect(o.periapsis).toBeCloseTo(2, 12);
    expect(o.apoapsis).toBeCloseTo(2, 12);
  });

  it("algo más rápida: elipse que tiene su punto más cercano en el lanzamiento", () => {
    const o = classifyOrbit(launch(2, 1.2 * circularSpeed(GM, 2)), GM, R);
    expect(o.kind).toBe("eliptica");
    expect(o.periapsis).toBeCloseTo(2, 12);
    expect(o.apoapsis).toBeGreaterThan(2);
  });

  it("a la velocidad de escape o más: escapa (energía ≥ 0, e ≥ 1)", () => {
    const o = classifyOrbit(launch(2, 1.01 * escapeSpeed(GM, 2)), GM, R);
    expect(o.kind).toBe("escape");
    expect(o.energy).toBeGreaterThan(0);
    expect(o.eccentricity).toBeGreaterThan(1);
    expect(o.apoapsis).toBe(Infinity);
  });

  it("demasiado lenta: el periapsis cae dentro del planeta y choca", () => {
    expect(classifyOrbit(launch(2, 0.5 * circularSpeed(GM, 2)), GM, R).kind).toBe("choque");
  });

  it("la clasificación coincide con integrar: la elipse no baja del periapsis ni sube del apoapsis", () => {
    const s = launch(2, 1.2 * circularSpeed(GM, 2));
    const { periapsis, apoapsis } = classifyOrbit(s, GM, R);
    const step = createRK4(4, centralGravity(GM));
    let min = Infinity;
    let max = 0;
    for (let i = 0; i < 20000; i++) {
      step(s, 0.002);
      const r = Math.hypot(s[0], s[1]);
      min = Math.min(min, r);
      max = Math.max(max, r);
    }
    expect(min).toBeCloseTo(periapsis, 6);
    expect(max).toBeCloseTo(apoapsis, 4);
  });
});
