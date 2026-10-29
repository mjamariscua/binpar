"use client";

import { Hand, Rotate3d } from "lucide-react";
import { lazy, Suspense, useEffect, useId, useState, useSyncExternalStore, ViewTransition, type ReactNode } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { Segmented, type SegmentedOption } from "@/components/ui/segmented";
import type { BraidViewName } from "@/lib/orbits/braid";
import type { OrbitSlug } from "@/lib/orbits/catalog";
import { BODY_COLORS, SCENE_BACKGROUND } from "@/lib/orbits/colors";
import {
  formatViewpoint,
  parseViewpoint,
  type Gaze,
  type Viewpoint,
  type ViewpointParam,
} from "@/lib/orbits/inside";
import type { ShapeCameraName } from "@/lib/orbits/shape";
import { parsePlayerView, type PlayerView } from "@/lib/orbits/views";
import { useCoarsePointer } from "@/lib/hooks/use-coarse-pointer";
import { useVisualQuality } from "@/lib/hooks/use-visual-quality";
import { useGalleryStore } from "@/lib/store/gallery-store";
import { useInsideStore } from "@/lib/store/inside-store";
import { usePlaybackStore } from "@/lib/store/playback-store";
import { LookButtons, LookSurface } from "./inside-look";
import { PlaybackControls } from "./playback-controls";
import { PLAYER_ID } from "./show-shape-button";

// three.js y las escenas se descargan solo al abrir un detalle; la trenza y «Dentro», solo si se eligen.
const OrbitScene = lazy(() => import("./orbit-scene"));
const BraidScene = lazy(() => import("./braid-scene"));
const InsideScene = lazy(() => import("./inside-scene"));
const ShapeScene = lazy(() => import("./shape-scene"));

const VIEWS: readonly { value: PlayerView; label: string; ariaLabel: string }[] = [
  { value: "2d", label: "2D", ariaLabel: "2D: el recorrido en el plano" },
  { value: "3d", label: "3D", ariaLabel: "3D: la trenza en el tiempo" },
  { value: "dentro", label: "Dentro", ariaLabel: "Dentro: la órbita en primera persona" },
  { value: "forma", label: "Forma", ariaLabel: "Forma: la esfera de formas del triángulo" },
];

const VIEWPOINTS: readonly SegmentedOption<ViewpointParam>[] = [
  { value: "centro", label: "Centro", ariaLabel: "En el centro de masas" },
  ...BODY_COLORS.map((color, b) => ({
    value: formatViewpoint(b as Viewpoint),
    label: (
      <>
        <BodyDot color={color} />
        {/* En móvil, solo el número: las cuatro opciones caben en una fila. */}
        <span className="max-sm:sr-only">Cuerpo</span> {b + 1}
      </>
    ),
    ariaLabel: `Sobre el cuerpo ${b + 1}`,
  })),
];

const GAZES: readonly SegmentedOption<Gaze>[] = [
  { value: "centro", label: "Al centro", ariaLabel: "Mirada al centro de masas" },
  { value: "fija", label: "Fija", ariaLabel: "Mirada fija respecto a las estrellas" },
];

const SHAPE_CAMERA_OPTIONS: readonly { value: ShapeCameraName; label: string }[] = [
  { value: "frente", label: "De frente" },
  { value: "polo", label: "Desde el polo" },
];

const CAMERAS: readonly { value: BraidViewName; label: string }[] = [
  { value: "perspectiva", label: "Perspectiva" },
  { value: "frente", label: "De frente" },
  { value: "lateral", label: "Lateral" },
];

const noopSubscribe = () => () => {};

/**
 * true en el navegador y false al renderizar en el servidor. La escena no
 * puede renderizarse en el servidor: necesita Worker y WebGL.
 */
function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * Simulación con sus controles, en dos vistas: 2D (el recorrido en el plano)
 * y 3D (la trenza en el tiempo). La vista es la misma que la de la galería
 * (vive en su store), así que lo que elijas allí se mantiene aquí y al volver.
 *
 * El póster SVG de cada vista (generado en el servidor) se ve al instante y
 * queda debajo; el canvas, opaco, lo tapa cuando ya hay algo que animar. Si la
 * simulación falla, el póster sigue ahí. Las dos escenas comparten el store de
 * reproducción: al cambiar de vista se conservan instante, pausa y velocidad.
 */
