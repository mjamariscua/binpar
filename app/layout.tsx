import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: {
    default: "Caída · La gravitación universal",
    template: "%s · Caída",
  },
  description:
    "La ley de gravitación universal de Newton explicada con simulaciones interactivas, y una galería de soluciones periódicas del problema de los tres cuerpos.",
};

// El sitio es solo oscuro (concepto visual «Caída»): se fija la clase `dark` en
// lugar de seguir la preferencia del sistema.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
