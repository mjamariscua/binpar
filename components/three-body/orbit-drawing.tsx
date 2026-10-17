import { BODY_COLORS } from "@/lib/orbits/colors";
import type { OrbitSummary } from "@/lib/orbits/summary";
import { cn } from "@/lib/utils";

/**
 * Recorrido completo de los tres cuerpos como SVG estático. Se genera en el
 * servidor: sirve de miniatura en la galería y de póster en el detalle
 * mientras se calcula la simulación (y si WebGL no está disponible).
 */
export function OrbitDrawing({
  svg,
  label,
  className,
}: {
  svg: OrbitSummary["svg"];
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
