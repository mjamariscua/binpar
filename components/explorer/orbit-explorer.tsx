"use client";

import { Crosshair, Sparkles } from "lucide-react";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LiveSummary } from "@/components/ui/live-summary";
import { Slider } from "@/components/ui/slider";
import { PRESETS, T_MAX_LIMITS, VELOCITY_LIMITS } from "@/lib/explorer/explorer";
import type { SearchView } from "@/lib/explorer/messages";
import { formatScientific } from "@/lib/format";
import { BODY_COLORS, SCENE_BACKGROUND } from "@/lib/orbits/colors";
import { cn } from "@/lib/utils";
import { useExplorerWorker } from "./use-explorer-worker";

/** Espera tras el último cambio antes de recalcular: arrastrar no lanza cien búsquedas. */
const DEBOUNCE_MS = 150;

/**
 * Explorador: eliges la velocidad inicial (vx, vy) de los cuerpos exteriores,
 * se integra hasta T máx. y se mide cuánto vuelve el sistema a su estado
 * inicial. «Refinar» busca cerca unos (vx, vy) que vuelvan mejor.
 */
export function OrbitExplorer() {
  const [vx, setVx] = useState(0.4644);
  const [vy, setVy] = useState(0.3961);
  const [tMax, setTMax] = useState(20);
  const [untilReturn, setUntilReturn] = useState(true);
  const { search, refined, busy, error, send, clearRefined } = useExplorerWorker();

  useEffect(() => {
    const timer = setTimeout(() => send({ kind: "search", vx, vy, tMax }), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [vx, vy, tMax, send]);

  const loadPreset = (p: (typeof PRESETS)[number]) => {
    setVx(p.vx);
    setVy(p.vy);
    setTMax(Math.min(T_MAX_LIMITS.max, Math.ceil(p.period * 1.3)));
    clearRefined();
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="flex flex-col gap-4">
        <div
          className="relative aspect-square w-full overflow-hidden rounded-xl border border-border sm:aspect-[4/3]"
          style={{ background: SCENE_BACKGROUND }}
        >
          {search && <Trajectory search={search} untilReturn={untilReturn} />}
          {/* Solo visual: con el debounce aparece y desaparece a menudo; lo que se anuncia es el veredicto. */}
          {busy.search && (
            <p aria-hidden className="absolute top-3 left-3 rounded-md bg-background/70 px-2 py-1 text-sm text-muted-foreground">
              Calculando…
            </p>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground pointer-coarse:min-h-11">
          <input type="checkbox" checked={untilReturn} onChange={(e) => setUntilReturn(e.target.checked)} className="accent-primary" />
          Dibujar solo hasta el mejor retorno
        </label>
      </div>

      <div className="flex flex-col gap-6">
        <ReturnMeter search={search} />

        <VelocityControl label="vx (horizontal)" value={vx} onChange={setVx} />
        <VelocityControl label="vy (vertical)" value={vy} onChange={setVy} />
        <TimeControl value={tMax} onChange={setTMax} />

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <Button
            onClick={() => search && send({ kind: "refine", vx, vy, periodGuess: search.bestTime })}
            disabled={!search || search.outcome !== "ok" || busy.refine || search.bestTime === 0}
            className="self-start"
          >
            <Crosshair /> {busy.refine ? "Refinando…" : "Refinar cerca de aquí"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Busca unos (vx, vy) cercanos que vuelvan mejor, cerca del mismo instante de retorno (método de Nelder–Mead,
            unas 80 órbitas integradas).
          </p>
          {/* Región viva estable: el resultado aparece dentro y así se anuncia. */}
          <div aria-live="polite">
            {refined && (
              <div className="border-t border-border pt-3 text-sm">
                <p>
                  De <Num>{formatScientific(refined.before)}</Num> a <Num>{formatScientific(refined.after)}</Num> en{" "}
                  {refined.evaluations} órbitas: vx = <Num>{refined.vx.toFixed(7)}</Num>, vy ={" "}
                  <Num>{refined.vy.toFixed(7)}</Num>, T ≈ <Num>{refined.period.toFixed(4)}</Num>.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setVx(refined.vx);
                    setVy(refined.vy);
                    clearRefined();
                  }}
                >
                  <Sparkles /> Usar estos valores
                </Button>
              </div>
            )}
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Órbitas conocidas en esta configuración:</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button key={p.label} variant="outline" size="sm" onClick={() => loadPreset(p)} title={p.source}>
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Num({ children }: { children: ReactNode }) {
  return <span className="font-mono tabular-nums">{children}</span>;
}

/** Lee «0,46» o «0.46»; null si no es un número dentro de los límites. */
function parseVelocity(text: string): number | null {
  const v = Number(text.trim().replace(",", "."));
  if (text.trim() === "" || !Number.isFinite(v)) return null;
  return v >= VELOCITY_LIMITS.min && v <= VELOCITY_LIMITS.max ? v : null;
}

/**
 * Campo y slider de una velocidad. Mientras se escribe, el texto es local (se
 * puede borrar entero o dejar a medias); se aplica con Intro o al salir del
 * campo, y Escape lo descarta. Un valor no válido se marca al intentar
 * aplicarlo y no cambia nada.
 */
function VelocityControl({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const id = useId();
  const hintId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  // Se marca al intentar aplicar un valor no válido, no mientras se escribe.
  const [invalid, setInvalid] = useState(false);

  const commit = () => {
    if (draft === null) return;
    const v = parseVelocity(draft);
    if (v === null) {
      setInvalid(true);
      return;
    }
    onChange(v);
    setDraft(null);
    setInvalid(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={draft ?? String(Number(value.toFixed(7)))}
          aria-invalid={invalid}
          aria-describedby={hintId}
          onChange={(e) => {
            setDraft(e.target.value);
            setInvalid(false);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(null);
              setInvalid(false);
            }
          }}
          className="w-32 rounded-md border border-border-strong bg-transparent px-2 py-1 text-right font-mono text-base tabular-nums aria-invalid:border-destructive sm:text-sm pointer-coarse:min-h-11"
        />
      </div>
      <p id={hintId} className={cn("text-sm", invalid ? "text-destructive" : "sr-only")}>
        Un número entre {VELOCITY_LIMITS.min} y {VELOCITY_LIMITS.max}; se aplica con Intro o al salir del campo.
      </p>
      <Slider
        value={[value]}
        min={VELOCITY_LIMITS.min}
        max={VELOCITY_LIMITS.max}
        step={0.0005}
        onValueChange={([v]) => {
          setDraft(null);
          setInvalid(false);
          onChange(v);
        }}
        thumbProps={{ "aria-label": label, "aria-valuetext": value.toFixed(4) }}
      />
    </div>
  );
}

function TimeControl({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-sm">
        <span>Tiempo máximo</span>
        <span className="font-mono tabular-nums">{value}</span>
      </div>
      <Slider
        value={[value]}
        min={T_MAX_LIMITS.min}
        max={T_MAX_LIMITS.max}
        step={1}
        onValueChange={([v]) => onChange(v)}
        thumbProps={{ "aria-label": "Tiempo máximo de integración", "aria-valuetext": `${value} unidades` }}
      />
    </div>
  );
}

/**
 * Proximidad de retorno en escala logarítmica: de 1 (no vuelve) a 10⁻⁶
 * (periódica a efectos prácticos). Las seis órbitas de la galería marcan
 * entre 10⁻⁷ y 10⁻¹⁰ en su periodo.
 */
function ReturnMeter({ search }: { search: SearchView | null }) {
  if (!search) {
    return <div className="h-28 animate-pulse rounded-xl border border-border bg-card" aria-hidden />;
  }
  const { bestDistance, bestTime, outcome } = search;
  const exponent = bestDistance > 0 ? -Math.log10(bestDistance) : 6;
  const fill = Math.min(1, Math.max(0, exponent / 6));
  const tone = bestDistance < 1e-3 ? "bg-success" : bestDistance < 1e-1 ? "bg-primary" : "bg-destructive";
  const verdict =
    outcome === "colision"
      ? "Dos cuerpos chocan: no hay órbita periódica aquí."
      : outcome === "escape"
        ? "Un cuerpo escapa del sistema: no volverá."
        : bestDistance < 1e-5
          ? "Vuelve a su estado inicial: es (casi seguro) una órbita periódica."
          : bestDistance < 1e-2
            ? "Vuelve muy cerca. Prueba a refinar."
            : "No vuelve cerca de donde empezó.";

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <LiveSummary
        text={outcome === "ok" && Number.isFinite(bestDistance) ? `Distancia de retorno ${formatScientific(bestDistance)}. ${verdict}` : verdict}
      />
      <p className="text-sm text-muted-foreground">Proximidad de retorno</p>
      <p className="mt-1 font-mono text-2xl tabular-nums">
        {outcome === "ok" && Number.isFinite(bestDistance) ? formatScientific(bestDistance) : "—"}
        {outcome === "ok" && bestTime > 0 && (
          <span className="ml-2 text-sm text-muted-foreground">en t = {bestTime.toFixed(3)}</span>
        )}
      </p>
      <div
        role="meter"
        aria-label="Proximidad de retorno (escala logarítmica)"
        aria-valuemin={0}
        aria-valuemax={6}
        aria-valuenow={Number(exponent.toFixed(2))}
        aria-valuetext={outcome === "ok" ? `distancia ${formatScientific(bestDistance)}` : verdict}
        className="mt-3 h-2 overflow-hidden rounded-full bg-border-strong"
      >
        <div className={cn("h-full rounded-full transition-[width] duration-300", tone)} style={{ width: `${fill * 100}%` }} />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>1</span>
        <span>10⁻³</span>
        <span>10⁻⁶</span>
      </div>
      <p className="mt-3 text-sm">{verdict}</p>
    </div>
  );
}

function Trajectory({ search, untilReturn }: { search: SearchView; untilReturn: boolean }) {
  const { viewBox, paths, starts } = useMemo(() => {
    const fraction = untilReturn && search.bestTime > 0 ? Math.min(1, search.bestTime / search.endTime) : 1;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    const cut = search.paths.map((p) => p.subarray(0, Math.max(4, Math.floor((p.length / 2) * fraction) * 2)));
    for (const p of cut) {
      for (let i = 0; i < p.length; i += 2) {
        minX = Math.min(minX, p[i]);
        maxX = Math.max(maxX, p[i]);
        minY = Math.min(minY, -p[i + 1]);
        maxY = Math.max(maxY, -p[i + 1]);
      }
    }
    const pad = Math.max(maxX - minX, maxY - minY) * 0.08 || 1;
    return {
      viewBox: `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`,
      paths: cut.map((p) => {
        let d = "";
        for (let i = 0; i < p.length; i += 2) d += `${i === 0 ? "M" : "L"}${p[i].toFixed(3)} ${(-p[i + 1]).toFixed(3)}`;
        return d;
      }),
      starts: search.paths.map((p) => [p[0], -p[1]] as const),
    };
  }, [search, untilReturn]);

  return (
    <svg viewBox={viewBox} className="h-full w-full" role="img" aria-label="Trayectorias de los tres cuerpos">
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={BODY_COLORS[i]} strokeOpacity={0.85} strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
      ))}
      {starts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={0.03} fill={BODY_COLORS[i]} />
      ))}
    </svg>
  );
}
