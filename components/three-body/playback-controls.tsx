"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Segmented } from "@/components/ui/segmented";
import type { OrbitSlug } from "@/lib/orbits/catalog";
import { SPEEDS, isSpeed, type Speed } from "@/lib/orbits/playback";
import { usePlayback, usePlaybackStore } from "@/lib/store/playback-store";

const SPEED_LABELS: Record<Speed, string> = { 0.25: "¼×", 0.5: "½×", 1: "1×", 2: "2×", 4: "4×" };
const SPEED_OPTIONS = SPEEDS.map((s) => ({ value: String(s), label: SPEED_LABELS[s], ariaLabel: `${s} veces` }));
/** El scrub recorre el periodo en 1000 pasos; RePág/AvPág saltan de 10 en 10 (comportamiento de Radix). */
const SCRUB_STEPS = 1000;

/** `extra` va en la fila de la velocidad, a la derecha (el selector de vista 2D | 3D): no añade altura en escritorio. */
export function PlaybackControls({ slug, period, extra }: { slug: OrbitSlug; period: number; extra?: ReactNode }) {
  const { time, playing, speed } = usePlayback(slug);
  const togglePlaying = usePlaybackStore((s) => s.togglePlaying);
  const seek = usePlaybackStore((s) => s.seek);
  const setSpeed = usePlaybackStore((s) => s.setSpeed);
  const reset = usePlaybackStore((s) => s.reset);
  const speedLabelId = useId();
  const percent = Math.round((time / period) * 100);

  return (
    <div role="group" aria-label="Controles de reproducción" className="flex flex-col gap-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <Button size="icon" onClick={() => togglePlaying(slug)} aria-label={playing ? "Pausar" : "Reproducir"}>
          {playing ? <Pause /> : <Play />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => reset(slug, period)} aria-label="Reiniciar desde t = 0">
          <RotateCcw />
        </Button>
        <Slider
          className="mx-2 flex-1"
          value={[time]}
          min={0}
          max={period}
          step={period / SCRUB_STEPS}
          // El extremo derecho es t = T, que equivale a t = 0: se detiene justo
          // antes para que el control no salte al principio al arrastrarlo al final.
          onValueChange={([value]) => seek(slug, Math.min(value, period * (1 - 1e-9)), period)}
          thumbProps={{
            "aria-label": "Instante dentro del periodo",
            "aria-valuetext": `${percent} % del periodo (t = ${time.toFixed(2)} de ${period.toFixed(2)})`,
          }}
        />
        <span className="w-24 shrink-0 text-right font-mono text-sm text-muted-foreground tabular-nums" aria-hidden>
          {time.toFixed(2)} / {period.toFixed(2)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span id={speedLabelId} className="text-sm text-muted-foreground">
          Velocidad
        </span>
        <Segmented
          size="sm"
          value={String(speed)}
          options={SPEED_OPTIONS}
          onChange={(value) => {
            const n = Number(value);
            if (isSpeed(n)) setSpeed(slug, n);
          }}
          aria-labelledby={speedLabelId}
          itemClassName="px-2.5 font-mono"
        />
        {extra && <div className="ml-auto flex items-center gap-3">{extra}</div>}
      </div>
    </div>
  );
}
