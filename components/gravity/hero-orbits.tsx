import type { CSSProperties } from "react";

/**
 * Fondo de la portada: tres órbitas luminosas alrededor de un astro. SVG y CSS
 * puros (sin JavaScript): cada órbita es una circunferencia con un punto que
 * gira; el grupo exterior la achata e inclina, así que el giro se ve como un
 * recorrido elíptico en perspectiva. Con «reducir movimiento» se queda quieto.
 *
 * Los periodos siguen la tercera ley de Kepler (T ∝ r^1.5): las órbitas de
 * dentro van más rápido. Es decorativo, pero no miente.
 */
const ORBITS = [
  { r: 70, color: "var(--glow-cyan)", start: 20 },
  { r: 120, color: "var(--glow-amber)", start: 200 },
  { r: 175, color: "var(--glow-rose)", start: 110 },
] as const;

/** Segundos por vuelta de la órbita de radio 70; el resto, por Kepler. */
const BASE_PERIOD = 14;

export function HeroOrbits() {
  return (
    <svg
      viewBox="-200 -200 400 400"
      aria-hidden
      // En móvil, arriba (detrás del título) y no detrás del párrafo, que es lo que hay que leer.
      className="pointer-events-none absolute top-0 -right-[25%] w-[min(110vw,760px)] opacity-40 sm:top-1/2 sm:-right-[8%] sm:-translate-y-1/2 sm:opacity-90"
    >
      <defs>
        <filter id="hero-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="hero-star">
          <stop offset="0%" stopColor="#fff6dd" />
          <stop offset="35%" stopColor="var(--glow-amber)" />
          <stop offset="100%" stopColor="var(--glow-amber)" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle r={34} fill="url(#hero-star)" opacity={0.9} />
      <g transform="rotate(-16) scale(1 0.36)">
        {ORBITS.map(({ r, color, start }) => (
          <g key={r} transform={`rotate(${start})`}>
            <g
              className="hero-orbit"
              style={{ "--orbit-duration": `${(BASE_PERIOD * (r / 70) ** 1.5).toFixed(1)}s` } as CSSProperties}
            >
              <circle r={r} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <circle cx={r} r={4.5} fill={color} filter="url(#hero-glow)" />
            </g>
          </g>
        ))}
      </g>
    </svg>
  );
}
