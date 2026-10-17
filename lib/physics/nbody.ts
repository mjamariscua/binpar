import { STRIDE, type BodyInit, type GravitySystem, type StateVector } from "./types";

export function bodyCount(state: StateVector): number {
  return state.length / STRIDE;
}

export function packState(bodies: readonly BodyInit[]): StateVector {
  const state = new Float64Array(bodies.length * STRIDE);
  bodies.forEach(({ position, velocity }, i) => {
    state.set([position.x, position.y, velocity.x, velocity.y], i * STRIDE);
  });
  return state;
}

/**
 * Derivada temporal del estado para N cuerpos bajo gravedad newtoniana:
 * d(x, y)/dt = (vx, vy) y d(vx, vy)/dt = Σⱼ G·mⱼ·(rⱼ − rᵢ) / |rⱼ − rᵢ|³.
 *
 * Cada par se calcula una sola vez y se aplica a ambos cuerpos con signo
 * opuesto (tercera ley de Newton): la mitad de raíces cuadradas que el bucle
 * ingenuo, y el momento lineal total se conserva por construcción.
 *
 * Escribe en `out` (misma longitud que `state`) y no reserva memoria: se llama
 * cuatro veces por paso de RK4, cientos de miles de veces por órbita.
 */
export function gravityDerivative(
  system: GravitySystem,
  state: StateVector,
  out: StateVector,
): void {
  const { G, masses } = system;
  const eps2 = (system.softening ?? 0) ** 2;
  const n = masses.length;

  for (let i = 0; i < n; i++) {
    const o = i * STRIDE;
    out[o] = state[o + 2];
    out[o + 1] = state[o + 3];
    out[o + 2] = 0;
    out[o + 3] = 0;
  }

  for (let i = 0; i < n; i++) {
    const oi = i * STRIDE;
    for (let j = i + 1; j < n; j++) {
      const oj = j * STRIDE;
      const dx = state[oj] - state[oi];
      const dy = state[oj + 1] - state[oi + 1];
      const r2 = dx * dx + dy * dy + eps2;
      const g = G / (r2 * Math.sqrt(r2));
      // a_i apunta hacia j; a_j hacia i. Cada uno escala con la masa del otro.
      out[oi + 2] += masses[j] * g * dx;
      out[oi + 3] += masses[j] * g * dy;
      out[oj + 2] -= masses[i] * g * dx;
      out[oj + 3] -= masses[i] * g * dy;
    }
  }
}
