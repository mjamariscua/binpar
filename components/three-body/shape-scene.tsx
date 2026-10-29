"use client";

import { Line, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { use, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { AdditiveBlending, Color, Vector3, type Mesh } from "three";
import { CameraRig } from "@/components/scene/camera-rig";
import { FadingTrail } from "@/components/scene/fading-trail";
import { SceneEffects } from "@/components/scene/scene-effects";
import type { Trajectory } from "@/lib/physics/trajectory";
import { STRIDE } from "@/lib/physics/types";
import { frameDistance } from "@/lib/orbits/braid";
import type { OrbitSlug } from "@/lib/orbits/catalog";
import { BODY_COLORS, BODY_GLOW, SCENE_BACKGROUND } from "@/lib/orbits/colors";
import { loadTrajectory } from "@/lib/orbits/load-trajectory";
import { INITIAL_PLAYBACK } from "@/lib/orbits/playback";
import {
  COLLISIONS,
  SHAPE_CAMERAS,
  cameraDirectionWorld,
  canonicalTriangle,
  equatorArc,
  sampleShapeTrail,
  shapeCurve,
  thinCurve,
  type ShapeCameraName,
} from "@/lib/orbits/shape";
import { useVisualQuality } from "@/lib/hooks/use-visual-quality";
import { usePlaybackStore } from "@/lib/store/playback-store";

/** Campo de visión vertical: poca perspectiva, para que la esfera se parezca al dibujo de la galería. */
const FOV = 35;
/** Radio que se encuadra: la esfera (1) y lo que sobresale, los choques y el halo del punto. */
const FRAME_RADIUS = 1.1;
/**
 * Las líneas van un poco por fuera de la superficie. Así, en la cara visible
 * quedan delante del velo (ver Veil) y no las atenúa; en el reverso, detrás.
 */
const LINE_RADIUS = 1.004;
const GRID_RADIUS = 1.002;
/** Distancia mínima entre puntos de la curva: menos de 1 px en un visor de 600 px. */
const MIN_SEGMENT = 0.003;
/** La estela cubre este tramo del periodo, como en las tarjetas. */
const TRAIL_FRACTION = 0.06;
const TRAIL_POINTS = 120;
const POINT_RADIUS = 0.04;
const COLLISION_RADIUS = 0.028;
const MARK_COLOR = "#f3efe6";
/** Por debajo del blanco: con el umbral del bloom (0,22), una curva más clara brillaría tanto como el punto. */
const CURVE_COLOR = "#8a857c";
const GRID_COLOR = "#2a2d38";
/** Cuánto atenúa el velo lo que queda detrás de la esfera. */
const VEIL_OPACITY = 0.62;
/** Orden de dibujo de lo translúcido: estela y halo antes que el velo, para que este atenúe solo su parte de detrás. */
const BEFORE_VEIL = 5;
const VEIL_ORDER = 10;

export interface ShapeSceneProps {
  slug: OrbitSlug;
  /** Vista fija de cámara; null cuando la persona ha girado la esfera a mano. */
  camera: ShapeCameraName | null;
  /** Si se puede girar arrastrando (OrbitControls montado). */
  interactive: boolean;
  /** Avisa de que la persona ha empezado a girar la esfera. */
  onRotateStart: () => void;
}

/**
 * La órbita en la esfera de formas, en 3D: la esfera translúcida con su
 * rejilla, el ecuador en tres colores (qué cuerpo queda en medio), los choques
 * de dos cuerpos, la curva completa y un punto con estela que la recorre: la
 * forma del triángulo en este instante. En una esquina, «la forma ahora»
 * dibuja ese mismo triángulo.
 *
 * Mismo patrón que BraidScene: React.lazy, `use()` hasta que el worker
 * entrega el periodo, un único useFrame que avanza el reloj del store de
 * reproducción y, en pausa, solo se pinta cuando algo cambia. Las cuentas
 * están en lib/orbits/shape.ts, con tests.
 */
export default function ShapeScene(props: ShapeSceneProps) {
  const trajectory = use(loadTrajectory(props.slug));
  const playing = usePlaybackStore((s) => (s.bySlug[props.slug] ?? INITIAL_PLAYBACK).playing);
  const { effects } = useVisualQuality();
  const now = useRef<SVGSVGElement>(null);

  return (
    <>
      <Canvas frameloop={playing ? "always" : "demand"} dpr={[1, 2]} gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={[SCENE_BACKGROUND]} />
        <ShapeContent {...props} trajectory={trajectory} now={now} />
        <SceneEffects enabled={effects} />
      </Canvas>
      <ShapeNow ref={now} />
    </>
  );
}

function ShapeContent({
  slug,
  trajectory,
  camera,
  interactive,
  onRotateStart,
  now,
}: ShapeSceneProps & { trajectory: Trajectory; now: RefObject<SVGSVGElement | null> }) {
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const { reducedMotion } = useVisualQuality();

  // Con frameloop "demand", cualquier cambio de la reproducción pide un fotograma.
  useEffect(() => usePlaybackStore.subscribe(() => invalidate()), [invalidate]);

  const target = useMemo(() => new Vector3(), []);
  const distance = frameDistance(FRAME_RADIUS, FOV, size.width / size.height);
  const direction = useMemo(() => (camera === null ? null : cameraDirectionWorld(SHAPE_CAMERAS[camera])), [camera]);
  // La cámara arranca ya en «De frente»: sin viaje desde el centro al abrir.
  const [initialPosition] = useState(() => {
    const [x, y, z] = cameraDirectionWorld(SHAPE_CAMERAS.frente);
    return [x * distance, y * distance, z * distance] as const;
  });

  const curve = useMemo(() => thinCurve(shapeCurve(trajectory).map((v) => v * LINE_RADIUS), MIN_SEGMENT), [trajectory]);

  return (
    <>
      <PerspectiveCamera makeDefault fov={FOV} near={distance / 20} far={distance * 4} position={initialPosition} />
      <CameraRig target={target} direction={direction} distance={distance} reducedMotion={reducedMotion} />
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

      {/* La esfera en sus propias coordenadas: este giro pone el polo norte arriba (sphereToWorld). */}
      <group rotation-x={-Math.PI / 2}>
        <SphereGrid />
        <Equator />
        <Line points={curve} color={CURVE_COLOR} lineWidth={1.25} />
        <Moving slug={slug} trajectory={trajectory} now={now} />
        <Veil />
      </group>
    </>
  );
}

/** Meridianos cada 30° y paralelos a ±30° y ±60°, tenues: dan forma a la esfera. */
function SphereGrid() {
  const lines = useMemo(() => {
    const circle = (point: (a: number) => [number, number, number]) => {
      const out: number[] = [];
      for (let i = 0; i <= 96; i++) out.push(...point((2 * Math.PI * i) / 96).map((v) => v * GRID_RADIUS));
      return out;
    };
    const meridians = [0, 30, 60, 90, 120, 150].map((deg) => {
      const lon = (deg * Math.PI) / 180;
      return circle((a) => [Math.cos(a) * Math.cos(lon), Math.cos(a) * Math.sin(lon), Math.sin(a)]);
    });
    const parallels = [-60, -30, 30, 60].map((deg) => {
      const lat = (deg * Math.PI) / 180;
      return circle((a) => [Math.cos(lat) * Math.cos(a), Math.cos(lat) * Math.sin(a), Math.sin(lat)]);
    });
    return [...meridians, ...parallels];
  }, []);

  return (
    <>
      {lines.map((points, i) => (
        <Line key={i} points={points} color={GRID_COLOR} lineWidth={1} />
      ))}
      <mesh position={[0, 0, LINE_RADIUS]} scale={0.016}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color={MARK_COLOR} />
      </mesh>
    </>
  );
}

/** El ecuador en tres arcos del color del cuerpo que queda en medio, y los choques: dos bolitas que se tocan. */
function Equator() {
  const arcs = useMemo(() => BODY_COLORS.map((_, middle) => equatorArc(middle, 64).map((v) => v * LINE_RADIUS)), []);
  const pairs = useMemo(
    () =>
      COLLISIONS.map(({ bodies, point: [x, y] }) => {
        // Las dos bolitas, a un lado y otro del choque a lo largo del ecuador.
        const [tx, ty] = [-y, x];
        return bodies.map((body, side) => {
          const s = (side === 0 ? -1 : 1) * COLLISION_RADIUS;
          return { body, position: [x * LINE_RADIUS + tx * s, y * LINE_RADIUS + ty * s, 0] as const };
        });
      }).flat(),
    [],
  );

  return (
    <>
      {arcs.map((points, i) => (
        <Line key={i} points={points} color={BODY_COLORS[i]} lineWidth={2.5} />
      ))}
      {pairs.map(({ body, position }, i) => (
        <mesh key={i} position={position} scale={COLLISION_RADIUS}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshBasicMaterial color={BODY_COLORS[body]} />
        </mesh>
      ))}
    </>
  );
}

/**
 * El punto que recorre la curva, su estela y «la forma ahora». Un único
 * useFrame avanza el reloj del store (como en las otras escenas); nada de
 * esto provoca renders de React.
 */
function Moving({ slug, trajectory, now }: { slug: OrbitSlug; trajectory: Trajectory; now: RefObject<SVGSVGElement | null> }) {
  const size = useThree((s) => s.size);
  const point = useRef<Mesh>(null);
  const state = useMemo(() => new Float64Array(trajectory.bodyCount * STRIDE), [trajectory]);
  const triangle = useMemo(() => new Float64Array(6), []);
  const trailXYZ = useMemo(() => new Float32Array(TRAIL_POINTS * 3), []);
  const trail = useMemo(() => new FadingTrail(MARK_COLOR, TRAIL_POINTS, 2.5, 0, { depthWrite: true }), []);
  const glow = useMemo(() => new Color(MARK_COLOR).multiplyScalar(BODY_GLOW), []);

  useEffect(() => () => trail.dispose(), [trail]);
  useEffect(() => trail.setResolution(size.width, size.height), [trail, size]);

  useFrame((_, delta) => {
    usePlaybackStore.getState().advance(slug, delta, trajectory.period);
    const { time } = usePlaybackStore.getState().bySlug[slug] ?? INITIAL_PLAYBACK;

    // Estela: la forma en [time − span, time]; su último punto es el de ahora.
    sampleShapeTrail(trajectory, time, trajectory.period * TRAIL_FRACTION, state, trailXYZ, LINE_RADIUS);
    trail.update(trailXYZ, TRAIL_POINTS, 3);
    const head = (TRAIL_POINTS - 1) * 3;
    point.current?.position.set(trailXYZ[head], trailXYZ[head + 1], trailXYZ[head + 2]);

    // «La forma ahora»: el mismo instante, como triángulo (y hacia abajo en SVG).
    const svg = now.current;
    if (svg) {
      canonicalTriangle(state, triangle);
      const [x1, y1, x2, y2, x3, y3] = triangle;
      const xy = (x: number, y: number) => `${x.toFixed(3)},${(-y).toFixed(3)}`;
      svg.querySelector("polygon")?.setAttribute("points", `${xy(x1, y1)} ${xy(x2, y2)} ${xy(x3, y3)}`);
      svg.querySelectorAll("circle").forEach((dot, b) => {
        dot.setAttribute("cx", triangle[b * 2].toFixed(3));
        dot.setAttribute("cy", (-triangle[b * 2 + 1]).toFixed(3));
      });
    }
  });

  return (
    <>
      <primitive object={trail.object} renderOrder={BEFORE_VEIL} />
      <mesh ref={point} scale={POINT_RADIUS}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial color={glow} toneMapped={false} />
        {/* Halo (aditivo). Escribe profundidad, como la estela, para que el velo solo lo atenúe detrás. */}
        <mesh scale={2.6} renderOrder={BEFORE_VEIL}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshBasicMaterial color={MARK_COLOR} transparent opacity={0.14} blending={AdditiveBlending} />
        </mesh>
      </mesh>
    </>
  );
}

/**
 * Velo: una esfera del color del fondo, translúcida, dibujada después de todo
 * lo demás y sin escribir profundidad. Lo que queda detrás de su cara visible
 * (el reverso de la curva, la rejilla y los choques de atrás) se ve atenuado,
 * como la esfera translúcida de la Fig. 1 de Šuvakov y Dmitrašinović; lo que
 * está delante (a LINE_RADIUS, un poco fuera) no pasa la prueba de
 * profundidad y queda intacto.
 */
function Veil() {
  return (
    <mesh renderOrder={VEIL_ORDER}>
      <sphereGeometry args={[1, 64, 32]} />
      <meshBasicMaterial color={SCENE_BACKGROUND} transparent opacity={VEIL_OPACITY} depthWrite={false} />
    </mesh>
  );
}

/** «La forma ahora»: el triángulo de los tres cuerpos sin tamaño ni giro, el cuerpo 1 a la izquierda. */
function ShapeNow({ ref }: { ref: RefObject<SVGSVGElement | null> }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-3 top-3 flex flex-col items-center gap-1 rounded-lg bg-background/60 px-2 pt-1.5 pb-2 backdrop-blur-sm"
    >
      <span className="text-[11px] text-muted-foreground">La forma ahora</span>
      <svg ref={ref} viewBox="-1 -1 2 2" className="size-16 overflow-visible">
        <polygon
          fill="var(--foreground)"
          fillOpacity={0.06}
          stroke="var(--foreground)"
          strokeOpacity={0.6}
          strokeWidth={1}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {BODY_COLORS.map((color) => (
          <circle key={color} r={0.1} fill={color} />
        ))}
      </svg>
    </div>
  );
}
