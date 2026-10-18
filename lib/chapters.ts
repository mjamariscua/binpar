/**
 * Capítulos de la Parte A, en orden. Los usan el índice de la portada y la
 * navegación de la cabecera; el id es el ancla de cada sección.
 */
export const CHAPTERS = [
  { id: "manzana-y-luna", title: "La manzana y la Luna" },
  { id: "la-formula", title: "La fórmula, viva" },
  { id: "lanzar", title: "Lanzar un satélite" },
  { id: "tutor", title: "Ponte a prueba" },
] as const;

export type ChapterId = (typeof CHAPTERS)[number]["id"];
