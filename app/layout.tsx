import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Tipografía de titulares: una serif de contraste alto, solo en tamaños
// grandes. Geist queda para el texto y Geist Mono para las cifras.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://binpar.vercel.app"),
  title: {
    default: "Caída · La gravitación universal",
    template: "%s · Caída",
  },
  description:
    "La ley de gravitación universal de Newton explicada con simulaciones interactivas, y una galería de soluciones periódicas del problema de los tres cuerpos.",
  openGraph: { type: "website", locale: "es_ES", siteName: "Caída" },
};

// El sitio es solo oscuro (concepto visual «Caída»): se fija la clase `dark` en
// lugar de seguir la preferencia del sistema.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* Primer elemento enfocable: salta la navegación y va al contenido. */}
        <a
          href="#contenido"
          className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Saltar al contenido
        </a>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
