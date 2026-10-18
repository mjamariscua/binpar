import { useMotionStore } from "@/lib/store/motion-store";
import { usePrefersReducedMotion } from "./use-reduced-motion";

/** true si lo que se anima solo puede moverse: ni «reducir movimiento» ni la pausa global. */
export function useAutoplay(): boolean {
  const reducedMotion = usePrefersReducedMotion();
  const paused = useMotionStore((s) => s.paused);
  return !reducedMotion && !paused;
}
