/**
 * Cifras reales del sistema Tierra–Luna para la Parte A. Se enseña con números
 * concretos (metros, kilómetros, newtons) porque el público no es físico:
 * «la Luna cae 1.4 mm por segundo» se entiende; «a = GM/r²» todavía no.
 */

/** Constante de gravitación universal, N·m²/kg². */
export const G = 6.674e-11;
/** Aceleración de la gravedad en la superficie terrestre, m/s². */
export const SURFACE_GRAVITY = 9.81;
/** Radio medio de la Tierra, km. */
export const EARTH_RADIUS_KM = 6371;
/** Distancia media Tierra–Luna, en radios terrestres (384 400 km / 6371 km). */
export const MOON_DISTANCE_RADII = 60.3;
export const EARTH_MASS_KG = 5.972e24;
export const MOON_MASS_KG = 7.342e22;
export const MOON_DISTANCE_M = 3.844e8;

/** Fuerza entre la Tierra y la Luna hoy: ≈ 1.98·10²⁰ N. */
export const EARTH_MOON_FORCE_N = (G * EARTH_MASS_KG * MOON_MASS_KG) / MOON_DISTANCE_M ** 2;

/**
 * Aceleración hacia el centro de la Tierra a una distancia dada en radios
 * terrestres. La gravedad se debilita con el cuadrado de la distancia:
 * a(d) = g / d².
 */
export function accelerationAt(distanceInEarthRadii: number): number {
  return SURFACE_GRAVITY / distanceInEarthRadii ** 2;
}

/** Lo que cae un objeto, partiendo del reposo, durante `seconds`: ½·a·t². */
export function fallDistance(acceleration: number, seconds = 1): number {
  return 0.5 * acceleration * seconds ** 2;
}

/**
 * Periodo de una órbita circular a esa distancia, en días.
 * ω = √(g/R) · d^(−3/2): tercera ley de Kepler, deducida de la misma gravedad.
 */
export function circularPeriodDays(distanceInEarthRadii: number): number {
  const omega = Math.sqrt(SURFACE_GRAVITY / (EARTH_RADIUS_KM * 1000)) * distanceInEarthRadii ** -1.5;
  return (2 * Math.PI) / omega / 86400;
}
