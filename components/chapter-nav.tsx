"use client";

import { ChevronDown, ListOrdered } from "lucide-react";
import { Popover } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CHAPTERS, type ChapterId } from "@/lib/chapters";
import { cn } from "@/lib/utils";

/** Un capítulo es el actual cuando su parte de arriba ha pasado esta fracción del alto de la ventana. */
const ACTIVE_LINE = 0.4;

/**
 * Navegación entre capítulos de la portada, dentro de la cabecera fija. En
 * escritorio, los cuatro en línea; en móvil y tablet, un botón con el
 * capítulo actual que abre la lista. El actual lleva aria-current="location".
 *
 * Solo se monta en la portada. En una página de unas diez pantallas en móvil,
 * dice dónde estás y deja saltar sin volver arriba.
 */
export function ChapterNav() {
  const active = useActiveChapter();
  const [open, setOpen] = useState(false);
  const index = CHAPTERS.findIndex((c) => c.id === active);
  // Capítulo elegido en el menú: al cerrarse, el foco va a su título y no
  // vuelve al botón (con teclado, seguirías en la cabecera).
  const target = useRef<ChapterId | null>(null);

  return (
    <>
      <ol className="hidden items-center lg:flex">
        {CHAPTERS.map((c, i) => (
          <li key={c.id}>
            <ChapterLink chapter={c} number={i + 1} active={c.id === active} />
          </li>
        ))}
      </ol>

      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <Button variant="ghost" className="gap-1 px-2 text-sm text-muted-foreground lg:hidden">
            {index >= 0 ? (
              <>
                <span className="sr-only">Capítulos. Estás en el </span>
                <span className="font-mono text-primary">{index + 1}</span>
                <span className="text-muted-foreground">/{CHAPTERS.length}</span>
                <span className="hidden sm:inline">· {CHAPTERS[index].title}</span>
              </>
            ) : (
              // En la portada, antes del primer capítulo: icono en móvil, que no cabe el texto a 320 px.
              <>
                <ListOrdered aria-hidden className="sm:hidden" />
                <span className="sr-only sm:not-sr-only">Capítulos</span>
              </>
            )}
            <ChevronDown aria-hidden />
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            onCloseAutoFocus={(event) => {
              const id = target.current;
              target.current = null;
              const heading = id && document.getElementById(`${id}-titulo`);
              if (!heading) return;
              event.preventDefault();
              heading.tabIndex = -1;
              heading.focus({ preventScroll: true });
            }}
            className="z-50 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-border-strong bg-popover p-2 shadow-card"
          >
            <nav aria-label="Ir a un capítulo">
              <ol className="flex flex-col">
                {CHAPTERS.map((c, i) => (
                  <li key={c.id}>
                    <ChapterLink
                      chapter={c}
                      number={i + 1}
                      active={c.id === active}
                      onNavigate={() => {
                        target.current = c.id;
                        setOpen(false);
                      }}
                      block
                    />
                  </li>
                ))}
              </ol>
            </nav>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}

function ChapterLink({
  chapter,
  number,
  active,
  onNavigate,
  block = false,
}: {
  chapter: (typeof CHAPTERS)[number];
  number: number;
  active: boolean;
  onNavigate?: () => void;
  block?: boolean;
}) {
  return (
    <a
      href={`#${chapter.id}`}
      onClick={onNavigate}
      aria-current={active ? "location" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 text-sm whitespace-nowrap transition-colors hover:text-foreground",
        block && "flex w-full px-3 text-base hover:bg-muted",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span className="font-mono text-primary">{number}</span>
      <span className={cn(active && "underline decoration-primary decoration-2 underline-offset-8")}>{chapter.title}</span>
    </a>
  );
}

/**
 * Capítulo cuya parte de arriba es la última en haber pasado la línea de
 * lectura (40 % del alto de la ventana); null en la portada, antes del
 * primero. Se recalcula al desplazar, como mucho una vez por fotograma.
 */
function useActiveChapter(): ChapterId | null {
  const [active, setActive] = useState<ChapterId | null>(null);
  const frame = useRef(0);

  useEffect(() => {
    const update = () => {
      frame.current = 0;
      const line = window.innerHeight * ACTIVE_LINE;
      let current: ChapterId | null = null;
      for (const c of CHAPTERS) {
        const top = document.getElementById(c.id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= line) current = c.id;
      }
      setActive(current);
    };
    const schedule = () => {
      if (!frame.current) frame.current = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  return active;
}

/**
 * Barra de progreso de lectura bajo la cabecera. Decorativa (el capítulo
 * actual ya lo dice la navegación): se actualiza escribiendo el estilo
 * directamente, sin renders de React en cada fotograma de scroll.
 */
export function ReadingProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${progress})`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div aria-hidden className="absolute inset-x-0 bottom-0 h-0.5">
      <div ref={bar} className="h-full origin-left scale-x-0 bg-primary" />
    </div>
  );
}
