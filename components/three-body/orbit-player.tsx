"use client";

import { lazy, Suspense, useEffect, useSyncExternalStore, ViewTransition, type ReactNode } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import type { OrbitSlug } from "@/lib/orbits/catalog";
import { SCENE_BACKGROUND } from "@/lib/orbits/colors";
import { useVisualQuality } from "@/lib/hooks/use-visual-quality";
import { usePlaybackStore } from "@/lib/store/playback-store";
import { PlaybackControls } from "./playback-controls";

// three.js y la escena se descargan solo al abrir un detalle.
const OrbitScene = lazy(() => import("./orbit-scene"));

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
 * Simulación con sus controles. El póster SVG (generado en el servidor) se ve
 * al instante y queda debajo; el canvas, opaco, lo tapa cuando ya hay algo que
 * animar. Si la simulación falla, el póster sigue mostrando el recorrido.
 */
export function OrbitPlayer({
  slug,
  name,
  period,
  poster,
}: {
  slug: OrbitSlug;
  name: string;
  period: number;
  poster: ReactNode;
}) {
  const isClient = useIsClient();
  const { reducedMotion } = useVisualQuality();

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
        className="relative aspect-square w-full overflow-hidden rounded-xl border border-border sm:aspect-[4/3]"
        style={{ background: SCENE_BACKGROUND }}
      >
        <div className="absolute inset-0">{poster}</div>
        {isClient && (
          <ErrorBoundary
            fallback={(retry) => (
              <StatusOverlay>
                <span>No se pudo iniciar la simulación. Se muestra el recorrido estático.</span>
                <Button variant="outline" size="sm" onClick={retry}>
                  Reintentar
                </Button>
              </StatusOverlay>
            )}
          >
            <Suspense fallback={<StatusOverlay>Calculando la órbita…</StatusOverlay>}>
              <div className="absolute inset-0">
                <OrbitScene slug={slug} />
              </div>
            </Suspense>
          </ErrorBoundary>
        )}
      </div>
      </ViewTransition>
      <PlaybackControls slug={slug} period={period} />
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