export function OrbitPlayer({
  slug,
  name,
  period,
  masses,
  poster,
  braidPoster,
  shapePoster,
}: {
  slug: OrbitSlug;
  name: string;
  period: number;
  /** Masas de los cuerpos: la vista «Dentro» las usa para el centro de masas. */
  masses: readonly number[];
  poster: ReactNode;
  braidPoster: ReactNode;
  shapePoster: ReactNode;
}) {
  const isClient = useIsClient();
  const { reducedMotion } = useVisualQuality();
  const coarse = useCoarsePointer();
  const view = useGalleryStore((s) => s.view);
  const setView = useGalleryStore((s) => s.setView);
  const from = useInsideStore((s) => s.from);
  const setFrom = useInsideStore((s) => s.setFrom);
  // Con «reducir movimiento», la mirada no gira sola salvo que se pida.
  const gaze = useInsideStore((s) => s.gaze) ?? (reducedMotion ? "fija" : "centro");
  const setGaze = useInsideStore((s) => s.setGaze);
  const [camera, setCamera] = useState<BraidViewName | null>("perspectiva");
  const [shapeCamera, setShapeCamera] = useState<ShapeCameraName | null>("frente");
  const [touchRotate, setTouchRotate] = useState(false);
  const [touchLook, setTouchLook] = useState(false);
  const viewLabelId = useId();
  const cameraLabelId = useId();
  const fromLabelId = useId();
  const gazeLabelId = useId();
  const is3D = view === "3d";
  const inside = view === "dentro";
  const isShape = view === "forma";

  // La URL manda al abrir: un enlace con ?vista=3d abre la órbita en 3D, y
  // ?vista=dentro&desde=2, sobre el cuerpo 2. Se lee de window.location y no
  // con useSearchParams, que en esta ruta estática obligaría a envolver el
  // reproductor en un Suspense y lo sacaría del HTML del servidor. Coste: con
  // el enlace se ve un instante el póster 2D.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vista = params.get("vista");
    if (vista !== null) setView(parsePlayerView(vista));
    if (vista === "dentro") setFrom(parseViewpoint(params.get("desde")));
  }, [setView, setFrom]);

  // Y la URL sigue a lo elegido, para poder compartirlo. replaceState y no
  // pushState: cambiar de vista no debe llenar el historial del botón «atrás».
  useEffect(() => {
    const url = new URL(window.location.href);
    if (view === "2d") url.searchParams.delete("vista");
    else url.searchParams.set("vista", view);
    if (inside && from !== "centro") url.searchParams.set("desde", formatViewpoint(from));
    else url.searchParams.delete("desde");
    if (url.href !== window.location.href) window.history.replaceState(null, "", url);
  }, [view, inside, from]);

  // Con «reducir movimiento», una órbita que se abre por primera vez empieza en
  // pausa: el movimiento lo decide la persona con el botón de reproducir.
  useEffect(() => {
    const store = usePlaybackStore.getState();
    if (reducedMotion && !store.bySlug[slug]) store.togglePlaying(slug);
  }, [reducedMotion, slug]);

  return (
    <section aria-label={`Simulación de ${name}`} className="flex flex-col gap-5">
      <ViewTransition name={`orbita-${slug}`} share="morph" default="none">
      <div
        id={PLAYER_ID}
        // En escritorio, más apaisado: así los controles quedan dentro de la primera pantalla (a 1440×900 empezaban en y = 915).
        className="relative aspect-square w-full scroll-mt-20 overflow-hidden rounded-xl border border-border sm:aspect-[4/3] lg:aspect-[16/10]"
        style={{ background: SCENE_BACKGROUND }}
      >
        <div className="absolute inset-0">{is3D ? braidPoster : isShape ? shapePoster : poster}</div>
        {isClient && (
          <ErrorBoundary
            fallback={(retry) => (
              <StatusOverlay>
                <span>No se pudo iniciar la simulación. Se muestra el dibujo estático.</span>
                <Button variant="outline" size="sm" onClick={retry}>
                  Reintentar
                </Button>
              </StatusOverlay>
            )}
          >
            <Suspense
              fallback={
                <StatusOverlay>
                  {is3D
                    ? "Preparando la trenza…"
                    : inside
                      ? "Preparando la vista desde dentro…"
                      : isShape
                        ? "Preparando la esfera…"
                        : "Calculando la órbita…"}
                </StatusOverlay>
              }
            >
              {inside ? (
                <LookSurface
                  label={`${name} desde dentro, ${from === "centro" ? "en el centro de masas" : `sobre el cuerpo ${from + 1}`}: la órbita es el suelo y los cuerpos se mueven a tu alrededor, bajo un cielo de estrellas fijas. Flechas para mirar alrededor; Inicio vuelve a la mirada inicial.`}
                  // En táctil, mirar con el dedo solo tras activarlo: si no, el dedo desplaza la página.
                  touch={coarse && touchLook}
                >
                  <InsideScene slug={slug} masses={masses} from={from} gaze={gaze} />
                </LookSurface>
              ) : isShape ? (
                <div
                  className="absolute inset-0"
                  role="img"
                  aria-label={`${name} en la esfera de formas: la curva es cómo cambia la forma del triángulo durante el periodo y el punto, su forma en este instante; en la esquina, el triángulo de ahora, con su giro.`}
                >
                  <ShapeScene
                    slug={slug}
                    camera={shapeCamera}
                    // En táctil, girar solo tras activarlo, como la trenza: OrbitControls bloquea el scroll sobre el canvas.
                    interactive={!coarse || touchRotate}
                    onRotateStart={() => setShapeCamera(null)}
                  />
                </div>
              ) : is3D ? (
                <div
                  className="absolute inset-0"
                  role="img"
                  aria-label={`Trenza de ${name}: una hebra por cuerpo durante dos periodos; el tiempo avanza a lo largo de la trenza y el triángulo marca el instante actual.`}
                >
                  <BraidScene
                    slug={slug}
                    camera={camera}
                    // En táctil, girar solo tras activarlo: OrbitControls bloquea el scroll sobre el canvas.
                    interactive={!coarse || touchRotate}
                    onRotateStart={() => setCamera(null)}
                  />
                </div>
              ) : (
                <div className="absolute inset-0">
                  <OrbitScene slug={slug} />
                </div>
              )}
            </Suspense>
          </ErrorBoundary>
        )}
        {inside && <ViewpointBadge from={from} />}
      </div>
      </ViewTransition>
      <PlaybackControls
        slug={slug}
        period={period}
        extra={
          <>
            <span id={viewLabelId} className="text-sm text-muted-foreground">
              Vista
            </span>
            <Segmented size="sm" value={view} options={VIEWS} onChange={setView} aria-labelledby={viewLabelId} />
          </>
        }
      />
      {inside && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span id={fromLabelId} className="text-sm text-muted-foreground">
                Desde
              </span>
              <Segmented
                size="sm"
                value={formatViewpoint(from)}
                options={VIEWPOINTS}
                onChange={(value) => setFrom(parseViewpoint(value))}
                aria-labelledby={fromLabelId}
              />
            </div>
            {from !== "centro" && (
              <div className="flex flex-wrap items-center gap-3">
                <span id={gazeLabelId} className="text-sm text-muted-foreground">
                  Mirada
                </span>
                <Segmented size="sm" value={gaze} options={GAZES} onChange={setGaze} aria-labelledby={gazeLabelId} />
              </div>
            )}
          </div>
          <LookButtons resetLabel={from !== "centro" && gaze === "centro" ? "Mirar al centro" : "Mirar al frente"}>
            {coarse && (
              <Button variant="outline" size="sm" aria-pressed={touchLook} onClick={() => setTouchLook((v) => !v)}>
                <Hand /> Mirar con el dedo
              </Button>
            )}
          </LookButtons>
          <p className="max-w-prose text-sm text-muted-foreground">
            {insideText(slug, from, gaze)}
            {coarse
              ? " Activa «Mirar con el dedo» para mirar alrededor, o usa los botones."
              : " Arrastra para mirar alrededor, o usa las flechas con la escena enfocada."}
          </p>
        </div>
      )}
      {isShape && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span id={cameraLabelId} className="text-sm text-muted-foreground">
              Cámara
            </span>
            <Segmented
              size="sm"
              value={shapeCamera}
              options={SHAPE_CAMERA_OPTIONS}
              onChange={setShapeCamera}
              aria-labelledby={cameraLabelId}
            />
            {coarse && (
              <Button variant="outline" size="sm" aria-pressed={touchRotate} onClick={() => setTouchRotate((v) => !v)}>
                <Rotate3d /> Girar con el dedo
              </Button>
            )}
          </div>
          <p className="max-w-prose text-sm text-muted-foreground">
            Cada punto de la esfera es una forma del triángulo, sin importar su tamaño ni hacia dónde apunte: en los polos,
            equilátero; en el ecuador, los tres alineados, y el color del arco dice qué cuerpo queda en medio. Las bolitas
            pareadas son choques de dos cuerpos.{" "}
            {slug === "lagrange"
              ? "En Lagrange el punto no se mueve del polo: el triángulo gira (míralo en el recuadro), pero su forma nunca cambia."
              : "El punto es la forma de ahora; el recuadro dibuja el triángulo con su giro, que la esfera no tiene en cuenta."}
            {coarse ? " Activa «Girar con el dedo» para girarla" : " Arrastra para girarla"}, o elige una vista: «Desde el
            polo» enseña el hemisferio norte con los tres choques en el borde.
          </p>
        </div>
      )}
      {is3D && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span id={cameraLabelId} className="text-sm text-muted-foreground">
              Cámara
            </span>
            <Segmented
              size="sm"
              value={camera}
              options={CAMERAS}
              onChange={setCamera}
              aria-labelledby={cameraLabelId}
            />
            {coarse && (
              <Button variant="outline" size="sm" aria-pressed={touchRotate} onClick={() => setTouchRotate((v) => !v)}>
                <Rotate3d /> Girar con el dedo
              </Button>
            )}
          </div>
          <p className="max-w-prose text-sm text-muted-foreground">
            El tiempo avanza a lo largo de la trenza: cada hebra es un cuerpo y el corte translúcido, el instante actual.
            {coarse ? " Activa «Girar con el dedo» para girarla" : " Arrastra para girarla"}, o elige una vista. «De frente»
            mira a lo largo del tiempo, como por un túnel: se reconoce el recorrido de la vista 2D.
          </p>
        </div>
      )}
    </section>
  );
}

