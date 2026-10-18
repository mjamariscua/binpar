import type { ReactNode } from "react";

/**
 * Bloque «Experimento» dentro de un capítulo: una etiqueta y la pregunta que
 * se responde tocando, como título. Así, en una página larga, se distingue lo
 * que se lee de lo que se hace. La instrucción (Hint) va dentro del widget,
 * que también se usa en el laboratorio del capítulo 4.
 */
export function Experiment({ id, question, children }: { id: string; question: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-pregunta`} className="mt-12">
      <p className="font-mono text-sm text-primary">Experimento</p>
      <h3 id={`${id}-pregunta`} className="mt-1 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
        {question}
      </h3>
      <div className="mt-6">{children}</div>
    </section>
  );
}
