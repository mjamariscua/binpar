import type { Metadata } from "next";
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
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Tres cuerpos</h1>
      <p className="mt-4 max-w-prose text-lg text-muted-foreground">
        Tres cuerpos que se atraen entre sí no tienen una fórmula que prediga su movimiento para
        siempre. Aun así, hay posiciones y velocidades iniciales exactas con las que repiten la
        misma coreografía una y otra vez. Estas son seis.
      </p>
      <OrbitGallery items={items} />
    </main>
  );
}
