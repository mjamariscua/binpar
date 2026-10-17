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
import type { OrbitSlug, PeriodicOrbit } from "./catalog";
import { initialStateOf } from "./catalog";
import { bodyPath, orbitBounds, padBounds, svgPathData, svgViewBox } from "./geometry";

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
  readonly svg: {
    readonly viewBox: string;
    readonly paths: readonly [string, string, string];
  };
}

/** Margen alrededor del recorrido en el dibujo estático, como fracción del lado mayor. */
const SVG_PADDING = 0.06;
/** Distancia mínima entre puntos del SVG, como fracción del lado mayor (≈ 1 px a 250 px). */
const SVG_MIN_SEGMENT = 0.004;

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
  const path = (body: number) => svgPathData(bodyPath(traj, body, side * SVG_MIN_SEGMENT));

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
  };
  cache.set(orbit.slug, summary);
  return summary;
}
