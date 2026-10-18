"use client";

import type { ComponentProps, ReactNode } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  readonly value: T;
  readonly label: ReactNode;
  /** Nombre accesible si la etiqueta visible no basta (p. ej. «¼×»). */
  readonly ariaLabel?: string;
}

/**
 * Elegir un estado entre varias opciones: el filtro de la galería, la
 * velocidad de reproducción, la distancia de la Luna. Las acciones (lanzar un
 * escenario) son botones normales, no esto.
 *
 * Es un ToggleGroup de selección única que no se puede dejar vacío: Radix
 * deselecciona al pulsar la opción activa, y aquí siempre hay una (o ninguna
 * si `value` es null porque el estado no coincide con ninguna opción).
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
  itemClassName,
  ...props
}: {
  value: T | null;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  itemClassName?: string;
} & Pick<ComponentProps<typeof ToggleGroup>, "aria-label" | "aria-labelledby" | "size">) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={value ?? ""}
      onValueChange={(next) => {
        const option = options.find((o) => o.value === next);
        if (option) onChange(option.value);
      }}
      className={cn("flex-wrap", className)}
      {...props}
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.value} value={o.value} aria-label={o.ariaLabel} className={cn("px-3", itemClassName)}>
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
