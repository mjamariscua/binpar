import type { Trajectory } from "@/lib/physics/trajectory";
import { STRIDE } from "@/lib/physics/types";
import { orbitBounds, type Bounds } from "./geometry";

/**
 * La órbita como trenza: el tiempo como tercera dimensión.
 *
 * Cada cuerpo dibuja una hebra (x, y, t). Si la órbita es periódica, al cabo
 * de T las tres hebras vuelven a la misma posición y la trenza se repite. Es
 * la idea con la que Moore («Braids in classical dynamics», 1993) clasificó
 * las órbitas periódicas de tres cuerpos y encontró la figura de ocho.
 *
 * No hay física nueva: las hebras salen del periodo ya precomputado. Funciones
 * puras, compartidas por el SVG de la galería (servidor) y la escena 3D
 * (cliente).
 *
 * Espacio de la trenza, que es también el de la escena 3D:
 *   X = tiempo (de izquierda a derecha en la vista por defecto),
 *   Y = y de la órbita,
 *   Z = x de la órbita.
 * Por qué Z = x: mirando a lo largo del tiempo desde t = 0 («De frente»), la
 * derecha de la cámara es +Z y su arriba +Y, así que se ve el recorrido plano
 * exactamente como en la vista 2D.
 */

/** Periodos que se dibujan: con dos se ve que la trenza se repite. */
export const BRAID_PERIODS = 2;

/** Largo de un periodo a lo largo del eje del tiempo, en lados de la órbita. */
export const LENGTH_PER_SIDE = 1;

/**
 * Distancia mínima entre puntos de una hebra, en lados de la órbita: menos de
 * 2 px en un visor de 600 px. Medido: deja el peor caso (Yin-Yang, 8192
 * muestras por periodo) en ≈ 9 000 vértices para las tres hebras, frente a
 * ≈ 49 000 sin diezmar.
 */
export const MIN_SEGMENT_PER_SIDE = 0.003;

export interface Braid {
  /** Una hebra por cuerpo: [X0, Y0, Z0, X1, Y1, Z1, …]. */
  readonly strands: readonly Float32Array[];
  readonly periods: number;
  /** Largo de un periodo en el eje del tiempo (unidades de la órbita). */
  readonly lengthPerPeriod: number;
  /** Rectángulo del recorrido en el plano de la órbita. */
  readonly bounds: Bounds;
}

/** Lado mayor del recorrido: la escala de la órbita. */
export function boundsSide(b: Bounds): number {
  return Math.max(b.maxX - b.minX, b.maxY - b.minY);
}

/**
 * Hebras de la trenza a partir del periodo precomputado.
 *
 * Usa las muestras guardadas tal cual, sin interpolar. A partir del segundo
 * periodo omite la primera muestra, que repetiría la última del anterior: el
 * nudo en t = T es la muestra real, así que cualquier salto ahí sería el error
 * de cierre medido (≈ 10⁻⁹), no un artefacto del dibujo.
 *
 * Con `minSegment` > 0 descarta cada punto a menos de esa distancia del último
 * conservado (el criterio de `bodyPath`, ahora en 3D). Conserva siempre el
 * primero y el último.
 */
export function buildBraid(
  trajectory: Trajectory,
  { periods = BRAID_PERIODS, lengthPerPeriod, minSegment = 0 }: { periods?: number; lengthPerPeriod?: number; minSegment?: number } = {},
): Braid {
  const bounds = orbitBounds(trajectory);
  const length = lengthPerPeriod ?? boundsSide(bounds) * LENGTH_PER_SIDE;
  const { intervals, states, bodyCount } = trajectory;
  const dim = bodyCount * STRIDE;
  const total = periods * intervals + 1;
  const strands: Float32Array[] = [];

  for (let body = 0; body < bodyCount; body++) {
    const out = new Float32Array(total * 3);
    let n = 0;
    let lastX = 0;
    let lastY = 0;
    let lastZ = 0;
    for (let p = 0; p < periods; p++) {
      for (let k = p === 0 ? 0 : 1; k <= intervals; k++) {
        const o = k * dim + body * STRIDE;
        const X = (p + k / intervals) * length;
        const Y = states[o + 1];
        const Z = states[o];
        const isLast = p === periods - 1 && k === intervals;
        if (n === 0 || isLast || Math.hypot(X - lastX, Y - lastY, Z - lastZ) >= minSegment) {
          out[n * 3] = X;
          out[n * 3 + 1] = Y;
          out[n * 3 + 2] = Z;
          lastX = X;
          lastY = Y;
          lastZ = Z;
          n++;
        }
      }
    }
    strands.push(n === total ? out : out.slice(0, n * 3));
  }

  return { strands, periods, lengthPerPeriod: length, bounds };
}

/** Posición en el eje del tiempo del instante `time` (en [0, T)) durante la vuelta `lap`. */
export function sliceX(time: number, period: number, lap: number, lengthPerPeriod: number): number {
  return (lap + time / period) * lengthPerPeriod;
}

