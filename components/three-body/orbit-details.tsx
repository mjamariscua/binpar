import type { ReactNode } from "react";
import { ScrollX } from "@/components/ui/scroll-x";
import { SHAPE_SPHERE_NOTE, type Citation, type PeriodicOrbit } from "@/lib/orbits/catalog";
import { BODY_COLORS } from "@/lib/orbits/colors";
import type { OrbitSummary } from "@/lib/orbits/summary";
import { ShowShapeButton } from "./show-shape-button";
import { formatInteger, formatScientific, formatValue } from "@/lib/format";

/*
 * Datos del detalle, en dos piezas. Todo es estático: se calcula al generar
 * la página.
 *
 * - OrbitSummaryPanel, junto al visor: qué estás viendo, en lenguaje llano, y
 *   las magnitudes y su verificación.
 * - OrbitDataPanel, a todo el ancho debajo: condiciones iniciales y fuentes.
 *   En la columna lateral (24 rem) la tabla no cabía y había que desplazarla.
 */

export function OrbitSummaryPanel({ orbit, summary }: { orbit: PeriodicOrbit; summary: OrbitSummary }) {
  return (
    <aside aria-label="Datos de la órbita" className="flex min-w-0 flex-col gap-8 text-sm">
      <Section title="Qué estás viendo">
        <p className="text-base text-muted-foreground">
          Cada punto de color es uno de los tres cuerpos, todos con la misma masa. La línea tenue es el recorrido
          completo; la estela, lo que cada cuerpo acaba de recorrer. Solo los mueve la atracción entre ellos, y al
          cabo de un periodo vuelven exactamente a donde empezaron: por eso la coreografía se repite.
        </p>
        <p className="mt-3 text-muted-foreground">
          En la vista 3D, el tiempo es la tercera dimensión: cada cuerpo dibuja una hebra y la órbita periódica, una
          trenza que se repite cada periodo. Así clasificó Moore (1993) estas órbitas, y buscando una trenza concreta
          encontró la figura de ocho.
        </p>
        <p className="mt-3 text-muted-foreground">
          En la vista «Dentro», la órbita es el suelo y tú estás en ella: en el centro de masas, el único punto que no
          se mueve, o viajando sobre un cuerpo, desde donde ves cómo se mueven los otros dos respecto a ti.
        </p>
        <p className="mt-3 text-muted-foreground">
          En la vista «Forma» solo cuenta la forma del triángulo que hacen los tres cuerpos. Sus posiciones son 6
          números; sin el centro de masas, que no se mueve, quedan 4, un espacio de cuatro dimensiones, y sin el
          tamaño ni el giro del triángulo, 2: un punto de una esfera. Cada órbita dibuja una curva en ella; la de
          Lagrange es un solo punto, porque su triángulo nunca cambia de forma.
        </p>
        {/* Antes iba bajo el título y empujaba los controles fuera de la primera pantalla. */}
        {orbit.family === "suvakov-2013" && (
          <div>
            <p className="mt-3 text-muted-foreground">{SHAPE_SPHERE_NOTE}</p>
            <ShowShapeButton />
          </div>
        )}
      </Section>

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
    </aside>
  );
}

export function OrbitDataPanel({ orbit }: { orbit: PeriodicOrbit }) {
  const [first] = orbit.bodies;

  return (
    <section
      aria-label="Condiciones iniciales y fuentes"
      // minmax(0, 1fr) en móvil: con la pista implícita (auto), la tabla ensancharía la página.
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-10 text-sm lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
    >
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
    </section>
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
