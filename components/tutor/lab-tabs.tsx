"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePrefersReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { useLabStore, type LabTab } from "@/lib/store/lab-store";
import { LiveFormula } from "@/components/gravity/live-formula";
import { OrbitSandbox } from "@/components/gravity/orbit-sandbox";

const isTab = (v: string): v is LabTab => v === "formula" || v === "orbita";

/** Altura de la cabecera fija: al desplazar, el laboratorio queda justo debajo. */
const HEADER_OFFSET = 72;

/**
 * El laboratorio que comparten la persona y el tutor: la fórmula del capítulo
 * 2 y el lanzador del capítulo 3, con el mismo estado. La pestaña activa
 * vive en el store porque el tutor la cambia al usar una herramienta.
 *
 * Cuando el tutor o un experimento lo mueven y no está a la vista (en móvil
 * queda encima o debajo de la conversación), se desplaza hasta él y ofrece
 * volver a donde estabas.
 */
export function LabTabs() {
  const tab = useLabStore((s) => s.tab);
  const setTab = useLabStore((s) => s.setTab);
  const revealRequest = useLabStore((s) => s.revealRequest);
  const reducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // Dónde estaba la persona antes de desplazar, y si volver es subir o bajar.
  const [returnTo, setReturnTo] = useState<{ top: number; up: boolean } | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (revealRequest === 0 || !node) return;
    const { top } = node.getBoundingClientRect();
    // Basta con que se vea su parte de arriba: ahí están la fórmula y la escena.
    if (top >= HEADER_OFFSET - 8 && top < window.innerHeight * 0.4) return;
    const from = window.scrollY;
    const target = from + top - HEADER_OFFSET;
    window.scrollTo({ top: target, behavior: reducedMotion ? "auto" : "smooth" });
    setReturnTo({ top: from, up: from < target });
  }, [revealRequest, reducedMotion]);

  // El botón de volver desaparece en cuanto el laboratorio sale de la vista
  // (la persona ya ha vuelto por su cuenta).
  useEffect(() => {
    const node = ref.current;
    if (returnTo === null || !node) return;
    let seen = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) seen = true;
      else if (seen) setReturnTo(null);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [returnTo]);

  return (
    <div ref={ref}>
      <Tabs value={tab} onValueChange={(v) => isTab(v) && setTab(v)}>
        <TabsList aria-label="Laboratorio">
          <TabsTrigger value="formula">Fórmula</TabsTrigger>
          <TabsTrigger value="orbita">Órbita</TabsTrigger>
        </TabsList>
        <TabsContent value="formula" className="mt-4">
          <LiveFormula />
        </TabsContent>
        <TabsContent value="orbita" className="mt-4">
          <OrbitSandbox compact />
        </TabsContent>
      </Tabs>
      {returnTo !== null && (
        <Button
          size="lg"
          className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 shadow-lg"
          onClick={() => {
            window.scrollTo({ top: returnTo.top, behavior: reducedMotion ? "auto" : "smooth" });
            setReturnTo(null);
          }}
        >
          Volver a donde estabas {returnTo.up ? <ArrowUp /> : <ArrowDown />}
        </Button>
      )}
    </div>
  );
}
