"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { ArrowUp, Square } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { DiagnosticAnswers } from "@/lib/tutor/diagnostic";
import { runTutorTool, type ToolCall } from "@/lib/tutor/run-tool";
import type { TutorUIMessage } from "@/lib/tutor/tools";
import { cn } from "@/lib/utils";
import { MessageText } from "./message-text";
import { ToolActivity } from "./tool-activity";

const SUGGESTIONS = [
  "¿Por qué no noto que la Tierra tira de mí?",
  "Enséñame qué pasaría si la Luna estuviera el doble de lejos",
  "¿Cómo se pone un satélite en órbita?",
];

const MAX_LENGTH = 1200;

/**
 * Chat con el tutor. Cada respuesta llega en streaming desde /api/tutor. Si el
 * modelo pide una herramienta, onToolCall la ejecuta aquí sobre el laboratorio
 * y addToolOutput devuelve el resultado; `sendAutomaticallyWhen` reenvía la
 * conversación en cuanto todas las herramientas tienen resultado, y el modelo
 * continúa con los datos reales de la escena.
 */
export function TutorChat({ answers, provider, model }: { answers: DiagnosticAnswers; provider: string; model: string }) {
  // El diagnóstico no cambia mientras existe el chat: viaja fijo en cada
  // petición, también en los reenvíos automáticos tras usar una herramienta.
  const [transport] = useState(
    () => new DefaultChatTransport<TutorUIMessage>({ api: "/api/tutor", body: { diagnostic: answers } }),
  );
  const { messages, sendMessage, addToolOutput, status, error, stop, regenerate, clearError } = useChat<TutorUIMessage>({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: ({ toolCall }) => {
      if (toolCall.dynamic) return;
      const { toolName, toolCallId } = toolCall;
      try {
        const output = runTutorTool({ toolName, input: toolCall.input } as ToolCall);
        // TypeScript no puede relacionar cada toolName de la unión con su
        // salida; runTutorTool garantiza que corresponden.
        void addToolOutput({ tool: toolName, toolCallId, output } as Parameters<typeof addToolOutput>[0]);
      } catch (err) {
        void addToolOutput({
          state: "output-error",
          tool: toolName,
          toolCallId,
          errorText: err instanceof Error ? err.message : "No se pudo ejecutar la acción.",
        });
      }
    },
  });
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const busy = status === "submitted" || status === "streaming";

  // Mantiene a la vista el último mensaje mientras llega el streaming.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    if (error) clearError();
    void sendMessage({ text: trimmed });
    setInput("");
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Tutor de IA real · {provider} · <span className="font-mono">{model}</span>. Conoce tu diagnóstico y puede mover
        el laboratorio.
      </p>

      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        // Mientras llega el streaming, los lectores de pantalla esperan al texto completo.
        aria-busy={busy}
        aria-label="Conversación con el tutor"
        className="flex h-[28rem] flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-card p-4"
      >
        {messages.length === 0 && (
          <div className="m-auto flex max-w-sm flex-col items-center gap-4 text-center">
            <p className="text-muted-foreground">
              El tutor empezará por lo que más te puede sorprender según tus respuestas.
            </p>
            <Button onClick={() => send("He terminado el diagnóstico. ¿Por dónde empezamos?")}>Empezar</Button>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex max-w-[90%] flex-col gap-2",
              message.role === "user" ? "self-end rounded-2xl rounded-br-sm bg-primary/15 px-4 py-2" : "self-start",
            )}
          >
            <span className="sr-only">{message.role === "user" ? "Tú:" : "Tutor:"}</span>
            {message.parts.map((part, i) => {
              if (part.type === "text") return <MessageText key={i} text={part.text} />;
              if (part.type.startsWith("tool-")) return <ToolActivity key={i} part={part} />;
              return null;
            })}
          </div>
        ))}
        {status === "submitted" && <p className="self-start text-sm text-muted-foreground">Pensando…</p>}
        {error && (
          <div role="alert" className="self-stretch rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">
            <p>{readableError(error)}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => void regenerate()}>
              Reintentar
            </Button>
          </div>
        )}
      </div>

      {messages.length > 0 && messages.length < 3 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <Button key={s} variant="outline" size="sm" disabled={busy} onClick={() => send(s)} className="h-auto py-1.5 whitespace-normal">
              {s}
            </Button>
          ))}
        </div>
      )}

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Escribe tu pregunta al tutor
        </label>
        <Textarea
          id={inputId}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          maxLength={MAX_LENGTH}
          rows={2}
          placeholder="Pregunta lo que quieras sobre la gravedad…"
          className="min-h-12 resize-none"
        />
        {busy ? (
          <Button type="button" size="icon" variant="outline" onClick={() => void stop()} aria-label="Detener la respuesta">
            <Square />
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Enviar">
            <ArrowUp />
          </Button>
        )}
      </form>
    </div>
  );
}

/** El transporte lanza el cuerpo de la respuesta como mensaje: si es el JSON de error de la ruta, se extrae el texto. */
function readableError(error: Error): string {
  try {
    const parsed: unknown = JSON.parse(error.message);
    if (parsed && typeof parsed === "object" && "error" in parsed && typeof parsed.error === "string") return parsed.error;
  } catch {
    // No era JSON: se usa tal cual.
  }
  return error.message || "No se pudo obtener respuesta del tutor.";
}
