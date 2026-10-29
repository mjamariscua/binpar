"use client";

import { useEffect, useRef, useState } from "react";
import { stateAt, type Trajectory } from "@/lib/physics/trajectory";
import { STRIDE } from "@/lib/physics/types";
import { BRAID_PERIODS, BRAID_VIEWS, projectPoint, sliceFrame, sliceX, type OrbitView } from "@/lib/orbits/braid";
import type { OrbitSlug } from "@/lib/orbits/catalog";
import { BODY_COLORS } from "@/lib/orbits/colors";
import { loadTrajectory } from "@/lib/orbits/load-trajectory";
import { SECONDS_PER_PERIOD } from "@/lib/orbits/playback";
import type { OrbitSummary } from "@/lib/orbits/summary";
import { useAutoplay } from "@/lib/hooks/use-autoplay";
import { cn } from "@/lib/utils";
import { OrbitDrawing } from "./orbit-drawing";

/** Tramo del periodo que cubre la estela de cada cuerpo en la miniatura. */
const TRAIL_FRACTION = 0.12;
const TRAIL_POINTS = 36;
/** La estela se dibuja en tramos de opacidad creciente: SVG no degrada la opacidad a lo largo de un trazo. */
const SEGMENT_OPACITY = [0.12, 0.3, 0.55, 0.95];

/**
 * Miniatura viva de la galería, en dos vistas:
 * - 2D: sobre el recorrido estático (SVG del servidor) se mueven los tres
 *   cuerpos con su estela.
 * - 3D: sobre la trenza proyectada (también del servidor) se mueve el corte
 *   del instante actual: su marco, los tres cuerpos y el triángulo que forman.
 *   Recorre los dos periodos dibujados y vuelve a empezar.
 *
 * Sin WebGL: seis contextos WebGL en una página es caro y los navegadores los
 * limitan. Aquí basta con SVG y un bucle requestAnimationFrame por miniatura,
 * activo solo mientras está en pantalla, que escribe atributos del DOM
 * directamente (sin renders de React). La trayectoria sale del mismo worker y
 * la misma caché que el detalle: al abrir una órbita desde la galería, ya está
 * calculada.
 *
 * La trayectoria se pide la primera vez que la tarjeta entra en pantalla, no al
 * cargar la galería: en un móvil modesto, calcular las seis a la vez competía
 * con la primera interacción.
 */
export function LiveThumbnail({
  slug,
  name,
  svg,
  braid,
  view,
}: {
  slug: OrbitSlug;
  name: string;
  svg: OrbitSummary["svg"];
  braid: OrbitSummary["braid"];
  view: OrbitView;
}) {
  const autoplay = useAutoplay();
  const overlay = useRef<SVGSVGElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const node = overlay.current;
    if (!autoplay || !node) return;
    let frame = 0;
    let visible = false;
    let cancelled = false;
    let requested = false;
    let draw: ((now: number) => void) | null = null;

    const loop = (now: number) => {
      draw?.(now);
      frame = requestAnimationFrame(loop);
    };
    const start = () => {
      requested = true;
      loadTrajectory(slug)
        .then((trajectory) => {
          if (cancelled) return;
          draw = view === "3d" ? braidAnimation(trajectory, node, braid) : planeAnimation(trajectory, node);
          // Una vez ya: al cambiar de vista, los elementos nuevos no esperan al primer fotograma con la posición vacía.
          draw(performance.now());
          setLive(true);
          if (visible) frame = requestAnimationFrame(loop);
        })
        .catch(() => {
          // Sin worker la miniatura sigue siendo el dibujo estático: no hay nada que mostrar como error.
        });
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      cancelAnimationFrame(frame);
      if (!visible) return;
      if (draw) frame = requestAnimationFrame(loop);
      else if (!requested) start();
    });
    observer.observe(node);

    return () => {
      cancelled = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [slug, autoplay, view, braid]);

  const drawing = view === "3d" ? braid : svg;
  const [, , width] = drawing.viewBox.split(" ").map(Number);
  const dotRadius = (width ?? 1) * (view === "3d" ? 0.012 : 0.016);

  return (
    <div className="relative h-full w-full">
      <OrbitDrawing
        svg={drawing}
        label={view === "3d" ? `Trenza de ${name}: el tiempo avanza hacia la derecha` : `Recorrido de ${name}`}
        // En 3D las hebras son la información: se atenúan menos que el recorrido en 2D.
        className={cn("transition-opacity duration-700", live && (view === "3d" ? "opacity-70" : "opacity-35"))}
      />
      <svg
        ref={overlay}
        viewBox={drawing.viewBox}
        aria-hidden
        className={cn("absolute inset-0 h-full w-full transition-opacity duration-700", live ? "opacity-100" : "opacity-0")}
      >
        {view === "3d" ? (
          <>
            <path fill="var(--foreground)" fillOpacity={0.06} stroke="var(--foreground)" strokeOpacity={0.45} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <polygon fill="none" stroke="var(--foreground)" strokeOpacity={0.8} strokeWidth={1.25} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </>
        ) : (
          BODY_COLORS.map((color, b) =>
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
          )
        )}
        {BODY_COLORS.map((color) => (
          <circle key={color} r={dotRadius} fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
        ))}
      </svg>
    </div>
  );
}

