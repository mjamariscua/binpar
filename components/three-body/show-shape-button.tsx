"use client";

import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { useGalleryStore } from "@/lib/store/gallery-store";

/** Id del visor del detalle (la escena, sin los controles): cabe siempre en pantalla, así que «nearest» lo enseña entero. */
export const PLAYER_ID = "simulacion";

/**
 * «Verla en la esfera»: pasa el reproductor a la vista «Forma» y lo trae a la
 * vista. En escritorio ya está al lado y no se mueve nada (block: "nearest");
 * en móvil, el texto está debajo y la página sube hasta él.
 */
export function ShowShapeButton() {
  const setView = useGalleryStore((s) => s.setView);
  const reducedMotion = usePrefersReducedMotion();

  return (
    <Button
      variant="outline"
      size="sm"
      className="mt-3"
      onClick={() => {
        setView("forma");
        document.getElementById(PLAYER_ID)?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "nearest" });
      }}
    >
      <Globe /> Verla en la esfera
    </Button>
  );
}
