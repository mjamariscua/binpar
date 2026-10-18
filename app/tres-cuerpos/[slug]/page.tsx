import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrbitDetails } from "@/components/three-body/orbit-details";
import { OrbitDrawing } from "@/components/three-body/orbit-drawing";
import { OrbitPlayer } from "@/components/three-body/orbit-player";
import { FAMILY_LABELS, ORBITS, SHAPE_SPHERE_NOTE, getOrbit } from "@/lib/orbits/catalog";
import { summarizeOrbit } from "@/lib/orbits/summary";

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
        <Link href="/tres-cuerpos" scroll={false} className="rounded-sm text-muted-foreground hover:text-foreground">
          ← Galería
        </Link>
        <div className="flex gap-4">
          <Link href={`/tres-cuerpos/${previous.slug}`} className="rounded-sm text-muted-foreground hover:text-foreground">
            <span className="sr-only">Anterior: </span>‹ {previous.name}
          </Link>
          <Link href={`/tres-cuerpos/${next.slug}`} className="rounded-sm text-muted-foreground hover:text-foreground">
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
        {orbit.family === "suvakov-2013" && (
          <p className="mt-2 max-w-prose text-sm text-muted-foreground">{SHAPE_SPHERE_NOTE}</p>
        )}
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
          poster={<OrbitDrawing svg={summary.svg} label={`Recorrido completo de ${orbit.name}`} />}
        />
        <OrbitDetails orbit={orbit} summary={summary} />
      </div>
    </main>
  );
}
