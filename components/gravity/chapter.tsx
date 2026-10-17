import type { ReactNode } from "react";

/** Un capítulo de la Parte A: número, título grande y contenido. */
export function Chapter({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="scroll-mt-20 border-t border-border/60 py-16 sm:py-24">
      <p className="font-mono text-sm text-primary">Capítulo {number}</p>
      <h2 id={`${id}-titulo`} className="mt-2 font-heading text-4xl text-balance sm:text-6xl">
        {title}
      </h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

/** Párrafo de texto corrido con la medida de lectura cómoda. */
export function Prose({ children }: { children: ReactNode }) {
  return <div className="max-w-prose space-y-4 text-lg leading-relaxed text-foreground/90">{children}</div>;
}
