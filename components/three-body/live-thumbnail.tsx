"use client";

import { useEffect, useRef, useState } from "react";
import { stateAt } from "@/lib/physics/trajectory";
import { STRIDE } from "@/lib/physics/types";
import type { OrbitSlug } from "@/lib/orbits/catalog";
import { BODY_COLORS } from "@/lib/orbits/colors";
import { loadTrajectory } from "@/lib/orbits/load-trajectory";
import { SECONDS_PER_PERIOD } from "@/lib/orbits/playback";
import type { OrbitSummary } from "@/lib/orbits/summary";
import { useVisualQuality } from "@/lib/hooks/use-visual-quality";
import { cn } from "@/lib/utils";
import { OrbitDrawing } from "./orbit-drawing";

/** Tramo del periodo que cubre la estela de cada cuerpo en la miniatura. */
const TRAIL_FRACTION = 0.12;
const TRAIL_POINTS = 36;
/** La estela se dibuja en tramos de opacidad creciente: SVG no degrada la opacidad a lo largo de un trazo. */
const SEGMENT_OPACITY = [0.12, 0.3, 0.55, 0.95];

/**
 * Miniatura viva de la galería: sobre el recorrido estático (SVG del
 * servidor) se mueven los tres cuerpos con su estela.
 *
 * Sin WebGL: seis contextos WebGL en una página es caro y los navegadores los
 * limitan. Aquí basta con SVG y un bucle requestAnimationFrame por miniatura,
 * activo solo mientras está en pantalla, que escribe atributos del DOM
 * directamente (sin renders de React). La trayectoria sale del mismo worker y
 * la misma caché que el detalle: al abrir una órbita desde la galería, ya está
 * calculada.
 */
export function LiveThumbnail({ slug, name, svg }: { slug: OrbitSlug; name: string; svg: OrbitSummary["svg"] }) {
  const { reducedMotion } = useVisualQuality();
  const overlay = useRef<SVGSVGElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const node = overlay.current;
    if (reducedMotion || !node) return;
    let frame = 0;
    let visible = false;
    let cancelled = false;
    let draw: ((now: number) => void) | null = null;

    const loop = (now: number) => {
      draw?.(now);
      frame = requestAnimationFrame(loop);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      cancelAnimationFrame(frame);
      if (visible && draw) frame = requestAnimationFrame(loop);
    });
    observer.observe(node);

    loadTrajectory(slug)
      .then((trajectory) => {
        if (cancelled) return;
        const dots = [...node.querySelectorAll<SVGCircleElement>("circle")];
        const segments = [...node.querySelectorAll<SVGPathElement>("path")];
        const state = new Float64Array(trajectory.bodyCount * STRIDE);
        const xy = BODY_COLORS.map(() => new Float64Array(TRAIL_POINTS * 2));
        const span = trajectory.period * TRAIL_FRACTION;
        const perSegment = Math.ceil(TRAIL_POINTS / SEGMENT_OPACITY.length);

        draw = (now) => {
          // Reloj global: todas las miniaturas avanzan a 1 periodo cada SECONDS_PER_PERIOD.
          const time = ((now / 1000 / SECONDS_PER_PERIOD) * trajectory.period) % trajectory.period;
          for (let i = 0; i < TRAIL_POINTS; i++) {
            stateAt(trajectory, time - span + (span * i) / (TRAIL_POINTS - 1), state);
            for (let b = 0; b < 3; b++) {
              xy[b][i * 2] = state[b * STRIDE];
              xy[b][i * 2 + 1] = -state[b * STRIDE + 1]; // en SVG el eje y apunta hacia abajo
            }
          }
          for (let b = 0; b < 3; b++) {
            dots[b]?.setAttribute("cx", xy[b][(TRAIL_POINTS - 1) * 2].toFixed(3));
            dots[b]?.setAttribute("cy", xy[b][(TRAIL_POINTS - 1) * 2 + 1].toFixed(3));
            SEGMENT_OPACITY.forEach((_, s) => {
              const from = s * perSegment;
              const to = Math.min(TRAIL_POINTS - 1, (s + 1) * perSegment);
              let d = "";
              for (let i = from; i <= to; i++) d += `${i === from ? "M" : "L"}${xy[b][i * 2].toFixed(3)} ${xy[b][i * 2 + 1].toFixed(3)}`;
              segments[b * SEGMENT_OPACITY.length + s]?.setAttribute("d", d);
            });
          }
        };
        setLive(true);
        if (visible) frame = requestAnimationFrame(loop);
      })
      .catch(() => {
        // Sin worker la miniatura sigue siendo el dibujo estático: no hay nada que mostrar como error.
      });

    return () => {
      cancelled = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [slug, reducedMotion]);

  const [, , width] = svg.viewBox.split(" ").map(Number);
  const dotRadius = (width ?? 1) * 0.016;

  return (
    <div className="relative h-full w-full">
      <OrbitDrawing
        svg={svg}
        label={`Recorrido de ${name}`}
        className={cn("transition-opacity duration-700", live && "opacity-35")}
      />
      <svg
        ref={overlay}
        viewBox={svg.viewBox}
        aria-hidden
        className={cn("absolute inset-0 h-full w-full transition-opacity duration-700", live ? "opacity-100" : "opacity-0")}
      >
        {BODY_COLORS.map((color, b) =>
          SEGMENT_OPACITY.map((opacity, s) => (
            <path
              key={`${b}-${s}`}
              fill="none"
              stroke={color}
              strokeOpacity={opacity}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )),
        )}
        {BODY_COLORS.map((color) => (
          <circle key={color} r={dotRadius} fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
        ))}
      </svg>
    </div>
  );
}
