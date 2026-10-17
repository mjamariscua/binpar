import type { Trajectory } from "@/lib/physics/trajectory";
import type { OrbitSlug } from "./catalog";
import type { TrajectoryRequest, TrajectoryResponse } from "./trajectory-messages";

/**
 * Una promesa por órbita, compartida mientras dure la pestaña: volver a una
 * órbita ya visitada no recalcula nada. Es una caché en memoria y no se
 * persiste; recargar la página la vacía.
 *
 * Devolver siempre la misma promesa es lo que permite leerla con `use()` de
 * React dentro de un <Suspense>.
 */
const cache = new Map<OrbitSlug, Promise<Trajectory>>();

export function loadTrajectory(slug: OrbitSlug): Promise<Trajectory> {
  let promise = cache.get(slug);
  if (!promise) {
    promise = computeInWorker(slug);
    // Si falla, se olvida para que «Reintentar» vuelva a calcular.
    promise.catch(() => cache.delete(slug));
    cache.set(slug, promise);
  }
  return promise;
}

function computeInWorker(slug: OrbitSlug): Promise<Trajectory> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./trajectory.worker.ts", import.meta.url), { type: "module" });
    worker.addEventListener("message", (event: MessageEvent<TrajectoryResponse>) => {
      worker.terminate();
      if (event.data.ok) resolve(event.data.trajectory);
      else reject(new Error(event.data.error));
    });
    worker.addEventListener("error", (event) => {
      worker.terminate();
      reject(new Error(event.message || "No se pudo calcular la órbita"));
    });
    const request: TrajectoryRequest = { slug };
    worker.postMessage(request);
  });
}
