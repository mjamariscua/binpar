"use client";

import { useEffect, useState } from "react";
import { Prose } from "@/components/gravity/chapter";
import { DIAGNOSTIC, profileFrom, type DiagnosticAnswers } from "@/lib/tutor/diagnostic";
import { DiagnosticQuiz } from "./diagnostic-quiz";
import { GuidedExperiments } from "./guided-experiments";
import { LabTabs } from "./lab-tabs";
import { TutorChat } from "./tutor-chat";

type TutorStatus =
  | { readonly available: true; readonly provider: string; readonly model: string }
  | { readonly available: false; readonly reason: string };

/**
 * Capítulo 4. Primero un diagnóstico de tres preguntas; después, según haya o
 * no clave de LLM en el servidor, el tutor de IA o los experimentos guiados
 * escritos de antemano. En ambos casos, al lado, el laboratorio compartido.
 */
export function TutorSection() {
  const [status, setStatus] = useState<TutorStatus | null>(null);
  const [answers, setAnswers] = useState<DiagnosticAnswers | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/tutor")
      .then((r) => r.json() as Promise<TutorStatus>)
      .then((s) => active && setStatus(s))
      .catch(() => active && setStatus({ available: false, reason: "No se pudo contactar con el servidor." }));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <Prose>
        <p>
          Ahora puedes preguntar lo que quieras. El tutor empieza con tres preguntas para saber de dónde partes, y
          luego explica, te pregunta y maneja el laboratorio para enseñártelo en vez de solo contártelo.
        </p>
      </Prose>

      {status && !status.available && <NoKeyBanner reason={status.reason} />}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <section aria-label="Laboratorio">
          <LabTabs />
        </section>
        <section aria-label={status?.available ? "Tutor" : "Experimentos guiados"} className="flex flex-col gap-4">
          {!answers ? (
            <DiagnosticQuiz onDone={setAnswers} />
          ) : (
            <>
              <DiagnosticSummary answers={answers} />
              {status?.available ? (
                <TutorChat answers={answers} provider={status.provider} model={status.model} />
              ) : (
                <GuidedExperiments answers={answers} />
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function NoKeyBanner({ reason }: { reason: string }) {
  return (
    <div role="status" className="rounded-xl border border-primary/50 bg-primary/10 p-4">
      <p className="font-semibold text-primary">Modo sin tutor de IA</p>
      <p className="mt-1 text-sm">
        {reason} Mientras tanto verás experimentos guiados con explicaciones escritas de antemano, nunca respuestas
        simuladas. Cómo activarlo: sección «Variables de entorno» del README.
      </p>
    </div>
  );
}

function DiagnosticSummary({ answers }: { answers: DiagnosticAnswers }) {
  const { correct } = profileFrom(answers);
  return (
    <details className="rounded-lg border border-border px-4 py-2 text-sm">
      <summary className="cursor-pointer">
        Diagnóstico: {correct} de {DIAGNOSTIC.length} — ver respuestas
      </summary>
      <ul className="mt-2 space-y-2 pb-2 text-muted-foreground">
        {DIAGNOSTIC.map((q, i) => {
          const option = q.options[answers[i]];
          return (
            <li key={q.id}>
              <span className={option.correct ? "text-emerald-300" : "text-primary"}>{option.correct ? "✓" : "✗"}</span>{" "}
              {option.feedback}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
