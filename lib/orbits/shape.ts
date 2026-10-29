import type { Trajectory } from "@/lib/physics/trajectory";
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
 * «La forma ahora»: las posiciones de los tres cuerpos sin traslación, tamaño
 * ni giro, [x1, y1, x2, y2, x3, y3]. El centro de masas en el origen, la suma
 * de distancias al cuadrado igual a 1 (R = 1) y el lado 1–2 horizontal, con el
 * cuerpo 1 a la izquierda, como en las condiciones iniciales de 2013. Dos
 * estados con el mismo punto en la esfera dan el mismo triángulo.
 */
export function canonicalTriangle(state: StateVector, out: Float64Array): Float64Array {
  const cx = (state[0] + state[STRIDE] + state[2 * STRIDE]) / 3;
  const cy = (state[1] + state[STRIDE + 1] + state[2 * STRIDE + 1]) / 3;
  // Ángulo del lado 1 → 2: se gira todo para llevarlo a +x.
  const angle = Math.atan2(state[STRIDE + 1] - state[1], state[STRIDE] - state[0]);
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  let sum = 0;
  for (let b = 0; b < 3; b++) {
    const x = state[b * STRIDE] - cx;
    const y = state[b * STRIDE + 1] - cy;
    out[b * 2] = x * cos - y * sin;
    out[b * 2 + 1] = x * sin + y * cos;
    sum += x * x + y * y;
  }
  const scale = 1 / Math.sqrt(sum);
  for (let i = 0; i < 6; i++) out[i] *= scale;
  return out;
}
