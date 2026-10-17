import type { Metadata } from "next";
import Link from "next/link";
import { OrbitExplorer } from "@/components/explorer/orbit-explorer";

export const metadata: Metadata = {
  title: "Explorador de órbitas",
  description: "Busca tu propia órbita periódica de tres cuerpos ajustando la velocidad inicial.",
};

export default function ExplorerPage() {
  return (
    <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/tres-cuerpos" scroll={false} className="rounded-sm text-sm text-muted-foreground hover:text-foreground">
        ← Galería
      </Link>
      <h1 className="mt-6 font-heading text-5xl sm:text-7xl">Busca tu órbita</h1>
      <div className="mt-4 max-w-prose space-y-3 text-lg text-muted-foreground">
        <p>
          Los tres cuerpos salen siempre de la misma línea: (−1, 0), (1, 0) y (0, 0). Tú eliges la velocidad inicial
          de los dos de fuera (el del centro va al doble y en sentido contrario, para que el conjunto no se desplace).
        </p>
        <p>
          Se simula hasta el tiempo máximo y se mide cuánto vuelve el sistema a como empezó, contando posiciones y
          velocidades. Si vuelve exactamente, has encontrado una órbita periódica. Así cribaron Šuvakov y
          Dmitrašinović las suyas en 2013; «refinar» hace lo mismo a pequeña escala.
        </p>
      </div>
      <div className="mt-10">
        <OrbitExplorer />
      </div>
      <p className="mt-10 max-w-prose text-sm text-muted-foreground">
        Límites: paso fijo de integración (2.5·10⁻⁴), así que los encuentros muy cercanos pierden precisión; y la
        mayoría de estas órbitas son inestables, de modo que un retorno de 10⁻³ puede ser una órbita periódica cercana
        o una casualidad. Un hallazgo aquí es una candidata, no una demostración.
      </p>
    </main>
  );
}
