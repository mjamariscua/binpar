"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DIAGNOSTIC, type DiagnosticAnswers } from "@/lib/tutor/diagnostic";
import { cn } from "@/lib/utils";

/**
 * Tres preguntas, una cada vez. Al comprobar se ve la explicación de la opción
 * elegida (se aprende ya en el diagnóstico); al terminar, las respuestas pasan
 * al tutor o a los experimentos guiados.
 */
export function DiagnosticQuiz({ onDone }: { onDone: (answers: DiagnosticAnswers) => void }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const legendId = useId();
  const legendRef = useRef<HTMLLegendElement>(null);
  const firstQuestion = useRef(true);
  const question = DIAGNOSTIC[index];

  // Al pasar de pregunta, el botón enfocado se deshabilita (no hay opción
  // elegida) y el foco caería al body: pasa al enunciado nuevo, que así se lee.
  useEffect(() => {
    if (firstQuestion.current) {
      firstQuestion.current = false;
      return;
    }
    legendRef.current?.focus();
  }, [index]);
  const isLast = index === DIAGNOSTIC.length - 1;

  const next = () => {
    if (selected === null) return;
    const all = [...answers, selected];
    if (isLast) {
      onDone(all);
      return;
    }
    setAnswers(all);
    setIndex(index + 1);
    setSelected(null);
    setChecked(false);
  };

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (checked) next();
        else if (selected !== null) setChecked(true);
      }}
    >
      <p className="font-mono text-sm text-muted-foreground">
        Pregunta {index + 1} de {DIAGNOSTIC.length} · antes de empezar, para saber de dónde partes
      </p>
      <fieldset aria-describedby={checked ? `${legendId}-feedback` : undefined} className="flex flex-col gap-3">
        <legend id={legendId} ref={legendRef} tabIndex={-1} className="mb-3 text-lg outline-none">
          {question.question}
        </legend>
        {question.options.map((option, i) => (
          <label
            key={option.text}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg border border-border-strong px-4 py-3 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-ring",
              selected === i && "border-primary/70 bg-primary/10",
              checked && option.correct && "border-success",
              checked && "cursor-default",
            )}
          >
            <input
              type="radio"
              name={question.id}
              value={i}
              checked={selected === i}
              disabled={checked}
              onChange={() => setSelected(i)}
              className="accent-primary"
            />
            <span>{option.text}</span>
            {checked && option.correct && <span className="ml-auto text-sm text-success">Correcta</span>}
          </label>
        ))}
      </fieldset>
      {/* Región viva estable: si se montara ya con el texto, podría no anunciarse. */}
      <div aria-live="polite">
        {checked && selected !== null && (
          <p id={`${legendId}-feedback`} className="rounded-lg bg-muted px-4 py-3">
            {question.options[selected].feedback}
          </p>
        )}
      </div>
      <Button type="submit" disabled={selected === null} className="self-start">
        {!checked ? "Comprobar" : isLast ? "Terminar" : "Siguiente"}
      </Button>
    </form>
  );
}
