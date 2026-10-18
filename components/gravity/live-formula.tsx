"use client";

import { MoveHorizontal, RotateCcw } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { EARTH_MOON_FORCE_N } from "@/lib/gravity/earth-moon";
import { FORMULA_LIMITS, explainChange, forceRatio, type FormulaSymbol } from "@/lib/gravity/formula";
import { formatScientific } from "@/lib/format";
import { useLabStore } from "@/lib/store/lab-store";
import { Hint } from "./hint";
import { ScrubValue } from "./scrub-value";

const UNITS: Record<FormulaSymbol, { short: string; long: string }> = {
  m1: { short: "× Tierra", long: "veces la masa de la Tierra" },
  m2: { short: "× Luna", long: "veces la masa de la Luna" },
  r: { short: "× 384 400 km", long: "veces la distancia Tierra–Luna" },
};

const fmt = (v: number) => v.toFixed(2);

/**
 * Capítulo 2: F = G·m₁·m₂/r² con m₁, m₂ y r como controles. Debajo, los dos
 * cuerpos y la fuerza que se hacen, con una frase que explica cada cambio.
 * El estado vive en el store del laboratorio, así que el tutor del capítulo 4
 * puede mover estos mismos controles.
 */
export function LiveFormula() {
  const formula = useLabStore((s) => s.formula);
  const lastChange = useLabStore((s) => s.lastChange);
  const setSymbol = useLabStore((s) => s.setSymbol);
  const resetFormula = useLabStore((s) => s.resetFormula);
  const [showG, setShowG] = useState(false);
  const gNoteId = useId();
  const ratio = forceRatio(formula);

  const symbol = (key: FormulaSymbol, glyph: ReactNode) => (
    <ScrubValue
      value={formula[key]}
      min={FORMULA_LIMITS[key].min}
      max={FORMULA_LIMITS[key].max}
      onChange={(v) => setSymbol(key, v)}
      label={key === "r" ? "Distancia r" : key === "m1" ? "Masa m₁" : "Masa m₂"}
      valueText={`${fmt(formula[key])} ${UNITS[key].long}`}
    >
      <span className="italic">{glyph}</span>
      <span className="font-mono text-xs text-muted-foreground not-italic tabular-nums">
        {fmt(formula[key])} {UNITS[key].short}
      </span>
    </ScrubValue>
  );

  return (
    <div className="flex flex-col gap-8">
      <Hint icon={MoveHorizontal}>
        Arrastra en horizontal los símbolos subrayados (m₁, m₂ y r), o enfócalos con el tabulador y usa las flechas.
      </Hint>
      <div role="group" aria-label="Fórmula de la gravitación universal: F igual a G por m₁ por m₂ entre r al cuadrado" className="rounded-2xl border border-border bg-card px-4 py-8">
        <div className="flex items-center justify-center gap-3 font-heading text-5xl sm:gap-5 sm:text-7xl">
          <div className="flex flex-col items-center">
            <span className="italic">F</span>
            <span className="font-mono text-xs text-glow-amber tabular-nums">× {ratio < 0.01 ? ratio.toExponential(1) : fmt(ratio)}</span>
          </div>
          <span aria-hidden>=</span>
          <button
            type="button"
            onClick={() => setShowG((v) => !v)}
            aria-expanded={showG}
            aria-controls={gNoteId}
            className="flex flex-col items-center rounded-lg px-2 py-1 italic hover:bg-muted"
          >
            G
            <span className="font-mono text-xs text-muted-foreground not-italic">¿qué es?</span>
          </button>
          <span aria-hidden className="text-muted-foreground">·</span>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-end gap-2 sm:gap-4">
              {symbol("m1", <>m<sub className="text-[0.5em]">1</sub></>)}
              <span aria-hidden className="pb-6 text-muted-foreground">·</span>
              {symbol("m2", <>m<sub className="text-[0.5em]">2</sub></>)}
            </div>
            <div aria-hidden className="h-0.5 w-full bg-foreground/80" />
            {symbol("r", <>r<sup className="text-[0.5em]">2</sup></>)}
          </div>
        </div>
        <p id={gNoteId} hidden={!showG} className="mx-auto mt-6 max-w-prose text-center text-sm text-muted-foreground">
          G = 6.674·10⁻¹¹ N·m²/kg² es la constante de gravitación universal: el mismo número para una manzana, la
          Luna o dos galaxias. Es tan pequeña que la atracción entre dos personas es imperceptible. Henry Cavendish
          la midió en 1798 con dos bolas de plomo y una balanza de torsión.
        </p>
      </div>

      <ForceDiagram m1={formula.m1} m2={formula.m2} r={formula.r} ratio={ratio} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p aria-live="polite" className="min-h-14 max-w-prose text-lg">
          {lastChange ? (
            <>
              {lastChange.by === "tutor" && <span className="text-primary">El tutor: </span>}
              {lastChange.by === "guia" && <span className="text-primary">Experimento: </span>}
              {explainChange(lastChange.symbol, lastChange.before, lastChange.after)}
            </>
          ) : (
            <span className="text-muted-foreground">La fuerza con que se atraen hoy la Tierra y la Luna.</span>
          )}
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <span className="font-mono text-sm text-muted-foreground tabular-nums">
            F = {formatScientific(ratio * EARTH_MOON_FORCE_N, 3)} N
          </span>
          <Button variant="outline" size="sm" onClick={resetFormula}>
            <RotateCcw /> Tierra y Luna de hoy
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Los dos cuerpos y la fuerza sobre cada uno. Las flechas miden lo mismo
 * porque la fuerza es mutua (tercera ley de Newton): la Luna tira de la Tierra
 * exactamente igual que la Tierra de la Luna. La longitud sigue una escala
 * logarítmica de la fuerza y la separación la raíz de r: ninguna de las dos
 * está a escala, solo crecen y decrecen en el sentido correcto.
 */
function ForceDiagram({ m1, m2, r, ratio }: { m1: number; m2: number; r: number; ratio: number }) {
  const separation = px(220 * Math.sqrt(r));
  const earthX = px(300 - separation / 2);
  const moonX = px(300 + separation / 2);
  const earthR = px(34 * Math.cbrt(m1));
  // La Luna tiene 1/81 de la masa de la Tierra: con densidad parecida, 0.23 veces su radio.
  const moonR = px(34 * Math.cbrt(m2 / 81.3));
  const arrow = px(Math.min(150, Math.max(14, 60 + 22 * Math.log2(ratio))));
  const arrowY = px(110 - Math.max(earthR, moonR) - 26);

  return (
    <svg viewBox="0 0 600 220" className="w-full" role="img" aria-label={`La Tierra y la Luna se atraen con ${ratio.toFixed(2)} veces la fuerza actual, igual sobre cada una.`}>
      <circle cx={earthX} cy={110} r={earthR} fill="var(--glow-cyan)" fillOpacity={0.85} />
      <circle cx={moonX} cy={110} r={moonR} fill="#d9d6cf" />
      <Arrow x={earthX} y={arrowY} length={arrow} direction={1} />
      <Arrow x={moonX} y={arrowY} length={arrow} direction={-1} />
      <text x={earthX} y={110 + earthR + 22} textAnchor="middle" fontSize={14} fill="var(--muted-foreground)">
        Tierra
      </text>
      <text x={moonX} y={110 + Math.max(moonR, 8) + 22} textAnchor="middle" fontSize={14} fill="var(--muted-foreground)">
        Luna
      </text>
    </svg>
  );
}

/**
 * Redondea a la centésima de píxel. Math.cbrt, Math.log2 y compañía no están
 * obligadas a redondear igual en todos los motores: Node (servidor) y Chrome
 * (cliente) difieren en el último bit y React lo detecta como desajuste de
 * hidratación. Una centésima de píxel es invisible y elimina la diferencia.
 */
const px = (v: number) => Math.round(v * 100) / 100;

function Arrow({ x, y, length, direction }: { x: number; y: number; length: number; direction: 1 | -1 }) {
  const end = x + direction * length;
  return (
    <g stroke="var(--glow-amber)" fill="var(--glow-amber)">
      <line x1={x} y1={y} x2={end - direction * 8} y2={y} strokeWidth={3} />
      <path d={`M ${end} ${y} L ${end - direction * 12} ${y - 7} L ${end - direction * 12} ${y + 7} Z`} stroke="none" />
    </g>
  );
}