/** Qué se ve desde cada punto de vista, y la idea que enseña. */
function insideText(slug: OrbitSlug, from: Viewpoint, gaze: Gaze): string {
  if (from === "centro") {
    return "Estás en el centro de masas, el único punto que no se mueve: los tres cuerpos danzan a tu alrededor y ninguno pasa nunca lejos de ti.";
  }
  const body = `Viajas sobre el cuerpo ${from + 1}`;
  if (gaze === "fija") {
    return `${body} y la mirada no gira: solo te desplazas con él, y las estrellas quedan quietas.${
      slug === "lagrange" ? " Ahora sí ves girar el triángulo: es el mismo movimiento, visto sin girar con él." : ""
    }`;
  }
  return `${body}, mirando siempre al centro de masas: lo que ves es cómo se mueven los otros dos respecto a ti.${
    slug === "lagrange"
      ? " En Lagrange parecen quietos, porque el triángulo gira contigo; con «Mirada fija» lo verás girar."
      : ""
  } Si marea, prueba ½× o «Mirada fija».`;
}

/** Recordatorio sobre la escena de desde dónde se mira, con el color del cuerpo. */
function ViewpointBadge({ from }: { from: Viewpoint }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full bg-background/60 px-3 py-1 text-xs text-foreground backdrop-blur-sm"
    >
      {from === "centro" ? (
        "En el centro de masas"
      ) : (
        <>
          <BodyDot color={BODY_COLORS[from]} />
          Sobre el cuerpo {from + 1}
        </>
      )}
    </div>
  );
}

function BodyDot({ color }: { color: string }) {
  return <span aria-hidden className="inline-block size-2 shrink-0 rounded-full" style={{ background: color }} />;
}

function StatusOverlay({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-3 bg-background/70 px-4 py-3 text-sm text-muted-foreground backdrop-blur-sm"
    >
      {children}
    </div>
  );
}
