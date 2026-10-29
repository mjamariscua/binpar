import { create } from "zustand";
import type { Gaze, Viewpoint } from "@/lib/orbits/inside";

/**
 * Estado de la vista «Dentro»: desde dónde se mira y cómo. En memoria, como
 * la vista de la galería: al pasar a la órbita siguiente sigues sobre el
 * mismo cuerpo.
 */
interface InsideStore {
  readonly from: Viewpoint;
  /** null: la mirada por defecto («Al centro», o «Fija» con «reducir movimiento»). */
  readonly gaze: Gaze | null;
  setFrom: (from: Viewpoint) => void;
  setGaze: (gaze: Gaze) => void;
}

export const useInsideStore = create<InsideStore>()((set) => ({
  from: "centro",
  gaze: null,
  setFrom: (from) => set({ from }),
  setGaze: (gaze) => set({ gaze }),
}));
