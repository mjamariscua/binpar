/**
 * Minimización de Nelder–Mead: busca un mínimo local moviendo un símplex
 * (en 2D, un triángulo) con reflexiones, expansiones y contracciones. No
 * necesita derivadas, que aquí no tenemos: la función a minimizar (la
 * proximidad de retorno) sale de integrar una órbita entera.
 *
 * Coeficientes estándar: reflexión 1, expansión 2, contracción ½, reducción ½.
 */
export interface NelderMeadResult {
  readonly point: readonly number[];
  readonly value: number;
  readonly evaluations: number;
}

export function nelderMead(
  f: (x: readonly number[]) => number,
  start: readonly number[],
  { step, maxEvaluations, tolerance = 1e-12 }: { step: number; maxEvaluations: number; tolerance?: number },
): NelderMeadResult {
  const dim = start.length;
  let evaluations = 0;
  const evaluate = (x: number[]) => {
    evaluations += 1;
    return { x, v: f(x) };
  };

  // Símplex inicial: el punto de partida y uno desplazado `step` en cada eje.
  let simplex = [evaluate([...start])];
  for (let i = 0; i < dim; i++) {
    const x = [...start];
    x[i] += step;
    simplex.push(evaluate(x));
  }

  const combine = (a: number[], b: number[], t: number) => a.map((ai, i) => ai + t * (b[i] - ai));

  while (evaluations < maxEvaluations) {
    simplex.sort((p, q) => p.v - q.v);
    const best = simplex[0];
    const worst = simplex[dim];
    if (Math.abs(worst.v - best.v) <= tolerance) break;

    // Centroide de todos menos el peor.
    const centroid = new Array<number>(dim).fill(0);
    for (let i = 0; i < dim; i++) for (let j = 0; j < dim; j++) centroid[j] += simplex[i].x[j] / dim;

    const reflected = evaluate(combine(centroid, worst.x, -1));
    if (reflected.v < best.v) {
      const expanded = evaluate(combine(centroid, worst.x, -2));
      simplex[dim] = expanded.v < reflected.v ? expanded : reflected;
    } else if (reflected.v < simplex[dim - 1].v) {
      simplex[dim] = reflected;
    } else {
      const contracted = evaluate(combine(centroid, worst.x, 0.5));
      if (contracted.v < worst.v) {
        simplex[dim] = contracted;
      } else {
        // Reducción: todo el símplex se encoge hacia el mejor punto.
        simplex = simplex.map((p, i) => (i === 0 ? p : evaluate(combine(best.x, p.x, 0.5))));
      }
    }
  }

  simplex.sort((p, q) => p.v - q.v);
  return { point: simplex[0].x, value: simplex[0].v, evaluations };
}
