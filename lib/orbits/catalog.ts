import { packState } from "@/lib/physics/nbody";
import type { PrecomputeOptions } from "@/lib/physics/trajectory";
import type { BodyInit, GravitySystem, StateVector } from "@/lib/physics/types";

/**
 * Las seis soluciones periódicas de la Parte B.
 *
 * Política de datos (detalle y tabla de verificación en docs/orbitas.md):
 *  - Cada órbita cita por separado quién la descubrió y de dónde salen los
 *    números concretos, porque no siempre es la misma publicación.
 *  - Se eligen los valores con MENOR error de cierre medido, no los que tienen
 *    más dígitos impresos. Los valores «a 15 dígitos» de arXiv:1312.6796 cierran
 *    peor (1e-7–1e-6 en el mejor instante) y sus periodos no coinciden con sus
 *    propias condiciones iniciales (hueco ≈1e-3 en t = T publicado). Los de Li &
 *    Liao (2017), con 10 dígitos, cierran a ≈1e-9 con el T publicado.
 *  - Los tests (catalog.test.ts) integran cada órbita un periodo y fallan si no
 *    vuelve al estado inicial: una órbita que no cierra es un bug.
 */

export type OrbitSlug =
  | "lagrange"
  | "figura-de-ocho"
  | "butterfly-i"
  | "goggles"
  | "moth-i"
  | "yin-yang-i";

/** Agrupación de la galería: soluciones clásicas frente a las halladas por búsqueda numérica en 2013. */
export type OrbitFamily = "clasica" | "suvakov-2013";

/**
 * Los nombres de Šuvakov y Dmitrašinović (mariposa, polilla, gafas, yin-yang)
 * describen la figura que cada órbita traza en la «esfera de formas», no su
 * recorrido en el plano. Se explica en el detalle para que nadie busque una
 * polilla en la animación.
 */
export const SHAPE_SPHERE_NOTE =
  "El nombre describe la figura que la órbita dibuja en la «esfera de formas», un mapa de la forma del " +
  "triángulo que forman los tres cuerpos en cada instante, no el recorrido que ves en el plano.";

export const FAMILY_LABELS: Record<OrbitFamily, string> = {
  clasica: "Clásicas",
  "suvakov-2013": "Šuvakov y Dmitrašinović (2013)",
};

export interface Citation {
  readonly authors: string;
  readonly title: string;
  /** Revista o identificador de arXiv. */
  readonly reference: string;
  readonly url?: string;
  /** Dónde exactamente dentro de la publicación (tabla, figura, fila). */
  readonly locator?: string;
}

export interface PeriodicOrbit {
  readonly slug: OrbitSlug;
  readonly name: string;
  readonly summary: string;
  readonly family: OrbitFamily;
  /** Clase topológica de Šuvakov & Dmitrašinović (p. ej. «I.A.1»), si la tiene. */
  readonly classification?: string;
  readonly system: GravitySystem;
  readonly bodies: readonly [BodyInit, BodyInit, BodyInit];
  readonly period: number;
  readonly discovery: Citation;
  readonly values: Citation;
  /** Por qué estos números y no otros. */
  readonly provenance: string;
  /**
   * Resolución del periodo precomputado (ver trajectory.ts), elegida con
   * `pnpm orbits:report` según dos criterios explícitos:
   *  - substeps: el menor que da cierre ≤ 1e-7 en el espacio de fases y
   *    |ΔE/E| ≤ 1e-7. Un píxel en la vista de detalle son ~3e-3 unidades, y
   *    1e-7 es el suelo que permiten los 8 dígitos de la figura de ocho.
   *  - intervals: el menor, con mínimo 1024 para que el trazo sea suave, cuya
   *    interpolación entre muestras se desvía ≤ 1e-3 unidades (≈⅓ de píxel
   *    en la vista de detalle).
   * Las órbitas con encuentros muy cercanos (r ≈ 0.01) necesitan hasta 64×
   * más pasos que la figura de ocho: el paso fijo lo dicta el peor instante.
   */
  readonly integration: PrecomputeOptions;
}

/** G = 1 y masas iguales a 1: las unidades de todas las publicaciones citadas. */
const EQUAL_MASSES: GravitySystem = { G: 1, masses: [1, 1, 1] };

/**
 * Configuración colineal isósceles de Šuvakov & Dmitrašinović (2013): cuerpos
 * en (−1, 0), (1, 0) y (0, 0); los dos exteriores con la misma velocidad
 * (vx, vy) y el central con −2·(vx, vy). Momento lineal y angular nulos.
 */
