import { gravityDerivative } from "./nbody";
import { createRK4 } from "./rk4";
import { STRIDE, type GravitySystem, type StateVector } from "./types";

/**
 * Búsqueda de retorno: integra desde un estado y mide cuánto se acerca el
 * sistema a su estado inicial con el tiempo. Una órbita periódica vuelve
 * exactamente (distancia 0); una casi periódica, mucho. Es la «proximidad de
 * retorno» con la que Šuvakov y Dmitrašinović cribaron candidatas en 2013.
 */

export type SearchOutcome = "ok" | "colision" | "escape";

export interface ReturnSearchResult {
  readonly outcome: SearchOutcome;
  /** Mínimo de |s(t) − s(0)| en el espacio de fases para t ∈ [tMin, fin]. */
  readonly bestDistance: number;
  readonly bestTime: number;
  /** Instante en que terminó la integración (tMax, o antes si hubo colisión o escape). */
  readonly endTime: number;
  /** Posiciones muestreadas para dibujar: por cuerpo, [x0, y0, x1, y1, …]. */
  readonly paths: readonly Float32Array[];
}

export interface ReturnSearchOptions {
  readonly tMax: number;
  /** No se busca retorno antes de este instante (al principio, s(t) ≈ s(0) trivialmente). */
  readonly tMin: number;
  readonly dt: number;
  /** Cuántos puntos por cuerpo guardar para el dibujo. */
  readonly drawPoints: number;
  /** Distancia entre dos cuerpos por debajo de la cual se considera choque. */
  readonly collisionDistance?: number;
  /** Distancia al centro de masas por encima de la cual se considera escape. */
  readonly escapeDistance?: number;
}

export function searchReturn(
  system: GravitySystem,
  initial: StateVector,
  { tMax, tMin, dt, drawPoints, collisionDistance = 1e-3, escapeDistance = 25 }: ReturnSearchOptions,
): ReturnSearchResult {
  const n = initial.length / STRIDE;
  const y = Float64Array.from(initial);
  const step = createRK4(y.length, (s, out) => gravityDerivative(system, s, out));
  const steps = Math.ceil(tMax / dt);
  const drawEvery = Math.max(1, Math.floor(steps / drawPoints));
  const paths = Array.from({ length: n }, () => new Float32Array((Math.floor(steps / drawEvery) + 1) * 2));
  let drawn = 0;
  const record = () => {
    for (let b = 0; b < n; b++) {
      paths[b][drawn * 2] = y[b * STRIDE];
      paths[b][drawn * 2 + 1] = y[b * STRIDE + 1];
    }
    drawn += 1;
  };
  record();

  // Se guarda d² en tres pasos consecutivos para afinar el mínimo con una parábola.
  let bestD2 = Infinity;
  let bestTime = 0;
  let prev2 = Infinity;
  let prev1 = Infinity;
  let outcome: SearchOutcome = "ok";
  let k = 0;

  for (k = 1; k <= steps; k++) {
    step(y, dt);
    const t = k * dt;
    const d2 = squaredDistance(y, initial);

    // prev1 es un mínimo local si es menor que sus dos vecinos: se interpola
    // la parábola que pasa por (t−2dt, prev2), (t−dt, prev1), (t, d2).
    if (t - dt >= tMin && prev1 <= prev2 && prev1 <= d2) {
      const { value, offset } = parabolaMinimum(prev2, prev1, d2);
      if (value < bestD2) {
        bestD2 = value;
        bestTime = t - dt + offset * dt;
      }
    }
    prev2 = prev1;
    prev1 = d2;

    if (k % drawEvery === 0) record();

    const status = checkStatus(y, n, collisionDistance, escapeDistance);
    if (status !== "ok") {
      outcome = status;
      break;
    }
  }

  return {
    outcome,
    bestDistance: Math.sqrt(Math.max(0, bestD2)),
    bestTime,
    endTime: Math.min(k, steps) * dt,
    paths: paths.map((p) => p.subarray(0, drawn * 2)),
  };
}

function squaredDistance(a: StateVector, b: StateVector): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return sum;
}

/**
 * Mínimo de la parábola que pasa por (−1, f0), (0, f1), (1, f2). Devuelve el
 * valor y su desplazamiento respecto al punto central (en pasos, ∈ [−1, 1]).
 * Cerca del mínimo d² es suave, así que esto afina mucho más que quedarse con
 * la muestra más baja.
 */
export function parabolaMinimum(f0: number, f1: number, f2: number): { value: number; offset: number } {
  const curvature = f0 - 2 * f1 + f2;
  if (curvature <= 0) return { value: f1, offset: 0 };
  const offset = Math.max(-1, Math.min(1, (f0 - f2) / (2 * curvature)));
  const value = f1 - ((f0 - f2) * offset) / 4;
  return { value: Math.max(0, value), offset };
}

function checkStatus(y: StateVector, n: number, collision: number, escape: number): SearchOutcome {
  let cx = 0;
  let cy = 0;
  for (let b = 0; b < n; b++) {
    cx += y[b * STRIDE] / n;
    cy += y[b * STRIDE + 1] / n;
  }
  for (let i = 0; i < n; i++) {
    const oi = i * STRIDE;
    if (Math.hypot(y[oi] - cx, y[oi + 1] - cy) > escape) return "escape";
    for (let j = i + 1; j < n; j++) {
      const oj = j * STRIDE;
      if (Math.hypot(y[oj] - y[oi], y[oj + 1] - y[oi + 1]) < collision) return "colision";
    }
  }
  return "ok";
}
