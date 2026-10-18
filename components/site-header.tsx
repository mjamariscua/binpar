"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChapterNav, ReadingProgress } from "@/components/chapter-nav";
import { MotionToggle } from "@/components/motion-toggle";
import { cn } from "@/lib/utils";

/**
 * Cabecera fija: marca, capítulos (solo en la portada), enlace a la Parte B y
 * pausa de animaciones. Fija porque la portada mide unas diez pantallas en
 * móvil y sin ella no se sabe dónde estás ni se puede saltar de capítulo.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const inThreeBody = pathname.startsWith("/tres-cuerpos");

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <nav
        aria-label="Principal"
        className="mx-auto flex w-full max-w-6xl items-center gap-1 px-4 py-1.5 sm:gap-3 sm:px-6"
      >
        <Link
          href="/"
          aria-current={onHome ? "page" : undefined}
          className="mr-1 inline-flex min-h-11 items-center rounded-sm font-heading text-2xl italic"
        >
          Caída
        </Link>
        {onHome && <ChapterNav />}
        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/tres-cuerpos"
            // La galería restaura su propio scroll (ver OrbitGallery).
            scroll={false}
            // «page» en la galería; «true» (sección actual) en el detalle y el explorador.
            aria-current={pathname === "/tres-cuerpos" ? "page" : inThreeBody ? "true" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-md px-2 text-base whitespace-nowrap transition-colors hover:text-foreground",
              inThreeBody
                ? "text-foreground underline decoration-primary decoration-2 underline-offset-8"
                : "text-muted-foreground",
            )}
          >
            Tres cuerpos
          </Link>
          <MotionToggle />
        </div>
      </nav>
      {onHome && <ReadingProgress />}
    </header>
  );
}
