# Caída

La ley de gravitación universal de Newton explicada con simulaciones que se
pueden tocar y un tutor con IA (Parte A), y una galería de seis soluciones
periódicas del problema de los tres cuerpos con un explorador para buscar
órbitas propias (Parte B).

**Demo:** https://binpar.vercel.app

| Ruta | Qué hay |
|---|---|
| [`/`](https://binpar.vercel.app) | Parte A: cuatro capítulos con scroll y el tutor |
| [`/tres-cuerpos`](https://binpar.vercel.app/tres-cuerpos) | Galería de las seis soluciones, con tarjetas animadas |
| `/tres-cuerpos/[slug]` | Detalle: simulación, controles y datos verificados |
| [`/tres-cuerpos/explorador`](https://binpar.vercel.app/tres-cuerpos/explorador) | Busca tu propia órbita periódica |

## Ejecutar

Requisitos: Node ≥ 20.9 y pnpm 10 (`corepack enable`).

```bash
pnpm install
pnpm dev              # http://localhost:3000
pnpm test             # 110 tests (física, órbitas, tutor, API)
pnpm typecheck
pnpm lint
pnpm orbits:report    # cierre, energía y coste de cada órbita
pnpm orbits:sources   # comparación entre fuentes publicadas
```

Con Docker, un único comando (lee `.env` si existe):

```bash
docker compose up --build    # http://localhost:3000
```

## Variables de entorno

Ninguna es obligatoria. Copia `.env.example` a `.env.local` (desarrollo) o a
`.env` (Docker). En Vercel, en *Settings → Environment Variables*.

| Variable | Para qué |
|---|---|
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` | Clave del proveedor del tutor. Basta una; si hay varias, se usa la primera de esta lista. |
| `LLM_PROVIDER` | Opcional: `anthropic`, `openai` o `google` si hay varias claves. |
| `LLM_MODEL` | Opcional: otro modelo del proveedor (por defecto `claude-haiku-5-5`, `gpt-5.4-mini` o `gemini-3.5-flash`). |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Opcional: límite de peticiones al tutor compartido entre instancias. Sin ellas, el límite vive en memoria de cada proceso. |

**Sin clave**, la app funciona entera en modo reducido: un aviso visible en el
capítulo del tutor y experimentos guiados con explicaciones escritas de
antemano. Nunca se simulan respuestas de un modelo.

## Qué hay dentro

### Parte A — la experiencia de aprendizaje

1. **La manzana y la Luna caen por lo mismo.** Tierra y Luna a escala real de
   distancia; la Luna se arrastra (o se mueve con el teclado) y se compara lo
   que cae en un segundo con una manzana: el «test de la Luna» de Newton
   (4.9 m frente a 1.35 mm, 60² veces menos).
2. **La fórmula, viva.** F = G·m₁·m₂/r² donde m₁, m₂ y r son controles; una
   frase explica cada cambio y las dos flechas miden siempre lo mismo
   (tercera ley).
3. **Lanzar un satélite.** Se apunta arrastrando o con controles accesibles;
   antes de lanzar se ve la trayectoria prevista y si será circular, elíptica,
   de escape o de choque.
4. **Tu tutor.** Diagnóstico de 3 preguntas que detecta ideas erróneas
   comunes; después, un tutor de IA real (streaming) que conoce ese diagnóstico
   y **opera el laboratorio** con herramientas (cambia masas y distancias,
   lanza satélites) para enseñar en vez de solo contar.

### Parte B — la galería

- **Seis soluciones** (Lagrange, figura de ocho, Butterfly I, Goggles, Moth I,
  Yin-Yang I) con URL propia y compartible.
- **Detalle**: simulación con estelas, play/pausa, scrub, velocidad y reinicio
  (todo por teclado); panel con condiciones iniciales, periodo, energía,
  momento angular, **error de cierre medido** y fuentes.
- **Estado conservado** al volver a la galería: filtro, scroll y foco en la
  tarjeta abierta; y cada órbita recuerda su instante y su velocidad.
- **Explorador**: eliges la velocidad inicial, se mide cuánto vuelve el sistema
  a su estado inicial y «refinar» busca la órbita periódica más cercana.

## Arquitectura

```
app/                       rutas (App Router) y API del tutor
components/gravity/        capítulos de la Parte A
components/three-body/     galería, detalle y escena de la Parte B
components/explorer/       explorador de órbitas
components/tutor/          diagnóstico, chat, laboratorio, modo sin clave
components/scene/          bloom y estelas compartidos por las escenas 3D
lib/physics/               física pura (sin React): RK4, N cuerpos, invariantes,
                           periodo precomputado, Kepler, búsqueda de retorno
lib/orbits/                catálogo con fuentes, geometría, worker y caché
lib/gravity/               cifras Tierra–Luna, fórmula y sandbox
lib/tutor/                 proveedor, prompt, herramientas, diagnóstico, rate limit
lib/store/                 estado (zustand): galería, reproducción, laboratorio
docs/orbitas.md            procedencia y verificación de las condiciones iniciales
scripts/                   informes reproducibles de las órbitas
```

## Decisiones técnicas

| Decisión | Por qué | Coste conocido |
|---|---|---|
| **Física en TypeScript puro** (`lib/physics`), sin React | Testeable con Vitest y reutilizable en servidor, cliente y workers | Ninguno relevante |
| **RK4 de paso fijo** | Muestras equiespaciadas: la animación indexa en O(1) y el scrub es trivial; orden 4 para cerrar un periodo con precisión | En encuentros cercanos (r ≈ 0.01) el paso pequeño se paga todo el periodo: Yin-Yang I son 10⁶ pasos (~0.1 s) |
| **Precomputar un periodo y animar indexando** (t mód T) | Casi todas estas órbitas son inestables: integradas sin fin se deshacen en ~20 periodos. Cada vuelta es idéntica y el error de cierre está medido | No se ve la inestabilidad (se explica en el panel) |
| **Condiciones iniciales de Li & Liao (2017)** en lugar de los «15 dígitos» de arXiv:1312.6796 previstos en el plan | Medido: los periodos de 1312.6796 no corresponden a sus propias condiciones (hueco ≈10⁻³); Li & Liao cierran a ≈10⁻⁹ ([docs/orbitas.md](docs/orbitas.md)) | Desviación del plan, documentada y respaldada por un test |
| **Resolución por órbita con criterios explícitos** (cierre y \|ΔE/E\| ≤ 10⁻⁷; interpolación ≤ 10⁻³) | Cada órbita usa lo que necesita y no más | Hay que mantener el criterio si se añaden órbitas (`pnpm orbits:report`) |
| **Interpolación de Hermite** entre muestras | Usa la velocidad (derivada exacta): error O(h⁴) con pocas muestras | En encuentros muy cercanos el error llega a 10⁻³ (medio píxel) |
| **Web Workers** + caché por órbita | El cálculo no congela la interfaz; volver a una órbita es instantáneo | Más piezas (mensajes tipados, ids). Turbopack copia además el `.ts` del worker como asset, inofensivo |
| **Páginas estáticas con datos calculados al compilar** (SVG, E, L, cierre) | La galería no ejecuta física en el navegador para mostrarse; el detalle tiene póster inmediato | Peso del HTML; reducido 7× simplificando los trazos con Ramer–Douglas–Peucker (176 → 26 KB) |
| **React Three Fiber** para escenas animadas, **SVG** para diagramas y miniaturas | WebGL donde hay animación continua y efectos; SVG donde importan el texto y la accesibilidad | three.js pesa; se carga con `React.lazy` solo donde hay escena |
| **Tarjetas vivas en SVG** (no WebGL) | Seis contextos WebGL son caros y los navegadores los limitan; un bucle rAF por tarjeta, solo si está en pantalla | Estelas en tramos de opacidad (SVG no degrada a lo largo de un trazo) |
| **Estado del laboratorio compartido** por persona y tutor (zustand, mismas acciones) | El tutor no tiene un camino propio: solo puede hacer lo que permite la interfaz | Estado global de módulo (vive mientras la pestaña) |
| **Herramientas del tutor ejecutadas en el cliente** (sin `execute` en el servidor) | Lo que cambian es la interfaz; el navegador devuelve al modelo los datos reales | Cada respuesta con herramienta son 2–3 peticiones |
| **Proveedor autodetectado** y **modelo rápido** por defecto | El equipo revisará con su clave, sea cual sea; en un chat pesa la latencia | Algo menos de calidad que un modelo grande (`LLM_MODEL` lo cambia) |
| **Estado del tutor consultado en tiempo de ejecución** (`GET /api/tutor`) | En Docker las claves llegan al arrancar, no al compilar | Una petición extra al cargar el capítulo 4 |
| **Límite de peticiones** con Upstash o en memoria | Protege la clave en un despliegue público | Sin Upstash, en Vercel cada instancia cuenta por separado |
| **`<ViewTransition>` de React** en lugar de `layoutId` de Motion (previsto en el plan) | `layoutId` necesita ambos elementos montados a la vez; entre rutas no lo están. ViewTransition usa la API del navegador | Sin animación en navegadores sin soporte; una dependencia menos |
| **Bloom con alternativa** (PerformanceMonitor, «reducir movimiento», dispositivos modestos) | Efectos solo donde no estropean la fluidez | Heurística de dispositivo aproximada |
| **KaTeX renderizado en el servidor** | HTML + MathML sin JavaScript de KaTeX en el cliente | Solo fórmulas estáticas (las vivas son componentes propios) |
| **TypeScript `strict`** sin `noUncheckedIndexedAccess` | El núcleo numérico indexa typed arrays con índices acotados; los `!` no añadirían seguridad | Un índice fuera de rango daría `NaN` en silencio (lo detectarían los tests de energía) |

## Verificación

- **110 tests** (Vitest): orden 4 del integrador y de Hermite, leyes de Newton,
  cierre y conservación de energía de **cada órbita**, comparación de fuentes,
  clasificación de órbitas, cifras Tierra–Luna, descripciones de la galería
  (sus afirmaciones se comprueban), diagnóstico, proveedor, límite de
  peticiones, explorador (recupera los valores de Li & Liao partiendo de los
  5 dígitos originales de Moth I) y la **API del tutor de punta a punta con
  `MockLanguageModelV4`**.
- **Informes reproducibles**: `pnpm orbits:report` y `pnpm orbits:sources`
  generan las tablas de [docs/orbitas.md](docs/orbitas.md).
- **Accesibilidad**: auditoría con axe-core 4.14 (WCAG 2.1 AA y buenas
  prácticas) en las cinco páginas: 0 infracciones. Navegación completa por
  teclado, foco visible, enlace para saltar al contenido, contrastes de 8:1 a
  17:1 y respeto a «reducir movimiento».
- **Navegador**: probado en Chrome, en escritorio y con viewport de móvil
  (375 px), sin scroll horizontal; despliegue en Vercel y `docker compose up`
  comprobados.

## Uso de IA

He desarrollado el proyecto con **Claude Code** (Anthropic) como asistente de
programación. Partí de un documento propio con el stack, el concepto visual y
el orden de construcción por módulos; la implementación se hizo módulo a
módulo, con commits por tema (llevan la coautoría de Claude) y una guía de
estudio por módulo para revisar y entender cada archivo y cada decisión.

La IA no sustituye la verificación: cada afirmación física está respaldada por
un test o un informe reproducible, y las dos desviaciones del plan (la fuente
de las condiciones iniciales y ViewTransition en lugar de Motion) se tomaron a
partir de mediciones y están documentadas arriba.

## Límites conocidos

- **Tutor con un LLM real:** la ruta está probada de punta a punta con un
  modelo simulado, y el chat en el navegador con respuestas interceptadas
  (herramientas, reenvío automático, formato). En el entorno de desarrollo no
  había claves, así que no se ha conversado con un proveedor real. Si tu clave
  falla, el chat dice qué revisar: clave rechazada o modelo no disponible (en
  ese caso, prueba otro con `LLM_MODEL`).
- **Modelos por defecto:** elegidos como los rápidos de cada proveedor según
  los tipos de los SDK instalados; una clave concreta puede no tener acceso a
  alguno.
- **Límite de peticiones sin Upstash:** orientativo en Vercel (por instancia).
- **Encuentros cercanos:** con paso fijo cuestan pasos; la interpolación se
  desvía hasta 10⁻³ y las estelas se ven en tramos rectos en el instante del
  encuentro.
- **Móviles modestos:** la galería calcula las seis trayectorias en workers al
  entrar (las tarjetas muestran el dibujo estático hasta que están listas).
- **Transición galería → detalle:** solo anima en navegadores con View
  Transitions (Chromium reciente, Safari reciente).
- **Escenas 3D:** tienen nombre, póster y controles accesibles, pero el
  movimiento en sí no se narra.
- **Sin tests E2E automatizados** (Playwright): la interfaz se verificó a mano
  en el navegador.
- **Explorador:** un buen retorno es una candidata a órbita periódica, no una
  demostración (lo dice la propia página).
- **Consola:** aviso de `THREE.Clock` obsoleto, procedente de React Three Fiber.
- El estado de la galería se conserva al navegar, **no tras recargar** (el
  enunciado no lo pide).

---

© 2026. Todos los derechos reservados. Código entregado exclusivamente para
evaluación en el proceso de selección de BinPar; no se concede licencia de uso,
copia ni distribución.
