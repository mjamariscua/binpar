import { useSyncExternalStore } from "react";
import { usePrefersReducedMotion } from "./use-reduced-motion";

const noopSubscribe = () => () => {};

/**
 * Heurística de dispositivo modesto: 4 núcleos o menos, o 4 GB de memoria o
 * menos (deviceMemory solo existe en Chromium). Es una primera estimación; en
 * cada escena, PerformanceMonitor apaga los efectos si los fotogramas caen.
 */
function isModestDevice(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
}

/**
 * Qué nivel visual usar. `effects` (bloom y estelas brillantes) se apaga con
 * «reducir movimiento» o en dispositivos modestos; `reducedMotion` hace que lo
 * que se anima solo arranque en pausa.
 */
export function useVisualQuality(): { effects: boolean; reducedMotion: boolean } {
  const reducedMotion = usePrefersReducedMotion();
  const modest = useSyncExternalStore(noopSubscribe, isModestDevice, () => false);
  return { effects: !reducedMotion && !modest, reducedMotion };
}
