import { create } from "zustand";
import type { OrbitFamily, OrbitSlug } from "@/lib/orbits/catalog";

export type GalleryFilter = "todas" | OrbitFamily;

/**
 * Estado de la interfaz de la galería que debe sobrevivir a ir al detalle y
 * volver (requisito del enunciado): filtro, posición de scroll y última
 * tarjeta abierta, para devolverle el foco. Vive en memoria, sin persistir:
 * el enunciado no exige conservarlo tras recargar.
 */
interface GalleryStore {
  readonly filter: GalleryFilter;
  readonly scrollY: number;
  readonly lastVisited: OrbitSlug | null;
  setFilter: (filter: GalleryFilter) => void;
  /** Se llama al abrir una tarjeta, justo antes de navegar. */
  rememberExit: (slug: OrbitSlug, scrollY: number) => void;
}

export const useGalleryStore = create<GalleryStore>()((set) => ({
  filter: "todas",
  scrollY: 0,
  lastVisited: null,
  setFilter: (filter) => set({ filter }),
  rememberExit: (slug, scrollY) => set({ lastVisited: slug, scrollY }),
}));

export function matchesFilter(family: OrbitFamily, filter: GalleryFilter): boolean {
  return filter === "todas" || filter === family;
}
