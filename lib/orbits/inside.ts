import { STRIDE, type StateVector } from "@/lib/physics/types";

/**
 * La órbita vista desde dentro, en primera persona: sobre uno de los cuerpos
 * o en el centro de masas. Funciones puras de la cámara; la escena
 * (inside-scene.tsx) solo las aplica.
 *
 * Ejes del mundo: la órbita es el suelo. X = x de la órbita, Y = arriba,
 * Z = −y. Es exactamente lo que hace un grupo girado −π/2 en X, así que los
 * trazos, las estelas y los cuerpos se dibujan en coordenadas de la órbita
 * dentro de ese grupo, y la cámara se coloca con planeToWorld.
 *
 * El ángulo de la mirada en el suelo (yaw) se mide en el plano de la órbita,
 * desde +x hacia +y: es el mismo ángulo que da atan2 sobre las posiciones.
 */

/** Desde dónde se mira: uno de los cuerpos (índice) o el centro de masas. */
export type Viewpoint = 0 | 1 | 2 | "centro";

/** Mirada al viajar sobre un cuerpo: siguiendo al centro de masas, o fija respecto a las estrellas. */
export type Gaze = "centro" | "fija";

const deg = (d: number) => (d * Math.PI) / 180;

/**
 * Altura del ojo sobre el plano, en lados de la órbita. Con el ojo en el plano
 * todo se aplastaría en la línea del horizonte; a 0,15 los cuerpos quedan unos
 * 17° bajo el horizonte a la distancia típica, las estrellas ocupan el tercio
 * de arriba, y los encuentros cercanos (Butterfly, a 0,01) pasan por debajo
 * del ojo sin atravesar la cámara.
 */
export const EYE_HEIGHT_PER_SIDE = 0.15;
export const INSIDE_FOV = 65;
/** Inclinación inicial: un poco hacia abajo, hacia el plano donde están los cuerpos. */
export const DEFAULT_PITCH = deg(-12);
/** Sin mirar del todo arriba o abajo: con el «arriba» fijo, la cámara giraría de golpe en el cénit. */
export const PITCH_LIMIT = deg(80);
/** Distancia al centro de masas, en lados de la órbita, por debajo de la cual «mirar al centro» se retiene. */
export const HOLD_PER_SIDE = 0.03;
/** Radio de los cuerpos en la escena, en lados de la órbita. */
export const BODY_RADIUS_PER_SIDE = 0.02;

/** «1», «2», «3» son los cuerpos (en la URL, contados desde 1); cualquier otro valor, el centro. */
export function parseViewpoint(value: string | null | undefined): Viewpoint {
  return value === "1" ? 0 : value === "2" ? 1 : value === "3" ? 2 : "centro";
}

/** Valor de `?desde=` en la URL. */
export type ViewpointParam = "centro" | "1" | "2" | "3";

export function formatViewpoint(viewpoint: Viewpoint): ViewpointParam {
  return viewpoint === "centro" ? "centro" : viewpoint === 0 ? "1" : viewpoint === 1 ? "2" : "3";
}

/** Centro de masas en el plano de la órbita: [x, y] en `out`. */
export function centerOfMass(state: StateVector, masses: readonly number[], out: Float64Array): Float64Array {
  let x = 0;
  let y = 0;
  let total = 0;
  for (let b = 0; b < masses.length; b++) {
    x += masses[b] * state[b * STRIDE];
    y += masses[b] * state[b * STRIDE + 1];
    total += masses[b];
  }
  out[0] = x / total;
  out[1] = y / total;
  return out;
}

/** Punto (x, y) de la órbita a una altura `lift` sobre ella, en coordenadas del mundo: [x, lift, −y]. */
export function planeToWorld(x: number, y: number, lift: number, out: Float64Array): Float64Array {
  out[0] = x;
  out[1] = lift;
  out[2] = -y;
  return out;
}

/** Posición del ojo en el mundo: sobre el cuerpo elegido o sobre el centro de masas, a `height` del plano. */
export function eyePosition(
  state: StateVector,
  masses: readonly number[],
  from: Viewpoint,
  height: number,
  out: Float64Array,
): Float64Array {
  if (from === "centro") {
    centerOfMass(state, masses, out);
    return planeToWorld(out[0], out[1], height, out);
  }
  return planeToWorld(state[from * STRIDE], state[from * STRIDE + 1], height, out);
}

/** Ángulo en el plano de la órbita de la dirección de a hacia b. */
export function bearing(ax: number, ay: number, bx: number, by: number): number {
  return Math.atan2(by - ay, bx - ax);
}

/** Lleva un ángulo a (−π, π]. */
export function wrapAngle(a: number): number {
  const w = Math.atan2(Math.sin(a), Math.cos(a));
  return w === -Math.PI ? Math.PI : w;
}

export function clampPitch(pitch: number): number {
  return Math.min(PITCH_LIMIT, Math.max(-PITCH_LIMIT, pitch));
}

