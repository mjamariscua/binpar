import { describe, expect, it } from "vitest";
import { nelderMead } from "@/lib/physics/nelder-mead";
import { parabolaMinimum } from "@/lib/physics/return-search";
import { PRESETS, explore, refine } from "./explorer";

describe("parabolaMinimum", () => {
  it("encuentra el mínimo exacto de una parábola muestreada en tres puntos", () => {
    // f(x) = (x − 0.3)² + 0.5 en x = −1, 0, 1
    const f = (x: number) => (x - 0.3) ** 2 + 0.5;
    const { value, offset } = parabolaMinimum(f(-1), f(0), f(1));
    expect(offset).toBeCloseTo(0.3, 12);
    expect(value).toBeCloseTo(0.5, 12);
  });
});

describe("nelderMead", () => {
  it("minimiza una función sin derivadas (valle de Rosenbrock)", () => {
    const rosenbrock = ([x, y]: readonly number[]) => (1 - x) ** 2 + 100 * (y - x * x) ** 2;
    const r = nelderMead(rosenbrock, [-1.2, 1], { step: 0.5, maxEvaluations: 2000, tolerance: 1e-16 });
    expect(r.point[0]).toBeCloseTo(1, 3);
    expect(r.point[1]).toBeCloseTo(1, 3);
  });
});

describe("explorador", () => {
  it("las órbitas conocidas vuelven casi exactamente a su estado inicial en su periodo", () => {
    for (const p of PRESETS.filter((p) => p.label === "Moth I" || p.label === "Figura de ocho")) {
      const r = explore(p.vx, p.vy, p.period * 1.05);
      expect(r.outcome).toBe("ok");
      expect(r.bestDistance).toBeLessThan(1e-5);
      expect(r.bestTime).toBeCloseTo(p.period, 4);
    }
  });

  it("unas condiciones cualesquiera no vuelven: la proximidad es grande", () => {
    const r = explore(0.2, 0.2, 20);
    expect(r.bestDistance > 1e-2 || r.outcome !== "ok").toBe(true);
  });

  it("refinar los 5 dígitos de la publicación original de Moth I mejora el retorno en órdenes de magnitud", () => {
    const r = refine(0.46444, 0.39606, 14.8939);
    expect(r.before).toBeGreaterThan(1e-4);
    expect(r.after).toBeLessThan(r.before / 100);
    // Y se acerca a los valores de Li & Liao (2017).
    expect(r.vx).toBeCloseTo(0.4644451728, 5);
    expect(r.vy).toBeCloseTo(0.3960600146, 5);
  });
});
