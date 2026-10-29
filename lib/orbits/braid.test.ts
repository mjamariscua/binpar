import { describe, expect, it } from "vitest";
import { packState } from "@/lib/physics/nbody";
import { precomputePeriod } from "@/lib/physics/trajectory";
import {
  BRAID_PERIODS,
  BRAID_VIEWS,
  MIN_SEGMENT_PER_SIDE,
  boundsSide,
  buildBraid,
  cameraDirection,
  nextLap,
  parseView,
  projectPoint,
  projectStrand,
  sliceFrame,
  sliceX,
} from "./braid";
import { ORBITS, initialStateOf } from "./catalog";

// Binaria circular: los dos cuerpos recorren la circunferencia unidad (la misma que en geometry.test).
const circular = precomputePeriod(
  { G: 1, masses: [1, 1] },
  packState([
    { position: { x: -1, y: 0 }, velocity: { x: 0, y: -0.5 } },
    { position: { x: 1, y: 0 }, velocity: { x: 0, y: 0.5 } },
  ]),
  4 * Math.PI,
  { intervals: 360, substeps: 8 },
);

describe("buildBraid", () => {
  it("sin diezmar: dos periodos sin repetir la muestra de t = T", () => {
    const braid = buildBraid(circular);
    expect(braid.strands).toHaveLength(2);
    expect(braid.strands[0].length).toBe((BRAID_PERIODS * 360 + 1) * 3);
  });

  it("el eje del tiempo crece estrictamente, de 0 a periodos × largo", () => {
    const { strands, lengthPerPeriod } = buildBraid(circular);
    const s = strands[1];
    expect(s[0]).toBe(0);
    for (let i = 3; i < s.length; i += 3) expect(s[i]).toBeGreaterThan(s[i - 3]);
    expect(s[s.length - 3]).toBeCloseTo(BRAID_PERIODS * lengthPerPeriod, 5);
    // La muestra k·intervals cae justo en un múltiplo del largo de un periodo.
    expect(s[360 * 3]).toBeCloseTo(lengthPerPeriod, 5);
  });

  it("Z es la x de la órbita e Y su y: el cuerpo 1 empieza en (1, 0)", () => {
    const s = buildBraid(circular).strands[1];
    expect([s[1], s[2]]).toEqual([0, 1]);
  });

  it("el largo de un periodo es el lado mayor de la órbita, y escala con ella", () => {
    const braid = buildBraid(circular);
    expect(braid.lengthPerPeriod).toBeCloseTo(boundsSide(braid.bounds), 12);
    expect(braid.lengthPerPeriod).toBeCloseTo(2, 3);
    expect(buildBraid(circular, { lengthPerPeriod: 5 }).lengthPerPeriod).toBe(5);
  });

  it("al diezmar conserva el primer y el último punto y respeta la distancia mínima", () => {
    const full = buildBraid(circular).strands[0];
    const thin = buildBraid(circular, { minSegment: 0.2 }).strands[0];
    expect(thin.length).toBeLessThan(full.length);
    expect(Array.from(thin.slice(0, 3))).toEqual(Array.from(full.slice(0, 3)));
    expect(Array.from(thin.slice(-3))).toEqual(Array.from(full.slice(-3)));
    for (let i = 3; i < thin.length - 3; i += 3) {
      const d = Math.hypot(thin[i] - thin[i - 3], thin[i + 1] - thin[i - 2], thin[i + 2] - thin[i - 1]);
      expect(d).toBeGreaterThanOrEqual(0.2 - 1e-6);
    }
  });
});

describe.each(ORBITS)("$name: la trenza se repite", (orbit) => {
  const traj = precomputePeriod(orbit.system, initialStateOf(orbit), orbit.period, orbit.integration);
  const braid = buildBraid(traj);

  it("cada hebra vuelve a su posición inicial en T y en 2T (< 1e-6)", () => {
    for (const s of braid.strands) {
      const atT = traj.intervals * 3;
      const at2T = s.length - 3;
      for (const i of [atT, at2T]) {
        expect(Math.hypot(s[i + 1] - s[1], s[i + 2] - s[2])).toBeLessThan(1e-6);
      }
    }
  });

  it("con el diezmado de la escena, cabe en el presupuesto de vértices", () => {
    const thin = buildBraid(traj, { minSegment: boundsSide(braid.bounds) * MIN_SEGMENT_PER_SIDE });
    const vertices = thin.strands.reduce((n, s) => n + s.length / 3, 0);
    // 3 hebras × 2 periodos: Yin-Yang tiene 8192 muestras por periodo sin diezmar (≈ 49 000 en total).
    expect(vertices).toBeLessThan(10_000);
  });
});

describe("sliceX / nextLap", () => {
  it("coloca el instante en la vuelta correcta", () => {
    expect(sliceX(0, 10, 0, 2)).toBe(0);
    expect(sliceX(5, 10, 0, 2)).toBe(1);
    expect(sliceX(5, 10, 1, 2)).toBe(3);
  });

  it("tras la última vuelta, vuelve a la primera", () => {
    expect(nextLap(0)).toBe(1);
    expect(nextLap(BRAID_PERIODS - 1)).toBe(0);
  });
});

describe("cámara y proyección", () => {
  it("la dirección de la cámara es unitaria en todas las vistas", () => {
    for (const view of Object.values(BRAID_VIEWS)) {
      expect(Math.hypot(...cameraDirection(view))).toBeCloseTo(1, 12);
    }
  });

  it("«De frente» proyecta el plano de la órbita como la vista 2D: x a la derecha, y arriba", () => {
    const [right, up] = projectPoint(7, 0.25, -0.5, BRAID_VIEWS.frente);
    expect(right).toBeCloseTo(-0.5, 12);
    expect(up).toBeCloseTo(0.25, 12);
  });

  it("«Lateral» deja el tiempo a la derecha y la y de la órbita arriba", () => {
    const [right, up] = projectPoint(3, 0.5, 9, BRAID_VIEWS.lateral);
    expect(right).toBeCloseTo(3, 12);
    expect(up).toBeCloseTo(0.5, 12);
  });

  it("en perspectiva el tiempo sigue avanzando hacia la derecha", () => {
    const [a] = projectPoint(0, 0, 0, BRAID_VIEWS.perspectiva);
    const [b] = projectPoint(1, 0, 0, BRAID_VIEWS.perspectiva);
    expect(b).toBeGreaterThan(a);
  });

  it("projectStrand proyecta cada punto de la hebra", () => {
    const strand = buildBraid(circular).strands[0];
    const flat = projectStrand(strand, BRAID_VIEWS.lateral);
    expect(flat).toHaveLength((strand.length / 3) * 2);
    expect([flat[2], flat[3]]).toEqual(projectPoint(strand[3], strand[4], strand[5], BRAID_VIEWS.lateral));
  });

  it("sliceFrame da las cuatro esquinas del recorrido en ese instante", () => {
    const frame = sliceFrame({ minX: -1, maxX: 2, minY: -3, maxY: 4 }, 5);
    expect(frame).toHaveLength(12);
    for (let i = 0; i < 12; i += 3) expect(frame[i]).toBe(5);
  });
});

describe("parseView", () => {
  it("solo «3d» activa la trenza; cualquier otro valor es la vista 2D", () => {
    expect(parseView("3d")).toBe("3d");
    expect(parseView("2d")).toBe("2d");
    expect(parseView(null)).toBe("2d");
    expect(parseView("trenza")).toBe("2d");
  });
});
