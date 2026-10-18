/**
 * Formato de cifras. Dos convenciones, cada una con su motivo:
 *
 * - Parte B (datos de las órbitas, explorador): punto decimal, como en las
 *   publicaciones citadas, para que las condiciones iniciales se puedan
 *   comparar y copiar tal cual con la fuente.
 * - Parte A (divulgación para todo público): coma decimal, la norma en
 *   español. Se hace con toFixed + coma, no con Intl, para que servidor y
 *   navegador den exactamente la misma cadena al hidratar.
 */

/** Cifra con `digits` decimales y coma decimal: 1,35. */
export function formatDecimal(x: number, digits: number): string {
  return x.toFixed(digits).replace(".", ",");
}

/** Hasta `digits` cifras significativas, sin ceros de relleno; el ruido de redondeo se muestra como 0. */
export function formatValue(x: number, digits = 12): string {
  if (Math.abs(x) < 1e-12) return "0";
  return String(Number(x.toPrecision(digits)));
}

/** Notación científica legible: 6.6·10⁻⁸ (o 6,6·10⁻⁸ con `decimal: ","`). */
export function formatScientific(x: number, digits = 2, decimal: "." | "," = "."): string {
  if (x === 0) return "0";
  const [mantissa, exponent] = x.toExponential(digits - 1).split("e");
  return `${mantissa.replace(".", decimal)}·10${toSuperscript(Number(exponent))}`;
}

const SUPERSCRIPT: Record<string, string> = {
  "-": "⁻",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

function toSuperscript(n: number): string {
  return [...String(n)].map((c) => SUPERSCRIPT[c] ?? c).join("");
}

/** 524288 → «524 288», con espacio fino como separador de miles (norma ISO, válida en español). */
export function formatInteger(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
