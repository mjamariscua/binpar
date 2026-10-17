/**
 * Estado de N cuerpos en el plano, empaquetado en un único Float64Array de
 * longitud 4N:
 *
 *   [x0, y0, vx0, vy0,  x1, y1, vx1, vy1,  ...]
 *
 * Un buffer contiguo permite integrar sin crear objetos en el bucle caliente y
 * guardar un periodo entero como una sola tabla (muestra k = estado k-ésimo).
 * Todo el proyecto es 2D: las seis órbitas de la galería y el sandbox orbital
 * son planos, así que una tercera coordenada solo costaría memoria y cálculo.
 */
export type StateVector = Float64Array;

/** Componentes por cuerpo dentro de un StateVector. */
export const STRIDE = 4;

export interface GravitySystem {
  /** Constante gravitatoria en las unidades del sistema (G = 1 en la galería). */
  readonly G: number;
  readonly masses: readonly number[];
  /**
   * Suavizado de Plummer ε: la distancia efectiva es √(r² + ε²). Con 0 es
   * Newton exacto, que es lo que usa la galería; un ε > 0 solo tiene sentido en
   * el sandbox interactivo, para que un choque no produzca aceleraciones infinitas.
   */
  readonly softening?: number;
}

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/** Cuerpo descrito de forma legible, para construir estados iniciales. */
export interface BodyInit {
  readonly position: Vec2;
  readonly velocity: Vec2;
}
