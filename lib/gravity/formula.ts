/**
 * La fórmula F = G·m₁·m₂/r² del capítulo 2, en unidades relativas al sistema
 * Tierra–Luna de hoy: m₁ en masas terrestres, m₂ en masas lunares y r en
 * distancias Tierra–Luna. Con todo a 1, F es la fuerza real entre la Tierra y
 * la Luna; cada cambio se lee como «la fuerza se multiplica por…».
 */

export type FormulaSymbol = "m1" | "m2" | "r";

export interface FormulaState {
  readonly m1: number;
  readonly m2: number;
  readonly r: number;
}

export const DEFAULT_FORMULA: FormulaState = { m1: 1, m2: 1, r: 1 };

export const FORMULA_LIMITS: Record<FormulaSymbol, { readonly min: number; readonly max: number }> = {
  m1: { min: 0.1, max: 10 },
  m2: { min: 0.1, max: 10 },
  r: { min: 0.25, max: 4 },
};

export const SYMBOL_NAMES: Record<FormulaSymbol, string> = {
  m1: "la masa de la Tierra (m₁)",
  m2: "la masa de la Luna (m₂)",
  r: "la distancia (r)",
};

export function clampSymbol(symbol: FormulaSymbol, value: number): number {
  const { min, max } = FORMULA_LIMITS[symbol];
  return Math.min(max, Math.max(min, value));
}

/** F respecto a la fuerza Tierra–Luna actual: m₁·m₂/r². G no aparece porque se cancela. */
export function forceRatio({ m1, m2, r }: FormulaState): number {
  return (m1 * m2) / (r * r);
}

/**
 * Explica en una frase qué ha hecho el último cambio con la fuerza. Es la
 * lección del capítulo: las masas multiplican, la distancia divide al cuadrado.
 */
export function explainChange(symbol: FormulaSymbol, before: number, after: number): string {
  const factor = after / before;
  const name = SYMBOL_NAMES[symbol];
  if (Math.abs(factor - 1) < 1e-9) return `${capitalize(name)} no ha cambiado.`;
  const verb = factor > 1 ? "multiplicado" : "dividido";
  const k = factor > 1 ? factor : 1 / factor;
  if (symbol === "r") {
    const effect = factor > 1 ? "se divide" : "se multiplica";
    return `Has ${verb} ${name} por ${fmt(k)}: la fuerza ${effect} por ${fmt(k)}² = ${fmt(k * k)}.`;
  }
  return `Has ${verb} ${name} por ${fmt(k)}: la fuerza también se ha ${verb} por ${fmt(k)}.`;
}

/** Sin ceros de relleno y con coma decimal: 2, 1,5, 0,25. */
const fmt = (x: number) => String(Number(x.toFixed(2))).replace(".", ",");
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
