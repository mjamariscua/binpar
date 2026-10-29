import { BODY_COLORS } from "@/lib/orbits/colors";
import type { OrbitDrawingData } from "@/lib/orbits/summary";
import { cn } from "@/lib/utils";

/**
 * Recorrido completo de los tres cuerpos como SVG estático. Se genera en el
 * servidor: sirve de miniatura en la galería y de póster en el detalle
 * mientras se calcula la simulación (y si WebGL no está disponible). Con los
 * datos de la trenza dibuja además, tenues, los marcos de cada periodo.
 */
export function OrbitDrawing({
  svg,
  label,
  className,
}: {
  svg: OrbitDrawingData;
  label: string;
  className?: string;
}) {
  return (
    <svg
      viewBox={svg.viewBox}
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
      className={cn("h-full w-full", className)}
    >
      {svg.frames && (
        <path
          d={svg.frames}
          fill="none"
          stroke="var(--foreground)"
          strokeOpacity={0.18}
          strokeWidth={1}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {svg.paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={BODY_COLORS[i]}
          strokeOpacity={0.8}
          strokeWidth={1.25}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
