"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair } from "lucide-react";
import { useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { INSIDE_FOV } from "@/lib/orbits/inside";
import { useInsideStore } from "@/lib/store/inside-store";
import { cn } from "@/lib/utils";

const deg = (d: number) => (d * Math.PI) / 180;
/** Lo que gira cada pulsación de ← → (teclas o botones) y lo que inclina cada ↑ ↓. */
const YAW_STEP = deg(10);
const PITCH_STEP = deg(5);

/**
 * Superficie de la escena «Dentro» para mirar alrededor: arrastrando y, con
 * la escena enfocada, con las flechas del teclado (Inicio vuelve a la mirada
 * inicial).
 *
 * Arrastrar mueve la escena con el puntero, como en las vistas de calle: a la
 * derecha, la mirada gira a la izquierda. Recorrer el alto de la escena gira
 * lo mismo que el campo de visión vertical, así lo que está bajo el puntero
 * lo acompaña.
 *
 * Con el dedo, solo si `touch` está activo: entonces, y solo entonces, la
 * superficie lleva `touch-action: none`. Sin activar, deslizar el dedo
 * desplaza la página, como en el resto del sitio.
 */
export function LookSurface({ label, touch, children }: { label: string; touch: boolean; children: ReactNode }) {
  const lookBy = useInsideStore((s) => s.lookBy);
  const resetLook = useInsideStore((s) => s.resetLook);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || (e.pointerType === "touch" && !touch)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (d === null || d.id !== e.pointerId) return;
    const perPixel = deg(INSIDE_FOV) / e.currentTarget.clientHeight;
    lookBy((e.clientX - d.x) * perPixel, (e.clientY - d.y) * perPixel);
    d.x = e.clientX;
    d.y = e.clientY;
  }

  function onPointerEnd(e: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id === e.pointerId) drag.current = null;
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const actions: Partial<Record<string, () => void>> = {
      ArrowLeft: () => lookBy(YAW_STEP, 0),
      ArrowRight: () => lookBy(-YAW_STEP, 0),
      ArrowUp: () => lookBy(0, PITCH_STEP),
      ArrowDown: () => lookBy(0, -PITCH_STEP),
      Home: resetLook,
    };
    const action = actions[e.key];
    if (!action) return;
    // Las flechas no deben, además, desplazar la página.
    e.preventDefault();
    action();
  }

  return (
    <div
      role="application"
      aria-label={label}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={onKeyDown}
      className={cn(
        "absolute inset-0 cursor-grab outline-none active:cursor-grabbing focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
        touch && "touch-none",
      )}
    >
      {children}
    </div>
  );
}

/**
 * Los mismos giros con botones: la alternativa a arrastrar (WCAG 2.5.7). Las
 * flechas van juntas en una fila y la vuelta a la mirada inicial (con
 * `children`, p. ej. «Mirar con el dedo»), en otra si no caben: a 375 px, dos
 * filas limpias.
 */
export function LookButtons({ resetLabel, children }: { resetLabel: string; children?: ReactNode }) {
  const lookBy = useInsideStore((s) => s.lookBy);
  const resetLook = useInsideStore((s) => s.resetLook);

  return (
    <div role="group" aria-label="Mirar alrededor" className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="flex items-center gap-2">
        <span aria-hidden className="mr-1 text-sm text-muted-foreground">
          Mirar
        </span>
        <Button variant="outline" size="icon" aria-label="Girar a la izquierda" onClick={() => lookBy(YAW_STEP, 0)}>
          <ArrowLeft />
        </Button>
        <Button variant="outline" size="icon" aria-label="Mirar más arriba" onClick={() => lookBy(0, PITCH_STEP)}>
          <ArrowUp />
        </Button>
        <Button variant="outline" size="icon" aria-label="Mirar más abajo" onClick={() => lookBy(0, -PITCH_STEP)}>
          <ArrowDown />
        </Button>
        <Button variant="outline" size="icon" aria-label="Girar a la derecha" onClick={() => lookBy(-YAW_STEP, 0)}>
          <ArrowRight />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={resetLook}>
          <Crosshair /> {resetLabel}
        </Button>
        {children}
      </div>
    </div>
  );
}
