import type { DiagnosticProfile, Misconception } from "./diagnostic";
import type { ToolCall } from "./run-tool";

/**
 * Modo sin clave: experimentos guiados escritos de antemano. Cada uno usa las
 * MISMAS acciones que las herramientas del tutor, pero el texto es fijo y la
 * interfaz lo dice. Nunca se simulan respuestas de un modelo.
 *
 * El orden se adapta al diagnóstico: primero los que atacan las ideas
 * erróneas detectadas.
 */
export interface Experiment {
  readonly id: string;
  readonly title: string;
  readonly prediction: string;
  readonly call: ToolCall;
  readonly explanation: string;
  readonly addresses: readonly Misconception[];
}

export const EXPERIMENTS: readonly Experiment[] = [
  {
    id: "distancia-doble",
    title: "La Luna, el doble de lejos",
    prediction: "Si la Luna estuviera al doble de distancia, ¿con cuánta fuerza la atraería la Tierra?",
    call: { toolName: "setDistance", input: { value: 2 } },
    explanation:
      "Con una cuarta parte de la fuerza: 1/2² = 1/4. No la mitad. La gravedad se reparte sobre una esfera cuya superficie crece con el cuadrado del radio, y por eso se debilita tan deprisa.",
    addresses: ["distancia-lineal", "distancia-no-importa"],
  },
  {
    id: "tierra-pesada",
    title: "Una Tierra diez veces más pesada",
    prediction: "Si la Tierra tuviera diez veces más masa, ¿qué pasaría con la fuerza sobre la Luna?",
    call: { toolName: "setMass", input: { body: "m1", value: 10 } },
    explanation:
      "Se multiplica por diez. Ahora piensa en una manzana: la Tierra tira de ella con más fuerza cuanto más pesa la manzana, pero también cuesta más moverla. Las dos cosas se compensan y todo cae igual de rápido.",
    addresses: ["lo-pesado-cae-antes"],
  },
  {
    id: "orbita-circular",
    title: "Caer sin llegar nunca",
    prediction: "Un satélite lanzado en horizontal a 5.59 km/s, a 6371 km de altura: ¿cae, escapa o da vueltas?",
    call: { toolName: "loadScenario", input: { name: "circular" } },
    explanation:
      "Da vueltas: está cayendo todo el rato, pero avanza tan deprisa que la superficie se curva por debajo al mismo ritmo. Es lo mismo que le pasa a la Luna. La gravedad sí llega al espacio: es la que lo curva.",
    addresses: ["no-hay-gravedad-en-el-espacio", "la-sujeta-el-sol"],
  },
  {
    id: "escape",
    title: "Escapar de la Tierra",
    prediction: "¿Y si lo lanzamos un 10 % más rápido que la velocidad de escape (8.7 km/s)?",
    call: { toolName: "loadScenario", input: { name: "escape" } },
    explanation:
      "Se va para siempre. La gravedad lo frena durante todo el camino, pero se debilita tan rápido con la distancia (otra vez el cuadrado) que nunca consigue pararlo.",
    addresses: ["no-hay-gravedad-en-el-espacio"],
  },
];

export function orderedExperiments(profile: DiagnosticProfile): readonly Experiment[] {
  const relevance = (e: Experiment) => e.addresses.filter((m) => profile.misconceptions.includes(m)).length;
  return [...EXPERIMENTS].sort((a, b) => relevance(b) - relevance(a));
}
