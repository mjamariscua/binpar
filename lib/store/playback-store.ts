import { create } from "zustand";
import type { OrbitSlug } from "@/lib/orbits/catalog";
import {
  INITIAL_PLAYBACK,
  advance,
  seek,
  type Playback,
  type Speed,
} from "@/lib/orbits/playback";

/**
 * Reproducción de cada órbita, guardada por slug en memoria: si sales de una
 * órbita y vuelves, sigue en el instante y a la velocidad en que la dejaste.
 * No se persiste; recargar la página la reinicia.
 *
 * El tiempo avanza desde useFrame (un set por fotograma). Los controles se
 * suscriben con selectores y la escena lee con getState(), así que la
 * animación no provoca renders de React en la escena.
 */
interface PlaybackStore {
  readonly bySlug: Partial<Record<OrbitSlug, Playback>>;
  advance: (slug: OrbitSlug, frameSeconds: number, period: number) => void;
  seek: (slug: OrbitSlug, time: number, period: number) => void;
  togglePlaying: (slug: OrbitSlug) => void;
  setSpeed: (slug: OrbitSlug, speed: Speed) => void;
  reset: (slug: OrbitSlug) => void;
}

export const usePlaybackStore = create<PlaybackStore>()((set) => {
  const update = (slug: OrbitSlug, next: (p: Playback) => Playback) =>
    set((state) => {
      const current = state.bySlug[slug] ?? INITIAL_PLAYBACK;
      const updated = next(current);
      return updated === current ? state : { bySlug: { ...state.bySlug, [slug]: updated } };
    });

  return {
    bySlug: {},
    advance: (slug, frameSeconds, period) => update(slug, (p) => advance(p, frameSeconds, period)),
    seek: (slug, time, period) => update(slug, (p) => seek(p, time, period)),
    togglePlaying: (slug) => update(slug, (p) => ({ ...p, playing: !p.playing })),
    setSpeed: (slug, speed) => update(slug, (p) => ({ ...p, speed })),
    reset: (slug) => update(slug, () => INITIAL_PLAYBACK),
  };
});

/** Reproducción de una órbita; devuelve la constante inicial (referencia estable) si aún no existe. */
export function usePlayback(slug: OrbitSlug): Playback {
  return usePlaybackStore((state) => state.bySlug[slug] ?? INITIAL_PLAYBACK);
}
