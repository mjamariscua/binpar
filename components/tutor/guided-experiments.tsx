"use client";

import { FlaskConical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { profileFrom, type DiagnosticAnswers } from "@/lib/tutor/diagnostic";
import { runTutorTool } from "@/lib/tutor/run-tool";
import { orderedExperiments, type Experiment } from "@/lib/tutor/static-guide";

/**
 * Modo sin clave: experimentos escritos de antemano, ordenados según el
 * diagnóstico. «Probar» ejecuta la misma acción que usaría el tutor y muestra
 * una explicación fija. La interfaz lo dice: nada aquí lo escribe un modelo.
 */
export function GuidedExperiments({ answers }: { answers: DiagnosticAnswers }) {
  const experiments = orderedExperiments(profileFrom(answers));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">
        Experimentos guiados, escritos de antemano y ordenados según tus respuestas. Primero piensa la pregunta;
        después pulsa «Probar» y mira el laboratorio.
      </p>
      <ol className="flex flex-col gap-3">
        {experiments.map((e, i) => (
          <ExperimentItem key={e.id} experiment={e} number={i + 1} />
        ))}
      </ol>
    </div>
  );
}

function ExperimentItem({ experiment, number }: { experiment: Experiment; number: number }) {
  const [done, setDone] = useState(false);
  const explanationRef = useRef<HTMLParagraphElement>(null);

  // «Probar» desaparece al pulsarlo: el foco pasa a la explicación que lo
  // sustituye. Sin desplazar, porque el laboratorio se acaba de poner a la vista.
  useEffect(() => {
    if (done) explanationRef.current?.focus({ preventScroll: true });
  }, [done]);

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <p className="font-mono text-xs text-primary">Experimento {number}</p>
      <h3 className="mt-1 text-lg">{experiment.title}</h3>
      <p className="mt-2 text-muted-foreground">{experiment.prediction}</p>
      {done ? (
        <p ref={explanationRef} tabIndex={-1} role="status" className="mt-3 border-t border-border pt-3 outline-none">
          {experiment.explanation}
        </p>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => {
            runTutorTool(experiment.call, "guia");
            setDone(true);
          }}
        >
          <FlaskConical /> Probar
        </Button>
      )}
    </li>
  );
}
