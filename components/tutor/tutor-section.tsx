"use client";

import { useEffect, useRef, useState, type Ref } from "react";
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
 * escritos de antemano. En ambos casos, el laboratorio compartido.
 *
 * El orden del DOM es diagnóstico → laboratorio: en móvil se lee así, de
 * arriba abajo. En escritorio el laboratorio pasa a la columna izquierda.
 */
export function TutorSection() {
  const [status, setStatus] = useState<TutorStatus | null>(null);
  const [answers, setAnswers] = useState<DiagnosticAnswers | null>(null);
  const summaryRef = useRef<HTMLElement>(null);

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

  // Al terminar el diagnóstico el formulario desaparece: el foco pasa al
  // resumen, que es lo primero de lo que viene después.
  useEffect(() => {
    if (answers) summaryRef.current?.focus();
  }, [answers]);

  return (
    <div className="flex flex-col gap-8">
      <Prose>
        <p>{introFor(status)}</p>
      </Prose>

      {status && !status.available && <NoKeyBanner reason={status.reason} />}

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-8">
        <section
          aria-label={status?.available ? "Tutor" : "Diagnóstico y experimentos"}
          className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1"
        >
          {!answers ? (
            <DiagnosticQuiz onDone={setAnswers} />
          ) : (
            <>
              <DiagnosticSummary answers={answers} summaryRef={summaryRef} />
              {status?.available ? (
                <TutorChat answers={answers} provider={status.provider} model={status.model} />
              ) : (
                <GuidedExperiments answers={answers} />
              )}
            </>
          )}
        </section>
        <section aria-labelledby="laboratorio-titulo" className="lg:col-start-1 lg:row-start-1">
          <h3 id="laboratorio-titulo" className="text-xl font-semibold tracking-tight">
            Laboratorio
          </h3>
          <p className="mt-1 mb-4 text-muted-foreground">
            La fórmula y el lanzador de los capítulos 2 y 3, juntos.{" "}
            {status?.available ? "El tutor también los mueve." : "Los experimentos los mueven por ti."}
          </p>
          <LabTabs />
        </section>
      </div>
    </div>
  );
}

function introFor(status: TutorStatus | null): string {
  if (status?.available) {
    return "Ahora puedes preguntar lo que quieras. El tutor de IA empieza con tres preguntas para saber de dónde partes, y luego explica, te pregunta y maneja el laboratorio para enseñártelo en vez de solo contártelo.";
  }
  if (status) {
    return "Comprueba lo que has aprendido. Primero, tres preguntas para saber de dónde partes; después, cuatro experimentos ordenados según tus respuestas que mueven el laboratorio por ti.";
  }
  return "Comprueba lo que has aprendido. Empieza con tres preguntas para saber de dónde partes.";
}

/**
 * Aviso del modo sin clave en dos capas: lo que necesita saber quien aprende,
 * y, plegado, lo que necesita quien despliega la aplicación.
 */
function NoKeyBanner({ reason }: { reason: string }) {
  return (
    <div role="status" className="rounded-xl border border-primary/50 bg-primary/10 p-4">
      <p className="font-semibold text-primary">El tutor de IA no está activo en esta versión</p>
      <p className="mt-1">
        En su lugar tienes experimentos guiados con explicaciones escritas de antemano. Nada de lo que verás aquí lo
        escribe un modelo.
      </p>
      <details className="mt-3 text-sm text-muted-foreground">
        <summary className="cursor-pointer py-1 text-foreground/90">Para quien despliega la aplicación</summary>
        <p className="mt-1">
          {reason} El tutor se activa con una clave de Anthropic, OpenAI o Google; los nombres de las variables están
          en la sección «Variables de entorno» del README.
        </p>
      </details>
    </div>
  );
}

function DiagnosticSummary({
  answers,
  summaryRef,
}: {
  answers: DiagnosticAnswers;
  summaryRef: Ref<HTMLElement>;
}) {
  const { correct } = profileFrom(answers);
  return (
    <details className="rounded-lg border border-border px-4 py-2 text-sm">
      <summary ref={summaryRef} className="cursor-pointer py-1">
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
