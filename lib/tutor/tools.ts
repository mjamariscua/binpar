import { tool, type InferUITools, type UIMessage } from "ai";
import { z } from "zod";
import { FORMULA_LIMITS } from "@/lib/gravity/formula";
import { ANGLE_LIMITS_DEG, SPEED_LIMITS_KMS } from "@/lib/gravity/sandbox";

/**
 * Herramientas con las que el tutor opera el laboratorio. No tienen `execute`:
 * el servidor solo las declara y el modelo decide llamarlas; la llamada viaja
 * en el stream al navegador, que la ejecuta sobre el store del laboratorio y
 * devuelve el resultado (ver run-tool.ts). Así el servidor nunca toca la
 * interfaz y el tutor solo puede hacer lo que la interfaz ya permite.
 *
 * Los `outputSchema` describen lo que devuelve el navegador: tipan los
 * resultados en el cliente y le dicen al modelo qué datos tendrá para explicar.
 */

const formulaOutput = z.object({
  m1: z.number().describe("Masa 1, en masas terrestres"),
  m2: z.number().describe("Masa 2, en masas lunares"),
  r: z.number().describe("Distancia, en distancias Tierra–Luna"),
  forceRatio: z.number().describe("Fuerza resultante relativa a la Tierra–Luna de hoy (1 = igual)"),
});

const launchOutput = z.object({
  speedKms: z.number(),
  angleDeg: z.number(),
  orbit: z.enum(["circular", "eliptica", "escape", "choque"]),
  eccentricity: z.number(),
  lowestAltitudeKm: z.number().describe("Altura mínima de la trayectoria sobre la superficie"),
  highestAltitudeKm: z.number().nullable().describe("Altura máxima; null si escapa"),
});

export const tutorTools = {
  setMass: tool({
    description:
      "Cambia una masa en la fórmula F = G·m₁·m₂/r² del laboratorio (muestra la pestaña Fórmula). " +
      "m1 se mide en masas terrestres y m2 en masas lunares; 1 = el valor real.",
    inputSchema: z.object({
      body: z.enum(["m1", "m2"]),
      value: z.number().min(FORMULA_LIMITS.m1.min).max(FORMULA_LIMITS.m1.max),
    }),
    outputSchema: formulaOutput,
  }),
  setDistance: tool({
    description:
      "Cambia la distancia r entre los dos cuerpos en la fórmula, en distancias Tierra–Luna (1 = 384 400 km).",
    inputSchema: z.object({ value: z.number().min(FORMULA_LIMITS.r.min).max(FORMULA_LIMITS.r.max) }),
    outputSchema: formulaOutput,
  }),
  resetFormula: tool({
    description: "Devuelve la fórmula a la Tierra y la Luna reales (m1 = m2 = r = 1).",
    inputSchema: z.object({}),
    outputSchema: formulaOutput,
  }),
  loadScenario: tool({
    description:
      "Lanza un satélite de ejemplo desde un radio terrestre de altura (muestra la pestaña Órbita): " +
      "circular (5.59 km/s), eliptica (6.71 km/s), escape (8.70 km/s) o caida (2.80 km/s, se estrella).",
    inputSchema: z.object({ name: z.enum(["circular", "eliptica", "escape", "caida"]) }),
    outputSchema: launchOutput,
  }),
  launchSatellite: tool({
    description:
      "Lanza un satélite con velocidad y ángulo concretos desde un radio terrestre de altura (6371 km). " +
      "Ángulo 0 = horizontal; positivo hacia arriba. A esa altura: circular 5.59 km/s, escape 7.91 km/s.",
    inputSchema: z.object({
      speedKms: z.number().min(SPEED_LIMITS_KMS.min).max(SPEED_LIMITS_KMS.max),
      angleDeg: z.number().min(ANGLE_LIMITS_DEG.min).max(ANGLE_LIMITS_DEG.max),
    }),
    outputSchema: launchOutput,
  }),
};

export type TutorTools = InferUITools<typeof tutorTools>;
export type TutorUIMessage = UIMessage<never, never, TutorTools>;
export type TutorToolName = keyof TutorTools;
