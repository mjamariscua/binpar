import { describe, expect, it } from "vitest";
import { createRK4 } from "./rk4";

// Oscilador armónico y'' = −y escrito como sistema de primer orden (y, v).
// Solución exacta conocida: vuelve al punto de partida tras 2π.
const oscillator = (y: Float64Array, out: Float64Array) => {
  out[0] = y[1];
  out[1] = -y[0];
};

function errorAfterOnePeriod(steps: number): number {
  const y = Float64Array.from([1, 0]);
  const step = createRK4(2, oscillator);
  const h = (2 * Math.PI) / steps;
  for (let i = 0; i < steps; i++) step(y, h);
  return Math.hypot(y[0] - 1, y[1]);
}

describe("createRK4", () => {
  it("devuelve el oscilador armónico a su estado inicial tras un periodo", () => {
    expect(errorAfterOnePeriod(1000)).toBeLessThan(1e-10);
  });

  it("es de orden 4: dividir el paso entre 2 reduce el error ~16×", () => {
    const ratio = errorAfterOnePeriod(100) / errorAfterOnePeriod(200);
    expect(ratio).toBeGreaterThan(14);
    expect(ratio).toBeLessThan(18);
  });

  it("integra en el sitio sin tocar otros buffers", () => {
    const y = Float64Array.from([1, 0]);
    const copy = Float64Array.from(y);
    createRK4(2, oscillator)(y, 0.1);
    expect(y).not.toEqual(copy);
    expect(copy).toEqual(Float64Array.from([1, 0]));
  });
});
