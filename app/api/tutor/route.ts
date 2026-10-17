import {
  APICallError,
  convertToModelMessages,
  createUIMessageStreamResponse,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
} from "ai";
import { z } from "zod";
import { DiagnosticAnswersSchema, profileFrom } from "@/lib/tutor/diagnostic";
import { buildInstructions } from "@/lib/tutor/prompt";
import { PROVIDERS, createModel, resolveProvider } from "@/lib/tutor/provider";
import { getLimiter } from "@/lib/tutor/rate-limit";
import { tutorTools, type TutorUIMessage } from "@/lib/tutor/tools";

export const maxDuration = 30;

/** Historial máximo que se envía al modelo: acota coste y latencia en conversaciones largas. */
const MAX_HISTORY = 30;
/** Caracteres máximos por mensaje de la persona. */
const MAX_TEXT = 1200;

const BodySchema = z.object({
  messages: z.array(z.unknown()).min(1).max(200),
  diagnostic: DiagnosticAnswersSchema.nullish(),
});

/**
 * Estado del tutor. La página es estática, pero las claves pueden llegar al
 * arrancar (Docker), no al compilar: por eso el cliente pregunta aquí en
 * tiempo de ejecución en vez de leerlo en el build.
 */
export function GET() {
  const provider = resolveProvider(process.env);
  return Response.json(
    provider.ok
      ? { available: true, provider: PROVIDERS[provider.id].label, model: provider.model }
      : { available: false, reason: provider.reason },
  );
}

export async function POST(request: Request) {
  const provider = resolveProvider(process.env);
  if (!provider.ok) return Response.json({ error: provider.reason }, { status: 503 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anonimo";
  const limit = await getLimiter()(ip);
  if (!limit.ok) {
    return Response.json(
      { error: "Demasiadas preguntas seguidas. Espera unos minutos y vuelve a intentarlo." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } },
    );
  }

  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Petición no válida." }, { status: 400 });

  // Valida la estructura de cada mensaje y de cada parte de herramienta contra
  // sus esquemas: el historial llega del navegador y no es de fiar.
  const validated = await safeValidateUIMessages<TutorUIMessage>({ messages: body.data.messages, tools: tutorTools });
  if (!validated.success) return Response.json({ error: "Mensajes no válidos." }, { status: 400 });

  const messages = validated.data.slice(-MAX_HISTORY);
  // Solo «user» y «assistant»: un mensaje «system» enviado desde el cliente
  // podría reescribir las instrucciones del tutor.
  if (messages.some((m) => m.role === "system")) {
    return Response.json({ error: "Mensajes no válidos." }, { status: 400 });
  }
  const tooLong = messages.some(
    (m) => m.role === "user" && m.parts.some((p) => p.type === "text" && p.text.length > MAX_TEXT),
  );
  if (tooLong) return Response.json({ error: `Cada mensaje puede tener como mucho ${MAX_TEXT} caracteres.` }, { status: 400 });

  const result = streamText({
    model: createModel(provider),
    instructions: buildInstructions(body.data.diagnostic ? profileFrom(body.data.diagnostic) : null),
    messages: await convertToModelMessages(messages, { tools: tutorTools }),
    tools: tutorTools,
    maxOutputTokens: 700,
    // Los modelos de razonamiento de OpenAI piensan «medio» por defecto: en un
    // chat eso se nota como espera. «low» basta para explicar física básica.
    providerOptions: { openai: { reasoningEffort: "low" } },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) => {
        console.error("[tutor]", error);
        return friendlyError(error, provider.model);
      },
    }),
  });
}

/** Mensaje útil para quien revisa con su propia clave, sin filtrar detalles internos. */
function friendlyError(error: unknown, model: string): string {
  if (APICallError.isInstance(error)) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return "El proveedor ha rechazado la clave de API: revisa que sea válida y tenga permisos.";
    }
    if (error.statusCode === 404) {
      return `El modelo «${model}» no está disponible con esta clave. Puedes elegir otro con LLM_MODEL.`;
    }
    if (error.statusCode === 429) return "El proveedor del modelo está limitando las peticiones. Prueba en un momento.";
  }
  return "El tutor no ha podido responder. Inténtalo de nuevo.";
}
