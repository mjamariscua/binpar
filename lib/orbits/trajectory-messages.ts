import type { Trajectory } from "@/lib/physics/trajectory";
import type { OrbitSlug } from "./catalog";

/** Contrato entre la página y trajectory.worker.ts. */
export interface TrajectoryRequest {
  readonly slug: OrbitSlug;
}

export type TrajectoryResponse =
  | { readonly ok: true; readonly trajectory: Trajectory }
  | { readonly ok: false; readonly error: string };
