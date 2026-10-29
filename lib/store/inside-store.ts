import { create } from "zustand";
import { DEFAULT_PITCH, clampPitch, type Gaze, type Viewpoint } from "@/lib/orbits/inside";

/**
 * Estado de la vista «Dentro»: desde dónde se mira, cómo, y hacia dónde ha
 * girado la persona. En memoria, como la vista de la galería: al pasar a la
 * órbita siguiente sigues sobre el mismo cuerpo.
 *
 * `yaw` y `pitch` son el objetivo: la escena los lee con getState() en cada
 * fotograma y se acerca a ellos con suavidad, sin renders de React.
 */
interface InsideStore {
  readonly from: Viewpoint;
  /** null: la mirada por defecto («Al centro», o «Fija» con «reducir movimiento»). */
  readonly gaze: Gaze | null;
  /** Giro de la persona sobre la mirada base, en radianes (positivo: a la izquierda). */
  readonly yaw: number;
  /** Inclinación, en radianes (positivo: hacia arriba), dentro de ±PITCH_LIMIT. */
  readonly pitch: number;
  /** Cambiar de punto de vista vuelve a la mirada inicial. */
  setFrom: (from: Viewpoint) => void;
  setGaze: (gaze: Gaze) => void;
  lookBy: (dYaw: number, dPitch: number) => void;
  resetLook: () => void;
}

export const useInsideStore = create<InsideStore>()((set) => ({
  from: "centro",
  gaze: null,
  yaw: 0,
  pitch: DEFAULT_PITCH,
  setFrom: (from) => set({ from, yaw: 0, pitch: DEFAULT_PITCH }),
  setGaze: (gaze) => set({ gaze }),
  lookBy: (dYaw, dPitch) => set((s) => ({ yaw: s.yaw + dYaw, pitch: clampPitch(s.pitch + dPitch) })),
  resetLook: () => set({ yaw: 0, pitch: DEFAULT_PITCH }),
}));
