import Link from "next/link";

export default function NotFound() {
  return (
    <main id="contenido" tabIndex={-1} className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <p className="font-mono text-sm text-primary">404</p>
      <h1 className="font-heading text-5xl sm:text-7xl">Esta página se ha perdido en órbita</h1>
      <p className="text-lg text-muted-foreground">La dirección no corresponde a ninguna página de Caída.</p>
      <div className="flex flex-wrap gap-4">
        <Link href="/" className="rounded-lg border border-primary/60 px-5 py-3 text-primary hover:bg-primary/10">
          Volver al inicio
        </Link>
        <Link href="/tres-cuerpos" className="rounded-lg border border-border px-5 py-3 hover:border-foreground/40">
          Galería de tres cuerpos
        </Link>
      </div>
    </main>
  );
}
