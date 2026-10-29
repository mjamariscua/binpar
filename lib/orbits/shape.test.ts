import { describe, expect, it } from "vitest";
import { precomputePeriod, stateAt } from "@/lib/physics/trajectory";
import { STRIDE } from "@/lib/physics/types";
import { ORBITS, getOrbit, initialStateOf } from "./catalog";
import { COLLISIONS, EULER_POINTS, canonicalTriangle, jacobi, middleBody, shapeCurve, shapePoint } from "./shape";

/** Estado con estas posiciones [x1, y1, x2, y2, x3, y3] y velocidades nulas: a la esfera solo le importan las posiciones. */
function stateOf(...xy: number[]): Float64Array {
  const state = new Float64Array(3 * STRIDE);
  for (let b = 0; b < 3; b++) {
    state[b * STRIDE] = xy[b * 2];
    state[b * STRIDE + 1] = xy[b * 2 + 1];
  }
  return state;
}

/** La misma configuración trasladada, girada, escalada y, si se pide, reflejada. */
function moved(state: Float64Array, { dx = 0, dy = 0, angle = 0, scale = 1, mirror = false } = {}): Float64Array {
  const out = new Float64Array(state);
  for (let b = 0; b < 3; b++) {
    const x = state[b * STRIDE];
    const y = mirror ? -state[b * STRIDE + 1] : state[b * STRIDE + 1];
    out[b * STRIDE] = scale * (x * Math.cos(angle) - y * Math.sin(angle)) + dx;
    out[b * STRIDE + 1] = scale * (x * Math.sin(angle) + y * Math.cos(angle)) + dy;
  }
  return out;
}

const point = (state: Float64Array) => [...shapePoint(state, new Float64Array(3))];

/** Configuraciones al azar, reproducibles (generador congruencial con semilla fija). */
function randomStates(count: number): Float64Array[] {
  let seed = 12345;
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2 ** 31;
    return (seed / 2 ** 31) * 4 - 2;
  };
  return Array.from({ length: count }, () => stateOf(next(), next(), next(), next(), next(), next()));
}

const trajectoryOf = (orbit: (typeof ORBITS)[number]) =>
  precomputePeriod(orbit.system, initialStateOf(orbit), orbit.period, orbit.integration);

describe("esfera de formas: la cuenta", () => {
  it("cualquier triángulo cae sobre la esfera (módulo 1)", () => {
    for (const state of randomStates(50)) {
      expect(Math.hypot(...point(state))).toBeCloseTo(1, 12);
    }
  });

  it("no depende de dónde esté el triángulo, de su tamaño ni de su giro", () => {
    for (const state of randomStates(20)) {
      const other = point(moved(state, { dx: 3.2, dy: -1.1, angle: 2.3, scale: 0.37 }));
      point(state).forEach((v, i) => expect(other[i]).toBeCloseTo(v, 12));
    }
  });

  it("el reflejo pasa al otro hemisferio: z cambia de signo; x e y no", () => {
    for (const state of randomStates(20)) {
      const [x, y, z] = point(state);
      const [mx, my, mz] = point(moved(state, { mirror: true }));
      expect([mx, my]).toEqual([expect.closeTo(x, 12), expect.closeTo(y, 12)]);
      expect(mz).toBeCloseTo(-z, 12);
    }
  });

  it("ρ y λ guardan el tamaño: ρ² + λ² es la suma de distancias al centro de masas al cuadrado", () => {
    for (const state of randomStates(20)) {
      const [rx, ry, lx, ly] = jacobi(state, new Float64Array(4));
      const cx = (state[0] + state[STRIDE] + state[2 * STRIDE]) / 3;
      const cy = (state[1] + state[STRIDE + 1] + state[2 * STRIDE + 1]) / 3;
      let inertia = 0;
      for (let b = 0; b < 3; b++) inertia += (state[b * STRIDE] - cx) ** 2 + (state[b * STRIDE + 1] - cy) ** 2;
      expect(rx * rx + ry * ry + lx * lx + ly * ly).toBeCloseTo(inertia, 12);
    }
  });
});

describe("puntos especiales", () => {
  const h = Math.sqrt(3);

  it("equilátero: polo norte si 1 → 2 → 3 gira en sentido antihorario; polo sur si horario", () => {
    expect(point(stateOf(-1, 0, 1, 0, 0, h))).toEqual([expect.closeTo(0, 12), expect.closeTo(0, 12), expect.closeTo(1, 12)]);
    expect(point(stateOf(-1, 0, 0, h, 1, 0))[2]).toBeCloseTo(-1, 12);
  });

  it("alineados: en el ecuador, en el arco del cuerpo que queda en medio", () => {
    for (const [xs, middle] of [
      [[-1, 0.3, 2], 1],
      [[0.5, -2, -0.4], 2],
      [[0, 1, -3], 0],
    ] as const) {
      const [x, y, z] = point(stateOf(xs[0], 0, xs[1], 0, xs[2], 0));
      expect(z).toBeCloseTo(0, 12);
      expect(middleBody(x, y)).toBe(middle);
    }
  });

  it("los tres choques de dos cuerpos: en el ecuador, a 120° unos de otros", () => {
    const positions = (a: number, b: number) => {
      const xy = [0, 0, 0, 0, 0, 0];
      const third = [0, 1, 2].find((i) => i !== a && i !== b)!;
      xy[third * 2] = 1.7;
      xy[third * 2 + 1] = 0.4;
      return stateOf(...xy);
    };
    for (const { bodies, point: expected } of COLLISIONS) {
      point(positions(...bodies)).forEach((v, i) => expect(v).toBeCloseTo(expected[i], 12));
    }
    for (let i = 0; i < 3; i++) {
      const [a, b] = [COLLISIONS[i].point, COLLISIONS[(i + 1) % 3].point];
      expect(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]).toBeCloseTo(-0.5, 12);
    }
  });

  it("puntos de Euler: el cuerpo en medio, en el punto medio; son los antípodas de los choques de los otros dos", () => {
    for (const { middle, point: expected } of EULER_POINTS) {
      const xy = [0, 0, 0, 0, 0, 0];
      const [a, b] = [0, 1, 2].filter((i) => i !== middle);
      xy[a * 2] = -1.3;
      xy[b * 2] = 1.3;
      point(stateOf(...xy)).forEach((v, i) => expect(v).toBeCloseTo(expected[i], 12));
      const collision = COLLISIONS.find((c) => !c.bodies.includes(middle))!.point;
      expected.forEach((v, i) => expect(v).toBeCloseTo(-collision[i], 12));
      expect(middleBody(expected[0], expected[1])).toBe(middle);
    }
  });
});