/** Reloj común: todas las miniaturas avanzan a un periodo cada SECONDS_PER_PERIOD. */
const periodsElapsed = (now: number) => now / 1000 / SECONDS_PER_PERIOD;

/** Vista 2D: cada cuerpo con su estela, en tramos de opacidad creciente. */
function planeAnimation(trajectory: Trajectory, node: SVGSVGElement): (now: number) => void {
  const dots = [...node.querySelectorAll<SVGCircleElement>("circle")];
  const segments = [...node.querySelectorAll<SVGPathElement>("path")];
  const state = new Float64Array(trajectory.bodyCount * STRIDE);
  const xy = BODY_COLORS.map(() => new Float64Array(TRAIL_POINTS * 2));
  const span = trajectory.period * TRAIL_FRACTION;
  const perSegment = Math.ceil(TRAIL_POINTS / SEGMENT_OPACITY.length);

  return (now) => {
    const time = (periodsElapsed(now) % 1) * trajectory.period;
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
}

/**
 * Vista 3D: el corte del instante actual recorre la trenza. Con la misma
 * proyección que el SVG del servidor (vista en perspectiva), para que los
 * cuerpos caigan exactamente sobre sus hebras.
 */
function braidAnimation(trajectory: Trajectory, node: SVGSVGElement, braid: OrbitSummary["braid"]): (now: number) => void {
  const view = BRAID_VIEWS.perspectiva;
  const dots = [...node.querySelectorAll<SVGCircleElement>("circle")];
  const frame = node.querySelector<SVGPathElement>("path");
  const triangle = node.querySelector<SVGPolygonElement>("polygon");
  const state = new Float64Array(trajectory.bodyCount * STRIDE);

  return (now) => {
    const elapsed = periodsElapsed(now);
    const lap = Math.floor(elapsed) % BRAID_PERIODS;
    const time = (elapsed % 1) * trajectory.period;
    const x = sliceX(time, trajectory.period, lap, braid.lengthPerPeriod);
    stateAt(trajectory, time, state);

    let points = "";
    for (let b = 0; b < 3; b++) {
      // Espacio de la trenza: Y = y de la órbita, Z = x de la órbita.
      const [sx, sy] = projectPoint(x, state[b * STRIDE + 1], state[b * STRIDE], view);
      dots[b]?.setAttribute("cx", sx.toFixed(3));
      dots[b]?.setAttribute("cy", (-sy).toFixed(3));
      points += `${sx.toFixed(3)},${(-sy).toFixed(3)} `;
    }
    triangle?.setAttribute("points", points);

    const corners = sliceFrame(braid.bounds, x);
    let d = "";
    for (let i = 0; i < corners.length; i += 3) {
      const [sx, sy] = projectPoint(corners[i], corners[i + 1], corners[i + 2], view);
      d += `${i === 0 ? "M" : "L"}${sx.toFixed(3)} ${(-sy).toFixed(3)}`;
    }
    frame?.setAttribute("d", `${d}Z`);
  };
}
