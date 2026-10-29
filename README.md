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
pnpm test             # 203 tests (física, órbitas, trenza, primera persona, esfera de formas, tutor, API, formato)
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

**La demo pública** usa Google `gemini-3.5-flash-lite` en el nivel gratuito
(`GOOGLE_GENERATIVE_AI_API_KEY` y `LLM_MODEL` en Vercel). Su cuota diaria es
limitada: si se agota, el chat lo dice y deja reintentar. Si tu clave falla,
el chat indica qué revisar: clave rechazada o modelo no disponible (en ese
caso, prueba otro con `LLM_MODEL`).

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
4. **Ponte a prueba.** Diagnóstico de 3 preguntas que detecta ideas erróneas
   comunes; después, un tutor de IA real (streaming) que conoce ese diagnóstico
   y **opera el laboratorio** con herramientas (cambia masas y distancias,
   lanza satélites) para enseñar en vez de solo contar. Sin clave, experimentos
   guiados escritos de antemano que mueven el mismo laboratorio.

Cada capítulo plantea su experimento como una pregunta, con la instrucción
antes del widget; la página cierra con «Lo que te llevas». Una cabecera fija
dice en qué capítulo estás y deja saltar entre ellos.

### Parte B — la galería

- **Seis soluciones** (Lagrange, figura de ocho, Butterfly I, Goggles, Moth I,
  Yin-Yang I) con URL propia y compartible.
- **Detalle**: simulación con estelas, play/pausa, scrub, velocidad y reinicio
  (todo por teclado); panel con condiciones iniciales, periodo, energía,
  momento angular, **error de cierre medido** y fuentes.
- **Vistas 2D, 3D y «Forma»** en la galería y en el detalle. En 3D, la órbita como
  **trenza en el tiempo** (una hebra por cuerpo durante dos periodos, con el
  corte del instante actual), la idea con la que Moore (1993) clasificó estas
  órbitas. En el detalle se puede girar, con vistas fijas como alternativa
  accesible, y la vista va en la URL (`?vista=3d`).
- **Vista «Dentro»** (solo en el detalle): la órbita en primera persona, desde
  el centro de masas o viajando sobre uno de los cuerpos, con la órbita como
  suelo y un cielo de estrellas fijas. Sobre un cuerpo se ve el movimiento
  relativo: en Lagrange los otros dos parecen quietos, porque el triángulo gira
  contigo. Se mira alrededor arrastrando, con las flechas o con botones, y
  también va en la URL (`?vista=dentro&desde=2`).
- **Vista «Forma»**: la **esfera de formas**, la forma del triángulo de los
  tres cuerpos sin su posición, su tamaño ni su giro. Sus 6 coordenadas quedan
  en 4 sin el centro de masas (el espacio de cuatro dimensiones del que sale la
  esfera) y en 2 sin tamaño ni giro: un punto de una esfera. Cada órbita dibuja
  ahí una curva. Lagrange es un punto quieto en el polo, y los nombres
  Butterfly, Moth, Goggles y Yin-Yang describen la figura que trazan aquí, como
  en la Fig. 1 de Šuvakov y Dmitrašinović (2013). En el detalle se gira, con
  vistas «De frente» y «Desde el polo»; un recuadro dibuja el triángulo de
  ahora con su giro (en Lagrange gira mientras el punto sigue quieto), y la
  vista va en la URL (`?vista=forma`).
- **Estado conservado** al volver a la galería: filtro, vista, scroll y foco en
  la tarjeta abierta; y cada órbita recuerda su instante y su velocidad.
- **Explorador**: eliges la velocidad inicial, se mide cuánto vuelve el sistema
  a su estado inicial y «refinar» busca la órbita periódica más cercana.

## Arquitectura

