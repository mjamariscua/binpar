import { nelderMead } from "@/lib/physics/nelder-mead";
import { searchReturn, type ReturnSearchResult } from "@/lib/physics/return-search";
import { packState } from "@/lib/physics/nbody";
import { isoscelesCollinear } from "@/lib/orbits/catalog";

/**
 * Explorador de órbitas propias (el «por dónde crecer» de la Parte B): la
 * misma configuración colineal isósceles de Šuvakov y Dmitrašinović, con
 * (vx, vy) libres. Para cada elección se integra y se mide la proximidad de
 * retorno; «refinar» la minimiza localmente, que es, a pequeña escala, como
 * encontraron ellos sus órbitas en 2013.
 */

export const SYSTEM = { G: 1, masses: [1, 1, 1] } as const;
/** Paso fijo: fino para que los encuentros cercanos no falseen la medida. */
export const EXPLORER_DT = 2.5e-4;
export const DRAW_POINTS = 2400;
/** No se busca retorno en la primera unidad de tiempo: al principio s(t) ≈ s(0) trivialmente. */
export const MIN_RETURN_TIME = 1;

export const VELOCITY_LIMITS = { min: 0, max: 0.8 } as const;
export const T_MAX_LIMITS = { min: 5, max: 80 } as const;

export interface ExplorerPreset {
  readonly label: string;
  readonly vx: number;
  readonly vy: number;
  readonly period: number;
  readonly source: string;
}

/**
 * Órbitas conocidas en esta misma configuración, para comprobar que el
 * medidor marca casi cero donde debe. La figura de ocho también cabe aquí,
 * reescalada (Li & Liao 2017, tabla S.XVII n.º 1).
 */
export const PRESETS: readonly ExplorerPreset[] = [
  { label: "Figura de ocho", vx: 0.3471168881, vy: 0.5327249454, period: 6.3259139829, source: "Li & Liao 2017, I.A n.º 1" },
  { label: "Butterfly I", vx: 0.3068934205, vy: 0.1255065670, period: 6.2346748391, source: "Li & Liao 2017, I.A n.º 2" },
  { label: "Goggles", vx: 0.0833000718, vy: 0.1278892555, period: 10.4648495256, source: "Li & Liao 2017, I.B n.º 3" },
  { label: "Moth I", vx: 0.4644451728, vy: 0.3960600146, period: 14.8943051743, source: "Li & Liao 2017, I.B n.º 1" },
  { label: "Yin-Yang I", vx: 0.2827020949, vy: 0.3272089716, period: 10.9633031497, source: "Li & Liao 2017, II.C n.º 1" },
  { label: "Dragonfly", vx: 0.0805842255, vy: 0.5888360898, period: 21.2723373956, source: "Li & Liao 2017, I.B n.º 4" },
];

export function explore(vx: number, vy: number, tMax: number): ReturnSearchResult {
  return searchReturn(SYSTEM, packState(isoscelesCollinear(vx, vy)), {
    tMax,
    tMin: MIN_RETURN_TIME,
    dt: EXPLORER_DT,
    drawPoints: DRAW_POINTS,
  });
}

export interface RefineResult {
  readonly vx: number;
  readonly vy: number;
  readonly before: number;
  readonly after: number;
  readonly period: number;
  readonly evaluations: number;
}

/**
 * Minimiza la proximidad de retorno alrededor de (vx, vy), buscando el
 * retorno solo cerca del periodo que ya se ha visto (±20 %): sin esa ventana,
 * el mínimo podría saltar a otro retorno y la búsqueda no convergería.
 */
export function refine(vx: number, vy: number, periodGuess: number, maxEvaluations = 80): RefineResult {
  const distanceAt = ([x, y]: readonly number[]) => {
    const r = searchReturn(SYSTEM, packState(isoscelesCollinear(x, y)), {
      tMax: periodGuess * 1.2,
      tMin: periodGuess * 0.8,
      dt: EXPLORER_DT,
      drawPoints: 2,
    });
    return r.outcome === "ok" && Number.isFinite(r.bestDistance) ? r.bestDistance : 10;
  };
  const before = distanceAt([vx, vy]);
  const { point, value, evaluations } = nelderMead(distanceAt, [vx, vy], { step: 2e-3, maxEvaluations });
  const [bestVx, bestVy] = point;
  const final = searchReturn(SYSTEM, packState(isoscelesCollinear(bestVx, bestVy)), {
    tMax: periodGuess * 1.2,
    tMin: periodGuess * 0.8,
    dt: EXPLORER_DT,
    drawPoints: 2,
  });
  return {
    vx: bestVx,
    vy: bestVy,
    before,
    after: Math.min(value, final.bestDistance),
    period: final.bestTime,
    evaluations: evaluations + 2,
  };
}
