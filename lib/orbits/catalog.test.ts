import { describe, expect, it } from "vitest";
import {
  angularMomentum,
  linearMomentum,
  maxPositionGap,
  phaseSpaceDistance,
  totalEnergy,
} from "@/lib/physics/invariants";
import { gravityDerivative, packState } from "@/lib/physics/nbody";
import {
  finalState,
  initialState,
  precomputePeriod,
  sampleState,
  stateAt,
} from "@/lib/physics/trajectory";
import {
  ORBITS,
  getOrbit,
  initialStateOf,
  isoscelesCollinear,
  lagrangeEquilateral,
} from "./catalog";

describe("catálogo", () => {
  it("contiene las seis soluciones del enunciado, en su orden", () => {
    expect(ORBITS.map((o) => o.name)).toEqual([
      "Lagrange",
      "Figura de ocho",
      "Butterfly I",
      "Goggles",
      "Moth I",
      "Yin-Yang I",
    ]);
    expect(new Set(ORBITS.map((o) => o.slug)).size).toBe(6);
  });

  it("busca por slug y devuelve undefined si no existe", () => {
    expect(getOrbit("moth-i")?.name).toBe("Moth I");
    expect(getOrbit("no-existe")).toBeUndefined();
  });

  it.each(ORBITS)("$name: momento lineal total nulo (centro de masas quieto)", (orbit) => {
    const p = linearMomentum(orbit.system, initialStateOf(orbit));
    expect(Math.hypot(p.x, p.y)).toBeLessThan(1e-12);
  });

  it.each(ORBITS.filter((o) => o.slug !== "lagrange"))(
    "$name: momento angular nulo, como exigen sus fuentes",
    (orbit) => {
      expect(Math.abs(angularMomentum(orbit.system, initialStateOf(orbit)))).toBeLessThan(1e-12);
    },
  );
});

describe("Lagrange (derivación)", () => {
  it("ω² = 3Gm/L³ es exactamente la aceleración centrípeta que da la gravedad", () => {
    const side = 2.7;
    const { bodies, omega } = lagrangeEquilateral(side);
    const out = new Float64Array(12);
    gravityDerivative({ G: 1, masses: [1, 1, 1] }, packState(bodies), out);
    bodies.forEach(({ position }, i) => {
      // La aceleración gravitatoria debe ser −ω²·r (centrípeta) en cada vértice.
      expect(out[i * 4 + 2]).toBeCloseTo(-(omega ** 2) * position.x, 12);
      expect(out[i * 4 + 3]).toBeCloseTo(-(omega ** 2) * position.y, 12);
    });
    expect(omega ** 2).toBeCloseTo(3 / side ** 3, 14);
  });
});

describe.each(ORBITS)("$name: un periodo precomputado", (orbit) => {
  const traj = precomputePeriod(orbit.system, initialStateOf(orbit), orbit.period, orbit.integration);
  const e0 = totalEnergy(orbit.system, initialState(traj));

  it("vuelve al estado inicial tras T (cierre ≤ 1e-7 en el espacio de fases)", () => {
    expect(phaseSpaceDistance(initialState(traj), finalState(traj))).toBeLessThan(1e-7);
  });

  it("conserva la energía en todo el periodo (|ΔE/E| ≤ 1e-7)", () => {
    let drift = 0;
    for (let k = 0; k <= traj.intervals; k++) {
      drift = Math.max(drift, Math.abs(totalEnergy(orbit.system, sampleState(traj, k)) / e0 - 1));
    }
    expect(drift).toBeLessThan(1e-7);
  });

  it("interpola entre muestras con error ≤ 1e-3 (menos de medio píxel)", () => {
    // Referencia: misma integración (mismo paso h) guardando también los puntos medios.
    const { intervals, substeps } = orbit.integration;
    const fine = precomputePeriod(orbit.system, initialStateOf(orbit), orbit.period, {
      intervals: intervals * 2,
      substeps: substeps / 2,
    });
    const out = new Float64Array(12);
    let worst = 0;
    for (let k = 0; k < intervals; k++) {
      stateAt(traj, (k + 0.5) * traj.sampleDt, out);
      worst = Math.max(worst, maxPositionGap(out, sampleState(fine, 2 * k + 1)));
    }
    expect(worst).toBeLessThan(1e-3);
  });
});

/**
 * Prueba de por qué no usamos los valores «a 15 dígitos» de arXiv:1312.6796
 * (Tabla I, comunicados por Šuvakov): integrados hasta el periodo que publican,
 * no cierran; el retorno real ocurre en el periodo que da Li & Liao (2017).
 */
describe("procedencia: arXiv:1312.6796 frente a Li & Liao (2017)", () => {
  const closureAt = (vx: number, vy: number, period: number) => {
    const initial = packState(isoscelesCollinear(vx, vy));
    const traj = precomputePeriod({ G: 1, masses: [1, 1, 1] }, initial, period, {
      intervals: 4096,
      substeps: 128,
    });
    return maxPositionGap(initial, finalState(traj));
  };

  it("Butterfly I: con su T publicado (6.23564…) el hueco es visible (> 1e-4)", () => {
    expect(closureAt(0.306892758965492, 0.125506782829762, 6.23564136316479)).toBeGreaterThan(1e-4);
  });

  it("Butterfly I: las mismas CI sí vuelven en el T de Li & Liao (6.23467…)", () => {
    expect(closureAt(0.306892758965492, 0.125506782829762, 6.2346748391)).toBeLessThan(1e-5);
  });

  it("Goggles: con su T publicado (10.46682…) el hueco es visible (> 1e-4)", () => {
    expect(closureAt(0.0833000564575194, 0.127889282226563, 10.4668176954385)).toBeGreaterThan(1e-4);
  });
});
