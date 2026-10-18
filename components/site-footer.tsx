import Link from "next/link";

const REPOSITORY = "https://github.com/mjamariscua/binpar";

/**
 * Pie común: navegación entre las partes, de dónde salen el código y las
 * decisiones (el README) y el aviso de que es una prueba técnica.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 text-sm sm:px-6 md:grid-cols-[1fr_auto]">
        <div className="max-w-prose space-y-2 text-muted-foreground">
          <p className="font-heading text-2xl text-foreground italic">Caída</p>
          <p>
            La ley de gravitación universal, para tocarla, y seis soluciones periódicas del problema de los tres
            cuerpos.
          </p>
          <p>
            © 2026 Michael Amariscua. Prueba técnica entregada exclusivamente para evaluación en el proceso de
            selección de BinPar.
          </p>
        </div>
        <nav aria-label="Pie de página">
          <ul className="flex flex-col gap-1">
            <FooterLink href="/">Gravitación: los cuatro capítulos</FooterLink>
            <FooterLink href="/tres-cuerpos">Galería de tres cuerpos</FooterLink>
            <FooterLink href="/tres-cuerpos/explorador">Busca tu órbita</FooterLink>
            <li>
              <a
                href={REPOSITORY}
                className="inline-flex min-h-11 items-center text-muted-foreground underline-offset-4 hover:text-foreground hover:underline md:min-h-9"
              >
                Código y decisiones técnicas
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: string }) {
  return (
    <li>
      <Link
        href={href}
        className="inline-flex min-h-11 items-center text-muted-foreground underline-offset-4 hover:text-foreground hover:underline md:min-h-9"
      >
        {children}
      </Link>
    </li>
  );
}
