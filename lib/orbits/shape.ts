import { stateAt, type Trajectory } from "@/lib/physics/trajectory";
import { STRIDE, type StateVector } from "@/lib/physics/types";

/**
 * La esfera de formas: la forma del triángulo de los tres cuerpos, sin su
 * posición, su tamaño ni su giro.
 *
 * Tres cuerpos en el plano son 6 números. Sin el centro de masas (que no se
 * mueve) quedan dos vectores de Jacobi, ρ y λ: 4 números. Sin el tamaño
 * R = √(ρ² + λ²) queda la hiperesfera de 4D, y sin el giro del triángulo
 * (la proyección de Hopf) queda una esfera normal. Cada punto de esa esfera
 * es una forma de triángulo:
 *   - ecuador (z = 0): los tres alineados;
 *   - polos (z = ±1): el triángulo equilátero, uno por cada orientación
 *     (norte: 1 → 2 → 3 en sentido antihorario);
 *   - tres puntos del ecuador, a 120°: los choques de dos cuerpos.
 *
 * Fórmulas de Šuvakov y Dmitrašinović (PRL 110, 114301, 2013) con el orden de
 * ejes de Janković, Dmitrašinović y Šuvakov (CPC 250, 107052, 2020, ec. 2),
 * en el que z es el eje de los polos. Valen para masas iguales, como las seis
 * órbitas del catálogo; con masas distintas, ρ y λ llevarían pesos.
 *
 * Funciones puras, compartidas por el SVG de la galería (servidor) y la
 * escena del detalle (cliente).
 */

const SQRT3_2 = Math.sqrt(3) / 2;
/** Búfer de trabajo de shapePoint, para no reservar memoria en cada fotograma (el worker tiene su propia copia del módulo). */
const JACOBI = new Float64Array(4);
/** Búfer de trabajo de sampleShapeTrail, por el mismo motivo. */
const TRAIL_POINT = new Float64Array(3);

/** Vectores de Jacobi ρ = (r₁ − r₂)/√2 y λ = (r₁ + r₂ − 2r₃)/√6, como [ρx, ρy, λx, λy]. */
export function jacobi(state: StateVector, out: Float64Array): Float64Array {
  const x1 = state[0];
  const y1 = state[1];
  const x2 = state[STRIDE];
  const y2 = state[STRIDE + 1];
  const x3 = state[2 * STRIDE];
  const y3 = state[2 * STRIDE + 1];
  out[0] = (x1 - x2) / Math.SQRT2;
  out[1] = (y1 - y2) / Math.SQRT2;
  out[2] = (x1 + x2 - 2 * x3) / Math.sqrt(6);
  out[3] = (y1 + y2 - 2 * y3) / Math.sqrt(6);
  return out;
}

/**
 * Punto de la esfera de formas, [x, y, z], de módulo 1:
 *   x = 2 ρ·λ / R²,   y = (λ² − ρ²) / R²,   z = 2 (ρ × λ) / R².
 * z es proporcional al área con signo del triángulo: cero si están alineados.
 * Los tres cuerpos nunca coinciden a la vez en estas órbitas, así que R² > 0.
 */
export function shapePoint(state: StateVector, out: Float64Array): Float64Array {
  const [rx, ry, lx, ly] = jacobi(state, JACOBI);
  const rho2 = rx * rx + ry * ry;
  const lambda2 = lx * lx + ly * ly;
  const r2 = rho2 + lambda2;
  out[0] = (2 * (rx * lx + ry * ly)) / r2;
  out[1] = (lambda2 - rho2) / r2;
  out[2] = (2 * (rx * ly - ry * lx)) / r2;
  return out;
}

/** Un punto de la esfera, [x, y, z]. */
export type SpherePoint = readonly [number, number, number];

/**
 * Los tres choques de dos cuerpos (índices desde 0), los «pinchazos» de la
 * esfera según Montgomery: una órbita sin choques nunca pasa por ellos.
 */
export const COLLISIONS: readonly { readonly bodies: readonly [number, number]; readonly point: SpherePoint }[] = [
  { bodies: [0, 1], point: [0, 1, 0] },
  { bodies: [1, 2], point: [SQRT3_2, -0.5, 0] },
  { bodies: [0, 2], point: [-SQRT3_2, -0.5, 0] },
];

/**
 * Puntos de Euler: los tres alineados con el cuerpo `middle` justo en el
 * punto medio de los otros dos. Cada uno es el antípoda del choque de los
 * otros dos, y el centro del arco del ecuador en el que ese cuerpo queda en
 * medio. Las cinco órbitas que no son de Lagrange arrancan en el del cuerpo 3.
 */
export const EULER_POINTS: readonly { readonly middle: number; readonly point: SpherePoint }[] = [
  { middle: 0, point: [-SQRT3_2, 0.5, 0] },
  { middle: 1, point: [SQRT3_2, 0.5, 0] },
  { middle: 2, point: [0, -1, 0] },
];

/**
 * Qué cuerpo queda en medio en una configuración alineada (un punto del
 * ecuador): el del punto de Euler más cercano. El ecuador se parte así en
 * tres arcos de 120°, uno por cuerpo, separados por los choques.
 */
