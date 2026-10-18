import type { Metadata } from "next";
import Link from "next/link";
import { OrbitGallery, type GalleryItem } from "@/components/three-body/orbit-gallery";
import { ORBITS } from "@/lib/orbits/catalog";
import { summarizeOrbit } from "@/lib/orbits/summary";

export const metadata: Metadata = {
  title: "Tres cuerpos",
  description: "Seis soluciones periódicas del problema de los tres cuerpos, simuladas y verificadas.",
};

export default function ThreeBodyGalleryPage() {
  // Se ejecuta al generar la página (es estática): el navegador recibe los
  // recorridos ya dibujados y no hace física para mostrar la galería.
  const items: GalleryItem[] = ORBITS.map((orbit) => ({
    slug: orbit.slug,
    name: orbit.name,
    summary: orbit.summary,
    family: orbit.family,
    classification: orbit.classification,
    period: orbit.period,
    svg: summarizeOrbit(orbit).svg,
  }));

  return (
    <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="font-heading text-5xl sm:text-7xl">Tres cuerpos</h1>
      <p className="mt-4 max-w-prose text-lg text-muted-foreground">
        Tres cuerpos que se atraen entre sí no tienen una fórmula que prediga su movimiento para
        siempre. Aun así, hay posiciones y velocidades iniciales exactas con las que repiten la
        misma coreografía una y otra vez. Estas son seis.
      </p>
      <p className="mt-2 max-w-prose text-muted-foreground">
        En cada tarjeta, la línea tenue es el recorrido completo y los puntos de color, los tres cuerpos moviéndose.
      </p>
      <OrbitGallery items={items} />
      <aside className="mt-16 flex flex-col gap-4 rounded-2xl border border-primary/40 bg-primary/5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-heading text-3xl">¿Y si buscas tú una?</p>
          <p className="mt-1 text-muted-foreground">
            Ajusta la velocidad inicial y mide si el sistema vuelve a como empezó.
          </p>
        </div>
        <Link
          href="/tres-cuerpos/explorador"
          className="shrink-0 rounded-lg border border-primary/60 px-5 py-3 text-primary transition-colors hover:bg-primary/10"
        >
          Abrir el explorador →
        </Link>
      </aside>
    </main>
  );
}
