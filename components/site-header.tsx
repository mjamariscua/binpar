import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-border/60">
      <nav
        aria-label="Principal"
        className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6"
      >
        <Link href="/" className="rounded-sm font-heading text-2xl italic">
          Caída
        </Link>
        <Link
          href="/tres-cuerpos"
          // La galería restaura su propio scroll (ver OrbitGallery).
          scroll={false}
          className="rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Tres cuerpos
        </Link>
      </nav>
    </header>
  );
}
