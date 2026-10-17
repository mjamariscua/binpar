"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLabStore, type LabTab } from "@/lib/store/lab-store";
import { LiveFormula } from "@/components/gravity/live-formula";
import { OrbitSandbox } from "@/components/gravity/orbit-sandbox";

const isTab = (v: string): v is LabTab => v === "formula" || v === "orbita";

/**
 * El laboratorio que comparten la persona y el tutor: la fórmula del capítulo
 * 2 y el lanzador del capítulo 3, con el mismo estado. La pestaña activa
 * vive en el store porque el tutor la cambia al usar una herramienta.
 */
export function LabTabs() {
  const tab = useLabStore((s) => s.tab);
  const setTab = useLabStore((s) => s.setTab);

  return (
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
  );
}