```
app/                       rutas (App Router) y API del tutor
components/gravity/        capítulos de la Parte A
components/three-body/     galería, detalle y escena de la Parte B
components/explorer/       explorador de órbitas
components/tutor/          diagnóstico, chat, laboratorio, modo sin clave
components/scene/          bloom, estelas y cámara compartidos por las escenas 3D
lib/physics/               física pura (sin React): RK4, N cuerpos, invariantes,
                           periodo precomputado, Kepler, búsqueda de retorno
lib/orbits/                catálogo con fuentes, geometría, worker y caché; las
                           vistas: trenza, primera persona y esfera de formas
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
| **3D como trenza en el tiempo**, no como física 3D | Las seis órbitas son planas: una física 3D (unos 15 archivos) no cambiaría nada visible. Con el tiempo como tercera dimensión, la periodicidad se ve como una trenza que se repite. Sale del periodo ya precomputado, sin física nueva | Se dibuja la trenza, pero no se calcula su «palabra de trenza» (la clasificación de Moore) |
| **Trenza de las tarjetas en SVG proyectado**; WebGL solo en el detalle | Misma razón que las tarjetas vivas; la proyección y la simplificación se hacen en el servidor | Las tarjetas no se pueden girar; ≈ 10 KB comprimidos más en el payload de la galería |
| **Girar la trenza y la esfera, y mirar «Dentro», con el dedo solo tras activarlo** | Girar con el dedo exige `touch-action: none` en el canvas, que bloquearía el scroll de la página en móvil | En táctil, un toque más; las vistas fijas y los botones funcionan siempre |
| **«Dentro» solo en el detalle**; la galería la muestra y la deja como 2D | Es la misma órbita plana vista desde dentro, y seis escenas WebGL en las tarjetas son lo que ya se descartó por coste | Al volver a la galería desde «Dentro», la vista pasa a 2D |
| **Mirada «al centro» con retención** junto al centro de masas | El cuerpo 3 arranca justo en el centro en cinco de las seis órbitas y en el ocho los tres lo cruzan: ahí la dirección «al centro» no existe y la cámara giraría 180° de golpe | Al cruzar el centro, la mirada da media vuelta suave (≈ 1 s); «Mirada fija» la evita |
| **Estrellas fijas, «Mirada fija», sin alabeo, inclinación ±80°** | Una referencia que no gira hace legible el movimiento relativo y reduce el mareo; con la mirada fija se ve la diferencia entre el marco que gira y el inercial | Las estrellas no parpadean (el parpadeo de drei es un pulso común a todas) |
| **Cuarta capa: la esfera de formas**, no la hiperesfera de 4D | Sin el centro de masas quedan 4 dimensiones; sin tamaño ni giro (proyección de Hopf), una esfera que distingue a cada órbita. Es la representación con la que las clasificaron Šuvakov y Dmitrašinović (PRL 110, 114301, 2013), con los ejes de Janković, Dmitrašinović y Šuvakov (CPC 250, 107052, 2020). La hiperesfera se puede dibujar (la fibración de Hopf), pero cuesta leerla | En esta vista no se ven el tamaño ni el giro (sí en 2D). Se dibuja la curva, pero no se calcula su «palabra» topológica (ver «Límites») |
| **Esfera en SVG en la galería**; WebGL solo en el detalle | Como la trenza: la curva se proyecta y se simplifica en el servidor, y solo viaja la de cada órbita; contorno, ecuador y choques son comunes | ≈ 5 KB comprimidos más en la galería (medido). La escena, ≈ 16 KB comprimidos, solo se descarga al elegir «Forma» |
| **Reverso de la esfera atenuado con un velo** | Sin el reverso, media curva desaparece. Un velo del color del fondo, translúcido y dibujado al final, atenúa lo de detrás y deja intacto lo de delante, como la esfera translúcida de la Fig. 1 de 2013 | Las líneas van a radio 1,004, un poco por fuera de la superficie, y la estela y el halo del punto tienen que escribir profundidad |
| **Estado del laboratorio compartido** por persona y tutor (zustand, mismas acciones) | El tutor no tiene un camino propio: solo puede hacer lo que permite la interfaz | Estado global de módulo (vive mientras la pestaña) |
| **Herramientas del tutor ejecutadas en el cliente** (sin `execute` en el servidor) | Lo que cambian es la interfaz; el navegador devuelve al modelo los datos reales | Cada respuesta con herramienta son 2–3 peticiones |
| **Proveedor autodetectado** y **modelo rápido** por defecto | El equipo revisará con su clave, sea cual sea; en un chat pesa la latencia | Algo menos de calidad que un modelo grande (`LLM_MODEL` lo cambia) |
| **Estado del tutor consultado en tiempo de ejecución** (`GET /api/tutor`) | En Docker las claves llegan al arrancar, no al compilar | Una petición extra al cargar el capítulo 4 |
| **Límite de peticiones** con Upstash o en memoria | Protege la clave en un despliegue público | Sin Upstash, en Vercel cada instancia cuenta por separado |
| **`<ViewTransition>` de React** en lugar de `layoutId` de Motion (previsto en el plan) | `layoutId` necesita ambos elementos montados a la vez; entre rutas no lo están. ViewTransition usa la API del navegador | Sin animación en navegadores sin soporte; una dependencia menos |
| **Bloom con alternativa** (PerformanceMonitor, «reducir movimiento», dispositivos modestos) | Efectos solo donde no estropean la fluidez | Heurística de dispositivo aproximada |
| **KaTeX renderizado en el servidor** | HTML + MathML sin JavaScript de KaTeX en el cliente | Solo fórmulas estáticas (las vivas son componentes propios) |
| **Laboratorio que se desplaza a la vista** cuando el tutor o un experimento lo mueve (en vez de dejarlo fijo en pantalla) | En móvil queda lejos del botón que lo mueve. Fijarlo no sirve: con la pestaña Órbita mide más que la pantalla y taparía sus propios controles | La página salta al laboratorio; un botón flotante devuelve a donde estabas |
| **Tamaño táctil de 44 px con `pointer: coarse`**, no por ancho de pantalla | Lo que importa es el dedo, no el ancho: una tablet necesita 44 px y un escritorio estrecho, no | Un portátil táctil cuyo puntero principal es el ratón ve la versión compacta |
| **Coma decimal en la Parte A, punto en la B** | La A es divulgación en español; en la B las condiciones iniciales se comparan y copian con las publicaciones | Dos convenciones en la misma aplicación, documentadas en `lib/format.ts` |
| **Cabecera fija con capítulos y progreso** | La portada mide unas diez pantallas en móvil | Ocupa 57 px de alto en todas las páginas |
| **TypeScript `strict`** sin `noUncheckedIndexedAccess` | El núcleo numérico indexa typed arrays con índices acotados; los `!` no añadirían seguridad | Un índice fuera de rango daría `NaN` en silencio (lo detectarían los tests de energía) |

## Verificación

- **203 tests** (Vitest): orden 4 del integrador y de Hermite, leyes de Newton,
  cierre y conservación de energía de **cada órbita**, comparación de fuentes,
  clasificación de órbitas, la trenza (cada hebra vuelve a su posición en T y
  en 2T, proyecciones y encuadre de cámara), la vista «Dentro» (centro de masas
  quieto en las seis órbitas; en Lagrange, desde un cuerpo, los otros dos a ±30°
  y a distancia constante; retención en el centro y giro suave), la esfera de
  formas (no cambia al mover, girar o escalar el triángulo; equilátero en los
  polos y alineados en el ecuador; Lagrange quieta en el polo; las otras cinco
  arrancan en el mismo punto, cruzan el ecuador, como exige el teorema de
  Montgomery, nunca tocan un choque y cierran a menos de 10⁻⁷), cifras
  Tierra–Luna, descripciones de la galería
  (sus afirmaciones se comprueban), diagnóstico, proveedor, límite de
  peticiones, explorador (recupera los valores de Li & Liao partiendo de los
  5 dígitos originales de Moth I) y la **API del tutor de punta a punta con
  `MockLanguageModelV4`**.
- **Tutor con un proveedor real**: probado en producción con Google
  `gemini-3.5-flash-lite`. Responde en streaming, usa las herramientas (por
  ejemplo, duplica la distancia en el laboratorio) y devuelve una pregunta.
  Con Anthropic y OpenAI solo se ha probado con el modelo simulado.
- **Informes reproducibles**: `pnpm orbits:report` y `pnpm orbits:sources`
  generan las tablas de [docs/orbitas.md](docs/orbitas.md).
- **Accesibilidad**: auditoría con axe-core 4.14 (WCAG 2.1 AA y buenas
  prácticas) en las cinco páginas: 0 infracciones (antes de la última ronda
  de mejoras de UX; conviene repetirla). Navegación completa por teclado, foco
  visible, enlace para saltar al contenido, contrastes de texto de 8:1 a 17:1
  y de controles y estados de al menos 3:1, áreas táctiles de 44 px,
  alternativa sin arrastre a cada gesto (WCAG 2.5.7), botón para pausar las
  animaciones (2.2.2) y respeto a «reducir movimiento».
- **Navegador**: probado en Chrome a 320, 375, 390, 768, 1280 y 1440 px, sin
  scroll horizontal en ninguna ruta; despliegue en Vercel y `docker compose up`
  comprobados.

## Uso de IA

He desarrollado el proyecto con **Claude Code** (Anthropic) como asistente de
programación. Partí de un documento propio con el stack, el concepto visual y
el orden de construcción por módulos; la implementación se hizo módulo a
módulo, con commits por tema (llevan la coautoría de Claude) y una guía de
estudio por módulo para revisar y entender cada archivo y cada decisión.

Organicé el trabajo con agentes especializados, cada uno con una función
distinta:

- uno de **frontend**: interfaz, componentes y escenas;
- uno de **backend**: API del tutor, proveedor de LLM y límite de peticiones;
- uno de **arquitectura**: estructura de módulos, motor de física y
  decisiones técnicas.

Con el diseño terminado, un agente de **UX/UI** auditó la web contra las buenas
prácticas de referencia (heurísticas de Nielsen, WCAG 2.2 AA, diseño móvil
primero). Midió en el navegador de 320 a 1440 px, priorizó los problemas por
su impacto y aplicó las mejoras en tres fases, con un commit por cambio y la
verificación de cada fase en el navegador.

La IA no sustituye la verificación: cada afirmación física está respaldada por
un test o un informe reproducible, y las dos desviaciones del plan (la fuente
de las condiciones iniciales y ViewTransition en lugar de Motion) se tomaron a
partir de mediciones y están documentadas arriba.

## Límites conocidos

- **Modelos por defecto:** elegidos como los rápidos de cada proveedor según
  los tipos de los SDK instalados; una clave concreta puede no tener acceso a
  alguno.
- **Límite de peticiones sin Upstash:** orientativo en Vercel (por instancia).
- **Encuentros cercanos:** con paso fijo cuestan pasos; la interpolación se
  desvía hasta 10⁻³ y las estelas se ven en tramos rectos en el instante del
  encuentro.
- **Móviles modestos:** cada tarjeta de la galería calcula su trayectoria en un
  worker la primera vez que aparece en pantalla (hasta entonces, el dibujo
  estático).
- **Core Web Vitals:** el peso está medido (unos 240 KB de JS comprimido en la
  portada), pero LCP, CLS e INP no se han medido en laboratorio.
- **Transición galería → detalle:** solo anima en navegadores con View
  Transitions (Chromium reciente, Safari reciente).
- **Escenas 3D:** tienen nombre, póster y controles accesibles, pero el
  movimiento en sí no se narra.
- **Vista «Dentro»:** los cuerpos se distinguen solo por el color (el mismo
  que en el selector «Desde»), sin etiquetas en la escena. Viajar sobre un
  cuerpo puede marear: hay «Mirada fija», ½× y respeto a «reducir
  movimiento», pero no se ha probado con personas.
- **Vista «Forma»:** se dibuja la curva de cada órbita en la esfera, pero no
  se calcula su «palabra» topológica (la clasificación de la Tabla I de 2013).
  Ni el artículo de 2013 ni el de 2020 publican la regla para pasar de la
  curva a las letras, y lo medido descarta la más simple (una letra por cada
  par de cruces del ecuador): la figura de ocho cruza 6 veces por periodo y su
  palabra tiene 4 letras. Calibrarla sin la regla original sería adivinar.
- **Sin tests E2E automatizados** (Playwright): la interfaz se verificó a mano
  en el navegador.
- **Explorador:** un buen retorno es una candidata a órbita periódica, no una
  demostración (lo dice la propia página).
- **Consola:** aviso de `THREE.Clock` obsoleto, procedente de React Three Fiber.
- El estado de la galería se conserva al navegar, **no tras recargar** (el
  enunciado no lo pide).

---

<table>
  <tr>
 <td align="center"> <img src="https://github.com/mjamariscua.png?s=100" width="100px;" alt=""/> <br /> <sub> <b> <a href="https://github.com/mjamariscua"> Michael Amariscua (mjamariscua) </a></b></sub><br /></td>     </tr>
</table>

© 2026 Michael Amariscua. Todos los derechos reservados. Código entregado
exclusivamente para evaluación en el proceso de selección de BinPar; no se
concede licencia de uso, copia ni distribución.
