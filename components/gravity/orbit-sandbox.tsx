"use client";

import { Hand, Rocket } from "lucide-react";
import { lazy, Suspense, useId } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { LiveSummary } from "@/components/ui/live-summary";
import { Slider } from "@/components/ui/slider";
import {
  ANGLE_LIMITS_DEG,
  CIRCULAR_KMS,
  ESCAPE_KMS,
  GM,
  KM_PER_SECOND_PER_UNIT,
  KM_PER_UNIT,
  ORBIT_KIND_LABELS,
  PLANET_RADIUS,
  SCENARIOS,
  SPEED_LIMITS_KMS,
  predictLaunch,
  type ScenarioName,
} from "@/lib/gravity/sandbox";
import { formatInteger } from "@/lib/format";
import { useInViewport } from "@/lib/hooks/use-in-viewport";
import { useNearViewport } from "@/lib/hooks/use-near-viewport";
import { SCENE_BACKGROUND } from "@/lib/orbits/colors";
import { useLabStore, type FlightStatus } from "@/lib/store/lab-store";
import { Hint } from "./hint";

const SandboxScene = lazy(() => import("./sandbox-scene"));

/** Segundos reales que dura una unidad de tiempo del sandbox: R / v = 6371 km / 7.905 km/s. */
const SECONDS_PER_UNIT = KM_PER_UNIT / KM_PER_SECOND_PER_UNIT;

const FLIGHT_LABELS: Record<FlightStatus, string> = {
  esperando: "Listo para lanzar",
  "en-vuelo": "En vuelo",
  choque: "Se ha estrellado",
  escapado: "Ha escapado: ya no volverá",
};

/**
 * Capítulo 3: lanza un satélite desde un radio terrestre de altura. Se apunta
 * arrastrando desde el satélite o con los controles (accesibles por teclado),
 * y antes de lanzar se ve qué tipo de órbita saldrá y por qué.
 */
