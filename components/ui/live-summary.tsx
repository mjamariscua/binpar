"use client";

import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

/**
 * Resumen para lectores de pantalla de un resultado que cambia mientras se
 * arrastra un control. Se anuncia cuando el valor lleva un rato quieto (no en
 * cada movimiento del puntero) y solo si `enabled`: con dos instancias del
 * mismo widget, anuncia la que está a la vista.
 *
 * La región existe siempre: si se montara ya con el texto, los lectores de
 * pantalla podrían no anunciarlo.
 */
export function LiveSummary({ text, enabled = true, delay = 700 }: { text: string; enabled?: boolean; delay?: number }) {
  const debounced = useDebouncedValue(text, delay);
  return (
    <p className="sr-only" aria-live="polite">
      {enabled ? debounced : ""}
    </p>
  );
}
