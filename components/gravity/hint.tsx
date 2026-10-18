import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Instrucción de un experimento: va antes del widget, para que se sepa qué
 * tocar antes de verlo, con un icono del gesto y a tamaño de lectura (16 px).
 */
export function Hint({ icon: Icon, children, className }: { icon: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-start gap-3 text-base text-muted-foreground", className)}>
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
      <span>{children}</span>
    </p>
  );
}
