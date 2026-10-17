"use client";

import { useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Un símbolo de la fórmula que es también un control: se arrastra en
 * horizontal (o se usan las flechas) para cambiar su valor.
 *
 * La escala es logarítmica: cada 90 px de arrastre multiplican por 2, y cada
 * flecha por 1.1. Para masas y distancias lo natural es pensar en «el doble» o
 * «la mitad», no en «sumar 0.3».
 *
 * Accesibilidad: es un role="slider" con nombre, valor y texto de valor; Home
 * y End llevan a los extremos; RePág y AvPág multiplican o dividen por 2.
 */
export function ScrubValue({
  value,
  min,
  max,
  onChange,
  label,
  valueText,
  children,
  className,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  valueText: string;
  children: ReactNode;
  className?: string;
}) {
  const drag = useRef<{ x: number; value: number } | null>(null);
  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, value };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    onChange(clamp(drag.current.value * 2 ** (dx / 90)));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const factors: Record<string, number> = {
      ArrowRight: 1.1,
      ArrowUp: 1.1,
      ArrowLeft: 1 / 1.1,
      ArrowDown: 1 / 1.1,
      PageUp: 2,
      PageDown: 0.5,
    };
    const factor = factors[event.key];
    let next: number | null = factor ? value * factor : null;
    if (event.key === "Home") next = min;
    if (event.key === "End") next = max;
    if (next === null) return;
    event.preventDefault();
    onChange(clamp(next));
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Number(value.toFixed(2))}
      aria-valuetext={valueText}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onKeyDown={onKeyDown}
      className={cn(
        "group relative inline-flex cursor-ew-resize touch-none flex-col items-center rounded-lg px-2 py-1 select-none",
        "border-b-2 border-dashed border-primary/60 transition-colors hover:bg-primary/10 focus-visible:bg-primary/10",
        className,
      )}
    >
      {children}
    </div>
  );
}
