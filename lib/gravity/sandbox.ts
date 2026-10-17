import { circularSpeed, classifyOrbit, escapeSpeed, type OrbitElements } from "@/lib/physics/kepler";

/**
 * Unidades del sandbox orbital (capítulo 3). Internamente: radio del planeta
 * = 1 y GM = 1, que hace las cuentas limpias. Hacia fuera: un planeta como la
 * Tierra, con velocidades en km/s y alturas en km.
 *
 * Con R = 1 y GM = 1 la unidad de velocidad es √(GM/R): para la Tierra, la
 * velocidad de una órbita rasante, 7.905 km/s.
 */
export const GM = 1;
export const PLANET_RADIUS = 1;
/** El satélite se lanza a un radio terrestre de altura (6371 km), sobre el polo norte del dibujo. */
export const LAUNCH_RADIUS = 2;
export const KM_PER_SECOND_PER_UNIT = 7.905;
export const KM_PER_UNIT = 6371;
/** Más allá de este radio se da por escapado y se deja de simular. */
export const ESCAPE_RADIUS = 30;

export const SPEED_LIMITS_KMS = { min: 0, max: 11 } as const;
export const ANGLE_LIMITS_DEG = { min: -180, max: 180 } as const;

export const kmsToUnits = (kms: number) => kms / KM_PER_SECOND_PER_UNIT;
export const unitsToKms = (units: number) => units * KM_PER_SECOND_PER_UNIT;

/** Velocidades características a la altura de lanzamiento, en km/s (≈5.59 y ≈7.91). */
export const CIRCULAR_KMS = unitsToKms(circularSpeed(GM, LAUNCH_RADIUS));
export const ESCAPE_KMS = unitsToKms(escapeSpeed(GM, LAUNCH_RADIUS));

export type ScenarioName = "circular" | "eliptica" | "escape" | "caida";

export const SCENARIOS: Record<ScenarioName, { readonly label: string; readonly speedKms: number; readonly angleDeg: number }> = {
  circular: { label: "Circular", speedKms: CIRCULAR_KMS, angleDeg: 0 },
  eliptica: { label: "Elíptica", speedKms: CIRCULAR_KMS * 1.2, angleDeg: 0 },
  escape: { label: "Escape", speedKms: ESCAPE_KMS * 1.1, angleDeg: 0 },
  caida: { label: "Demasiado lenta", speedKms: CIRCULAR_KMS * 0.5, angleDeg: 0 },
};

/**
 * Estado inicial [x, y, vx, vy] del satélite. Ángulo 0 = horizontal hacia la
 * derecha (tangente a la superficie); positivo = hacia arriba.
 */
export function launchState(speedKms: number, angleDeg: number): Float64Array {
  const v = kmsToUnits(speedKms);
  const a = (angleDeg * Math.PI) / 180;
  return Float64Array.from([0, LAUNCH_RADIUS, v * Math.cos(a), v * Math.sin(a)]);
}

/** Qué órbita saldrá de un lanzamiento, antes de simularlo. */
export function predictLaunch(speedKms: number, angleDeg: number): OrbitElements {
  return classifyOrbit(launchState(speedKms, angleDeg), GM, PLANET_RADIUS);
}

export const ORBIT_KIND_LABELS: Record<OrbitElements["kind"], string> = {
  circular: "Órbita circular",
  eliptica: "Órbita elíptica",
  escape: "Escapa de la gravedad",
  choque: "Cae al planeta",
};
