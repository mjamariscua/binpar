import { stateAt, type Trajectory } from "@/lib/physics/trajectory";
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

/** Rectángulo que contiene una lista plana de puntos [x0, y0, x1, y1, …]. */
export function pointsBounds(points: readonly number[]): Bounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    minX = Math.min(minX, points[i]);
    maxX = Math.max(maxX, points[i]);
    minY = Math.min(minY, points[i + 1]);
    maxY = Math.max(maxY, points[i + 1]);
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

/**
 * Simplificación de Ramer–Douglas–Peucker: elimina los puntos que se desvían
 * menos de `tolerance` de la recta entre sus vecinos conservados. A diferencia
 * de diezmar por distancia, gasta puntos donde la curva gira y casi ninguno
 * en los tramos suaves: una circunferencia queda en unas decenas de puntos
 * con error inferior a un píxel. Iterativa (pila) para no depender de la
 * profundidad de recursión.
 */
export function simplifyPath(points: readonly number[], tolerance: number): number[] {
  const n = points.length / 2;
  if (n <= 2) return [...points];
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack: [number, number][] = [[0, n - 1]];
  const tol2 = tolerance * tolerance;
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    const ax = points[first * 2];
    const ay = points[first * 2 + 1];
    const dx = points[last * 2] - ax;
    const dy = points[last * 2 + 1] - ay;
    const len2 = dx * dx + dy * dy;
    let worst = -1;
    let worstD2 = tol2;
    for (let i = first + 1; i < last; i++) {
      const px = points[i * 2] - ax;
      const py = points[i * 2 + 1] - ay;
      // Distancia² al segmento (o al punto, si el segmento es degenerado: inicio = fin en un lazo cerrado).
      const t = len2 > 0 ? Math.max(0, Math.min(1, (px * dx + py * dy) / len2)) : 0;
      const d2 = (px - t * dx) ** 2 + (py - t * dy) ** 2;
      if (d2 > worstD2) {
        worstD2 = d2;
        worst = i;
      }
    }
    if (worst > 0) {
      keep[worst] = 1;
      stack.push([first, worst], [worst, last]);
    }
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(points[i * 2], points[i * 2 + 1]);
  return out;
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

/**
 * Rellena la estela de cada cuerpo con sus posiciones en [time − span, time],
 * de la cola (más antiguo) a la cabeza. Al terminar, `state` contiene el
 * estado en `time`, que es donde se dibujan los cuerpos.
 */
export function sampleTrails(trajectory: Trajectory, time: number, span: number, state: Float64Array, trails: Float32Array[]) {
  const points = trails[0].length / 2;
  for (let i = 0; i < points; i++) {
    stateAt(trajectory, time - span + (span * i) / (points - 1), state);
    for (let b = 0; b < trails.length; b++) {
      trails[b][i * 2] = state[b * STRIDE];
      trails[b][i * 2 + 1] = state[b * STRIDE + 1];
    }
  }
}

/** [x0, y0, x1, y1, …] → [x0, y0, 0, x1, y1, 0, …], el formato plano que espera <Line> de drei. */
export function to3D(flat: readonly number[]): number[] {
  const out = new Array<number>((flat.length / 2) * 3);
  for (let i = 0, j = 0; i < flat.length; i += 2, j += 3) {
    out[j] = flat[i];
    out[j + 1] = flat[i + 1];
    out[j + 2] = 0;
  }
  return out;
}
