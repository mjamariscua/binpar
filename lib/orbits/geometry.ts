import type { Trajectory } from "@/lib/physics/trajectory";
import { STRIDE } from "@/lib/physics/types";

/**
 * Geometría para dibujar un periodo precomputado: encuadre y trazos.
 * Funciones puras, compartidas por el SVG estático (servidor) y la escena 3D (cliente).
 */

export interface Bounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

/** Rectángulo que contiene todas las posiciones de todos los cuerpos durante el periodo. */
export function orbitBounds(trajectory: Trajectory): Bounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const { states } = trajectory;
  for (let o = 0; o < states.length; o += STRIDE) {
    minX = Math.min(minX, states[o]);
    maxX = Math.max(maxX, states[o]);
    minY = Math.min(minY, states[o + 1]);
    maxY = Math.max(maxY, states[o + 1]);
  }
  return { minX, maxX, minY, maxY };
}

/** Añade un margen proporcional al lado mayor, para que los cuerpos no toquen el borde. */
export function padBounds(b: Bounds, fraction: number): Bounds {
  const pad = Math.max(b.maxX - b.minX, b.maxY - b.minY) * fraction;
  return { minX: b.minX - pad, maxX: b.maxX + pad, minY: b.minY - pad, maxY: b.maxY + pad };
}

/**
 * Recorrido de un cuerpo durante el periodo como lista plana [x0, y0, x1, y1, …].
 *
 * Las muestras están equiespaciadas en el tiempo, no en el espacio: donde el
 * cuerpo va lento se amontonan y donde va rápido (encuentros cercanos) se
 * separan. Con `minDistance` > 0 se descarta cada punto que quede a menos de
 * esa distancia del último conservado. Así sobran puntos solo en los tramos
 * lentos y se conservan todos los de los tramos rápidos, que son justo los
 * que dan forma a la curva. La última muestra se conserva siempre para que el
 * trazo cierre.
 */
export function bodyPath(trajectory: Trajectory, body: number, minDistance = 0): number[] {
  const dim = trajectory.bodyCount * STRIDE;
  const { states, intervals } = trajectory;
  const points: number[] = [];
  let lastX = Infinity;
  let lastY = Infinity;
  for (let k = 0; k <= intervals; k++) {
    const o = k * dim + body * STRIDE;
    const x = states[o];
    const y = states[o + 1];
    if (k === intervals || Math.hypot(x - lastX, y - lastY) >= minDistance) {
      points.push(x, y);
      lastX = x;
      lastY = y;
    }
  }
  return points;
}

/** Atributo `d` de un <path> SVG. El eje y del SVG apunta hacia abajo, así que se invierte. */
export function svgPathData(points: readonly number[], decimals = 3): string {
  const parts: string[] = [];
  for (let i = 0; i < points.length; i += 2) {
    const x = points[i].toFixed(decimals);
    const y = (-points[i + 1]).toFixed(decimals);
    parts.push(`${i === 0 ? "M" : "L"}${x} ${y}`);
  }
  return parts.join("");
}

/** Atributo `viewBox` de un SVG que encuadra `b`, con el eje y invertido como en svgPathData. */
export function svgViewBox(b: Bounds, decimals = 3): string {
  return [b.minX, -b.maxY, b.maxX - b.minX, b.maxY - b.minY].map((v) => v.toFixed(decimals)).join(" ");
}