/** Vuelta siguiente al dar la vuelta al periodo: tras la última, se vuelve a la primera. */
export function nextLap(lap: number, periods: number = BRAID_PERIODS): number {
  return (lap + 1) % periods;
}

/* ─── Cámara y proyección ───────────────────────────────────────────────── */

/** Dirección de la cámara: acimut desde el lateral (+Z) hacia t = 0 (−X) y elevación sobre el plano horizontal, en radianes. */
export interface BraidView {
  readonly azimuth: number;
  readonly elevation: number;
}

const deg = (d: number) => (d * Math.PI) / 180;

/**
 * Vistas fijas. La de perspectiva es la de las tarjetas de la galería y la
 * inicial del detalle, para que la transición entre las dos no salte.
 */
export const BRAID_VIEWS = {
  perspectiva: { azimuth: deg(32), elevation: deg(22) },
  frente: { azimuth: deg(90), elevation: 0 },
  lateral: { azimuth: 0, elevation: 0 },
} as const satisfies Record<string, BraidView>;

export type BraidViewName = keyof typeof BRAID_VIEWS;

/** Vector unitario desde el centro de la trenza hacia la cámara. */
export function cameraDirection({ azimuth, elevation }: BraidView): [number, number, number] {
  return [-Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation)];
}

/**
 * Proyección ortográfica de un punto de la trenza en la pantalla de la cámara:
 * [derecha, arriba]. La usa el SVG de las tarjetas, que no gira. La escena 3D
 * del detalle coloca una cámara en perspectiva en la misma dirección.
 */
export function projectPoint(X: number, Y: number, Z: number, view: BraidView): [number, number] {
  const [dx, dy, dz] = cameraDirection(view);
  // Base de la cámara con el «arriba» del mundo (+Y): derecha = adelante × arriba.
  const h = Math.hypot(dx, dz);
  const right = X * (dz / h) - Z * (dx / h);
  const up = (-X * dx * dy - Z * dz * dy) / h + Y * h;
  return [right, up];
}

/**
 * Distancia a la que poner una cámara en perspectiva para que una esfera de
 * radio `radius` quepa entera, sea cual sea la dirección desde la que se mire:
 * se encuadra por el campo de visión más estrecho (el vertical o, en un
 * visor más alto que ancho, el horizontal).
 */
export function frameDistance(radius: number, fovDeg: number, aspect: number): number {
  const vertical = (fovDeg * Math.PI) / 180;
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect);
  return radius / Math.sin(Math.min(vertical, horizontal) / 2);
}

/**
 * Distancia a la que poner una cámara en perspectiva, mirando desde `view`
 * hacia el centro de una caja de semiejes `half` [X, Y, Z], para que la caja
 * quepa entera. Ajusta mejor que la esfera de frameDistance en una trenza
 * alargada: encuadra lo que de verdad se ve desde esa dirección (semiancho y
 * semialto proyectados) y suma la semiprofundidad, para que también quepa la
 * cara más cercana a la cámara.
 */
export function viewDistance(
  half: readonly [number, number, number],
  view: BraidView,
  fovDeg: number,
  aspect: number,
): number {
  const [dx, dy, dz] = cameraDirection(view);
  let halfWidth = 0;
  let halfHeight = 0;
  let halfDepth = 0;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const X = sx * half[0];
        const Y = sy * half[1];
        const Z = sz * half[2];
        const [right, up] = projectPoint(X, Y, Z, view);
        halfWidth = Math.max(halfWidth, Math.abs(right));
        halfHeight = Math.max(halfHeight, Math.abs(up));
        halfDepth = Math.max(halfDepth, Math.abs(X * dx + Y * dy + Z * dz));
      }
    }
  }
  const vertical = (fovDeg * Math.PI) / 180;
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect);
  return Math.max(halfWidth / Math.tan(horizontal / 2), halfHeight / Math.tan(vertical / 2)) + halfDepth;
}

/** Proyecta una hebra entera a una lista plana [x0, y0, x1, y1, …], lista para simplificar y pasar a SVG. */
export function projectStrand(strand: Float32Array, view: BraidView): number[] {
  const out: number[] = new Array((strand.length / 3) * 2);
  for (let i = 0, j = 0; i < strand.length; i += 3, j += 2) {
    const [sx, sy] = projectPoint(strand[i], strand[i + 1], strand[i + 2], view);
    out[j] = sx;
    out[j + 1] = sy;
  }
  return out;
}

/**
 * Las cuatro esquinas del rectángulo del recorrido en el instante del eje del
 * tiempo `x`, como lista plana [X, Y, Z, …]. Marca un corte de la trenza:
 * dentro está el triángulo de los tres cuerpos en ese instante.
 */
export function sliceFrame(bounds: Bounds, x: number): number[] {
  const { minX, maxX, minY, maxY } = bounds;
  // Z = x de la órbita, Y = y de la órbita.
  return [x, minY, minX, x, minY, maxX, x, maxY, maxX, x, maxY, minX];
}
