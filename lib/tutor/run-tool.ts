import { forceRatio } from "@/lib/gravity/formula";
import { KM_PER_UNIT, PLANET_RADIUS, predictLaunch } from "@/lib/gravity/sandbox";
import { useLabStore, type Actor, type LaunchRequest } from "@/lib/store/lab-store";
import type { TutorTools } from "./tools";

/**
 * Ejecuta en el navegador una herramienta pedida por el tutor. Usa las mismas
 * acciones del store que los controles (marcadas como hechas por «tutor» para
 * que la interfaz lo diga) y devuelve los datos resultantes, que vuelven al
 * modelo: así explica con los números reales de la escena, no con los que
 * imagine.
 */
export type ToolCall = {
  [K in keyof TutorTools]: { toolName: K; input: TutorTools[K]["input"] };
}[keyof TutorTools];

export type ToolOutput<K extends keyof TutorTools> = TutorTools[K]["output"];

export function runTutorTool(call: ToolCall, by: Actor = "tutor"): ToolOutput<typeof call.toolName> {
  const lab = useLabStore.getState();
  switch (call.toolName) {
    case "setMass":
      lab.setTab("formula");
      lab.setSymbol(call.input.body, call.input.value, by);
      return formulaSnapshot();
    case "setDistance":
      lab.setTab("formula");
      lab.setSymbol("r", call.input.value, by);
      return formulaSnapshot();
    case "resetFormula":
      lab.setTab("formula");
      lab.resetFormula();
      return formulaSnapshot();
    case "loadScenario":
      lab.setTab("orbita");
      return launchSnapshot(lab.loadScenario(call.input.name, by));
    case "launchSatellite":
      lab.setTab("orbita");
      return launchSnapshot(lab.fire(call.input, by));
  }
}

function formulaSnapshot() {
  const { formula } = useLabStore.getState();
  return { ...formula, forceRatio: Number(forceRatio(formula).toPrecision(4)) };
}

function launchSnapshot({ speedKms, angleDeg }: LaunchRequest) {
  const orbit = predictLaunch(speedKms, angleDeg);
  const altitude = (r: number) => Math.round((r - PLANET_RADIUS) * KM_PER_UNIT);
  return {
    speedKms: Number(speedKms.toFixed(2)),
    angleDeg: Math.round(angleDeg),
    orbit: orbit.kind,
    eccentricity: Number(orbit.eccentricity.toFixed(3)),
    lowestAltitudeKm: altitude(orbit.periapsis),
    highestAltitudeKm: Number.isFinite(orbit.apoapsis) ? altitude(orbit.apoapsis) : null,
  };
}
