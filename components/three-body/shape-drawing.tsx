import { BODY_COLORS } from "@/lib/orbits/colors";
import { padBounds, svgPathData, svgViewBox } from "@/lib/orbits/geometry";
import { COLLISIONS, SHAPE_VIEW, equatorArc, projectSphere, sphereRuns, viewAxes } from "@/lib/orbits/shape";
import type { ShapeDrawingData } from "@/lib/orbits/summary";
import { cn } from "@/lib/utils";

const AXES = viewAxes(SHAPE_VIEW);

/** Encuadre del dibujo: la esfera (radio 1) con el mismo margen que el resto de dibujos. */
export const SHAPE_VIEWBOX = svgViewBox(padBounds({ minX: -1, maxX: 1, minY: -1, maxY: 1 }, 0.06));

const toPath = (runs: number[][]) => runs.map((run) => svgPathData(run)).join("");

/** El ecuador en tres arcos, cada uno del color del cuerpo que queda en medio cuando la curva lo cruza. */
const EQUATOR = BODY_COLORS.map((color, middle) => {
  const { front, back } = sphereRuns(equatorArc(middle), AXES);
  return { color, front: toPath(front), back: toPath(back) };
});

/** Los tres choques, en coordenadas del SVG (y hacia abajo), con los colores de los dos cuerpos que chocan. */
const COLLISION_MARKS = COLLISIONS.map(({ bodies, point }) => {
  const [x, y, depth] = projectSphere(point[0], point[1], point[2], AXES, new Float64Array(3));
  return { key: bodies.join("-"), colors: [BODY_COLORS[bodies[0]], BODY_COLORS[bodies[1]]] as const, x, y: -y, front: depth >= 0 };
});

const NORTH = projectSphere(0, 0, 1, AXES, new Float64Array(3));

/**
 * La órbita en la esfera de formas, como SVG estático: miniatura de la
 * galería y póster del detalle. Como en la Fig. 1 de Šuvakov y Dmitrašinović
 * (2013), la esfera es translúcida: el reverso se ve, atenuado, detrás.
 *
 * Contorno, ecuador y choques son los mismos para todas las órbitas y se
 * calculan aquí una vez; de cada órbita solo llega su curva (`shape`).
 */
export function ShapeDrawing({ shape, label, className }: { shape: ShapeDrawingData; label: string; className?: string }) {
  return (
    <svg
      viewBox={SHAPE_VIEWBOX}
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
      className={cn("h-full w-full", className)}
    >
      {/* Reverso: atenuado y, el ecuador, discontinuo. */}
      {EQUATOR.map(({ color, back }) => (
        <path key={`back-${color}`} d={back} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={1} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
      ))}
      <path d={shape.back} fill="none" stroke="var(--foreground)" strokeOpacity={0.22} strokeWidth={1} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {COLLISION_MARKS.filter((m) => !m.front).map((m) => (
        <CollisionMark key={m.key} x={m.x} y={m.y} colors={m.colors} opacity={0.4} />
      ))}

      <circle r={1} fill="var(--foreground)" fillOpacity={0.035} stroke="var(--foreground)" strokeOpacity={0.3} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <circle cx={NORTH[0]} cy={-NORTH[1]} r={0.018} fill="var(--foreground)" fillOpacity={0.45} />

      {/* Cara visible. */}
      {EQUATOR.map(({ color, front }) => (
        <path key={`front-${color}`} d={front} fill="none" stroke={color} strokeOpacity={0.85} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      ))}
      <path
        d={shape.front}
        fill="none"
        stroke="var(--foreground)"
        strokeOpacity={0.75}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {COLLISION_MARKS.filter((m) => m.front).map((m) => (
        <CollisionMark key={m.key} x={m.x} y={m.y} colors={m.colors} opacity={1} />
      ))}
    </svg>
  );
}

/** Un choque de dos cuerpos: un punto partido con el color de cada uno. */
function CollisionMark({ x, y, colors, opacity }: { x: number; y: number; colors: readonly [string, string]; opacity: number }) {
  const r = 0.045;
  return (
    <g transform={`translate(${x.toFixed(3)} ${y.toFixed(3)})`} opacity={opacity}>
      <path d={`M0 ${-r}A${r} ${r} 0 0 0 0 ${r}Z`} fill={colors[0]} />
      <path d={`M0 ${-r}A${r} ${r} 0 0 1 0 ${r}Z`} fill={colors[1]} />
    </g>
  );
}
