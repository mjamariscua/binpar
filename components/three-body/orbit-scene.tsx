"use client";

import { Line, OrthographicCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { use, useEffect, useMemo, useRef } from "react";
import type { Mesh } from "three";
import { stateAt, type Trajectory } from "@/lib/physics/trajectory";
import { STRIDE } from "@/lib/physics/types";
import type { OrbitSlug } from "@/lib/orbits/catalog";
import { BODY_COLORS, SCENE_BACKGROUND } from "@/lib/orbits/colors";
import { bodyPath, orbitBounds, padBounds } from "@/lib/orbits/geometry";
import { loadTrajectory } from "@/lib/orbits/load-trajectory";
import { INITIAL_PLAYBACK } from "@/lib/orbits/playback";
import { usePlaybackStore } from "@/lib/store/playback-store";

/** Radio de cada cuerpo en píxeles de pantalla, independiente del zoom. */
const BODY_RADIUS_PX = 6;
/** Margen alrededor del recorrido, como fracción del lado mayor. */
const VIEW_PADDING = 0.06;
/** Distancia mínima entre vértices del trazo, como fracción del lado mayor. */
const PATH_MIN_SEGMENT = 0.001;

/**
 * Simulación de una órbita. Se carga con React.lazy (three.js solo se descarga
 * en el detalle) y suspende con `use()` hasta que el worker entrega el periodo.
 *
 * Vista 2D: cámara ortográfica cenital encuadrada al recorrido. Se usa WebGL y
 * no SVG/Canvas 2D porque la capa visual del módulo 4 (bloom, estelas) se
 * construye sobre esta misma escena.
 */
export default function OrbitScene({ slug }: { slug: OrbitSlug }) {
  const trajectory = use(loadTrajectory(slug));
  const playing = usePlaybackStore((s) => (s.bySlug[slug] ?? INITIAL_PLAYBACK).playing);

  return (
    <Canvas
      // En pausa no se renderiza en bucle: solo cuando cambia el estado (scrub, reset).
      frameloop={playing ? "always" : "demand"}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={[SCENE_BACKGROUND]} />
      <SceneContent slug={slug} trajectory={trajectory} />
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
        <Line key={i} points={points} color={BODY_COLORS[i]} lineWidth={1.25} transparent opacity={0.35} />
      ))}
      <Bodies slug={slug} trajectory={trajectory} radius={BODY_RADIUS_PX / zoom} />
    </>
  );
}

function Bodies({ slug, trajectory, radius }: { slug: OrbitSlug; trajectory: Trajectory; radius: number }) {
  const meshes = useRef<(Mesh | null)[]>([]);
  const state = useMemo(() => new Float64Array(trajectory.bodyCount * STRIDE), [trajectory]);

  // Un único reloj: este useFrame avanza el tiempo en el store y coloca los
  // cuerpos interpolando el periodo precomputado. Sin renders de React.
  useFrame((_, delta) => {
    usePlaybackStore.getState().advance(slug, delta, trajectory.period);
    const { time } = usePlaybackStore.getState().bySlug[slug] ?? INITIAL_PLAYBACK;
    stateAt(trajectory, time, state);
    meshes.current.forEach((mesh, i) => {
      mesh?.position.set(state[i * STRIDE], state[i * STRIDE + 1], 1);
    });
  });

  return BODY_COLORS.map((color, i) => (
    <mesh
      key={i}
      scale={radius}
      ref={(mesh) => {
        meshes.current[i] = mesh;
      }}
    >
      <circleGeometry args={[1, 32]} />
      <meshBasicMaterial color={color} />
    </mesh>
  ));
}

/** [x0, y0, x1, y1, …] → [x0, y0, 0, x1, y1, 0, …], el formato plano que espera <Line>. */
function to3D(flat: readonly number[]): number[] {
  const out = new Array<number>((flat.length / 2) * 3);
  for (let i = 0, j = 0; i < flat.length; i += 2, j += 3) {
    out[j] = flat[i];
    out[j + 1] = flat[i + 1];
    out[j + 2] = 0;
  }
  return out;
}
