import { STRIDE, type GravitySystem, type StateVector, type Vec2 } from "./types";

/**
 * Magnitudes que la gravedad newtoniana conserva exactamente. El integrador no
 * las conserva exactamente, así que medir cuánto se desvían es la forma más
 * directa de saber si una simulación es fiable (y es lo que muestran los tests
 * y el panel de detalle de cada órbita).
 */

/** Energía total: cinética Σ ½mv² más potencial −Σ G·mᵢ·mⱼ/rᵢⱼ (con el mismo ε que la dinámica). */
export function totalEnergy(system: GravitySystem, state: StateVector): number {
  const { G, masses } = system;
  const eps2 = (system.softening ?? 0) ** 2;
  const n = masses.length;
  let kinetic = 0;
  let potential = 0;
  for (let i = 0; i < n; i++) {
    const o = i * STRIDE;
    kinetic += 0.5 * masses[i] * (state[o + 2] ** 2 + state[o + 3] ** 2);
    for (let j = i + 1; j < n; j++) {
      const p = j * STRIDE;
      const r = Math.sqrt((state[p] - state[o]) ** 2 + (state[p + 1] - state[o + 1]) ** 2 + eps2);
      potential -= (G * masses[i] * masses[j]) / r;
    }
  }
  return kinetic + potential;
}

/** Componente z del momento angular total respecto al origen: Σ m·(x·vy − y·vx). */
export function angularMomentum(system: GravitySystem, state: StateVector): number {
  let l = 0;
  system.masses.forEach((m, i) => {
    const o = i * STRIDE;
    l += m * (state[o] * state[o + 3] - state[o + 1] * state[o + 2]);
  });
  return l;
}

export function linearMomentum(system: GravitySystem, state: StateVector): Vec2 {
  let x = 0;
  let y = 0;
  system.masses.forEach((m, i) => {
    x += m * state[i * STRIDE + 2];
    y += m * state[i * STRIDE + 3];
  });
  return { x, y };
}

export function centerOfMass(system: GravitySystem, state: StateVector): Vec2 {
  let x = 0;
  let y = 0;
  let total = 0;
  system.masses.forEach((m, i) => {
    x += m * state[i * STRIDE];
    y += m * state[i * STRIDE + 1];
    total += m;
  });
  return { x: x / total, y: y / total };
}

/** Distancia euclídea entre dos estados en el espacio de fases (posiciones y velocidades). */
export function phaseSpaceDistance(a: StateVector, b: StateVector): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

/** Mayor distancia entre la posición inicial y final de cualquier cuerpo. */
export function maxPositionGap(a: StateVector, b: StateVector): number {
  let max = 0;
  for (let o = 0; o < a.length; o += STRIDE) {
    max = Math.max(max, Math.hypot(a[o] - b[o], a[o + 1] - b[o + 1]));
  }
  return max;
}