export function middleBody(x: number, y: number): number {
  let best = 0;
  let bestDot = -Infinity;
  for (const { middle, point } of EULER_POINTS) {
    const dot = x * point[0] + y * point[1];
    if (dot > bestDot) {
      bestDot = dot;
      best = middle;
    }
  }
  return best;
}

/**
 * La curva de la órbita en la esfera: un punto por muestra guardada del
 * periodo, [x0, y0, z0, x1, …]. Usa las muestras tal cual, como la trenza: el
 * último punto es el de t = T y cualquier salto con el primero sería el
 * error de cierre medido.
 */
export function shapeCurve(trajectory: Trajectory): Float64Array {
  const { intervals, states, bodyCount } = trajectory;
  const dim = bodyCount * STRIDE;
  const out = new Float64Array((intervals + 1) * 3);
  const point = new Float64Array(3);
  for (let k = 0; k <= intervals; k++) {
    shapePoint(states.subarray(k * dim, (k + 1) * dim), point);
    out[k * 3] = point[0];
    out[k * 3 + 1] = point[1];
    out[k * 3 + 2] = point[2];
  }
  return out;
}

/**
 * La estela de la forma: los puntos de la esfera en [time − span, time], de
 * la cola a la cabeza, en `out` ([x0, y0, z0, …], a radio `radius`). Al
 * terminar, `state` es el estado en `time`: el de «el triángulo ahora».
 */
export function sampleShapeTrail(
  trajectory: Trajectory,
  time: number,
  span: number,
  state: StateVector,
  out: Float32Array | Float64Array,
  radius = 1,
): void {
  const points = out.length / 3;
  for (let i = 0; i < points; i++) {
    stateAt(trajectory, time - span + (span * i) / (points - 1), state);
    shapePoint(state, TRAIL_POINT);
    out[i * 3] = TRAIL_POINT[0] * radius;
    out[i * 3 + 1] = TRAIL_POINT[1] * radius;
    out[i * 3 + 2] = TRAIL_POINT[2] * radius;
  }
}

/**
 * «El triángulo ahora», el recuadro de la escena: las posiciones de los tres
 * cuerpos, [x1, y1, x2, y2, x3, y3], centradas en el centro de masas y a
 * tamaño fijo (suma de distancias al cuadrado igual a 1, R = 1), pero con su
 * giro real. La esfera no ve ese giro y el recuadro sí: en Lagrange el
 * triángulo gira mientras su punto sigue quieto en el polo, y eso es lo que
 * enseña la esfera (gira, pero su forma no cambia). Sin el giro, en Lagrange
 * no se movería nada en toda la escena.
 */
export function triangleNow(state: StateVector, out: Float64Array): Float64Array {
  const cx = (state[0] + state[STRIDE] + state[2 * STRIDE]) / 3;
  const cy = (state[1] + state[STRIDE + 1] + state[2 * STRIDE + 1]) / 3;
  let sum = 0;
  for (let b = 0; b < 3; b++) {
    out[b * 2] = state[b * STRIDE] - cx;
    out[b * 2 + 1] = state[b * STRIDE + 1] - cy;
    sum += out[b * 2] ** 2 + out[b * 2 + 1] ** 2;
  }
  const scale = 1 / Math.sqrt(sum);
  for (let i = 0; i < 6; i++) out[i] *= scale;
  return out;
}

/* ─── Dibujo: la esfera vista desde fuera ───────────────────────────────── */

/** Desde dónde se mira la esfera: acimut en el ecuador (desde +x hacia +y) y elevación sobre él, en grados. */
export interface SphereView {
  readonly azimuth: number;
  readonly elevation: number;
}

/**
 * Vista del dibujo de la galería y del póster: de frente al punto de Euler
 * del cuerpo 3, donde arrancan cinco de las seis órbitas, y 20° por encima
 * del ecuador para ver el norte. Los choques 1–3 y 2–3 quedan a izquierda y
 * derecha y el 1–2, detrás, como en la Fig. 1 de 2013; el cuerpo 1, a la
 * izquierda, como en las condiciones iniciales.
 */
export const SHAPE_VIEW: SphereView = { azimuth: -90, elevation: 20 };

/** Ejes de la pantalla en coordenadas de la esfera: derecha, arriba y hacia la cámara. */
export interface ViewAxes {
  readonly right: SpherePoint;
  readonly up: SpherePoint;
  readonly toward: SpherePoint;
}

export function viewAxes({ azimuth, elevation }: SphereView): ViewAxes {
  const a = (azimuth * Math.PI) / 180;
  const e = (elevation * Math.PI) / 180;
  return {
    right: [-Math.sin(a), Math.cos(a), 0],
    up: [-Math.sin(e) * Math.cos(a), -Math.sin(e) * Math.sin(a), Math.cos(e)],
    toward: [Math.cos(e) * Math.cos(a), Math.cos(e) * Math.sin(a), Math.sin(e)],
  };
}

/**
 * Proyección ortográfica de un punto de la esfera: [derecha, arriba,
 * profundidad]. Profundidad > 0 es la cara que se ve; < 0, el reverso.
 */