export function isoscelesCollinear(vx: number, vy: number): [BodyInit, BodyInit, BodyInit] {
  return [
    { position: { x: -1, y: 0 }, velocity: { x: vx, y: vy } },
    { position: { x: 1, y: 0 }, velocity: { x: vx, y: vy } },
    { position: { x: 0, y: 0 }, velocity: { x: -2 * vx, y: -2 * vy } },
  ];
}

/**
 * Solución equilátera de Lagrange, derivada aquí en vez de copiada.
 *
 * Tres masas m en los vértices de un triángulo equilátero de lado L, a distancia
 * R = L/√3 del centro. Sobre cada cuerpo tiran los otros dos con fuerza Gm²/L²,
 * cada una a 30° de la dirección al centro, así que la resultante es radial:
 *   F = 2 · (Gm²/L²) · cos 30° = √3 · Gm²/L².
 * Si el triángulo gira rígido con velocidad angular ω, esa fuerza debe ser la
 * centrípeta m·ω²·R = m·ω²·L/√3. Igualando:
 *   ω² = 3Gm / L³,   T = 2π/ω.
 */
export function lagrangeEquilateral(side: number, G = 1, m = 1) {
  const R = side / Math.sqrt(3);
  const omega = Math.sqrt((3 * G * m) / side ** 3);
  const bodies = [90, 210, 330].map((deg): BodyInit => {
    const a = (deg * Math.PI) / 180;
    const x = R * Math.cos(a);
    const y = R * Math.sin(a);
    // Rotación rígida antihoraria: v = ω × r = ω · (−y, x).
    return { position: { x, y }, velocity: { x: -omega * y, y: omega * x } };
  }) as [BodyInit, BodyInit, BodyInit];
  return { bodies, omega, period: (2 * Math.PI) / omega };
}

// Lado √3 ⇒ circunradio 1: las tres órbitas son la circunferencia unidad, a la
// misma escala visual que el resto de la galería.
const lagrange = lagrangeEquilateral(Math.sqrt(3));

const SUVAKOV_2013: Citation = {
  authors: "M. Šuvakov y V. Dmitrašinović",
  title: "Three Classes of Newtonian Three-Body Planar Periodic Orbits",
  reference: "Phys. Rev. Lett. 110, 114301 (2013) · arXiv:1303.0181",
  url: "https://arxiv.org/abs/1303.0181",
};

const LI_LIAO_2017 = (locator: string): Citation => ({
  authors: "X. Li y S. Liao",
  title: "More than six hundred new families of Newtonian periodic planar collisionless three-body orbits",
  reference: "Sci. China Phys. Mech. Astron. 60, 129511 (2017) · arXiv:1705.00527",
  url: "https://arxiv.org/abs/1705.00527",
  locator,
});

const LI_LIAO_PROVENANCE =
  "Li & Liao (2017) recalcularon esta órbita con precisión múltiple. Sus 10 dígitos cierran " +
  "tras un periodo con error ≈1e-9, mejor que los 5 dígitos de la publicación original y que " +
  "los valores «a 15 dígitos» de arXiv:1312.6796, cuyo periodo no corresponde a sus propias " +
  "condiciones iniciales.";

