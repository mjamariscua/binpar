"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Contenido ancho (una tabla) que se desplaza en horizontal dentro de su caja
 * en vez de ensanchar la página. Un degradado en el borde avisa de que hay más
 * por ese lado; cuando hay desplazamiento, la caja es enfocable para moverla
 * con las flechas (WCAG 2.1.1) y lleva nombre.
 */
export function ScrollX({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () =>
      setEdges({
        start: node.scrollLeft > 1,
        end: node.scrollLeft + node.clientWidth < node.scrollWidth - 1,
      });
    update();
    node.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => {
      node.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  const scrollable = edges.start || edges.end;

  return (
    <div className={cn("relative", className)}>
      <div
        ref={ref}
        role={scrollable ? "region" : undefined}
        aria-label={scrollable ? label : undefined}
        tabIndex={scrollable ? 0 : undefined}
        className="overflow-x-auto rounded-sm"
      >
        {children}
      </div>
      <Fade side="start" visible={edges.start} />
      <Fade side="end" visible={edges.end} />
    </div>
  );
}

function Fade({ side, visible }: { side: "start" | "end"; visible: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-y-0 w-10 from-background to-transparent transition-opacity",
        side === "start" ? "left-0 bg-gradient-to-r" : "right-0 bg-gradient-to-l",
        visible ? "opacity-100" : "opacity-0",
      )}
    />
  );
}