export function OrbitSandbox({ compact = false }: { compact?: boolean }) {
  const [ref, near] = useNearViewport<HTMLDivElement>();
  // El sandbox está dos veces en la página (capítulo 3 y laboratorio): solo
  // anuncia cambios la instancia que se ve.
  const [visibleRef, visible] = useInViewport<HTMLDivElement>();

  return (
    <div ref={visibleRef} className="flex flex-col gap-6">
      <Hint icon={Hand}>
        Elige un lanzamiento de ejemplo, o ajusta velocidad y ángulo y pulsa «Lanzar». También puedes arrastrar desde
        el satélite para apuntar y soltar para lanzar.
      </Hint>
      <div className={compact ? "flex flex-col gap-5" : "grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]"}>
        <div
          ref={ref}
          className="relative aspect-square w-full overflow-hidden rounded-xl border border-border"
          style={{ background: SCENE_BACKGROUND }}
        >
          {near && (
            <ErrorBoundary
              fallback={() => (
                <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted-foreground">
                  Este navegador no puede mostrar la simulación (WebGL no disponible). Los controles y la predicción
                  siguen funcionando.
                </p>
              )}
            >
              <Suspense fallback={<p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">Preparando el planeta…</p>}>
                <SandboxScene />
              </Suspense>
            </ErrorBoundary>
          )}
          <FlightBadge announce={visible} />
        </div>
        <SandboxControls announce={visible} />
      </div>
    </div>
  );
}

/**
 * Estado del vuelo sobre la escena. Solo el estado (listo, en vuelo,
 * estrellado, escapado) es una región viva: la altura y la velocidad cambian
 * unas 10 veces por segundo y saturarían el lector de pantalla.
 */
function FlightBadge({ announce }: { announce: boolean }) {
  const flight = useLabStore((s) => s.flight);
  return (
    <p className="absolute top-3 left-3 rounded-md bg-background/70 px-2.5 py-1.5 text-sm backdrop-blur-sm">
      <span role={announce ? "status" : undefined} className={flight.status === "choque" ? "text-destructive" : undefined}>
        {FLIGHT_LABELS[flight.status]}
      </span>
      {flight.status === "en-vuelo" && (
        <span className="ml-2 font-mono text-muted-foreground tabular-nums">
          {formatInteger(flight.altitudeKm)} km · {flight.speedKms.toFixed(2)} km/s
        </span>
      )}
    </p>
  );
}

function SandboxControls({ announce }: { announce: boolean }) {
  const speedKms = useLabStore((s) => s.speedKms);
  const angleDeg = useLabStore((s) => s.angleDeg);
  const setLaunchParams = useLabStore((s) => s.setLaunchParams);
  const fire = useLabStore((s) => s.fire);
  const loadScenario = useLabStore((s) => s.loadScenario);
  const speedId = useId();
  const angleId = useId();
  const orbit = predictLaunch(speedKms, angleDeg);

  // Periodo de una órbita ligada: T = 2π·√(a³/GM), con semieje a = −GM/(2ε).
  const hours =
    orbit.energy < 0 && orbit.kind !== "choque"
      ? (2 * Math.PI * Math.sqrt((-GM / (2 * orbit.energy)) ** 3 / GM) * SECONDS_PER_UNIT) / 3600
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Lanzamientos de ejemplo">
        {(Object.keys(SCENARIOS) as ScenarioName[]).map((name) => (
          <Button key={name} variant="outline" size="sm" onClick={() => loadScenario(name)}>
            {SCENARIOS[name].label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between text-base">
          <label id={speedId}>Velocidad</label>
          <span className="font-mono tabular-nums">{speedKms.toFixed(2)} km/s</span>
        </div>
        <Slider
          value={[speedKms]}
          min={SPEED_LIMITS_KMS.min}
          max={SPEED_LIMITS_KMS.max}
          step={0.05}
          onValueChange={([v]) => setLaunchParams({ speedKms: v })}
          thumbProps={{ "aria-labelledby": speedId, "aria-valuetext": `${speedKms.toFixed(2)} kilómetros por segundo` }}
        />
        <p className="text-base text-muted-foreground">
          A esta altura: órbita circular con {CIRCULAR_KMS.toFixed(2)} km/s; para escapar hacen falta{" "}
          {ESCAPE_KMS.toFixed(2)} km/s.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between text-base">
          <label id={angleId}>Ángulo sobre la horizontal</label>
          <span className="font-mono tabular-nums">{angleDeg.toFixed(0)}°</span>
        </div>
        <Slider
          value={[angleDeg]}
          min={ANGLE_LIMITS_DEG.min}
          max={ANGLE_LIMITS_DEG.max}
          step={1}
          onValueChange={([v]) => setLaunchParams({ angleDeg: v })}
          thumbProps={{ "aria-labelledby": angleId, "aria-valuetext": `${angleDeg.toFixed(0)} grados` }}
        />
      </div>

      <LiveSummary text={`Si lanzas así: ${ORBIT_KIND_LABELS[orbit.kind]}.`} enabled={announce} />
      <div className="rounded-xl border border-border bg-card p-4 text-base">
        <p className="text-muted-foreground">Si lanzas así:</p>
        <p className="mt-1 text-lg">{ORBIT_KIND_LABELS[orbit.kind]}</p>
        <p className="mt-2 text-muted-foreground">
          {orbit.kind === "choque" &&
            `El punto más bajo de la trayectoria queda bajo la superficie: la gravedad la curva antes de dar la vuelta.`}
          {orbit.kind === "escape" &&
            `Tiene energía de sobra: la gravedad la frena, pero nunca lo bastante para hacerla volver.`}
          {(orbit.kind === "circular" || orbit.kind === "eliptica") &&
            `Cae sin parar, pero se mueve de lado tan rápido que nunca llega al suelo. Altura entre ${formatInteger(
              Math.round((orbit.periapsis - PLANET_RADIUS) * KM_PER_UNIT),
            )} y ${formatInteger(Math.round((orbit.apoapsis - PLANET_RADIUS) * KM_PER_UNIT))} km; una vuelta dura ${hours?.toFixed(1)} h.`}
        </p>
      </div>

      <Button onClick={() => fire()} className="self-start">
        <Rocket /> Lanzar
      </Button>
      <p className="text-sm text-muted-foreground">Tiempo acelerado: cada segundo en pantalla son unos 20 minutos.</p>
    </div>
  );
}