/**
 * Ángulo hacia el centro de masas visto desde el cuerpo `body`, o null si el
 * cuerpo está a menos de `hold` del centro. Ahí la dirección no existe: el
 * cuerpo 3 arranca justo en el centro en cinco de las seis órbitas, y en la
 * figura de ocho los tres lo cruzan dos veces por periodo. Mirar al centro sin
 * esta retención haría girar la cámara 180° de golpe.
 */
export function gazeTargetYaw(state: StateVector, masses: readonly number[], body: number, hold: number, scratch: Float64Array): number | null {
  centerOfMass(state, masses, scratch);
  const x = state[body * STRIDE];
  const y = state[body * STRIDE + 1];
  if (Math.hypot(scratch[0] - x, scratch[1] - y) < hold) return null;
  return bearing(x, y, scratch[0], scratch[1]);
}

/** Estado de la mirada que sigue al centro: el ángulo actual y si ya va enganchada al objetivo. */
export interface Follow {
  readonly yaw: number;
  readonly locked: boolean;
}

/**
 * Siguiente ángulo de una mirada que sigue a un objetivo (el centro de masas).
 *
 * - Enganchada y con un cambio pequeño entre fotogramas (≤ `jump`): sigue al
 *   objetivo exactamente. Es lo normal mientras el cuerpo se mueve.
 * - Retención (objetivo null): se queda donde está.
 * - Tras una retención o un salto grande (el objetivo da media vuelta al
 *   cruzar el centro): gira hacia él por el arco corto, suave, con constante
 *   de tiempo `tau`, y se engancha cuando le falta menos de `settle`.
 */
export function followYaw(
  prev: Follow,
  target: number | null,
  dt: number,
  { jump = deg(20), tau = 0.5, settle = deg(0.5) }: { jump?: number; tau?: number; settle?: number } = {},
): Follow {
  if (target === null) return { yaw: prev.yaw, locked: false };
  const diff = wrapAngle(target - prev.yaw);
  if (prev.locked && Math.abs(diff) <= jump) return { yaw: target, locked: true };
  // tau = 0 (con «reducir movimiento»): salta al objetivo sin transición.
  const step = tau > 0 ? 1 - Math.exp(-dt / tau) : 1;
  const yaw = wrapAngle(prev.yaw + diff * step);
  return Math.abs(wrapAngle(target - yaw)) <= settle ? { yaw: target, locked: true } : { yaw, locked: false };
}

/**
 * Mirada al llegar a un punto de vista, y la que conserva «Mirada fija».
 * - Desde el centro: hacia el cuerpo 1.
 * - Sobre un cuerpo: hacia el centro de masas. Si el cuerpo está justo en el
 *   centro (el cuerpo 3 en t = 0), hacia atrás de su movimiento: es donde
 *   quedará el centro al alejarse, y así la mirada no da media vuelta al arrancar.
 */
export function initialYaw(
  state: StateVector,
  masses: readonly number[],
  from: Viewpoint,
  hold: number,
  scratch: Float64Array,
): number {
  if (from === "centro") {
    centerOfMass(state, masses, scratch);
    return bearing(scratch[0], scratch[1], state[0], state[1]);
  }
  const toCenter = gazeTargetYaw(state, masses, from, hold, scratch);
  if (toCenter !== null) return toCenter;
  return Math.atan2(-state[from * STRIDE + 3], -state[from * STRIDE + 2]);
}

/** Lo que decide la mirada base en cada fotograma. */
export interface GazeInput {
  readonly state: StateVector;
  readonly masses: readonly number[];
  readonly from: Viewpoint;
  readonly gaze: Gaze;
  /** Distancia de retención al centro (HOLD_PER_SIDE × lado). */
  readonly hold: number;
}

/**
 * Ángulo base de la mirada en este fotograma, antes de lo que gire la persona.
 * - `prev` null: recién llegado a este punto de vista; arranca en initialYaw,
 *   sin transición (el ojo también salta).
 * - Desde el centro, o con «Mirada fija»: no cambia; solo se desplaza el ojo.
 * - Sobre un cuerpo mirando al centro: lo sigue con followYaw.
 */
export function baseYaw(prev: Follow | null, input: GazeInput, dt: number, scratch: Float64Array, tau?: number): Follow {
  const { state, masses, from, gaze, hold } = input;
  if (prev === null) {
    // Enganchada desde el primer fotograma, salvo en retención: ahí espera a que aparezca el objetivo.
    const locked = from !== "centro" && gazeTargetYaw(state, masses, from, hold, scratch) !== null;
    return { yaw: initialYaw(state, masses, from, hold, scratch), locked };
  }
  if (from === "centro" || gaze === "fija") return prev;
  return followYaw(prev, gazeTargetYaw(state, masses, from, hold, scratch), dt, { tau });
}

/** Dirección de la mirada en el mundo para un yaw (en el plano de la órbita) y una inclinación: vector unitario. */
export function lookVector(yaw: number, pitch: number, out: Float64Array): Float64Array {
  out[0] = Math.cos(pitch) * Math.cos(yaw);
  out[1] = Math.sin(pitch);
  out[2] = -Math.cos(pitch) * Math.sin(yaw);
  return out;
}
