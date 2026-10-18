"use client";

import { Hand } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Hint } from "./hint";
import {
  EARTH_RADIUS_KM,
  MOON_DISTANCE_RADII,
  accelerationAt,
  circularPeriodDays,
  fallDistance,
} from "@/lib/gravity/earth-moon";
import { formatInteger } from "@/lib/format";
import { usePrefersReducedMotion } from "@/lib/hooks/use-reduced-motion";

const MIN_DISTANCE = 3;
const MAX_DISTANCE = 65;
/** Medio lado del dibujo, en radios terrestres: la Tierra y la Luna están a escala real de distancia. */
const VIEW = 70;
/** A la distancia real, una vuelta de la Luna dura 16 s en pantalla; a otras distancias, lo que diga Kepler. */
const SCREEN_SECONDS_PER_LUNAR_MONTH = 16;
const TIME_SCALE = (circularPeriodDays(MOON_DISTANCE_RADII) * 86400) / SCREEN_SECONDS_PER_LUNAR_MONTH;

const APPLE_FALL_M = fallDistance(accelerationAt(1));

const PRESETS = [
  { label: "Distancia real", distance: MOON_DISTANCE_RADII },
  { label: "A 30 radios", distance: 30 },
  { label: "A 10 radios", distance: 10 },
] as const;

const clamp = (d: number) => Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, d));

/**
 * Coloca el grupo de la Luna: traslada a su posición y rota para que el eje x
 * local apunte hacia fuera de la Tierra. Así las flechas se dibujan una vez,
 * en coordenadas locales: la de caída hacia −x y la de velocidad hacia −y.
 * (En SVG el eje y crece hacia abajo, de ahí los signos.)
 */
function placeMoon(group: SVGGElement | null, angle: number, distance: number) {
  if (!group) return;
  const x = distance * Math.cos(angle);
  const y = -distance * Math.sin(angle);
  group.setAttribute("transform", `translate(${x} ${y}) rotate(${(-angle * 180) / Math.PI})`);
}

/**
 * Capítulo 1: la manzana y la Luna caen por la misma razón. Se puede
 * arrastrar la Luna (o moverla con las flechas del teclado) y ver cuánto cae
 * en un segundo a cada distancia, comparado con una manzana en la superficie.
 */
