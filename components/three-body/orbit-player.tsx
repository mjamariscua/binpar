"use client";

import { Rotate3d } from "lucide-react";
import { lazy, Suspense, useEffect, useId, useState, useSyncExternalStore, ViewTransition, type ReactNode } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import type { BraidViewName, OrbitView } from "@/lib/orbits/braid";
import type { OrbitSlug } from "@/lib/orbits/catalog";
import { SCENE_BACKGROUND } from "@/lib/orbits/colors";
import { useCoarsePointer } from "@/lib/hooks/use-coarse-pointer";
import { useVisualQuality } from "@/lib/hooks/use-visual-quality";
import { useGalleryStore } from "@/lib/store/gallery-store";
import { usePlaybackStore } from "@/lib/store/playback-store";
import { PlaybackControls } from "./playback-controls";

// three.js y las escenas se descargan solo al abrir un detalle; la de la trenza, solo si se elige 3D.
const OrbitScene = lazy(() => import("./orbit-scene"));
const BraidScene = lazy(() => import("./braid-scene"));

const VIEWS: readonly { value: OrbitView; label: string; ariaLabel: string }[] = [
  { value: "2d", label: "2D", ariaLabel: "2D: el recorrido en el plano" },
  { value: "3d", label: "3D", ariaLabel: "3D: la trenza en el tiempo" },
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
  poster,
  braidPoster,
}: {
  slug: OrbitSlug;
  name: string;
  period: number;
  poster: ReactNode;
  braidPoster: ReactNode;
}) {
  const isClient = useIsClient();
  const { reducedMotion } = useVisualQuality();
  const coarse = useCoarsePointer();
  const view = useGalleryStore((s) => s.view);
  const setView = useGalleryStore((s) => s.setView);
  const [camera, setCamera] = useState<BraidViewName | null>("perspectiva");
  const [touchRotate, setTouchRotate] = useState(false);
  const viewLabelId = useId();
  const cameraLabelId = useId();
  const is3D = view === "3d";

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
        // En escritorio, más apaisado: así los controles quedan dentro de la primera pantalla (a 1440×900 empezaban en y = 915).
        className="relative aspect-square w-full overflow-hidden rounded-xl border border-border sm:aspect-[4/3] lg:aspect-[16/10]"
        style={{ background: SCENE_BACKGROUND }}
      >
        <div className="absolute inset-0">{is3D ? braidPoster : poster}</div>
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
            <Suspense fallback={<StatusOverlay>{is3D ? "Preparando la trenza…" : "Calculando la órbita…"}</StatusOverlay>}>
              {is3D ? (
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
            mira a lo largo del tiempo y muestra la órbita igual que en 2D.
          </p>
        </div>
      )}
    </section>
  );
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
