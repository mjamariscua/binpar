/**
 * Precomputa el periodo de una órbita fuera del hilo principal.
 *
 * La órbita más cara (Yin-Yang I, ~10⁶ pasos de RK4) tarda ~0.1 s en un
 * portátil y bastante más en un móvil: en el hilo principal congelaría la
 * interfaz justo al entrar en la página. El resultado vuelve como objeto
 * transferible, sin copiar el buffer.
 */
import { precomputePeriod } from "@/lib/physics/trajectory";
import { getOrbit, initialStateOf } from "./catalog";
import type { TrajectoryRequest, TrajectoryResponse } from "./trajectory-messages";

addEventListener("message", (event: MessageEvent<TrajectoryRequest>) => {
  const orbit = getOrbit(event.data.slug);
  if (!orbit) {
    const response: TrajectoryResponse = { ok: false, error: `Órbita desconocida: ${event.data.slug}` };
    postMessage(response);
    return;
  }
  const trajectory = precomputePeriod(orbit.system, initialStateOf(orbit), orbit.period, orbit.integration);
  const response: TrajectoryResponse = { ok: true, trajectory };
  postMessage(response, { transfer: [trajectory.states.buffer] });
});
