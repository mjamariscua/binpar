import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrbitDataPanel, OrbitSummaryPanel } from "@/components/three-body/orbit-details";
import { OrbitDrawing } from "@/components/three-body/orbit-drawing";
import { OrbitPlayer } from "@/components/three-body/orbit-player";
import { ShapeDrawing } from "@/components/three-body/shape-drawing";
import { FAMILY_LABELS, ORBITS, getOrbit } from "@/lib/orbits/catalog";
import { summarizeOrbit } from "@/lib/orbits/summary";

/** Enlaces de navegación entre órbitas: 44 px de alto en pantallas táctiles. */
const NAV_LINK = "inline-flex items-center rounded-sm text-muted-foreground hover:text-foreground pointer-coarse:min-h-11";

// Las seis rutas se generan al compilar; cualquier otro slug es un 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return ORBITS.map((orbit) => ({ slug: orbit.slug }));
}

export async function generateMetadata({ params }: PageProps<"/tres-cuerpos/[slug]">): Promise<Metadata> {
  const orbit = getOrbit((await params).slug);
  return orbit ? { title: orbit.name, description: orbit.summary } : {};
}

export default async function OrbitPage({ params }: PageProps<"/tres-cuerpos/[slug]">) {
  const orbit = getOrbit((await params).slug);
  if (!orbit) notFound();

  const summary = summarizeOrbit(orbit);
  const index = ORBITS.indexOf(orbit);
  const previous = ORBITS[(index - 1 + ORBITS.length) % ORBITS.length];
  const next = ORBITS[(index + 1) % ORBITS.length];

  return (
    <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <nav aria-label="Órbitas" className="flex flex-wrap items-center justify-between gap-3 text-sm">
        {/* scroll={false}: la galería restaura su propio scroll al volver. */}
        <Link href="/tres-cuerpos" scroll={false} className={NAV_LINK}>
          ← Galería
        </Link>
        <div className="flex gap-4">
          <Link href={`/tres-cuerpos/${previous.slug}`} className={NAV_LINK}>
            <span className="sr-only">Anterior: </span>‹ {previous.name}
          </Link>
          <Link href={`/tres-cuerpos/${next.slug}`} className={NAV_LINK}>
            <span className="sr-only">Siguiente: </span>
            {next.name} ›
          </Link>
        </div>
      </nav>

      <header className="mt-6">
        <p className="text-sm text-muted-foreground">
          {FAMILY_LABELS[orbit.family]}
          {orbit.classification && <span className="font-mono"> · {orbit.classification}</span>}
        </p>
        <h1 className="mt-1 font-heading text-5xl sm:text-7xl">{orbit.name}</h1>
        <p className="mt-3 max-w-prose text-lg text-muted-foreground">{orbit.summary}</p>
      </header>

      {/*
        minmax(0, 1fr) también en móvil: sin columnas explícitas, la pista
        implícita es `auto` y crece hasta el ancho mínimo de la tabla de
        condiciones iniciales, que desbordaba la página a 375 px.
      */}
      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <OrbitPlayer
          slug={orbit.slug}
          name={orbit.name}
          period={orbit.period}
          masses={orbit.system.masses}
          poster={<OrbitDrawing svg={summary.svg} label={`Recorrido completo de ${orbit.name}`} />}
          braidPoster={<OrbitDrawing svg={summary.braid} label={`Trenza de ${orbit.name}: el tiempo avanza hacia la derecha`} />}
          shapePoster={<ShapeDrawing shape={summary.shape} label={`${orbit.name} en la esfera de formas`} />}
        />
        <OrbitSummaryPanel orbit={orbit} summary={summary} />
      </div>

      <div className="mt-14 border-t border-border/60 pt-10">
        <OrbitDataPanel orbit={orbit} />
      </div>
    </main>
  );
}
