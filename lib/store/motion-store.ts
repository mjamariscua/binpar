import { create } from "zustand";

/**
 * Pausa global de las animaciones que arrancan solas: la Luna que gira, las
 * miniaturas de la galería y las órbitas de la portada. WCAG 2.2.2 pide un
 * control en la propia página, además de respetar «reducir movimiento» del
 * sistema. Lo que pone en marcha la persona (lanzar un satélite, reproducir
 * una órbita) tiene sus propios controles.
 *
 * Vive en memoria, como el resto del estado de la interfaz.
 */
interface MotionStore {
  readonly paused: boolean;
  toggle: () => void;
}

export const useMotionStore = create<MotionStore>()((set) => ({
  paused: false,
  toggle: () => set((state) => ({ paused: !state.paused })),
}));