export function AppleMoon() {
  const [distance, setDistance] = useState<number>(MOON_DISTANCE_RADII);
  const [dragging, setDragging] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const moonRef = useRef<SVGGElement>(null);
  const angle = useRef(Math.PI / 5);

  // La Luna gira a la velocidad de una órbita circular a su distancia, con el
  // tiempo acelerado. Se mueve tocando el DOM directamente: sin renders.
  useEffect(() => {
    placeMoon(moonRef.current, angle.current, distance);
    if (reducedMotion || dragging) return;
    let frame = 0;
    let last = performance.now();
    const omega = ((2 * Math.PI) / (circularPeriodDays(distance) * 86400)) * TIME_SCALE;
    const tick = (now: number) => {
      angle.current += omega * Math.min((now - last) / 1000, 0.1);
      last = now;
      placeMoon(moonRef.current, angle.current, distance);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [distance, dragging, reducedMotion]);

  const dragTo = (event: PointerEvent) => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM()?.inverse();
    if (!matrix) return;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix);
    angle.current = Math.atan2(-p.y, p.x);
    const d = clamp(Math.hypot(p.x, p.y));
    setDistance(d);
    placeMoon(moonRef.current, angle.current, d);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const steps: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 };
    let next: number | null = null;
    if (event.key in steps) next = distance + (steps[event.key] ?? 0);
    else if (event.key === "Home") next = MIN_DISTANCE;
    else if (event.key === "End") next = MAX_DISTANCE;
    if (next === null) return;
    event.preventDefault();
    setDistance(clamp(next));
  };

  const acceleration = accelerationAt(distance);
  const fall = fallDistance(acceleration);
  // Con la distancia redondeada a la décima que se muestra, para que «d²» cuadre con el texto.
  const shown = Number(distance.toFixed(1));
  const ratio = shown * shown;
  const days = circularPeriodDays(distance);

  return (
    <div className="flex flex-col gap-6">
      <Hint icon={Hand}>
        Arrastra la Luna para acercarla o alejarla, o enfócala con el tabulador y usa las flechas. Mira cuánto cae en un
        segundo a cada distancia.
      </Hint>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
        <div className="mx-auto w-full max-w-[560px]">
          <svg
            ref={svgRef}
            viewBox={`${-VIEW} ${-VIEW} ${2 * VIEW} ${2 * VIEW}`}
            className="aspect-square w-full touch-none select-none"
            aria-labelledby="luna-dibujo-titulo"
          >
            {/* Un único nodo de texto: <title> no admite varios hijos sin desajustes de hidratación. */}
            <title id="luna-dibujo-titulo">{`La Tierra y la Luna a escala de distancia. La Luna está a ${distance.toFixed(1)} radios terrestres.`}</title>
            <circle r={distance} fill="none" stroke="var(--muted-foreground)" strokeOpacity={0.35} strokeWidth={0.3} strokeDasharray="1.2 1.2" />
            <circle r={4} fill="var(--glow-cyan)" opacity={0.12} />
            <circle r={1} fill="var(--glow-cyan)" />
            <text y={7.5} textAnchor="middle" fontSize={3.4} fill="var(--muted-foreground)">
              Tierra (a escala)
            </text>

            <g
              ref={moonRef}
              role="slider"
              tabIndex={0}
              aria-label="Distancia de la Luna a la Tierra"
              aria-valuemin={MIN_DISTANCE}
              aria-valuemax={MAX_DISTANCE}
              aria-valuenow={Math.round(distance)}
              aria-valuetext={`${distance.toFixed(1)} radios terrestres`}
              onKeyDown={onKeyDown}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setDragging(true);
              }}
              onPointerMove={(e) => dragging && dragTo(e)}
              onPointerUp={() => setDragging(false)}
              onPointerCancel={() => setDragging(false)}
              className="cursor-grab outline-none focus-visible:[&>.focus-ring]:opacity-100 active:cursor-grabbing"
            >
              {/* Área táctil generosa (≈ 40 px) alrededor de una Luna pequeña. */}
              <circle r={7} fill="transparent" />
              <circle className="focus-ring opacity-0" r={5} fill="none" stroke="var(--ring)" strokeWidth={0.6} />
              {/* Caída: hacia la Tierra. */}
              <line x1={-2.8} y1={0} x2={-11} y2={0} stroke="var(--glow-amber)" strokeWidth={0.7} />
              <path d="M -12.5 0 L -10.3 -1.4 L -10.3 1.4 Z" fill="var(--glow-amber)" />
              {/* Velocidad: tangente a la órbita. */}
              <line x1={0} y1={-2.8} x2={0} y2={-11} stroke="var(--foreground)" strokeOpacity={0.6} strokeWidth={0.5} strokeDasharray="1 0.8" />
              <path d="M 0 -12.5 L -1.4 -10.3 L 1.4 -10.3 Z" fill="var(--foreground)" fillOpacity={0.6} />
              <circle r={2.2} fill="#d9d6cf" />
            </g>
          </svg>
          <p className="mt-2 text-center text-base text-muted-foreground">
            <span className="text-glow-amber">Flecha ámbar</span>: hacia dónde cae. Discontinua: hacia dónde iría si no
            cayera.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                variant="outline"
                size="sm"
                aria-pressed={Math.abs(distance - p.distance) < 0.05}
                onClick={() => setDistance(p.distance)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-base">
            <dt className="text-muted-foreground">Distancia</dt>
            <dd className="font-mono tabular-nums">
              {distance.toFixed(1)} radios · {formatInteger(Math.round(distance * EARTH_RADIUS_KM))} km
            </dd>
            <dt className="text-muted-foreground">Gravedad allí</dt>
            <dd className="font-mono tabular-nums">{formatAcceleration(acceleration)}</dd>
            <dt className="text-muted-foreground">Una vuelta tarda</dt>
            <dd className="font-mono tabular-nums">{days.toFixed(1)} días</dd>
          </dl>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-muted-foreground">En el primer segundo de caída…</p>
            <p className="mt-3 flex items-baseline justify-between gap-3">
              <span>
                <span aria-hidden>🍎 </span>la manzana, en la superficie
              </span>
              <span className="font-mono tabular-nums">{APPLE_FALL_M.toFixed(1)} m</span>
            </p>
            <p className="mt-1 flex items-baseline justify-between gap-3">
              <span>
                <span aria-hidden>🌕 </span>la Luna, a {distance.toFixed(1)} radios
              </span>
              <span className="font-mono text-glow-amber tabular-nums">{formatLength(fall)}</span>
            </p>
            <p className="mt-3 border-t border-border pt-3">
              {distance.toFixed(1)} veces más lejos del centro de la Tierra, {formatInteger(Math.round(ratio))} veces menos
              caída: {distance.toFixed(1)}².
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatAcceleration(a: number): string {
  return a >= 0.1 ? `${a.toFixed(2)} m/s²` : `${(a * 1000).toFixed(2)} mm/s²`;
}

function formatLength(m: number): string {
  if (m >= 1) return `${m.toFixed(2)} m`;
  if (m >= 0.01) return `${(m * 100).toFixed(1)} cm`;
  return `${(m * 1000).toFixed(2)} mm`;
}
