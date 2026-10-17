/** Escribe dy/dt evaluada en `y` dentro de `out`. Sistemas autónomos: no depende de t. */
export type Derivative = (y: Float64Array, out: Float64Array) => void;

/** Avanza `y` en el sitio un paso de tamaño `h`. */
export type Stepper = (y: Float64Array, h: number) => void;

/**
 * Runge–Kutta clásico de orden 4 con paso fijo.
 *
 * Por qué RK4 de paso fijo y no un integrador adaptativo (Dormand–Prince) o
 * simpléctico (Verlet):
 *  - Paso fijo ⇒ las muestras quedan equiespaciadas en el tiempo físico, así
 *    que la animación indexa el buffer en O(1) y el scrub es trivial.
 *  - Orden 4 ⇒ dividir el paso entre 2 reduce el error ~16×, lo que permite
 *    alcanzar cierres de órbita de 1e-9 con un coste predecible.
 *  - Verlet conserva mejor la energía a largo plazo, pero es de orden 2: para
 *    cerrar un único periodo con precisión haría falta muchísimos más pasos.
 * Coste conocido: en encuentros cercanos (r ≈ 0.01 en varias órbitas) el paso
 * fijo debe ser pequeño en todo el periodo, no solo durante el encuentro.
 *
 * Los buffers intermedios se reservan una sola vez por stepper, de modo que
 * integrar un millón de pasos no genera basura para el recolector.
 */
export function createRK4(dimension: number, f: Derivative): Stepper {
  const k1 = new Float64Array(dimension);
  const k2 = new Float64Array(dimension);
  const k3 = new Float64Array(dimension);
  const k4 = new Float64Array(dimension);
  const tmp = new Float64Array(dimension);

  return (y, h) => {
    f(y, k1);
    for (let i = 0; i < dimension; i++) tmp[i] = y[i] + 0.5 * h * k1[i];
    f(tmp, k2);
    for (let i = 0; i < dimension; i++) tmp[i] = y[i] + 0.5 * h * k2[i];
    f(tmp, k3);
    for (let i = 0; i < dimension; i++) tmp[i] = y[i] + h * k3[i];
    f(tmp, k4);
    const h6 = h / 6;
    for (let i = 0; i < dimension; i++) {
      y[i] += h6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    }
  };
}
