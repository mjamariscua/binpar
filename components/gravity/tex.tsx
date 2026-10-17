import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * Fórmula con KaTeX, renderizada en el servidor: el navegador recibe HTML y
 * MathML ya hechos (este último lo leen los lectores de pantalla) y no
 * descarga KaTeX. Solo se usa con cadenas escritas en el código, nunca con
 * texto del usuario o del modelo, por eso el HTML se inserta tal cual.
 */
export function Tex({ children, display = false }: { children: string; display?: boolean }) {
  const html = katex.renderToString(children, {
    displayMode: display,
    output: "htmlAndMathml",
    throwOnError: true,
  });
  return display ? (
    <div className="my-6 overflow-x-auto text-xl" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  );
}
