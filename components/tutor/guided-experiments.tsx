"use client";

import { FlaskConical } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { profileFrom, type DiagnosticAnswers } from "@/lib/tutor/diagnostic";
import { runTutorTool } from "@/lib/tutor/run-tool";
import { orderedExperiments } from "@/lib/tutor/static-guide";

/**
 * Modo sin clave: experimentos escritos de antemano, ordenados según el
 * diagnóstico. «Probar» ejecuta la misma acción que usaría el tutor y muestra
 * una explicación fija. La interfaz lo dice: nada aquí lo escribe un modelo.
 */
export function GuidedExperiments({ answers }: { answers: DiagnosticAnswers }) {
  const experiments = orderedExperiments(profileFrom(answers));
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Experimentos guiados, escritos de antemano y ordenados según tus respuestas. Primero piensa la pregunta;
        después pulsa «Probar» y mira el laboratorio.
      </p>
      <ol className="flex flex-col gap-3">
        {experiments.map((e, i) => (
          <li key={e.id} className="rounded-xl border border-border bg-card p-4">
            <p className="font-mono text-xs text-primary">Experimento {i + 1}</p>
            <h3 className="mt-1 text-lg">{e.title}</h3>
            <p className="mt-2 text-muted-foreground">{e.prediction}</p>
            {done.has(e.id) ? (
              <p role="status" className="mt-3 border-t border-border pt-3">
                {e.explanation}
              </p>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  runTutorTool(e.call, "guia");
                  setDone(new Set(done).add(e.id));
                }}
              >
                <FlaskConical /> Probar
              </Button>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
