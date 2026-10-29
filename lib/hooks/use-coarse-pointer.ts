import { useSyncExternalStore } from "react";

const QUERY = "(pointer: coarse)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/**
 * true si el puntero principal es un dedo (pantallas táctiles). Es el mismo
 * criterio que las áreas de 44 px (`pointer-coarse:` de Tailwind): lo que
 * importa es el tipo de puntero, no el ancho de la pantalla. En el servidor se
 * asume false.
 */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
