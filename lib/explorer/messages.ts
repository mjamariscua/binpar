import type { SearchOutcome } from "@/lib/physics/return-search";
import type { RefineResult } from "./explorer";

/** Contrato entre el explorador y su worker. Cada petición lleva un id: la interfaz ignora respuestas viejas. */
export type ExplorerRequest =
  | { readonly id: number; readonly kind: "search"; readonly vx: number; readonly vy: number; readonly tMax: number }
  | { readonly id: number; readonly kind: "refine"; readonly vx: number; readonly vy: number; readonly periodGuess: number };

export interface SearchView {
  readonly outcome: SearchOutcome;
  readonly bestDistance: number;
  readonly bestTime: number;
  readonly endTime: number;
  readonly paths: readonly Float32Array[];
}

export type ExplorerResponse =
  | { readonly id: number; readonly kind: "search"; readonly result: SearchView }
  | { readonly id: number; readonly kind: "refine"; readonly result: RefineResult }
  | { readonly id: number; readonly kind: "error"; readonly message: string };
