"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Vector3 } from "three";

/** Constante de tiempo del cambio de vista de cámara, en segundos. */
const CAMERA_SMOOTHING = 0.12;

/**
 * Lleva la cámara a una vista fija: a `distance` de `target` en la dirección
 * `direction` (unitaria), con una transición suave o, con «reducir
 * movimiento», de un salto. Si la persona gira a mano (direction null), no
 * toca nada: manda OrbitControls. La comparten la trenza y la esfera de formas.
 *
 * `direction` debe ser estable entre renders (useMemo): un array nuevo en cada
 * render reiniciaría la transición.
 */
export function CameraRig({
  target,
  direction,
  distance,
  reducedMotion,
}: {
  target: Vector3;
  direction: readonly [number, number, number] | null;
  distance: number;
  reducedMotion: boolean;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const goal = useMemo(() => new Vector3(), []);
  const arrived = useRef(false);

  useEffect(() => {
    arrived.current = false;
    invalidate();
  }, [direction, distance, target, invalidate]);

  useFrame((state, delta) => {
    if (direction === null || arrived.current) return;
    const [dx, dy, dz] = direction;
    goal.set(target.x + dx * distance, target.y + dy * distance, target.z + dz * distance);
    const cam = state.camera;
    if (reducedMotion) {
      cam.position.copy(goal);
    } else {
      cam.position.lerp(goal, 1 - Math.exp(-delta / CAMERA_SMOOTHING));
    }
    cam.lookAt(target);
    if (cam.position.distanceToSquared(goal) < (distance * 1e-4) ** 2) {
      cam.position.copy(goal);
      cam.lookAt(target);
      arrived.current = true;
    } else {
      // En pausa (frameloop "demand") la transición necesita pedir el siguiente fotograma.
      invalidate();
    }
  });

  return null;
}
