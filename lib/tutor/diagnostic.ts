import { z } from "zod";

/**
 * Mini-diagnóstico de tres preguntas antes del tutor. Cada pregunta busca una
 * idea errónea concreta y muy común sobre la gravedad; el resultado decide el
 * nivel y por dónde empieza el tutor (o, sin clave, qué explicaciones escritas
 * se muestran primero). Es contenido fijo: funciona igual con y sin LLM.
 */

export type Misconception =
  | "lo-pesado-cae-antes"
  | "distancia-lineal"
  | "distancia-no-importa"
  | "no-hay-gravedad-en-el-espacio"
  | "la-sujeta-el-sol";

export interface DiagnosticQuestion {
  readonly id: string;
  readonly question: string;
  readonly options: readonly {
    readonly text: string;
    readonly correct: boolean;
    readonly misconception?: Misconception;
    readonly feedback: string;
  }[];
}

export const DIAGNOSTIC: readonly DiagnosticQuestion[] = [
  {
    id: "masa",
    question:
      "Dejas caer a la vez, desde la misma altura, una bola de bolos y una pelota de tenis. Sin contar el aire, ¿cuál llega antes al suelo?",
    options: [
      {
        text: "La bola de bolos",
        correct: false,
        misconception: "lo-pesado-cae-antes",
        feedback:
          "Es la intuición más común; Aristóteles pensaba lo mismo. La Tierra tira más de la bola de bolos, pero también cuesta más moverla, y las dos cosas se compensan exactamente.",
      },
      {
        text: "Las dos a la vez",
        correct: true,
        feedback:
          "Exacto. La Tierra tira más de la bola, pero moverla también cuesta más: se compensa, y todo cae con la misma aceleración.",
      },
      {
        text: "La pelota de tenis",
        correct: false,
        misconception: "lo-pesado-cae-antes",
        feedback:
          "No: sin aire caen a la vez. La masa aumenta la atracción, pero también lo que cuesta mover el objeto, y se compensa.",
      },
    ],
  },
  {
    id: "distancia",
    question: "Si la distancia entre dos cuerpos se duplica, la atracción entre ellos…",
    options: [
      {
        text: "se reduce a la mitad",
        correct: false,
        misconception: "distancia-lineal",
        feedback:
          "Casi: se reduce más deprisa. La atracción depende del cuadrado de la distancia: el doble de lejos es la cuarta parte de fuerza.",
      },
      {
        text: "se reduce a la cuarta parte",
        correct: true,
        feedback: "Eso es: el doble de distancia, 2² = 4 veces menos fuerza. Es la «inversa del cuadrado».",
      },
      {
        text: "no cambia",
        correct: false,
        misconception: "distancia-no-importa",
        feedback:
          "Sí cambia, y mucho: el doble de lejos es la cuarta parte de fuerza. Por eso la Luna cae 3600 veces menos que una manzana.",
      },
    ],
  },
  {
    id: "luna",
    question: "¿Por qué la Luna no se cae sobre la Tierra?",
    options: [
      {
        text: "Porque en el espacio no hay gravedad",
        correct: false,
        misconception: "no-hay-gravedad-en-el-espacio",
        feedback:
          "La gravedad llega a cualquier distancia, solo que se debilita. En la Estación Espacial es casi tan fuerte como aquí: los astronautas flotan porque caen junto con la estación.",
      },
      {
        text: "Sí cae, pero se mueve de lado tan rápido que nunca llega",
        correct: true,
        feedback: "Justo eso. Cae 1.4 mm cada segundo, pero avanza un kilómetro de lado: la Tierra se curva por debajo.",
      },
      {
        text: "Porque el Sol la sujeta",
        correct: false,
        misconception: "la-sujeta-el-sol",
        feedback:
          "El Sol también la atrae, pero no la sujeta lejos de la Tierra. La Luna cae hacia la Tierra sin parar; lo que la salva es su velocidad lateral.",
      },
    ],
  },
];

/** Respuestas: índice de la opción elegida en cada pregunta, en orden. */
export const DiagnosticAnswersSchema = z.array(z.number().int().min(0).max(2)).length(DIAGNOSTIC.length);
export type DiagnosticAnswers = z.infer<typeof DiagnosticAnswersSchema>;

export type Level = "inicial" | "intermedio" | "avanzado";

export interface DiagnosticProfile {
  readonly correct: number;
  readonly level: Level;
  readonly misconceptions: readonly Misconception[];
}

export function profileFrom(answers: DiagnosticAnswers): DiagnosticProfile {
  const chosen = answers.map((a, i) => DIAGNOSTIC[i].options[a]);
  const correct = chosen.filter((o) => o.correct).length;
  const misconceptions = chosen.flatMap((o) => (o.misconception ? [o.misconception] : []));
  const level: Level = correct === 3 ? "avanzado" : correct === 2 ? "intermedio" : "inicial";
  return { correct, level, misconceptions };
}
