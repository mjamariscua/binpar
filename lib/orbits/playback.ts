import { wrapTime } from "@/lib/physics/trajectory";

/**
 * Estado de reproducción de una órbita y sus transiciones, como funciones
 * puras: el store de Zustand solo las aplica, y los tests las prueban sin React.
 */

export const SPEEDS = [0.25, 0.5, 1, 2, 4] as const;
export type Speed = (typeof SPEEDS)[number];

/**
 * A velocidad 1× cada periodo dura lo mismo en pantalla, sea cual sea su T
 * físico (de 6.2 a 14.9 unidades). Así las seis órbitas se leen al mismo
 * ritmo; el T real se muestra aparte.
 */
export const SECONDS_PER_PERIOD = 12;

/** Paso máximo por fotograma: al volver a una pestaña inactiva no hay un salto de varios segundos. */
export const MAX_FRAME_SECONDS = 0.1;

export interface Playback {
  /** Instante dentro del periodo, en unidades físicas: siempre en [0, T). */
  readonly time: number;
  readonly playing: boolean;
  readonly speed: Speed;
}

export const INITIAL_PLAYBACK: Playback = { time: 0, playing: true, speed: 1 };

export function advance(p: Playback, frameSeconds: number, period: number): Playback {
  if (!p.playing) return p;
  const seconds = Math.min(frameSeconds, MAX_FRAME_SECONDS);
  const time = wrapTime(p.time + (seconds * p.speed * period) / SECONDS_PER_PERIOD, period);
  return { ...p, time };
}

export function seek(p: Playback, time: number, period: number): Playback {
  return { ...p, time: wrapTime(time, period) };
}

export function isSpeed(value: number): value is Speed {
  return (SPEEDS as readonly number[]).includes(value);
}
