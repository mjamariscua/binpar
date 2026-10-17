import { describe, expect, it } from "vitest";
import { profileFrom } from "./diagnostic";
import { buildInstructions } from "./prompt";
import { resolveProvider } from "./provider";
import { createMemoryLimiter } from "./rate-limit";
import { EXPERIMENTS, orderedExperiments } from "./static-guide";

describe("resolveProvider", () => {
  it("sin claves no hay tutor y explica qué falta", () => {
    const r = resolveProvider({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("ANTHROPIC_API_KEY");
  });

  it("usa la primera clave disponible en orden anthropic → openai → google", () => {
    expect(resolveProvider({ GOOGLE_GENERATIVE_AI_API_KEY: "g", OPENAI_API_KEY: "o" })).toMatchObject({
      ok: true,
      id: "openai",
      model: "gpt-5.4-mini",
    });
  });

  it("LLM_PROVIDER fuerza el proveedor, y falla con claridad si falta su clave", () => {
    expect(resolveProvider({ LLM_PROVIDER: "Google", ANTHROPIC_API_KEY: "a", GOOGLE_GENERATIVE_AI_API_KEY: "g" })).toMatchObject({
      ok: true,
      id: "google",
    });
    const missing = resolveProvider({ LLM_PROVIDER: "openai", ANTHROPIC_API_KEY: "a" });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.reason).toContain("OPENAI_API_KEY");
  });

  it("LLM_MODEL sustituye el modelo por defecto; una clave vacía cuenta como ausente", () => {
    expect(resolveProvider({ ANTHROPIC_API_KEY: "  ", OPENAI_API_KEY: "o", LLM_MODEL: "gpt-x" })).toMatchObject({
      id: "openai",
      model: "gpt-x",
    });
  });
});

describe("diagnóstico y adaptación", () => {
  it("todo acertado: nivel avanzado, sin ideas erróneas", () => {
    expect(profileFrom([1, 1, 1])).toEqual({ correct: 3, level: "avanzado", misconceptions: [] });
  });

  it("registra las ideas erróneas concretas", () => {
    const p = profileFrom([0, 0, 2]);
    expect(p.level).toBe("inicial");
    expect(p.misconceptions).toEqual(["lo-pesado-cae-antes", "distancia-lineal", "la-sujeta-el-sol"]);
  });

  it("las instrucciones del tutor incluyen el diagnóstico", () => {
    const text = buildInstructions(profileFrom([1, 0, 1]));
    expect(text).toContain("2 de 3 aciertos");
    expect(text).toContain("lineal");
  });

  it("sin clave, los experimentos se ordenan por las ideas erróneas detectadas", () => {
    const first = orderedExperiments(profileFrom([1, 1, 0]))[0];
    expect(first.addresses).toContain("no-hay-gravedad-en-el-espacio");
    expect(orderedExperiments(profileFrom([1, 1, 1])).length).toBe(EXPERIMENTS.length);
  });
});

describe("límite de peticiones en memoria", () => {
  it("deja pasar `limit` peticiones por ventana y libera al pasar el tiempo", async () => {
    let t = 0;
    const limiter = createMemoryLimiter(2, 1000, () => t);
    expect((await limiter("ip")).ok).toBe(true);
    expect((await limiter("ip")).ok).toBe(true);
    const blocked = await limiter("ip");
    expect(blocked).toEqual({ ok: false, retryAfterMs: 1000 });
    expect((await limiter("otra-ip")).ok).toBe(true);
    t = 1001;
    expect((await limiter("ip")).ok).toBe(true);
  });
});
