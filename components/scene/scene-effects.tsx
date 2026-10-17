"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useState } from "react";

/**
 * Posprocesado común de las escenas: bloom para el aspecto de «trazos
 * luminosos». Solo brillan los colores por encima del umbral (cuerpos y
 * cabezas de estela), no las líneas tenues del recorrido.
 *
 * Si los fotogramas caen de forma sostenida, PerformanceMonitor baja la
 * resolución a 1× y apaga el bloom: mejor una escena fluida que bonita y a
 * tirones.
 */
export function SceneEffects({ enabled }: { enabled: boolean }) {
  const [declined, setDeclined] = useState(false);
  const setDpr = useThree((s) => s.setDpr);

  return (
    <>
      <PerformanceMonitor
        onDecline={() => {
          setDpr(1);
          setDeclined(true);
        }}
      />
      {enabled && !declined && (
        <EffectComposer>
          <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.22} luminanceSmoothing={0.35} radius={0.75} />
        </EffectComposer>
      )}
    </>
  );
}
