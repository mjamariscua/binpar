"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const inThreeBody = pathname.startsWith("/tres-cuerpos");

  return (
    <header className="border-b border-border/60">
      <nav
        aria-label="Principal"
        className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-1.5 sm:px-6"
      >
        <Link
          href="/"
          aria-current={pathname === "/" ? "page" : undefined}
          className="inline-flex min-h-11 items-center rounded-sm font-heading text-2xl italic"
        >
          Caída
        </Link>
        <Link
          href="/tres-cuerpos"
          // La galería restaura su propio scroll (ver OrbitGallery).
          scroll={false}
          // «page» en la galería; «true» (sección actual) en el detalle y el explorador.
          aria-current={pathname === "/tres-cuerpos" ? "page" : inThreeBody ? "true" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center rounded-md px-2 text-base transition-colors hover:text-foreground",
            inThreeBody
              ? "text-foreground underline decoration-primary decoration-2 underline-offset-8"
              : "text-muted-foreground",
          )}
        >
          Tres cuerpos
        </Link>
      </nav>
    </header>
  );
}
