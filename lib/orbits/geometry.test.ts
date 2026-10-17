import { describe, expect, it } from "vitest";
import { packState } from "@/lib/physics/nbody";
import { precomputePeriod } from "@/lib/physics/trajectory";
import { bodyPath, orbitBounds, padBounds, simplifyPath, svgPathData, svgViewBox } from "./geometry";

// Binaria circular: los dos cuerpos recorren la circunferencia unidad.
const circular = precomputePeriod(
  { G: 1, masses: [1, 1] },
  packState([
    { position: { x: -1, y: 0 }, velocity: { x: 0, y: -0.5 } },
    { position: { x: 1, y: 0 }, velocity: { x: 0, y: 0.5 } },
  ]),
  4 * Math.PI,
  { intervals: 360, substeps: 8 },
);

describe("orbitBounds / padBounds", () => {
  it("encuadra el recorrido de todos los cuerpos", () => {
    const b = orbitBounds(circular);
    expect(b.minX).toBeCloseTo(-1, 6);
    expect(b.maxX).toBeCloseTo(1, 6);
    expect(b.minY).toBeCloseTo(-1, 3);
    expect(b.maxY).toBeCloseTo(1, 3);
  });

  it("añade el margen proporcional al lado mayor", () => {
    expect(padBounds({ minX: 0, maxX: 4, minY: 0, maxY: 2 }, 0.25)).toEqual({
      minX: -1,
      maxX: 5,
      minY: -1,
      maxY: 3,
    });
  });
});

describe("bodyPath", () => {
  it("sin diezmar devuelve todas las muestras del cuerpo, de la primera a la última", () => {
    const path = bodyPath(circular, 1);
    expect(path.length).toBe(361 * 2);
    expect([path[0], path[1]]).toEqual([1, 0]);
  });

  it("diezmando conserva la forma: menos puntos, separados al menos minDistance, y cierra", () => {
    const path = bodyPath(circular, 0, 0.1);
    // Circunferencia de longitud 2π con puntos cada ≥ 0.1: unos 63.
    expect(path.length / 2).toBeGreaterThan(55);
    expect(path.length / 2).toBeLessThan(70);
    for (let i = 2; i < path.length - 2; i += 2) {
      expect(Math.hypot(path[i] - path[i - 2], path[i + 1] - path[i - 1])).toBeGreaterThanOrEqual(0.1);
    }
    const [x0, y0] = path;
    const last = path.slice(-2);
    expect(Math.hypot(last[0] - x0, last[1] - y0)).toBeLessThan(1e-9);
  });
});

describe("simplifyPath (Ramer–Douglas–Peucker)", () => {
  it("una recta se queda en sus dos extremos; una esquina se conserva", () => {
    expect(simplifyPath([0, 0, 1, 0.0001, 2, 0, 3, 0], 0.01)).toEqual([0, 0, 3, 0]);
    expect(simplifyPath([0, 0, 1, 0, 1, 1], 0.01)).toEqual([0, 0, 1, 0, 1, 1]);
  });

  it("ningún punto descartado queda más lejos que la tolerancia del trazo simplificado", () => {
    const circle = bodyPath(circular, 1);
    const tol = 0.003;
    const simple = simplifyPath(circle, tol);
    expect(simple.length).toBeLessThan(circle.length / 4);
    // Para cada punto original, distancia mínima a los segmentos simplificados.
    const distToPolyline = (x: number, y: number) => {
      let best = Infinity;
      for (let i = 0; i + 3 < simple.length; i += 2) {
        const [ax, ay, bx, by] = [simple[i], simple[i + 1], simple[i + 2], simple[i + 3]];
        const dx = bx - ax;
        const dy = by - ay;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
        best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
      }
      return best;
    };
    for (let i = 0; i < circle.length; i += 2) {
      expect(distToPolyline(circle[i], circle[i + 1])).toBeLessThanOrEqual(tol + 1e-12);
    }
  });
});

describe("SVG", () => {
  it("invierte el eje y (en SVG crece hacia abajo)", () => {
    expect(svgPathData([0, 1, 2, -3], 1)).toBe("M0.0 -1.0L2.0 3.0");
    expect(svgViewBox({ minX: -1, maxX: 3, minY: -2, maxY: 5 }, 0)).toBe("-1 -5 4 7");
  });
});
