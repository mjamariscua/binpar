import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Límite de peticiones al tutor por IP: 20 cada 10 minutos (cada respuesta
 * con herramientas son 2–3 peticiones, así que da para una conversación larga).
 *
 * Con Upstash configurado el límite es global y sobrevive a reinicios. Sin
 * Upstash se usa un contador en memoria: suficiente en Docker (un solo
 * proceso), pero en Vercel cada instancia lleva su propia cuenta, así que es
 * orientativo. Es un coste conocido y está documentado en el README.
 */

const LIMIT = 20;
const WINDOW_MS = 10 * 60 * 1000;

export interface RateLimitResult {
  readonly ok: boolean;
  /** Milisegundos hasta que se libere una petición, si se ha superado. */
  readonly retryAfterMs: number;
}

export type Limiter = (key: string) => Promise<RateLimitResult>;

/** Ventana deslizante en memoria. `now` es inyectable para los tests. */
export function createMemoryLimiter(limit = LIMIT, windowMs = WINDOW_MS, now: () => number = Date.now): Limiter {
  const hits = new Map<string, number[]>();
  return async (key) => {
    const t = now();
    const recent = (hits.get(key) ?? []).filter((h) => t - h < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return { ok: false, retryAfterMs: windowMs - (t - recent[0]) };
    }
    recent.push(t);
    hits.set(key, recent);
    return { ok: true, retryAfterMs: 0 };
  };
}

function createUpstashLimiter(url: string, token: string): Limiter {
  const ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(LIMIT, "10 m"),
    prefix: "caida-tutor",
  });
  return async (key) => {
    const { success, reset } = await ratelimit.limit(key);
    return { ok: success, retryAfterMs: Math.max(0, reset - Date.now()) };
  };
}

let limiter: Limiter | null = null;

export function getLimiter(): Limiter {
  if (!limiter) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    limiter = url && token ? createUpstashLimiter(url, token) : createMemoryLimiter();
  }
  return limiter;
}
