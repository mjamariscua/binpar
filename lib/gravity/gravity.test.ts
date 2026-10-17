import { describe, expect, it } from "vitest";
import { clampSymbol, explainChange, forceRatio } from "./formula";
import { CIRCULAR_KMS, ESCAPE_KMS, SCENARIOS, predictLaunch } from "./sandbox";

describe("fórmula relativa", () => {
  it("con todo a 1 es la fuerza Tierra–Luna de hoy; doblar r la divide por 4", () => {
    expect(forceRatio({ m1: 1, m2: 1, r: 1 })).toBe(1);
    expect(forceRatio({ m1: 1, m2: 1, r: 2 })).toBe(0.25);
    expect(forceRatio({ m1: 2, m2: 3, r: 1 })).toBe(6);
  });

  it("limita cada símbolo a su rango", () => {
    expect(clampSymbol("r", 100)).toBe(4);
    expect(clampSymbol("m1", 0)).toBe(0.1);
  });

  it("explica el efecto de cada cambio en una frase", () => {
    expect(explainChange("r", 1, 2)).toBe(
      "Has multiplicado la distancia (r) por 2: la fuerza se divide por 2² = 4.",
    );
    expect(explainChange("m1", 2, 1)).toBe(
      "Has dividido la masa de la Tierra (m₁) por 2: la fuerza también se ha dividido por 2.",
    );
  });
});

describe("sandbox orbital", () => {
  it("a un radio terrestre de altura: 5.59 km/s para órbita circular y 7.91 km/s para escapar", () => {
    expect(CIRCULAR_KMS).toBeCloseTo(5.59, 2);
    expect(ESCAPE_KMS).toBeCloseTo(7.905, 3);
  });

  it("cada escenario produce la órbita que anuncia su nombre", () => {
    const kind = (name: keyof typeof SCENARIOS) =>
      predictLaunch(SCENARIOS[name].speedKms, SCENARIOS[name].angleDeg).kind;
    expect(kind("circular")).toBe("circular");
    expect(kind("eliptica")).toBe("eliptica");
    expect(kind("escape")).toBe("escape");
    expect(kind("caida")).toBe("choque");
  });
});
