import {
  angularMomentum,
  maxPositionGap,
  phaseSpaceDistance,
  totalEnergy,
} from "@/lib/physics/invariants";
import {
  finalState,
  initialState,
  precomputePeriod,
  sampleState,
} from "@/lib/physics/trajectory";
import { BRAID_VIEWS, MIN_SEGMENT_PER_SIDE, buildBraid, projectStrand, sliceFrame } from "./braid";
import type { OrbitSlug, PeriodicOrbit } from "./catalog";
import { initialStateOf } from "./catalog";
import {
  bodyPath,
  orbitBounds,
  padBounds,
  pointsBounds,
  simplifyPath,
  svgPathData,
  svgViewBox,
  type Bounds,
} from "./geometry";

/**
 * Lo que las páginas necesitan saber de cada órbita sin animarla: magnitudes
 * conservadas, verificación del cierre y el dibujo estático del recorrido.
 *
 * Se calcula en el servidor al generar las páginas (son estáticas), así que la
 * galería no ejecuta física en el navegador y el detalle muestra el recorrido
 * antes de que la simulación esté lista.
 */
export interface OrbitSummary {
  readonly energy: number;
  readonly angularMomentum: number;
  /** Distancia en el espacio de fases entre t = 0 y t = T. */
  readonly closure: number;
  /** Mayor distancia entre la posición inicial y final de un cuerpo. */
  readonly positionClosure: number;
  /** Máximo de |ΔE/E| en las muestras del periodo. */
  readonly energyDrift: number;
  readonly steps: number;
  readonly samples: number;
  readonly svg: OrbitDrawingData;
  /**
   * La misma órbita como trenza (el tiempo como tercera dimensión), proyectada
   * con la vista en perspectiva: la vista 3D de la galería. Lleva también lo
   * que la animación de la tarjeta necesita para mover el corte del instante.
   */
  readonly braid: OrbitDrawingData & {
    /** Marcos del recorrido en t = 0, T y 2T. */
    readonly frames: string;
    readonly lengthPerPeriod: number;
    readonly bounds: Bounds;
  };
}

/** Lo que dibuja OrbitDrawing: un trayecto SVG por cuerpo y, en la trenza, los marcos de cada periodo. */
export interface OrbitDrawingData {
  readonly viewBox: string;
  readonly paths: readonly [string, string, string];
  readonly frames?: string;
}

/** Margen alrededor del recorrido en el dibujo estático, como fracción del lado mayor. */
const SVG_PADDING = 0.06;
/**
 * Tolerancia de simplificación del SVG, como fracción del lado mayor: ≈ 0.9 px
 * en el póster del detalle (600 px) y menos en las miniaturas. Reduce los
 * trazos de ~176 KB a una fracción, que importa porque la galería los envía
 * dos veces (en el HTML y en el payload RSC).
 */
const SVG_TOLERANCE = 0.0015;

const cache = new Map<OrbitSlug, OrbitSummary>();

export function summarizeOrbit(orbit: PeriodicOrbit): OrbitSummary {
  const cached = cache.get(orbit.slug);
  if (cached) return cached;

  const traj = precomputePeriod(orbit.system, initialStateOf(orbit), orbit.period, orbit.integration);
  const start = initialState(traj);
  const energy = totalEnergy(orbit.system, start);
  let energyDrift = 0;
  for (let k = 0; k <= traj.intervals; k++) {
    const e = totalEnergy(orbit.system, sampleState(traj, k));
    energyDrift = Math.max(energyDrift, Math.abs(e / energy - 1));
  }

  const bounds = orbitBounds(traj);
  const side = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  const path = (body: number) => svgPathData(simplifyPath(bodyPath(traj, body), side * SVG_TOLERANCE));
  const braid = braidDrawing(traj, side);

  const summary: OrbitSummary = {
    energy,
    angularMomentum: angularMomentum(orbit.system, start),
    closure: phaseSpaceDistance(start, finalState(traj)),
    positionClosure: maxPositionGap(start, finalState(traj)),
    energyDrift,
    steps: orbit.integration.intervals * orbit.integration.substeps,
    samples: orbit.integration.intervals,
    svg: {
      viewBox: svgViewBox(padBounds(bounds, SVG_PADDING)),
      paths: [path(0), path(1), path(2)],
    },
    braid,
  };
  cache.set(orbit.slug, summary);
  return summary;
}

/**
 * Trenza proyectada a SVG: hebras diezmadas en 3D, proyectadas con la vista en
 * perspectiva y simplificadas con la misma tolerancia que el dibujo plano.
 */
function braidDrawing(traj: Parameters<typeof buildBraid>[0], side: number): OrbitSummary["braid"] {
  const view = BRAID_VIEWS.perspectiva;
  const braid = buildBraid(traj, { minSegment: side * MIN_SEGMENT_PER_SIDE });
  const strands = braid.strands.map((s) => simplifyPath(projectStrand(s, view), side * SVG_TOLERANCE));
  const frames = [0, 1, 2].map((p) =>
    projectStrand(Float32Array.from(sliceFrame(braid.bounds, p * braid.lengthPerPeriod)), view),
  );
  const all = [...strands, ...frames].flat();
  return {
    viewBox: svgViewBox(padBounds(pointsBounds(all), SVG_PADDING)),
    paths: [svgPathData(strands[0]), svgPathData(strands[1]), svgPathData(strands[2])],
    frames: frames.map((f) => `${svgPathData(f)}Z`).join(""),
    lengthPerPeriod: braid.lengthPerPeriod,
    bounds: braid.bounds,
  };
}
