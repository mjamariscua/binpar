/**
 * Integra y refina fuera del hilo principal: una búsqueda son ~10⁵ pasos y un
 * refinado unas 80 búsquedas, demasiado para hacerlo mientras se arrastra un
 * control. Las trayectorias vuelven transferidas, sin copiar.
 */
import { explore, refine } from "./explorer";
import type { ExplorerRequest, ExplorerResponse } from "./messages";

addEventListener("message", (event: MessageEvent<ExplorerRequest>) => {
  const request = event.data;
  try {
    if (request.kind === "search") {
      const result = explore(request.vx, request.vy, request.tMax);
      const response: ExplorerResponse = { id: request.id, kind: "search", result };
      postMessage(response, { transfer: result.paths.map((p) => p.buffer) });
    } else {
      const response: ExplorerResponse = {
        id: request.id,
        kind: "refine",
        result: refine(request.vx, request.vy, request.periodGuess),
      };
      postMessage(response);
    }
  } catch (error) {
    const response: ExplorerResponse = {
      id: request.id,
      kind: "error",
      message: error instanceof Error ? error.message : "Error en el cálculo",
    };
    postMessage(response);
  }
});
