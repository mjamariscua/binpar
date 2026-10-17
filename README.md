# Caída

La ley de gravitación universal de Newton explicada con simulaciones
interactivas y un tutor con IA (Parte A), y una galería de seis soluciones
periódicas del problema de los tres cuerpos (Parte B).

**Demo:** https://binpar.vercel.app

> **Estado:** módulo 2 de 6: motor de física y Parte B (galería de tres cuerpos) funcionales.
> Este README se completa en el módulo final con decisiones, costes, uso de IA
> y límites conocidos.

## Ejecutar

Requisitos: Node ≥ 20.9 y pnpm 10 (`corepack enable`).

```bash
pnpm install
pnpm dev              # http://localhost:3000
pnpm test             # tests del motor de física y de las órbitas
pnpm typecheck
pnpm orbits:report    # cierre, energía y coste de cada órbita
```

Con Docker, un único comando:

```bash
docker compose up --build
```

## Variables de entorno

Ninguna es obligatoria. Copia `.env.example` a `.env.local` (desarrollo) o a
`.env` (Docker).

| Variable | Para qué |
|---|---|
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` | Clave del proveedor del tutor. Basta una. |
| `LLM_PROVIDER` | Opcional: `anthropic`, `openai` o `google` si hay varias claves. |
| `LLM_MODEL` | Opcional: otro modelo del proveedor (por defecto `claude-haiku-5-5`, `gpt-5.4-mini` o `gemini-3.5-flash`). |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Opcional: límite de peticiones al tutor compartido entre instancias. Sin ellas, el límite vive en memoria de cada proceso. |

Sin clave, la app funciona en modo reducido con explicaciones estáticas y un
aviso visible.

## Documentación

- [docs/orbitas.md](docs/orbitas.md): de dónde salen las condiciones iniciales
  de cada órbita y cómo se verificó que cierran.

---

© 2026. Todos los derechos reservados. Código entregado exclusivamente para
evaluación en el proceso de selección de BinPar; no se concede licencia de uso,
copia ni distribución.
