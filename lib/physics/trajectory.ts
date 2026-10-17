import { gravityDerivative } from "./nbody";
import { createRK4 } from "./rk4";
import { STRIDE, type GravitySystem, type StateVector } from "./types";

/**
 * Un periodo completo precomputado. La animación no integra en tiempo real:
 * indexa esta tabla con t mód T. Así no hay deriva acumulada (cada vuelta es
 * idéntica a la primera), el scrub hacia atrás es gratis y el coste de
 * integrar se paga una sola vez.
 *
 * Esto importa porque la mayoría de estas órbitas son inestables: integradas
 * sin fin, el error de redondeo crece exponencialmente y los cuerpos acaban
 * escapando tras ~10–20 periodos (Li & Liao, arXiv:1312.6796). Lo que se
 * enseña es el periodo verdadero, y su error de cierre se mide y se publica.
 */
export interface Trajectory {
  readonly bodyCount: number;
  readonly period: number;
  /** Intervalos guardados por periodo; hay `intervals + 1` muestras y la última está en t = T. */
  readonly intervals: number;
  /** Tiempo entre muestras consecutivas: T / intervals. */
  readonly sampleDt: number;
  /** Pasos de RK4 entre muestras guardadas (la precisión, independiente de la memoria). */
  readonly substeps: number;
  /** (intervals + 1) estados consecutivos de 4N valores cada uno. */
  readonly states: Float64Array;
}

export interface PrecomputeOptions {
  /** Muestras guardadas por periodo: resolución de la animación y del trazo. */
  readonly intervals: number;
  /** Pasos de integración por muestra: precisión física. */
  readonly substeps: number;
}

/**
 * Integra exactamente un periodo con paso h = T / (intervals · substeps), de
 * modo que la última muestra cae en t = T sin interpolar.
 */
export function precomputePeriod(
  system: GravitySystem,
  initial: StateVector,
  period: number,
  { intervals, substeps }: PrecomputeOptions,
): Trajectory {
  const dim = initial.length;
  const states = new Float64Array((intervals + 1) * dim);
  const y = Float64Array.from(initial);
  const step = createRK4(dim, (s, out) => gravityDerivative(system, s, out));
  const h = period / (intervals * substeps);

  states.set(y, 0);
  for (let k = 1; k <= intervals; k++) {
    for (let s = 0; s < substeps; s++) step(y, h);
    states.set(y, k * dim);
  }

  return {
    bodyCount: dim / STRIDE,
    period,
    intervals,
    sampleDt: period / intervals,
    substeps,
    states,
  };
}

/** Vista (sin copia) del estado guardado en la muestra k. */
export function sampleState(trajectory: Trajectory, k: number): StateVector {
  const dim = trajectory.bodyCount * STRIDE;
  return trajectory.states.subarray(k * dim, (k + 1) * dim);
}

export const initialState = (t: Trajectory): StateVector => sampleState(t, 0);
export const finalState = (t: Trajectory): StateVector => sampleState(t, t.intervals);

/** Lleva cualquier t (también negativo, al hacer scrub hacia atrás) a [0, T). */
export function wrapTime(t: number, period: number): number {
  return ((t % period) + period) % period;
}

/**
 * Estado en un instante arbitrario t, con t tomado módulo T.
 *
 * Entre dos muestras se usa interpolación cúbica de Hermite: además de las
 * posiciones conocemos las velocidades (su derivada exacta), así que la curva
 * es C¹ y el error es O(Δt⁴) en vez del O(Δt²) de interpolar linealmente. Eso
 * permite guardar pocas muestras sin que el movimiento se vea a saltos.
 */
export function stateAt(trajectory: Trajectory, t: number, out: StateVector): StateVector {
  const { intervals, sampleDt, states, bodyCount } = trajectory;
  const dim = bodyCount * STRIDE;
  const tau = wrapTime(t, trajectory.period) / sampleDt;
  const k = Math.min(Math.floor(tau), intervals - 1);
  const u = tau - k;
  const a = k * dim;
  const b = a + dim;

  // Bases de Hermite y sus derivadas respecto a u.
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;
  const d00 = 6 * u2 - 6 * u;
  const d10 = 3 * u2 - 4 * u + 1;
  const d01 = -6 * u2 + 6 * u;
  const d11 = 3 * u2 - 2 * u;

  for (let o = 0; o < dim; o += STRIDE) {
    for (let c = 0; c < 2; c++) {
      const p0 = states[a + o + c];
      const p1 = states[b + o + c];
      const v0 = states[a + o + c + 2];
      const v1 = states[b + o + c + 2];
      out[o + c] = h00 * p0 + h10 * sampleDt * v0 + h01 * p1 + h11 * sampleDt * v1;
      out[o + c + 2] = (d00 * p0 + d01 * p1) / sampleDt + d10 * v0 + d11 * v1;
    }
  }
  return out;
}
