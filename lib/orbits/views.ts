/**
 * Las vistas de una órbita, en un solo sitio:
 *   - 2D: el recorrido en el plano;
 *   - 3D: la trenza en el tiempo (braid.ts);
 *   - Forma: la esfera de formas (shape.ts);
 *   - Dentro: primera persona (inside.ts), solo en el detalle.
 */

/** Vistas de la galería: las que se pueden dibujar en SVG en cada tarjeta. */
export type OrbitView = "2d" | "3d" | "forma";

/** Vistas del reproductor del detalle: las de la galería y, solo aquí, «Dentro». */
export type PlayerView = OrbitView | "dentro";

const PLAYER_VIEWS: readonly PlayerView[] = ["2d", "3d", "dentro", "forma"];

/** Lee la vista de un parámetro de URL; cualquier otro valor es la vista 2D, la de siempre. */
export function parsePlayerView(value: string | null | undefined): PlayerView {
  return PLAYER_VIEWS.find((view) => view === value) ?? "2d";
}

/** Lo que la galería muestra para la vista guardada: «Dentro» no existe allí y se ve como 2D. */
export function galleryView(view: PlayerView): OrbitView {
  return view === "dentro" ? "2d" : view;
}
