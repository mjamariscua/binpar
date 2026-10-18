import type { ReactNode } from "react";
import { ScrollX } from "@/components/ui/scroll-x";
import type { Citation, PeriodicOrbit } from "@/lib/orbits/catalog";
import { BODY_COLORS } from "@/lib/orbits/colors";
import type { OrbitSummary } from "@/lib/orbits/summary";
import { formatInteger, formatScientific, formatValue } from "@/lib/format";

/** Panel de datos del detalle. Todo es estático: se calcula al generar la página. */
export function OrbitDetails({ orbit, summary }: { orbit: PeriodicOrbit; summary: OrbitSummary }) {
  const [first] = orbit.bodies;

  return (
    <aside aria-label="Datos de la órbita" className="flex min-w-0 flex-col gap-8 text-sm">
      <Section title="Magnitudes">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <Term label="Periodo T" value={formatValue(orbit.period)} />
          <Term label="Energía total E" value={formatValue(summary.energy, 10)} />
          <Term label="Momento angular L" value={formatValue(summary.angularMomentum, 10)} />
          <Term label="Masas y G" value="m₁ = m₂ = m₃ = 1, G = 1" />
        </dl>
        <p className="mt-3 text-muted-foreground">
          La energía y el momento angular no cambian durante el movimiento: son los mismos en cualquier
          instante del periodo.
        </p>
      </Section>

      <Section title="Verificación">
        <p>
          Tras un periodo, el sistema vuelve a su estado inicial con un error de{" "}
          <Num>{formatScientific(summary.closure)}</Num> (en posiciones,{" "}
          <Num>{formatScientific(summary.positionClosure)}</Num>). La energía se mantiene con una desviación
          relativa máxima de <Num>{formatScientific(summary.energyDrift)}</Num>.
        </p>
        <p className="mt-2 text-muted-foreground">
          {formatInteger(summary.steps)} pasos de Runge–Kutta 4 por periodo, {formatInteger(summary.samples)}{" "}
          muestras guardadas.
        </p>
      </Section>

      <Section title="Condiciones iniciales">
        <ScrollX label="Condiciones iniciales (se desplaza en horizontal)">
          <table className="w-full font-mono text-sm tabular-nums">
            <caption className="sr-only">Posición y velocidad de cada cuerpo en t = 0</caption>
            <thead className="text-left text-muted-foreground">
              <tr>
                <th scope="col" className="py-1 pr-3 font-normal">
                  Cuerpo
                </th>
                {["x", "y", "vx", "vy"].map((h) => (
                  <th key={h} scope="col" className="py-1 pr-3 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orbit.bodies.map(({ position, velocity }, i) => (
                <tr key={i} className="border-t border-border/60">
                  <th scope="row" className="py-1.5 pr-3 font-normal">
                    <span className="inline-flex items-center gap-2">
                      <span aria-hidden className="size-2 rounded-full" style={{ background: BODY_COLORS[i] }} />
                      {i + 1}
                    </span>
                  </th>
                  {[position.x, position.y, velocity.x, velocity.y].map((v, j) => (
                    <td key={j} className="py-1.5 pr-3 whitespace-nowrap">
                      {formatValue(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollX>
        {orbit.family === "suvakov-2013" && (
          <p className="mt-3 text-muted-foreground">
            Configuración colineal isósceles: cuerpos en (−1, 0), (1, 0) y (0, 0); los dos exteriores con
            velocidad (vx, vy) = ({formatValue(first.velocity.x)}, {formatValue(first.velocity.y)}) y el
            central con −2·(vx, vy).
          </p>
        )}
      </Section>

      <Section title="Fuentes">
        <dl className="flex flex-col gap-4">
          <div>
            <dt className="text-muted-foreground">Descubrimiento</dt>
            <dd className="mt-1">
              <CitationText citation={orbit.discovery} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">De dónde salen los números</dt>
            <dd className="mt-1">
              <CitationText citation={orbit.values} />
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-muted-foreground">{orbit.provenance}</p>
      </Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </>
  );
}

function Num({ children }: { children: ReactNode }) {
  return <span className="font-mono whitespace-nowrap">{children}</span>;
}

function CitationText({ citation }: { citation: Citation }) {
  return (
    <span>
      {citation.authors}. <cite>{citation.title}</cite>.{" "}
      {citation.url ? (
        <a href={citation.url} className="underline underline-offset-2 hover:text-muted-foreground">
          {citation.reference}
        </a>
      ) : (
        citation.reference
      )}
      {citation.locator && <span className="block text-muted-foreground">{citation.locator}</span>}
    </span>
  );
}
