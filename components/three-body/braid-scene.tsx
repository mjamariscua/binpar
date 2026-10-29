"use client";

import { Line, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { use, useEffect, useMemo, useRef } from "react";
import { Color, DoubleSide, Vector3, type BufferAttribute, type Group, type Mesh } from "three";
import { SceneEffects } from "@/components/scene/scene-effects";
import { stateAt, type Trajectory } from "@/lib/physics/trajectory";
import { STRIDE } from "@/lib/physics/types";
import {
  BRAID_VIEWS,
  MIN_SEGMENT_PER_SIDE,
  boundsSide,
  buildBraid,
  cameraDirection,
  frameDistance,
  nextLap,
  viewDistance,
  sliceX,
  type BraidViewName,
} from "@/lib/orbits/braid";
import type { OrbitSlug } from "@/lib/orbits/catalog";
import { BODY_COLORS, BODY_GLOW, SCENE_BACKGROUND } from "@/lib/orbits/colors";
import { loadTrajectory } from "@/lib/orbits/load-trajectory";
import { INITIAL_PLAYBACK } from "@/lib/orbits/playback";
import { useVisualQuality } from "@/lib/hooks/use-visual-quality";
import { usePlaybackStore } from "@/lib/store/playback-store";

/** Campo de visión vertical: poca perspectiva, para que la trenza no se deforme. */
const FOV = 35;
/** Margen alrededor de la trenza al encuadrarla. */
const FRAME_MARGIN = 1.06;
/** Radio de los cuerpos, como fracción del lado de la órbita. */
const BODY_RADIUS = 0.022;
/** Constante de tiempo del cambio de vista de cámara, en segundos. */
const CAMERA_SMOOTHING = 0.12;

export interface BraidSceneProps {
  slug: OrbitSlug;
  /** Vista fija de cámara; null cuando la persona ha girado la escena a mano. */
  camera: BraidViewName | null;
  /** Si se puede girar arrastrando (OrbitControls montado). */
  interactive: boolean;
  /** Avisa de que la persona ha empezado a girar la escena. */
  onRotateStart: () => void;
}

/**
 * La órbita como trenza en 3D: el tiempo avanza a lo largo del eje X y cada
 * cuerpo dibuja una hebra durante dos periodos. Un corte translúcido marca el
 * instante actual y, dentro, el triángulo de los tres cuerpos: es lo mismo
 * que muestra la vista 2D, desplazado en el tiempo.
 *
 * Mismo patrón que OrbitScene: se carga con React.lazy, suspende con `use()`
 * hasta que el worker entrega el periodo, un único useFrame avanza el reloj
 * del store de reproducción y, en pausa, solo se pinta cuando algo cambia.
 */
export default function BraidScene(props: BraidSceneProps) {
  const trajectory = use(loadTrajectory(props.slug));
  const playing = usePlaybackStore((s) => (s.bySlug[props.slug] ?? INITIAL_PLAYBACK).playing);
  const { effects } = useVisualQuality();

  return (
    <Canvas frameloop={playing ? "always" : "demand"} dpr={[1, 2]} gl={{ antialias: true, alpha: false }}>
      <color attach="background" args={[SCENE_BACKGROUND]} />
      <BraidContent {...props} trajectory={trajectory} />
      <SceneEffects enabled={effects} />
    </Canvas>
  );
}

function BraidContent({ slug, trajectory, camera, interactive, onRotateStart }: BraidSceneProps & { trajectory: Trajectory }) {
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const { reducedMotion } = useVisualQuality();

  // Con frameloop "demand", cualquier cambio de la reproducción pide un fotograma.
  useEffect(() => usePlaybackStore.subscribe(() => invalidate()), [invalidate]);

  const braid = useMemo(() => {
    const side = boundsSide(buildBraid(trajectory, { periods: 1 }).bounds);
    return buildBraid(trajectory, { minSegment: side * MIN_SEGMENT_PER_SIDE });
  }, [trajectory]);
  const { bounds, lengthPerPeriod, periods } = braid;
  const side = boundsSide(bounds);
  // drei <Line> espera un array plano de números (no admite Float32Array).
  const strands = useMemo(() => braid.strands.map((s) => Array.from(s)), [braid]);

  // Centro de la trenza y semiejes de la caja que la contiene (X = tiempo, Y = y, Z = x).
  const target = useMemo(
    () =>
      new Vector3(
        (periods * lengthPerPeriod) / 2,
        (bounds.minY + bounds.maxY) / 2,
        (bounds.minX + bounds.maxX) / 2,
      ),
    [bounds, lengthPerPeriod, periods],
  );
  const half = useMemo(
    () =>
      [(periods * lengthPerPeriod) / 2, (bounds.maxY - bounds.minY) / 2, (bounds.maxX - bounds.minX) / 2] as const,
    [bounds, lengthPerPeriod, periods],
  );
  const aspect = size.width / size.height;
  // Planos de recorte con la esfera que contiene la trenza: valen para cualquier giro.
  const sphereDistance = frameDistance(Math.hypot(...half), FOV, aspect);

  // Marco del recorrido en el plano de la órbita, a la altura x = 0 del corte (Z = x, Y = y).
  const frame = useMemo(
    () => [
      0, bounds.minY, bounds.minX,
      0, bounds.minY, bounds.maxX,
      0, bounds.maxY, bounds.maxX,
      0, bounds.maxY, bounds.minX,
      0, bounds.minY, bounds.minX,
    ],
    [bounds],
  );

  return (
    <>
      <PerspectiveCamera makeDefault fov={FOV} near={sphereDistance / 50} far={sphereDistance * 10} />
      <CameraRig target={target} half={half} aspect={aspect} camera={camera} reducedMotion={reducedMotion} />
      {interactive && (
        <OrbitControls
          makeDefault
          target={target}
          enableZoom={false}
          enablePan={false}
          enableDamping={false}
          onStart={onRotateStart}
          onChange={() => invalidate()}
        />
      )}

      {strands.map((points, i) => (
        <Line key={i} points={points} color={BODY_COLORS[i]} lineWidth={1.5} transparent opacity={0.55} />
      ))}

      {/* Marcos en t = 0, T y 2T: los cuerpos pasan por el mismo punto en los tres, y eso es la repetición. */}
      {Array.from({ length: periods + 1 }, (_, p) => (
        <group key={p} position={[p * lengthPerPeriod, 0, 0]}>
          <Line points={frame} color="#f3efe6" lineWidth={1} transparent opacity={0.16} />
        </group>
      ))}

      <Slice
        slug={slug}
        trajectory={trajectory}
        lengthPerPeriod={lengthPerPeriod}
        frame={frame}
        bounds={bounds}
        bodyRadius={side * BODY_RADIUS}
      />
    </>
  );
}

/**
 * Coloca la cámara en la vista fija elegida, con una transición suave (o un
 * salto, con «reducir movimiento»). Si la persona gira a mano (camera = null),
 * no toca nada: manda OrbitControls.
 */
function CameraRig({
  target,
  half,
  aspect,
  camera,
  reducedMotion,
}: {
  target: Vector3;
  half: readonly [number, number, number];
  aspect: number;
  camera: BraidViewName | null;
  reducedMotion: boolean;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const goal = useMemo(() => new Vector3(), []);
  const arrived = useRef(false);
  // Cada vista encuadra lo que se ve desde ella: de frente, la cara de la órbita; en lateral, la trenza entera.
  const distance = camera === null ? 0 : viewDistance(half, BRAID_VIEWS[camera], FOV, aspect) * FRAME_MARGIN;

  useEffect(() => {
    arrived.current = false;
    invalidate();
  }, [camera, distance, target, invalidate]);

  useFrame((state, delta) => {
    if (camera === null || arrived.current) return;
    const [dx, dy, dz] = cameraDirection(BRAID_VIEWS[camera]);
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

/**
 * El corte del instante actual: un plano translúcido con el marco del
 * recorrido, los tres cuerpos y el triángulo que forman. Un único useFrame
 * avanza el reloj del store (como en OrbitScene) y lleva el corte a su sitio;
 * nada de esto provoca renders de React.
 */
function Slice({
  slug,
  trajectory,
  lengthPerPeriod,
  frame,
  bounds,
  bodyRadius,
}: {
  slug: OrbitSlug;
  trajectory: Trajectory;
  lengthPerPeriod: number;
  frame: number[];
  bounds: ReturnType<typeof buildBraid>["bounds"];
  bodyRadius: number;
}) {
  const group = useRef<Group>(null);
  const bodies = useRef<(Mesh | null)[]>([]);
  const triangle = useRef<BufferAttribute>(null);
  const lap = useRef(0);
  const state = useMemo(() => new Float64Array(trajectory.bodyCount * STRIDE), [trajectory]);
  // Búfer del triángulo, reservado una vez y reescrito en el sitio (setXYZ) en cada fotograma.
  const trianglePositions = useMemo(() => new Float32Array(9), []);
  const glowColors = useMemo(() => BODY_COLORS.map((c) => new Color(c).multiplyScalar(BODY_GLOW)), []);

  useFrame((_, delta) => {
    const store = usePlaybackStore.getState();
    const before = (store.bySlug[slug] ?? INITIAL_PLAYBACK).time;
    store.advance(slug, delta, trajectory.period);
    const { time, playing } = usePlaybackStore.getState().bySlug[slug] ?? INITIAL_PLAYBACK;
    // Al dar la vuelta al periodo reproduciendo, el corte pasa a la vuelta siguiente de la trenza.
    // El scrub y el reinicio no cuentan como vuelta: ocurren fuera de advance.
    if (playing && time < before) lap.current = nextLap(lap.current);

    const x = sliceX(time, trajectory.period, lap.current, lengthPerPeriod);
    stateAt(trajectory, time, state);
    group.current?.position.setX(x);
    for (let b = 0; b < 3; b++) {
      // Espacio de la trenza: Y = y de la órbita, Z = x de la órbita.
      const y = state[b * STRIDE + 1];
      const z = state[b * STRIDE];
      bodies.current[b]?.position.set(x, y, z);
      triangle.current?.setXYZ(b, x, y, z);
    }
    if (triangle.current) triangle.current.needsUpdate = true;
  });

  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  return (
    <>
      <group ref={group}>
        {/* Plano en Y–Z (el de la órbita), girado para mirar a lo largo del tiempo. */}
        <mesh
          position={[0, (bounds.minY + bounds.maxY) / 2, (bounds.minX + bounds.maxX) / 2]}
          rotation={[0, Math.PI / 2, 0]}
          renderOrder={1}
        >
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial color="#f3efe6" transparent opacity={0.06} side={DoubleSide} depthWrite={false} />
        </mesh>
        <Line points={frame} color="#f3efe6" lineWidth={1.25} transparent opacity={0.5} />
      </group>
      <lineLoop renderOrder={2}>
        <bufferGeometry>
          <bufferAttribute ref={triangle} attach="attributes-position" args={[trianglePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#f3efe6" transparent opacity={0.85} />
      </lineLoop>
      {BODY_COLORS.map((_, i) => (
        <mesh
          key={i}
          ref={(mesh) => {
            bodies.current[i] = mesh;
          }}
          scale={bodyRadius}
        >
          <sphereGeometry args={[1, 24, 16]} />
          <meshBasicMaterial color={glowColors[i]} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}
