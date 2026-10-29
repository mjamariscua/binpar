"use client";

import { Line, OrthographicCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { use, useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Color, type Mesh } from "three";
import { FadingTrail } from "@/components/scene/fading-trail";
import { SceneEffects } from "@/components/scene/scene-effects";
import type { Trajectory } from "@/lib/physics/trajectory";
import { STRIDE } from "@/lib/physics/types";
import type { OrbitSlug } from "@/lib/orbits/catalog";
import { BODY_COLORS, BODY_GLOW, SCENE_BACKGROUND } from "@/lib/orbits/colors";
import { bodyPath, orbitBounds, padBounds, sampleTrails, to3D } from "@/lib/orbits/geometry";
import { loadTrajectory } from "@/lib/orbits/load-trajectory";
import { INITIAL_PLAYBACK } from "@/lib/orbits/playback";
import { useVisualQuality } from "@/lib/hooks/use-visual-quality";
import { usePlaybackStore } from "@/lib/store/playback-store";

/** Radio de cada cuerpo en píxeles de pantalla, independiente del zoom. */
const BODY_RADIUS_PX = 5;
/** Margen alrededor del recorrido, como fracción del lado mayor. */
const VIEW_PADDING = 0.06;
/** Distancia mínima entre vértices del trazo, como fracción del lado mayor. */
const PATH_MIN_SEGMENT = 0.001;
/** La estela cubre este tramo del periodo detrás de cada cuerpo. */
const TRAIL_FRACTION = 0.16;
const TRAIL_POINTS = 160;

/**
 * Simulación de una órbita. Se carga con React.lazy (three.js solo se descarga
 * en el detalle) y suspende con `use()` hasta que el worker entrega el periodo.
 *
 * Vista 2D: cámara ortográfica cenital encuadrada al recorrido, con el
 * recorrido completo tenue de fondo, una estela que se desvanece detrás de
 * cada cuerpo y bloom (si el dispositivo lo permite).
 */
export default function OrbitScene({ slug }: { slug: OrbitSlug }) {
  const trajectory = use(loadTrajectory(slug));
  const playing = usePlaybackStore((s) => (s.bySlug[slug] ?? INITIAL_PLAYBACK).playing);
  const { effects } = useVisualQuality();

  return (
    <Canvas
      // En pausa no se renderiza en bucle: solo cuando cambia el estado (scrub, reset).
      frameloop={playing ? "always" : "demand"}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={[SCENE_BACKGROUND]} />
      <SceneContent slug={slug} trajectory={trajectory} />
      <SceneEffects enabled={effects} />
    </Canvas>
  );
}

function SceneContent({ slug, trajectory }: { slug: OrbitSlug; trajectory: Trajectory }) {
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  // Con frameloop "demand", cualquier cambio de la reproducción pide un fotograma.
  useEffect(() => usePlaybackStore.subscribe(() => invalidate()), [invalidate]);

  const bounds = useMemo(() => padBounds(orbitBounds(trajectory), VIEW_PADDING), [trajectory]);
  const paths = useMemo(() => {
    const side = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
    return BODY_COLORS.map((_, body) => to3D(bodyPath(trajectory, body, side * PATH_MIN_SEGMENT)));
  }, [trajectory, bounds]);

  // Zoom ortográfico = píxeles por unidad física: el recorrido cabe entero en
  // el lado más restrictivo del canvas.
  const zoom = Math.min(size.width / (bounds.maxX - bounds.minX), size.height / (bounds.maxY - bounds.minY));
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  return (
    <>
      <OrthographicCamera makeDefault position={[centerX, centerY, 10]} zoom={zoom} near={0.1} far={100} />
      {paths.map((points, i) => (
        <Line key={i} points={points} color={BODY_COLORS[i]} lineWidth={1} transparent opacity={0.16} />
      ))}
      <Bodies slug={slug} trajectory={trajectory} radius={BODY_RADIUS_PX / zoom} />
    </>
  );
}

function Bodies({ slug, trajectory, radius }: { slug: OrbitSlug; trajectory: Trajectory; radius: number }) {
  const size = useThree((s) => s.size);
  const meshes = useRef<(Mesh | null)[]>([]);
  const state = useMemo(() => new Float64Array(trajectory.bodyCount * STRIDE), [trajectory]);
  const trailXY = useMemo(() => BODY_COLORS.map(() => new Float32Array(TRAIL_POINTS * 2)), []);
  const trails = useMemo(() => BODY_COLORS.map((color) => new FadingTrail(color, TRAIL_POINTS, 2.5)), []);
  const glowColors = useMemo(() => BODY_COLORS.map((c) => new Color(c).multiplyScalar(BODY_GLOW)), []);

  useEffect(() => () => trails.forEach((t) => t.dispose()), [trails]);
  useEffect(() => trails.forEach((t) => t.setResolution(size.width, size.height)), [trails, size]);

  // Un único reloj: este useFrame avanza el tiempo en el store, coloca los
  // cuerpos interpolando el periodo precomputado y redibuja las estelas.
  // Todo fuera de React: ni un render por fotograma.
  useFrame((_, delta) => {
    usePlaybackStore.getState().advance(slug, delta, trajectory.period);
    const { time } = usePlaybackStore.getState().bySlug[slug] ?? INITIAL_PLAYBACK;

    sampleTrails(trajectory, time, trajectory.period * TRAIL_FRACTION, state, trailXY);
    trails.forEach((trail, b) => trail.update(trailXY[b], TRAIL_POINTS));

    // El último estado calculado es el de `time`: ahí van los cuerpos.
    meshes.current.forEach((mesh, i) => {
      mesh?.position.set(state[i * STRIDE], state[i * STRIDE + 1], 1);
    });
  });

  return (
    <>
      {trails.map((trail, i) => (
        <primitive key={`trail-${i}`} object={trail.object} />
      ))}
      {BODY_COLORS.map((color, i) => (
        <mesh
          key={i}
          scale={radius}
          ref={(mesh) => {
            meshes.current[i] = mesh;
          }}
        >
          <circleGeometry args={[1, 32]} />
          <meshBasicMaterial color={glowColors[i]} toneMapped={false} />
          {/* Halo suave alrededor del cuerpo (aditivo: solo aclara). */}
          <mesh scale={3} position={[0, 0, -0.1]}>
            <circleGeometry args={[1, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.12} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
        </mesh>
      ))}
    </>
  );
}
