"use client";

import Link from "next/link";
import { useEffect, useRef, ViewTransition } from "react";
import { Segmented } from "@/components/ui/segmented";
import type { OrbitView } from "@/lib/orbits/braid";
import type { OrbitFamily, OrbitSlug } from "@/lib/orbits/catalog";
import type { OrbitSummary } from "@/lib/orbits/summary";
import { matchesFilter, useGalleryStore, type GalleryFilter } from "@/lib/store/gallery-store";
import { LiveThumbnail } from "./live-thumbnail";

export interface GalleryItem {
  readonly slug: OrbitSlug;
  readonly name: string;
  readonly summary: string;
  readonly family: OrbitFamily;
  readonly classification?: string;
  readonly period: number;
  readonly svg: OrbitSummary["svg"];
  readonly braid: OrbitSummary["braid"];
}

// En lenguaje llano: «Šuvakov y Dmitrašinović (2013)» no dice nada a quien no
// es del campo. Los autores siguen en la ficha de cada órbita.
const FILTERS: readonly { value: GalleryFilter; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "clasica", label: "Clásicas (1772 y 1993)" },
  { value: "suvakov-2013", label: "Halladas por ordenador (2013)" },
];

const VIEWS: readonly { value: OrbitView; label: string; ariaLabel: string }[] = [
  { value: "2d", label: "2D", ariaLabel: "2D: el recorrido en el plano" },
  { value: "3d", label: "3D", ariaLabel: "3D: la trenza en el tiempo" },
];

export function OrbitGallery({ items }: { items: readonly GalleryItem[] }) {
  const filter = useGalleryStore((s) => s.filter);
  const setFilter = useGalleryStore((s) => s.setFilter);
  const view = useGalleryStore((s) => s.view);
  const setView = useGalleryStore((s) => s.setView);
  const rememberExit = useGalleryStore((s) => s.rememberExit);
  const cards = useRef(new Map<OrbitSlug, HTMLAnchorElement>());

  // Al volver del detalle: misma posición de scroll y foco en la tarjeta que
  // se abrió, para que quien navega con teclado siga donde estaba. Los enlaces
  // que llevan aquí usan scroll={false}, así que la galería decide su scroll.
  useEffect(() => {
    const { lastVisited, scrollY } = useGalleryStore.getState();
    window.scrollTo({ top: lastVisited ? scrollY : 0 });
    if (lastVisited) cards.current.get(lastVisited)?.focus({ preventScroll: true });
  }, []);

  const visible = items.filter((item) => matchesFilter(item.family, filter));

  return (
    <section aria-labelledby="galeria-titulo" className="mt-10">
      <h2 id="galeria-titulo" className="sr-only">
        Soluciones
      </h2>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Segmented value={filter} options={FILTERS} onChange={setFilter} aria-label="Filtrar soluciones" />
        <div className="flex items-center gap-3">
          <span id="vista-galeria" className="text-sm text-muted-foreground">
            Vista
          </span>
          <Segmented value={view} options={VIEWS} onChange={setView} aria-labelledby="vista-galeria" />
        </div>
      </div>
      <p className="mt-3 max-w-prose text-muted-foreground">
        {view === "2d"
          ? "En cada tarjeta, la línea tenue es el recorrido completo y los puntos de color, los tres cuerpos moviéndose."
          : "El tiempo avanza hacia la derecha: cada hebra es un cuerpo, y el triángulo, el instante actual. Cuando la trenza se repite, la órbita ha dado una vuelta."}
      </p>

      <p className="sr-only" aria-live="polite">
        {visible.length} {visible.length === 1 ? "solución" : "soluciones"}
      </p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/tres-cuerpos/${item.slug}`}
              ref={(node) => {
                if (node) cards.current.set(item.slug, node);
                return () => {
                  cards.current.delete(item.slug);
                };
              }}
              onClick={() => rememberExit(item.slug, window.scrollY)}
              className="group flex h-full flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
            >
              {/* Mismo `name` que el visor del detalle: el navegador transforma uno en otro al navegar. */}
              <ViewTransition name={`orbita-${item.slug}`} share="morph" default="none">
                <div className="aspect-[4/3] w-full rounded-lg bg-background/60 p-3">
                  <LiveThumbnail slug={item.slug} name={item.name} svg={item.svg} braid={item.braid} view={view} />
                </div>
              </ViewTransition>
              <div className="mt-4 flex items-baseline justify-between gap-3">
                <h3 className="text-xl font-semibold tracking-tight">{item.name}</h3>
                {item.classification && (
                  <span className="font-mono text-sm text-muted-foreground">{item.classification}</span>
                )}
              </div>
              <p className="mt-1 font-mono text-sm text-muted-foreground">T = {item.period.toFixed(4)}</p>
              <p className="mt-3 text-sm text-muted-foreground">{item.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