describe.each(ORBITS)("$name en la esfera", (orbit) => {
  const curve = shapeCurve(trajectoryOf(orbit));
  const n = curve.length / 3;

  it("la curva cierra tras un periodo", () => {
    const gap = Math.hypot(curve[0] - curve[(n - 1) * 3], curve[1] - curve[(n - 1) * 3 + 1], curve[2] - curve[(n - 1) * 3 + 2]);
    // Medido: como mucho 7,8e-8 (Yin-Yang), el error de cierre del periodo visto en la esfera.
    expect(gap).toBeLessThan(1e-7);
  });

  it("nunca toca un choque de dos cuerpos", () => {
    let closest = Infinity;
    for (let k = 0; k < n; k++) {
      for (const { point: p } of COLLISIONS) {
        closest = Math.min(closest, Math.hypot(curve[k * 3] - p[0], curve[k * 3 + 1] - p[1], curve[k * 3 + 2] - p[2]));
      }
    }
    // Medido: Yin-Yang pasa a 1,2e-2 del choque 2–3 y Butterfly a 1,5e-2 del 1–3; la figura de ocho, a 0,69.
    expect(closest).toBeGreaterThan(1e-2);
  });
});

describe("las órbitas del catálogo", () => {
  it("Lagrange es un punto quieto en el polo norte: el triángulo gira, pero nunca cambia de forma", () => {
    const curve = shapeCurve(trajectoryOf(getOrbit("lagrange")!));
    for (let k = 0; k < curve.length; k += 3) {
      expect(curve[k + 2]).toBeCloseTo(1, 12);
    }
  });

  it("las otras cinco arrancan en el punto de Euler del cuerpo 3 y cruzan el ecuador (teorema de Montgomery)", () => {
    for (const orbit of ORBITS.filter((o) => o.slug !== "lagrange")) {
      const curve = shapeCurve(trajectoryOf(orbit));
      [0, -1, 0].forEach((v, i) => expect(curve[i]).toBeCloseTo(v, 12));
      let crossings = 0;
      for (let k = 3; k < curve.length; k += 3) if (curve[k - 1] * curve[k + 2] < 0) crossings++;
      expect(crossings, orbit.slug).toBeGreaterThan(0);
    }
  });
});

describe("la forma ahora (canonicalTriangle)", () => {
  const triangle = (state: Float64Array) => [...canonicalTriangle(state, new Float64Array(6))];

  it("no depende de dónde esté el triángulo, de su tamaño ni de su giro; el reflejo lo refleja", () => {
    for (const state of randomStates(20)) {
      const base = triangle(state);
      triangle(moved(state, { dx: -2, dy: 5, angle: -1.2, scale: 3.1 })).forEach((v, i) => expect(v).toBeCloseTo(base[i], 12));
      triangle(moved(state, { mirror: true })).forEach((v, i) => expect(v).toBeCloseTo(i % 2 ? -base[i] : base[i], 12));
    }
  });

  it("tamaño 1, centrado, y el lado 1–2 horizontal con el cuerpo 1 a la izquierda", () => {
    for (const state of randomStates(20)) {
      const [x1, y1, x2, y2, x3, y3] = triangle(state);
      expect(x1 ** 2 + y1 ** 2 + x2 ** 2 + y2 ** 2 + x3 ** 2 + y3 ** 2).toBeCloseTo(1, 12);
      expect(x1 + x2 + x3).toBeCloseTo(0, 12);
      expect(y1 + y2 + y3).toBeCloseTo(0, 12);
      expect(y2 - y1).toBeCloseTo(0, 12);
      expect(x2).toBeGreaterThan(x1);
    }
  });

  it("en t = 0, las órbitas de 2013 dan su configuración inicial: 1 y 2 a los lados, 3 en medio", () => {
    const s = 1 / Math.SQRT2;
    for (const slug of ["butterfly-i", "moth-i", "goggles", "yin-yang-i"]) {
      const orbit = getOrbit(slug)!;
      triangle(initialStateOf(orbit)).forEach((v, i) => expect(v).toBeCloseTo([-s, 0, s, 0, 0, 0][i], 12));
    }
  });

  it("en Lagrange no cambia en todo el periodo", () => {
    const traj = trajectoryOf(getOrbit("lagrange")!);
    const state = new Float64Array(3 * STRIDE);
    const first = triangle(stateAt(traj, 0, state));
    for (let i = 1; i < 64; i++) {
      triangle(stateAt(traj, (traj.period * i) / 64, state)).forEach((v, j) => expect(v).toBeCloseTo(first[j], 9));
    }
  });
});
