import { create } from "zustand";
import type { OrbitView } from "@/lib/orbits/braid";
import type { OrbitFamily, OrbitSlug } from "@/lib/orbits/catalog";

export type GalleryFilter = "todas" | OrbitFamily;

/**
 * Estado de la interfaz de la galería que debe sobrevivir a ir al detalle y
 * volver (requisito del enunciado): filtro, vista 2D o 3D, posición de scroll
 * y última tarjeta abierta, para devolverle el foco. Vive en memoria, sin
 * persistir: el enunciado no exige conservarlo tras recargar.
 *
 * La vista la comparten galería y detalle: si eliges 3D en la galería, la
 * órbita que abras se abre en 3D, y viceversa.
 */
interface GalleryStore {
  readonly filter: GalleryFilter;
  readonly view: OrbitView;
  readonly scrollY: number;
  readonly lastVisited: OrbitSlug | null;
  setFilter: (filter: GalleryFilter) => void;
  setView: (view: OrbitView) => void;
  /** Se llama al abrir una tarjeta, justo antes de navegar. */
  rememberExit: (slug: OrbitSlug, scrollY: number) => void;
}

export const useGalleryStore = create<GalleryStore>()((set) => ({
  filter: "todas",
  view: "2d",
  scrollY: 0,
  lastVisited: null,
  setFilter: (filter) => set({ filter }),
  setView: (view) => set({ view }),
  rememberExit: (slug, scrollY) => set({ lastVisited: slug, scrollY }),
}));

export function matchesFilter(family: OrbitFamily, filter: GalleryFilter): boolean {
  return filter === "todas" || filter === family;
}
