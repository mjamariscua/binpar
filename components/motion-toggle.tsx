"use client";

import { Pause, Play } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { useMotionStore } from "@/lib/store/motion-store";

/**
 * Pausa o reanuda las animaciones que arrancan solas. Con «reducir
 * movimiento» del sistema ya están paradas y el botón no aparece.
 *
 * Las órbitas de la portada son CSS puro: se paran con un atributo en <html>.
 */
export function MotionToggle() {
  const paused = useMotionStore((s) => s.paused);
  const toggle = useMotionStore((s) => s.toggle);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    document.documentElement.dataset.animations = paused ? "paused" : "running";
  }, [paused]);

  if (reducedMotion) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-pressed={paused}
      aria-label="Pausar animaciones"
      title={paused ? "Reanudar animaciones" : "Pausar animaciones"}
      onClick={toggle}
      className="text-muted-foreground"
    >
      {paused ? <Play /> : <Pause />}
    </Button>
  );
}
