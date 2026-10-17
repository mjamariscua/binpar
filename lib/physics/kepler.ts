import type { Derivative } from "./rk4";
import type { StateVector } from "./types";

/**
 * Problema de dos cuerpos con un cuerpo central fijo (un satélite alrededor
 * de un planeta mucho más pesado). Lo usa el sandbox orbital de la Parte A.
 *
 * Fijar el planeta en el origen es la aproximación estándar cuando su masa
 * es enorme frente a la del satélite: el centro de masas prácticamente
 * coincide con el planeta.
 */

/** Derivada del estado [x, y, vx, vy] de un cuerpo atraído por una masa GM en el origen. */
export function centralGravity(GM: number): Derivative {
  return (s, out) => {
    const r2 = s[0] * s[0] + s[1] * s[1];
    const k = -GM / (r2 * Math.sqrt(r2));
    out[0] = s[2];
    out[1] = s[3];
    out[2] = k * s[0];
    out[3] = k * s[1];
  };
}

/** Velocidad de una órbita circular de radio r: la gravedad aporta justo la fuerza centrípeta. */
export function circularSpeed(GM: number, r: number): number {
  return Math.sqrt(GM / r);
}

/** Velocidad mínima para escapar desde r: energía cinética = energía potencial. Es √2 veces la circular. */
export function escapeSpeed(GM: number, r: number): number {
  return Math.sqrt((2 * GM) / r);
}

export type OrbitKind = "circular" | "eliptica" | "escape" | "choque";

export interface OrbitElements {
  readonly kind: OrbitKind;
  /** Energía por unidad de masa: negativa ⇒ ligada, ≥ 0 ⇒ escapa. */
  readonly energy: number;
  /** 0 = circular, (0, 1) = elipse, 1 = parábola, > 1 = hipérbola. */
  readonly eccentricity: number;
  /** Distancia mínima al centro a lo largo de la órbita. */
  readonly periapsis: number;
  /** Distancia máxima (Infinity si escapa). */
  readonly apoapsis: number;
}

/** Excentricidad por debajo de la cual llamamos «circular» a la órbita. */
export const CIRCULAR_TOLERANCE = 0.03;

/**
 * Clasifica la órbita que seguirá un cuerpo con el estado dado, sin integrar:
 * en el problema de dos cuerpos la energía y el momento angular la determinan.
 *
 *   ε = v²/2 − GM/r          (energía específica)
 *   h = x·vy − y·vx          (momento angular específico)
 *   e = √(1 + 2εh²/GM²)      (excentricidad)
 *   periapsis = h² / (GM·(1 + e))
 *
 * Si el periapsis queda dentro del planeta, el satélite chocará antes de
 * completar la órbita, aunque esta fuera «ligada».
 */
export function classifyOrbit(state: StateVector, GM: number, planetRadius: number): OrbitElements {
  const [x, y, vx, vy] = state;
  const r = Math.hypot(x, y);
  const energy = (vx * vx + vy * vy) / 2 - GM / r;
  const h = x * vy - y * vx;
  const eccentricity = Math.sqrt(Math.max(0, 1 + (2 * energy * h * h) / (GM * GM)));
  const periapsis = (h * h) / (GM * (1 + eccentricity));
  const apoapsis = eccentricity < 1 ? (h * h) / (GM * (1 - eccentricity)) : Infinity;

  let kind: OrbitKind;
  if (periapsis <= planetRadius) kind = "choque";
  else if (energy >= 0) kind = "escape";
  else if (eccentricity < CIRCULAR_TOLERANCE) kind = "circular";
  else kind = "eliptica";

  return { kind, energy, eccentricity, periapsis, apoapsis };
}