export const ORBITS: readonly PeriodicOrbit[] = [
  {
    slug: "lagrange",
    name: "Lagrange",
    summary: "Un triángulo equilátero que gira rígido: la primera solución exacta, de 1772.",
    family: "clasica",
    system: EQUAL_MASSES,
    bodies: lagrange.bodies,
    period: lagrange.period,
    discovery: {
      authors: "J.-L. Lagrange",
      title: "Essai sur le problème des trois corps",
      reference: "Prix de l'Académie Royale des Sciences de Paris (1772)",
    },
    values: {
      authors: "Derivación propia",
      title: "Equilibrio entre gravedad y fuerza centrípeta: ω² = 3Gm/L³",
      reference: "lib/orbits/catalog.ts · lagrangeEquilateral()",
    },
    provenance:
      "Solución analítica: no hay valores que copiar, se deducen de igualar la atracción de los " +
      "otros dos cuerpos a la fuerza centrípeta. Con masas iguales es inestable (criterio de Routh), " +
      "así que una perturbación mínima la destruye tras unas pocas vueltas.",
    integration: { intervals: 1024, substeps: 16 },
  },
  {
    slug: "figura-de-ocho",
    name: "Figura de ocho",
    summary: "Los tres cuerpos se persiguen sobre un mismo ocho. Estable: sobrevive a pequeños empujones.",
    family: "clasica",
    system: EQUAL_MASSES,
    bodies: [
      { position: { x: 0.97000436, y: -0.24308753 }, velocity: { x: 0.466203685, y: 0.43236573 } },
      { position: { x: -0.97000436, y: 0.24308753 }, velocity: { x: 0.466203685, y: 0.43236573 } },
      { position: { x: 0, y: 0 }, velocity: { x: -0.93240737, y: -0.86473146 } },
    ],
    period: 6.32591398,
    discovery: {
      authors: "C. Moore",
      title: "Braids in classical dynamics",
      reference: "Phys. Rev. Lett. 70, 3675 (1993)",
    },
    values: {
      authors: "A. Chenciner y R. Montgomery (valores de C. Simó)",
      title: "A remarkable periodic solution of the three-body problem in the case of equal masses",
      reference: "Annals of Mathematics 152, 881–901 (2000) · arXiv:math/0011268",
      url: "https://arxiv.org/abs/math/0011268",
      locator: "Figura 1: x₁ = −x₂ = 0.97000436 − 0.24308753i, ẋ₃ = −2ẋ₁ = −0.93240737 − 0.86473146i, T = 6.32591398",
    },
    provenance:
      "Valores de la fuente original de la prueba de existencia. Las velocidades de los cuerpos 1 y 2 " +
      "son −ẋ₃/2, como indica el artículo. Con 8 dígitos cierra con error ≈1e-7: la órbita es estable, " +
      "así que no hace falta más precisión.",
    integration: { intervals: 1024, substeps: 16 },
  },
  {
    slug: "butterfly-i",
    name: "Butterfly I",
    summary: "Encontrada por ordenador en 2013. En cada vuelta, dos de los cuerpos se cruzan a solo una centésima de unidad.",
    family: "suvakov-2013",
    classification: "I.A.1",
    system: EQUAL_MASSES,
    bodies: isoscelesCollinear(0.3068934205, 0.1255065670),
    period: 6.2346748391,
    discovery: SUVAKOV_2013,
    values: LI_LIAO_2017("Tabla S.XVII, clase I.A, n.º 2"),
    provenance: LI_LIAO_PROVENANCE,
    integration: { intervals: 4096, substeps: 128 },
  },
  {
    slug: "goggles",
    name: "Goggles",
    summary: "Arranca con los cuerpos casi quietos: es la de menor velocidad inicial de las cuatro órbitas de 2013.",
    family: "suvakov-2013",
    classification: "I.B.5",
    system: EQUAL_MASSES,
    bodies: isoscelesCollinear(0.0833000718, 0.1278892555),
    period: 10.4648495256,
    discovery: SUVAKOV_2013,
    values: LI_LIAO_2017("Tabla S.XXI, clase I.B, n.º 3"),
    provenance: LI_LIAO_PROVENANCE,
    integration: { intervals: 4096, substeps: 128 },
  },
  {
    slug: "moth-i",
    name: "Moth I",
    summary: "La más holgada de las cuatro órbitas de 2013: dos cuerpos nunca se acercan a menos de unas 8 centésimas de unidad.",
    family: "suvakov-2013",
    classification: "I.B.1",
    system: EQUAL_MASSES,
    bodies: isoscelesCollinear(0.4644451728, 0.3960600146),
    period: 14.8943051743,
    discovery: SUVAKOV_2013,
    values: LI_LIAO_2017("Tabla S.XXI, clase I.B, n.º 1"),
    provenance:
      "La publicación original solo da 5 dígitos, que cierran con error ≈2e-4; arXiv:1312.6796 no " +
      "incluye esta órbita. Li & Liao (2017) dan 10 dígitos que cierran con error ≈1e-8.",
    integration: { intervals: 1024, substeps: 64 },
  },
  {
    slug: "yin-yang-i",
    name: "Yin-Yang I",
    summary: "Vuelve dos veces a la forma inicial en cada periodo; por eso se publicaron dos juegos de condiciones para ella.",
    family: "suvakov-2013",
    classification: "II.C.2b",
    system: EQUAL_MASSES,
    bodies: isoscelesCollinear(0.2827020949, 0.3272089716),
    period: 10.9633031497,
    discovery: SUVAKOV_2013,
    values: LI_LIAO_2017("Tabla S.XXV, clase II.C, n.º 1"),
    provenance:
      "La publicación original da dos juegos de condiciones (II.C.2a y II.C.2b) que describen la misma " +
      "órbita reescalada en espacio y tiempo. Usamos II.C.2b porque es la que Li & Liao (2017) " +
      "recalcularon: cierra con error ≈1e-8.",
    integration: { intervals: 8192, substeps: 128 },
  },
];

export function getOrbit(slug: string): PeriodicOrbit | undefined {
  return ORBITS.find((orbit) => orbit.slug === slug);
}

export function initialStateOf(orbit: PeriodicOrbit): StateVector {
  return packState(orbit.bodies);
}
