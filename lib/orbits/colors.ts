/**
 * Un color por cuerpo, el mismo en el SVG estático y en la escena 3D.
 * Tonos cálido, frío y rosado separados en matiz para distinguirse sobre fondo
 * oscuro; la capa visual (módulo 4) los ajustará junto al resto del tema.
 */
export const BODY_COLORS = ["#f5b83d", "#5ec8f2", "#f2708a"] as const;

/**
 * Fondo de la escena 3D, opaco y con el mismo valor que el contenedor: el
 * canvas tapa el póster SVG en cuanto pinta su primer fotograma.
 */
export const SCENE_BACKGROUND = "#0a0b10";

/**
 * Los cuerpos de las escenas 3D se pintan con su color multiplicado por este
 * factor, «más blanco que el blanco» (componentes > 1, sin tone mapping), para
 * que superen el umbral del bloom y brillen.
 */
export const BODY_GLOW = 2.4;