export function projectSphere(x: number, y: number, z: number, axes: ViewAxes, out: Float64Array): Float64Array {
  const { right, up, toward } = axes;
  out[0] = x * right[0] + y * right[1] + z * right[2];
  out[1] = x * up[0] + y * up[1] + z * up[2];
  out[2] = x * toward[0] + y * toward[1] + z * toward[2];
  return out;
}

/** Tramos proyectados [x0, y0, x1, y1, …] (y hacia arriba), en la cara visible y en el reverso. */
export interface SphereRuns {
  readonly front: number[][];
  readonly back: number[][];
}

/**
 * Proyecta una curva de la esfera ([x0, y0, z0, …]) y la parte en tramos
 * delante y detrás. Donde cruza el borde, el punto de corte (interpolado y
 * llevado a la esfera, así que cae justo en el contorno) cierra un tramo y
 * abre el siguiente: los dos se tocan sin hueco.
 */
export function sphereRuns(points: ArrayLike<number>, axes: ViewAxes): SphereRuns {
  const runs: SphereRuns = { front: [], back: [] };
  const q = new Float64Array(3);
  let current: number[] = [];
  let visible = false;
  let prev: [number, number, number, number] | null = null; // x, y, z y profundidad del punto anterior
  for (let i = 0; i < points.length; i += 3) {
    const [x, y, z] = [points[i], points[i + 1], points[i + 2]];
    projectSphere(x, y, z, axes, q);
    const front = q[2] >= 0;
    if (prev === null) {
      visible = front;
    } else if (front !== visible) {
      // Corte con el borde: interpolar entre los dos puntos hasta profundidad 0 y volver a la esfera.
      const t = prev[3] / (prev[3] - q[2]);
      const cx = prev[0] + t * (x - prev[0]);
      const cy = prev[1] + t * (y - prev[1]);
      const cz = prev[2] + t * (z - prev[2]);
      const norm = Math.hypot(cx, cy, cz);
      const edge = projectSphere(cx / norm, cy / norm, cz / norm, axes, new Float64Array(3));
      current.push(edge[0], edge[1]);
      (visible ? runs.front : runs.back).push(current);
      current = [edge[0], edge[1]];
      visible = front;
    }
    current.push(q[0], q[1]);
    prev = [x, y, z, q[2]];
  }
  if (current.length > 0) (visible ? runs.front : runs.back).push(current);
  return runs;
}

/**
 * El arco del ecuador en el que el cuerpo `middle` queda en medio: 120°
 * centrados en su punto de Euler, de un choque al otro, con `segments` tramos.
 */
export function equatorArc(middle: number, segments = 48): number[] {
  const [ex, ey] = EULER_POINTS[middle].point;
  const center = Math.atan2(ey, ex);
  const points: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = center - Math.PI / 3 + ((2 * Math.PI) / 3) * (i / segments);
    points.push(Math.cos(angle), Math.sin(angle), 0);
  }
  return points;
}

/* ─── Escena del detalle ────────────────────────────────────────────────── */

/**
 * Vistas fijas de la escena. «De frente» es la del dibujo de la galería, así
 * que la transición de la tarjeta al detalle no salta; «Desde el polo» enseña
 * todo el hemisferio norte con el ecuador y los tres choques en el borde.
 */
export const SHAPE_CAMERAS = {
  frente: SHAPE_VIEW,
  // 89° y no 90°: mirando justo desde el polo, el «arriba» de la cámara quedaría indefinido.
  polo: { azimuth: -90, elevation: 89 },
} as const satisfies Record<string, SphereView>;

export type ShapeCameraName = keyof typeof SHAPE_CAMERAS;

/**
 * Un punto de la esfera en el mundo de la escena: [x, z, −y], con el polo
 * norte arriba (+Y). Es exactamente el giro de −π/2 en X del grupo que
 * contiene la esfera, así que todo se dibuja dentro en coordenadas de la esfera.
 */
export function sphereToWorld(x: number, y: number, z: number): [number, number, number] {
  return [x, z, -y];
}

/** Dirección unitaria, en el mundo, del centro de la esfera hacia la cámara de una vista. */
export function cameraDirectionWorld(view: SphereView): [number, number, number] {
  const [x, y, z] = viewAxes(view).toward;
  return sphereToWorld(x, y, z);
}

/**
 * Aligera una curva [x0, y0, z0, …] para dibujarla: descarta cada punto a
 * menos de `minDistance` del último conservado (el criterio de bodyPath y de
 * la trenza) y conserva siempre el último, para que la curva cierre. Devuelve
 * un array plano, que es lo que espera <Line> de drei.
 */
export function thinCurve(points: ArrayLike<number>, minDistance: number): number[] {
  const out: number[] = [];
  let [lx, ly, lz] = [Infinity, Infinity, Infinity];
  for (let i = 0; i < points.length; i += 3) {
    const [x, y, z] = [points[i], points[i + 1], points[i + 2]];
    if (i === points.length - 3 || Math.hypot(x - lx, y - ly, z - lz) >= minDistance) {
      out.push(x, y, z);
      [lx, ly, lz] = [x, y, z];
    }
  }
  return out;
}
