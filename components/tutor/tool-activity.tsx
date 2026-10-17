import { FlaskConical, Rocket, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { TutorUIMessage } from "@/lib/tutor/tools";

type ToolPart = Extract<TutorUIMessage["parts"][number], { type: `tool-${string}` }>;

const ORBIT_LABELS = { circular: "circular", eliptica: "elíptica", escape: "escapa", choque: "se estrella" } as const;
const fmt = (v: number) => String(Number(v.toFixed(2)));

/**
 * Lo que el tutor ha hecho en el laboratorio, contado en el propio chat: la
 * persona ve cada acción y su resultado, no solo el texto del modelo.
 */
export function ToolActivity({ part }: { part: TutorUIMessage["parts"][number] }) {
  if (!isToolPart(part)) return null;

  if (part.state === "output-error") {
    return (
      <Chip icon={<TriangleAlert className="size-3.5" />}>No se pudo aplicar la acción: {part.errorText}</Chip>
    );
  }
  if (part.state !== "output-available") {
    return <Chip icon={<FlaskConical className="size-3.5" />}>Preparando el laboratorio…</Chip>;
  }

  switch (part.type) {
    case "tool-setMass":
      return (
        <Chip icon={<FlaskConical className="size-3.5" />}>
          {part.input.body === "m1" ? "m₁" : "m₂"} = {fmt(part.input.value)} → fuerza × {fmt(part.output.forceRatio)}
        </Chip>
      );
    case "tool-setDistance":
      return (
        <Chip icon={<FlaskConical className="size-3.5" />}>
          r = {fmt(part.input.value)} → fuerza × {fmt(part.output.forceRatio)}
        </Chip>
      );
    case "tool-resetFormula":
      return <Chip icon={<FlaskConical className="size-3.5" />}>Fórmula a la Tierra y la Luna de hoy</Chip>;
    case "tool-loadScenario":
    case "tool-launchSatellite":
      return (
        <Chip icon={<Rocket className="size-3.5" />}>
          Lanzamiento a {fmt(part.output.speedKms)} km/s → {ORBIT_LABELS[part.output.orbit]}
        </Chip>
      );
  }
}

function isToolPart(part: TutorUIMessage["parts"][number]): part is ToolPart {
  return part.type.startsWith("tool-");
}

function Chip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-xs text-primary">
      {icon}
      <span>
        <span className="sr-only">El tutor ha usado el laboratorio: </span>
        {children}
      </span>
    </p>
  );
}
