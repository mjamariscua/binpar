import { create } from "zustand";
import {
  DEFAULT_FORMULA,
  clampSymbol,
  type FormulaState,
  type FormulaSymbol,
} from "@/lib/gravity/formula";
import {
  ANGLE_LIMITS_DEG,
  SCENARIOS,
  SPEED_LIMITS_KMS,
  type ScenarioName,
} from "@/lib/gravity/sandbox";

/**
 * Estado del «laboratorio» de la Parte A: la fórmula viva (capítulo 2) y el
 * sandbox orbital (capítulo 3). Lo modifican dos actores con las mismas
 * acciones: la persona, con los controles, y el tutor de IA, con sus
 * herramientas. Así el tutor no tiene un camino propio que pueda divergir de
 * lo que la interfaz permite: si el tutor puede hacerlo, tú también.
 */

export type LabTab = "formula" | "orbita";
/** Quién hizo el cambio: la persona, el tutor de IA o un experimento guiado escrito de antemano (modo sin clave). */
export type Actor = "persona" | "tutor" | "guia";

export interface FormulaChange {
  readonly symbol: FormulaSymbol;
  readonly before: number;
  readonly after: number;
  readonly by: Actor;
}

export interface LaunchRequest {
  /** Se incrementa en cada lanzamiento: la escena relanza cuando cambia. */
  readonly id: number;
  readonly speedKms: number;
  readonly angleDeg: number;
  readonly by: Actor;
}

export type FlightStatus = "esperando" | "en-vuelo" | "choque" | "escapado";

/** Lo que la escena del sandbox informa a los controles (unas 10 veces por segundo). */
export interface FlightReadout {
  readonly status: FlightStatus;
  readonly altitudeKm: number;
  readonly speedKms: number;
}

interface LabStore {
  readonly formula: FormulaState;
  readonly lastChange: FormulaChange | null;
  readonly speedKms: number;
  readonly angleDeg: number;
  readonly launch: LaunchRequest | null;
  readonly tab: LabTab;
  readonly flight: FlightReadout;

  setSymbol: (symbol: FormulaSymbol, value: number, by?: Actor) => void;
  resetFormula: () => void;
  setLaunchParams: (params: { speedKms?: number; angleDeg?: number }) => void;
  /** Lanza con los parámetros actuales, o con los dados. */
  fire: (params?: { speedKms?: number; angleDeg?: number }, by?: Actor) => LaunchRequest;
  loadScenario: (name: ScenarioName, by?: Actor) => LaunchRequest;
  setTab: (tab: LabTab) => void;
  setFlight: (flight: FlightReadout) => void;
}

const clamp = (v: number, { min, max }: { min: number; max: number }) => Math.min(max, Math.max(min, v));

export const useLabStore = create<LabStore>()((set, get) => ({
  formula: DEFAULT_FORMULA,
  lastChange: null,
  speedKms: SCENARIOS.circular.speedKms,
  angleDeg: 0,
  launch: null,
  tab: "formula",
  flight: { status: "esperando", altitudeKm: 0, speedKms: 0 },

  setSymbol: (symbol, value, by = "persona") =>
    set((state) => {
      const before = state.formula[symbol];
      const after = clampSymbol(symbol, value);
      return {
        formula: { ...state.formula, [symbol]: after },
        lastChange: { symbol, before, after, by },
      };
    }),

  resetFormula: () => set({ formula: DEFAULT_FORMULA, lastChange: null }),

  setLaunchParams: ({ speedKms, angleDeg }) =>
    set((state) => ({
      speedKms: speedKms === undefined ? state.speedKms : clamp(speedKms, SPEED_LIMITS_KMS),
      angleDeg: angleDeg === undefined ? state.angleDeg : clamp(angleDeg, ANGLE_LIMITS_DEG),
    })),

  fire: (params = {}, by = "persona") => {
    get().setLaunchParams(params);
    const { speedKms, angleDeg, launch } = get();
    const request: LaunchRequest = { id: (launch?.id ?? 0) + 1, speedKms, angleDeg, by };
    set({ launch: request });
    return request;
  },

  loadScenario: (name, by = "persona") => {
    const { speedKms, angleDeg } = SCENARIOS[name];
    return get().fire({ speedKms, angleDeg }, by);
  },

  setTab: (tab) => set({ tab }),
  setFlight: (flight) => set({ flight }),
}));
