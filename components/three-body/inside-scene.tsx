"use client";

import { Grid, Line, PerspectiveCamera, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { use, useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Color, DoubleSide, type Mesh } from "three";
import { FadingTrail } from "@/components/scene/fading-trail";
import { SceneEffects } from "@/components/scene/scene-effects";
import type { Trajectory } from "@/lib/physics/trajectory";
import { STRIDE } from "@/lib/physics/types";
import { boundsSide } from "@/lib/orbits/braid";
import type { OrbitSlug } from "@/lib/orbits/catalog";
import { BODY_COLORS, BODY_GLOW, SCENE_BACKGROUND } from "@/lib/orbits/colors";
import { bodyPath, orbitBounds, sampleTrails, to3D } from "@/lib/orbits/geometry";
import {
  BODY_RADIUS_PER_SIDE,
  DEFAULT_PITCH,
  EYE_HEIGHT_PER_SIDE,
  HOLD_PER_SIDE,
  INSIDE_FOV,
  baseYaw,
  eyePosition,
  lookVector,
  type Follow,
  type Gaze,
  type Viewpoint,
} from "@/lib/orbits/inside";
import { loadTrajectory } from "@/lib/orbits/load-trajectory";
import { INITIAL_PLAYBACK } from "@/lib/orbits/playback";
import { useVisualQuality } from "@/lib/hooks/use-visual-quality";
import { usePlaybackStore } from "@/lib/store/playback-store";

/** La estela cubre este tramo del periodo detrás de cada cuerpo: más larga que en 2D, porque desde dentro se ve menos recorrido. */
const TRAIL_FRACTION = 0.25;
/** Más muestras que en 2D: de cerca, cada segmento ocupa muchos píxeles y las uniones se verían como cuentas. */
const TRAIL_POINTS = 480;
/** Distancia mínima entre vértices del trazo completo, en lados de la órbita. */
const PATH_MIN_SEGMENT = 0.002;
/** Paso máximo del suavizado de la mirada: tras un rato en pausa, el primer fotograma no salta. */
const MAX_LOOK_DT = 1 / 15;
const MARK_COLOR = "#f3efe6";

export interface InsideSceneProps {
  slug: OrbitSlug;
  /** Masas de los tres cuerpos, para el centro de masas. */
  masses: readonly number[];
  from: Viewpoint;
  gaze: Gaze;
}

/**
 * La órbita vista desde dentro, en primera persona: sobre uno de los cuerpos
 * o en el centro de masas, con la órbita como suelo y un cielo de estrellas
 * fijas como referencia.
 *
 * Mismo patrón que OrbitScene: React.lazy, `use()` hasta que el worker
 * entrega el periodo, un único useFrame que avanza el reloj y, en pausa,
 * solo se pinta cuando algo cambia. Las cuentas de la cámara están en
 * lib/orbits/inside.ts, con tests; aquí solo se aplican.
 */
export default function InsideScene(props: InsideSceneProps) {
  const trajectory = use(loadTrajectory(props.slug));
  const playing = usePlaybackStore((s) => (s.bySlug[props.slug] ?? INITIAL_PLAYBACK).playing);
  const { effects } = useVisualQuality();

  return (
    <Canvas frameloop={playing ? "always" : "demand"} dpr={[1, 2]} gl={{ antialias: true, alpha: false }}>
      <color attach="background" args={[SCENE_BACKGROUND]} />
      <InsideContent {...props} trajectory={trajectory} />
      <SceneEffects enabled={effects} />
    </Canvas>
  );
}

function InsideContent({ slug, masses, from, gaze, trajectory }: InsideSceneProps & { trajectory: Trajectory }) {
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const { reducedMotion } = useVisualQuality();

  // Con frameloop "demand", cualquier cambio de la reproducción pide un fotograma.
  useEffect(() => usePlaybackStore.subscribe(() => invalidate()), [invalidate]);

  const side = useMemo(() => boundsSide(orbitBounds(trajectory)), [trajectory]);
  const paths = useMemo(
    () => BODY_COLORS.map((_, body) => to3D(bodyPath(trajectory, body, side * PATH_MIN_SEGMENT))),
    [trajectory, side],
  );
  const eyeHeight = side * EYE_HEIGHT_PER_SIDE;
  // Un poco por encima del suelo, para que estelas y marcas no compitan en profundidad con los trazos.
  const lift = side * 0.001;

  const meshes = useRef<(Mesh | null)[]>([]);
  const state = useMemo(() => new Float64Array(trajectory.bodyCount * STRIDE), [trajectory]);
  const trailXY = useMemo(() => BODY_COLORS.map(() => new Float32Array(TRAIL_POINTS * 2)), []);
  const trails = useMemo(() => BODY_COLORS.map((color) => new FadingTrail(color, TRAIL_POINTS, 2.5, lift)), [lift]);
  const glowColors = useMemo(() => BODY_COLORS.map((c) => new Color(c).multiplyScalar(BODY_GLOW)), []);
  // Búferes de la cámara, reservados una vez.
  const eye = useMemo(() => new Float64Array(3), []);
  const look = useMemo(() => new Float64Array(3), []);
  const scratch = useMemo(() => new Float64Array(2), []);
  const follow = useRef<Follow | null>(null);

  useEffect(() => () => trails.forEach((t) => t.dispose()), [trails]);
  useEffect(() => trails.forEach((t) => t.setResolution(size.width, size.height)), [trails, size]);

  // Al cambiar de punto de vista, la mirada vuelve a la inicial (el ojo también salta).
  useEffect(() => {
    follow.current = null;
    invalidate();
  }, [from, invalidate]);
  // Al cambiar de mirada se conserva el ángulo: «Fija» se queda donde estaba y
  // «Al centro» gira suave hasta él, sin saltos.
  useEffect(() => {
    if (follow.current) follow.current = { yaw: follow.current.yaw, locked: false };
    invalidate();
  }, [gaze, invalidate]);

  // Un único useFrame: reloj, cuerpos, estelas y, al final, la cámara. Si la
  // cámara se moviera en otro, iría un fotograma por detrás del cuerpo que
  // llevas y el mundo temblaría a su alrededor.
  useFrame((three, delta) => {
    usePlaybackStore.getState().advance(slug, delta, trajectory.period);
    const { time } = usePlaybackStore.getState().bySlug[slug] ?? INITIAL_PLAYBACK;

    sampleTrails(trajectory, time, trajectory.period * TRAIL_FRACTION, state, trailXY);
    trails.forEach((trail, b) => trail.update(trailXY[b], TRAIL_POINTS));
    // Dentro del grupo del suelo, en coordenadas de la órbita.
    meshes.current.forEach((mesh, i) => mesh?.position.set(state[i * STRIDE], state[i * STRIDE + 1], 0));

    const before = follow.current?.yaw;
    const next = baseYaw(
      follow.current,
      { state, masses, from, gaze, hold: side * HOLD_PER_SIDE },
      Math.min(delta, MAX_LOOK_DT),
      scratch,
      reducedMotion ? 0 : undefined,
    );
    follow.current = next;
    eyePosition(state, masses, from, eyeHeight, eye);
    lookVector(next.yaw, DEFAULT_PITCH, look);
    three.camera.position.set(eye[0], eye[1], eye[2]);
    three.camera.lookAt(eye[0] + look[0], eye[1] + look[1], eye[2] + look[2]);
    // En pausa, el giro suave hacia el centro pide fotogramas hasta engancharse.
    if (!next.locked && next.yaw !== before) invalidate();
  });

  return (
    <>
      <PerspectiveCamera makeDefault fov={INSIDE_FOV} near={side * 0.01} far={1000} />
      {/* Estrellas quietas (speed 0: el parpadeo de drei es un pulso común a todas): la referencia que no gira. */}
      <Stars radius={100} depth={50} count={4000} factor={4} saturation={0} fade speed={0} />
      {/* Suelo: rejilla tenue que se desvanece con la distancia; al desplazarte, se ve pasar. */}
      <Grid
        position={[0, -side * 0.002, 0]}
        args={[2, 2]}
        infiniteGrid
        followCamera
        cellSize={side / 8}
        sectionSize={side / 2}
        cellThickness={0.6}
        sectionThickness={0.9}
        cellColor="#1a1d27"
        sectionColor="#2b3040"
        fadeDistance={side * 5}
        fadeStrength={1.5}
      />

      {/* La órbita es el suelo: este giro lleva (x, y) del plano a (x, 0, −y), como planeToWorld. */}
      <group rotation-x={-Math.PI / 2}>
        {paths.map((points, i) => (
          <Line key={i} points={points} color={BODY_COLORS[i]} lineWidth={1} transparent opacity={0.22} />
        ))}
        {trails.map((trail, i) => (
          <primitive key={`trail-${i}`} object={trail.object} />
        ))}

        {/* Centro de masas: un anillo en el suelo y un poste corto, el punto al que mira «Al centro». */}
        <mesh position={[0, 0, lift]}>
          <ringGeometry args={[side * 0.026, side * 0.03, 64]} />
          <meshBasicMaterial color={MARK_COLOR} transparent opacity={0.4} side={DoubleSide} depthWrite={false} />
        </mesh>
        <Line points={[0, 0, 0, 0, 0, eyeHeight * 0.6]} color={MARK_COLOR} lineWidth={1} transparent opacity={0.3} />

        {BODY_COLORS.map((color, i) => (
          <mesh
            key={i}
            scale={side * BODY_RADIUS_PER_SIDE}
            ref={(mesh) => {
              meshes.current[i] = mesh;
            }}
          >
            <sphereGeometry args={[1, 24, 16]} />
            <meshBasicMaterial color={glowColors[i]} toneMapped={false} />
            {/* Halo suave (aditivo: solo aclara). */}
            <mesh scale={3}>
              <sphereGeometry args={[1, 24, 16]} />
              <meshBasicMaterial color={color} transparent opacity={0.1} blending={AdditiveBlending} depthWrite={false} />
            </mesh>
          </mesh>
        ))}
      </group>
    </>
  );
}
