import { AdditiveBlending, Color, type InterleavedBufferAttribute } from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

/**
 * Estela que se desvanece: una línea gruesa (Line2, ancho en píxeles) cuyo
 * color va del negro en la cola al color del cuerpo en la cabeza.
 *
 * Line2 solo admite color RGB por vértice, sin transparencia. Con mezcla
 * aditiva, sumar negro no cambia nada, así que degradar el color hacia negro
 * equivale a degradar la opacidad sobre el fondo oscuro. Además el bloom
 * hace brillar más la cabeza que la cola.
 *
 * Los búferes se reservan UNA vez, al tamaño máximo, y se reescriben en el
 * sitio en cada fotograma; `instanceCount` decide cuántos segmentos se
 * dibujan. Dos motivos:
 *  - sin asignaciones por fotograma;
 *  - three.js calcula el máximo de instancias dibujables la primera vez que
 *    ve los búferes: si se recrean más grandes, sigue dibujando solo los del
 *    principio (fallo real que tuvo el sandbox: la estela no aparecía).
 */
export class FadingTrail {
  readonly object: Line2;
  private readonly geometry = new LineGeometry();
  private readonly material: LineMaterial;
  private readonly rgb: Color;
  private readonly maxPoints: number;
  private readonly segments: Float32Array;
  private readonly colors: Float32Array;
  private readonly positionAttribute: InterleavedBufferAttribute;
  private readonly colorAttribute: InterleavedBufferAttribute;

  /**
   * Con `depthWrite`, la estela escribe profundidad. La esfera de formas lo
   * necesita: su velo translúcido atenúa lo que queda detrás de la esfera, y
   * sin profundidad escrita taparía también la estela de la cara visible.
   */
  constructor(color: string, maxPoints: number, widthPx: number, z = 0.5, { depthWrite = false }: { depthWrite?: boolean } = {}) {
    this.rgb = new Color(color);
    this.maxPoints = maxPoints;
    this.material = new LineMaterial({
      color: 0xffffff,
      linewidth: widthPx,
      vertexColors: true,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite,
    });
    // Búferes del tamaño máximo: (maxPoints − 1) segmentos de [inicio xyz, fin xyz].
    const zeros = new Float32Array(maxPoints * 3);
    this.geometry.setPositions(zeros);
    this.geometry.setColors(zeros);
    this.positionAttribute = this.geometry.getAttribute("instanceStart") as InterleavedBufferAttribute;
    this.colorAttribute = this.geometry.getAttribute("instanceColorStart") as InterleavedBufferAttribute;
    this.segments = this.positionAttribute.data.array as Float32Array;
    this.colors = this.colorAttribute.data.array as Float32Array;
    this.geometry.instanceCount = 0;

    this.object = new Line2(this.geometry, this.material);
    this.object.frustumCulled = false;
    this.object.position.z = z;
  }

  /**
   * `points` contiene `count` puntos ordenados de la cola a la cabeza:
   * [x0, y0, x1, y1, …] en el plano (z = 0) o, con `dims` = 3, [x0, y0, z0, …].
   */
  update(points: Float32Array | Float64Array, count: number, dims: 2 | 3 = 2): void {
    const n = Math.min(count, this.maxPoints);
    const { r, g, b } = this.rgb;
    for (let i = 0; i < n - 1; i++) {
      const o = i * 6;
      const a = i * dims;
      const c = (i + 1) * dims;
      // La cola se apaga deprisa (t²); la cabeza conserva el color.
      const f0 = (i / (n - 1)) ** 2;
      const f1 = ((i + 1) / (n - 1)) ** 2;
      this.segments[o] = points[a];
      this.segments[o + 1] = points[a + 1];
      this.segments[o + 2] = dims === 3 ? points[a + 2] : 0;
      this.segments[o + 3] = points[c];
      this.segments[o + 4] = points[c + 1];
      this.segments[o + 5] = dims === 3 ? points[c + 2] : 0;
      this.colors[o] = r * f0;
      this.colors[o + 1] = g * f0;
      this.colors[o + 2] = b * f0;
      this.colors[o + 3] = r * f1;
      this.colors[o + 4] = g * f1;
      this.colors[o + 5] = b * f1;
    }
    this.positionAttribute.data.needsUpdate = true;
    this.colorAttribute.data.needsUpdate = true;
    this.geometry.instanceCount = Math.max(0, n - 1);
  }

  /** LineMaterial necesita el tamaño del canvas para que el ancho en píxeles sea correcto. */
  setResolution(width: number, height: number): void {
    this.material.resolution.set(width, height);
  }

  hide(): void {
    this.geometry.instanceCount = 0;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
