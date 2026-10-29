import { describe, expect, it } from "vitest";
import { galleryView, parsePlayerView } from "./views";

describe("vistas", () => {
  it("la URL elige la vista; cualquier otro valor es la vista 2D", () => {
    for (const view of ["2d", "3d", "dentro", "forma"] as const) expect(parsePlayerView(view)).toBe(view);
    expect(parsePlayerView(null)).toBe("2d");
    expect(parsePlayerView("4d")).toBe("2d");
    expect(parsePlayerView("trenza")).toBe("2d");
  });

  it("la galería muestra «Dentro» como 2D y el resto tal cual", () => {
    expect(galleryView("dentro")).toBe("2d");
    for (const view of ["2d", "3d", "forma"] as const) expect(galleryView(view)).toBe(view);
  });
});
