import { Euler, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { precomputePeriod, stateAt } from "@/lib/physics/trajectory";
import { STRIDE } from "@/lib/physics/types";
import { boundsSide } from "./braid";
import { ORBITS, getOrbit, initialStateOf } from "./catalog";
import { orbitBounds } from "./geometry";
import {
  BODY_RADIUS_PER_SIDE,
  EYE_HEIGHT_PER_SIDE,
  HOLD_PER_SIDE,
  PITCH_LIMIT,
  baseYaw,
  bearing,
  centerOfMass,
  clampPitch,
  eyePosition,
  followYaw,
  formatViewpoint,
  gazeTargetYaw,
  initialYaw,
  lookVector,
  parseViewpoint,
  planeToWorld,
  wrapAngle,
  type Follow,
} from "./inside";

const SAMPLES = 64;
const trajectoryOf = (slug: string) => {
  const orbit = getOrbit(slug)!;
  return { orbit, traj: precomputePeriod(orbit.system, initialStateOf(orbit), orbit.period, orbit.integration) };
};

describe.each(ORBITS)("$name: desde dentro", (orbit) => {
  const traj = precomputePeriod(orbit.system, initialStateOf(orbit), orbit.period, orbit.integration);
  const state = new Float64Array(traj.bodyCount * STRIDE);
  const com = new Float64Array(2);

  it("el centro de masas está en el origen en todo el periodo: el ojo de «Centro» no se mueve", () => {
    for (let i = 0; i < SAMPLES; i++) {
      stateAt(traj, (traj.period * i) / SAMPLES, state);
      centerOfMass(state, orbit.system.masses, com);
      expect(Math.hypot(com[0], com[1])).toBeLessThan(1e-9);
    }
  });

  it("el ojo va siempre por encima del plano, lejos de cualquier cuerpo", () => {
    const side = boundsSide(orbitBounds(traj));
    const eye = new Float64Array(3);
    const body = new Float64Array(3);
    for (const from of [0, 1, 2, "centro"] as const) {
      for (let i = 0; i < SAMPLES; i++) {
        stateAt(traj, (traj.period * i) / SAMPLES, state);
        eyePosition(state, orbit.system.masses, from, side * EYE_HEIGHT_PER_SIDE, eye);
        for (let b = 0; b < 3; b++) {
          planeToWorld(state[b * STRIDE], state[b * STRIDE + 1], 0, body);
          // El ojo nunca a menos de 3 radios de un cuerpo.
          expect(Math.hypot(eye[0] - body[0], eye[1] - body[1], eye[2] - body[2])).toBeGreaterThan(
            3 * BODY_RADIUS_PER_SIDE * side,
          );
        }
      }
    }
  });
});

describe("movimiento relativo, visto desde el cuerpo 1 mirando al centro", () => {
  /** Ángulo de cada uno de los otros dos cuerpos respecto a la mirada, y su distancia, en cada instante. */
  function relativeView(slug: string) {
    const { orbit, traj } = trajectoryOf(slug);
    const state = new Float64Array(traj.bodyCount * STRIDE);
    const scratch = new Float64Array(2);
    const side = boundsSide(orbitBounds(traj));
    const out: { angles: number[]; distances: number[] }[] = [];
    for (let i = 0; i < SAMPLES; i++) {
      stateAt(traj, (traj.period * i) / SAMPLES, state);
      const gaze = gazeTargetYaw(state, orbit.system.masses, 0, side * HOLD_PER_SIDE, scratch);
      if (gaze === null) continue;
      const [x, y] = [state[0], state[1]];
      out.push({
        angles: [1, 2].map((b) => wrapAngle(bearing(x, y, state[b * STRIDE], state[b * STRIDE + 1]) - gaze)),
        distances: [1, 2].map((b) => Math.hypot(state[b * STRIDE] - x, state[b * STRIDE + 1] - y)),
      });
    }
    return out;
  }

  it("Lagrange: los otros dos parecen quietos, a ±30° y siempre a la misma distancia (el triángulo gira contigo)", () => {
    const view = relativeView("lagrange");
    expect(view).toHaveLength(SAMPLES);
    for (const { angles, distances } of view) {
      expect(Math.abs(angles[0])).toBeCloseTo(Math.PI / 6, 6);
      expect(Math.abs(angles[1])).toBeCloseTo(Math.PI / 6, 6);
      expect(distances[0]).toBeCloseTo(view[0].distances[0], 6);
      expect(distances[1]).toBeCloseTo(view[0].distances[1], 6);
    }
  });

  it("figura de ocho: los otros dos se mueven a tu alrededor (más de 45° en el periodo)", () => {
    const angles = relativeView("figura-de-ocho").map((v) => v.angles[0]);
    expect(Math.max(...angles) - Math.min(...angles)).toBeGreaterThan(Math.PI / 4);
  });
});

describe("gazeTargetYaw", () => {
  it("se retiene (null) cuando el cuerpo está en el centro: el cuerpo 3 en t = 0 en el ocho y en las de 2013", () => {
    for (const slug of ["figura-de-ocho", "butterfly-i", "goggles", "moth-i", "yin-yang-i"]) {
      const { orbit, traj } = trajectoryOf(slug);
      const state = new Float64Array(traj.bodyCount * STRIDE);
      stateAt(traj, 0, state);
      const side = boundsSide(orbitBounds(traj));
      expect(gazeTargetYaw(state, orbit.system.masses, 2, side * HOLD_PER_SIDE, new Float64Array(2))).toBeNull();
    }
  });

  it("mira hacia el centro de masas: desde (1, 0) hacia el origen es π", () => {
    const state = Float64Array.from([1, 0, 0, 0, -1, 0, 0, 0, 0, 2, 0, 0]);
    // Centro de masas de (1, 0), (−1, 0), (0, 2): (0, 2/3).
    expect(gazeTargetYaw(state, [1, 1, 1], 0, 0.01, new Float64Array(2))).toBeCloseTo(bearing(1, 0, 0, 2 / 3), 12);
  });
});

describe("followYaw", () => {
  it("enganchada, sigue al objetivo exactamente, también al cruzar ±π", () => {
    expect(followYaw({ yaw: 0.1, locked: true }, 0.2, 1 / 60)).toEqual({ yaw: 0.2, locked: true });
    const crossed = followYaw({ yaw: 3.1, locked: true }, -3.1, 1 / 60);
    expect(crossed).toEqual({ yaw: -3.1, locked: true });
  });

  it("en retención se queda quieta y se desengancha", () => {
    expect(followYaw({ yaw: 1, locked: true }, null, 1 / 60)).toEqual({ yaw: 1, locked: false });
  });

  it("tras media vuelta del objetivo gira suave y siempre hacia él, hasta engancharse", () => {
    let f: Follow = { yaw: 0, locked: true };
    let remaining = Math.PI - 1e-3;
    let frames = 0;
    while (!f.locked || frames === 0) {
      f = followYaw(f, Math.PI - 1e-3, 1 / 60);
      const now = Math.abs(wrapAngle(Math.PI - 1e-3 - f.yaw));
      expect(now).toBeLessThanOrEqual(remaining + 1e-12);
      // Nunca un salto de más de un 4 % de la media vuelta en un fotograma.
      expect(remaining - now).toBeLessThan(0.04 * Math.PI);
      remaining = now;
      frames++;
      if (frames > 1000) throw new Error("no se engancha");
    }
    expect(frames).toBeGreaterThan(30);
  });
});

describe("mirada al llegar y en cada fotograma", () => {
  it("desde el centro se empieza mirando al cuerpo 1", () => {
    const { orbit, traj } = trajectoryOf("lagrange");
    const state = new Float64Array(traj.bodyCount * STRIDE);
    stateAt(traj, 0, state);
    expect(initialYaw(state, orbit.system.masses, "centro", 0.01, new Float64Array(2))).toBeCloseTo(
      bearing(0, 0, state[0], state[1]),
      9,
    );
  });

  it("el cuerpo 3 arranca en el centro: la mirada inicial es la que tendrá al alejarse (sin media vuelta)", () => {
    const { orbit, traj } = trajectoryOf("figura-de-ocho");
    const state = new Float64Array(traj.bodyCount * STRIDE);
    const scratch = new Float64Array(2);
    const hold = boundsSide(orbitBounds(traj)) * HOLD_PER_SIDE;
    stateAt(traj, 0, state);
    const start = initialYaw(state, orbit.system.masses, 2, hold, scratch);
    let target: number | null = null;
    for (let t = 0; target === null; t += traj.period / 2000) {
      stateAt(traj, t, state);
      target = gazeTargetYaw(state, orbit.system.masses, 2, hold, scratch);
    }
    expect(Math.abs(wrapAngle(target - start))).toBeLessThan((5 * Math.PI) / 180);
  });

  it("«Mirada fija» no cambia mientras el cuerpo se mueve; «Al centro» lo sigue (Lagrange)", () => {
    const { orbit, traj } = trajectoryOf("lagrange");
    const state = new Float64Array(traj.bodyCount * STRIDE);
    const scratch = new Float64Array(2);
    const dt = traj.period / SAMPLES;
    stateAt(traj, 0, state);
    const start = initialYaw(state, orbit.system.masses, 0, 0.03, scratch);
    let fixed: Follow | null = null;
    let follow: Follow | null = null;
    for (let i = 0; i < SAMPLES; i++) {
      stateAt(traj, i * dt, state);
      const input = { state, masses: orbit.system.masses, from: 0, hold: 0.03 } as const;
      fixed = baseYaw(fixed, { ...input, gaze: "fija" }, dt, scratch);
      follow = baseYaw(follow, { ...input, gaze: "centro" }, dt, scratch);
      expect(fixed.yaw).toBe(start);
      expect(follow.yaw).toBeCloseTo(gazeTargetYaw(state, orbit.system.masses, 0, 0.03, scratch)!, 9);
    }
  });

  it("con tau = 0 (reducir movimiento) salta al objetivo, también con dt = 0", () => {
    expect(followYaw({ yaw: 0, locked: false }, 2, 0, { tau: 0 })).toEqual({ yaw: 2, locked: true });
  });
});

describe("cámara", () => {
  it("planeToWorld es el giro −π/2 en X del grupo de la escena", () => {
    for (const [x, y, lift] of [[1, 2, 0], [-0.5, 0.25, 0.3]]) {
      const v = new Vector3(x, y, lift).applyEuler(new Euler(-Math.PI / 2, 0, 0));
      const w = planeToWorld(x, y, lift, new Float64Array(3));
      expect(w[0]).toBeCloseTo(v.x, 12);
      expect(w[1]).toBeCloseTo(v.y, 12);
      expect(w[2]).toBeCloseTo(v.z, 12);
    }
  });

  it("lookVector es unitario y +π/2 de yaw lleva la mirada de +x a +y de la órbita", () => {
    const v = lookVector(0.7, -0.2, new Float64Array(3));
    expect(Math.hypot(v[0], v[1], v[2])).toBeCloseTo(1, 12);
    const toY = lookVector(Math.PI / 2, 0, new Float64Array(3));
    const expected = planeToWorld(0, 1, 0, new Float64Array(3));
    expect(toY[0]).toBeCloseTo(expected[0], 12);
    expect(toY[2]).toBeCloseTo(expected[2], 12);
  });

  it("clampPitch limita la inclinación a ±80°", () => {
    expect(clampPitch(2)).toBe(PITCH_LIMIT);
    expect(clampPitch(-2)).toBe(-PITCH_LIMIT);
    expect(clampPitch(0.3)).toBe(0.3);
  });
});

describe("URL", () => {
  it("punto de vista: ida y vuelta, y valores desconocidos por defecto", () => {
    for (const v of [0, 1, 2, "centro"] as const) expect(parseViewpoint(formatViewpoint(v))).toBe(v);
    expect(parseViewpoint("7")).toBe("centro");
    expect(parseViewpoint(null)).toBe("centro");
  });
});
