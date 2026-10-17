"use client";

import { Line, OrthographicCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BufferAttribute, BufferGeometry, Line as ThreeLine, LineBasicMaterial, type Mesh } from "three";
import { centralGravity } from "@/lib/physics/kepler";
import { createRK4 } from "@/lib/physics/rk4";
import {
  ESCAPE_RADIUS,
  GM,
  KM_PER_UNIT,
  LAUNCH_RADIUS,
  PLANET_RADIUS,
  launchState,
  unitsToKms,
} from "@/lib/gravity/sandbox";
import { SCENE_BACKGROUND } from "@/lib/orbits/colors";
import { useLabStore, type FlightStatus } from "@/lib/store/lab-store";

/** Medio lado visible, en radios del planeta. */
const VIEW_HALF = 6.5;
/** Longitud de la flecha de lanzamiento por cada km/s. */
const ARROW_UNITS_PER_KMS = 0.3;
/** Tiempo simulado por segundo real: una órbita circular de lanzamiento dura ~12 s. */
export const SIM_UNITS_PER_SECOND = 1.5;
/** Paso máximo de RK4: fino cerca del planeta, donde la órbita se curva más. */
const MAX_STEP = 0.002;
const TRAIL_POINTS = 900;
const PREVIEW_STEPS = 4000;
const PREVIEW_DT = 0.01;

const step = createRK4(4, centralGravity(GM));

/** Escena del capítulo 3: planeta, lanzamiento por arrastre, trayectoria prevista y vuelo en directo. */
export default function SandboxScene() {
  return (
    <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: false }}>
      <color attach="background" args={[SCENE_BACKGROUND]} />
      <SceneContent />
    </Canvas>
  );
}

function SceneContent() {
  const size = useThree((s) => s.size);
  const zoom = Math.min(size.width, size.height) / (2 * VIEW_HALF);
  return (
    <>
      <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={zoom} near={0.1} far={100} />
      <Planet />
      <Preview />
      <Satellite pixel={1 / zoom} />
      <AimSurface />
    </>
  );
}

function Planet() {
  return (
    <group>
      <mesh scale={PLANET_RADIUS * 1.15}>
        <circleGeometry args={[1, 64]} />
        <meshBasicMaterial color="#5ec8f2" transparent opacity={0.12} />
      </mesh>
      <mesh scale={PLANET_RADIUS}>
        <circleGeometry args={[1, 64]} />
        <meshBasicMaterial color="#2a6f97" />
      </mesh>
    </group>
  );
}

/**
 * Lo que pasará si lanzas con los valores actuales: flecha de velocidad y
 * trayectoria integrada de antemano (hasta 40 unidades de tiempo, o hasta
 * chocar o salir de la vista). Se recalcula al mover los controles.
 */
function Preview() {
  const speedKms = useLabStore((s) => s.speedKms);
  const angleDeg = useLabStore((s) => s.angleDeg);

  const { arrow, path } = useMemo(() => {
    const s = launchState(speedKms, angleDeg);
    const a = (angleDeg * Math.PI) / 180;
    const len = speedKms * ARROW_UNITS_PER_KMS;
    const arrowPoints: [number, number, number][] = [
      [0, LAUNCH_RADIUS, 0],
      [len * Math.cos(a), LAUNCH_RADIUS + len * Math.sin(a), 0],
    ];
    const points: number[] = [s[0], s[1], 0];
    for (let i = 0; i < PREVIEW_STEPS; i++) {
      for (let k = 0; k < 5; k++) step(s, PREVIEW_DT / 5);
      points.push(s[0], s[1], 0);
      const r = Math.hypot(s[0], s[1]);
      if (r < PLANET_RADIUS || r > VIEW_HALF * 1.6) break;
    }
    return { arrow: arrowPoints, path: points };
  }, [speedKms, angleDeg]);

  return (
    <>
      <Line points={path} color="#f3efe6" lineWidth={1} transparent opacity={0.25} dashed dashSize={0.12} gapSize={0.1} />
      {speedKms > 0.05 && <Line points={arrow} color="#f5b83d" lineWidth={2.5} />}
    </>
  );
}

/**
 * El satélite en vuelo. Cada lanzamiento (un id nuevo en el store) reinicia
 * su estado; useFrame integra con RK4 en subpasos e informa a los controles
 * unas 10 veces por segundo, no en cada fotograma.
 */
function Satellite({ pixel }: { pixel: number }) {
  const launch = useLabStore((s) => s.launch);
  const setFlight = useLabStore((s) => s.setFlight);
  const mesh = useRef<Mesh>(null);
  const state = useRef<Float64Array>(Float64Array.from([0, LAUNCH_RADIUS, 0, 0]));
  const status = useRef<FlightStatus>("esperando");
  const lastReport = useRef(0);

  const trail = useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(TRAIL_POINTS * 3), 3));
    geometry.setDrawRange(0, 0);
    return new ThreeLine(geometry, new LineBasicMaterial({ color: "#f5b83d", transparent: true, opacity: 0.8 }));
  }, []);
  const trailCount = useRef(0);

  useEffect(() => () => {
    trail.geometry.dispose();
    (trail.material as LineBasicMaterial).dispose();
  }, [trail]);

  useEffect(() => {
    if (!launch) return;
    state.current = launchState(launch.speedKms, launch.angleDeg);
    status.current = "en-vuelo";
    trailCount.current = 0;
    trail.geometry.setDrawRange(0, 0);
  }, [launch, trail]);

  useFrame((_, delta) => {
    const s = state.current;
    if (status.current === "en-vuelo") {
      const simDt = Math.min(delta, 0.1) * SIM_UNITS_PER_SECOND;
      const n = Math.ceil(simDt / MAX_STEP);
      for (let i = 0; i < n; i++) {
        step(s, simDt / n);
        const r = Math.hypot(s[0], s[1]);
        if (r <= PLANET_RADIUS) {
          // Se proyecta sobre la superficie para que el choque se vea donde ocurre.
          s[0] *= PLANET_RADIUS / r;
          s[1] *= PLANET_RADIUS / r;
          status.current = "choque";
          break;
        }
        if (r >= ESCAPE_RADIUS) {
          status.current = "escapado";
          break;
        }
      }
      pushTrail(trail, trailCount, s[0], s[1]);
    }
    mesh.current?.position.set(s[0], s[1], 1);

    const now = performance.now();
    if (now - lastReport.current > 100) {
      lastReport.current = now;
      const readout = {
        status: status.current,
        altitudeKm: Math.round((Math.hypot(s[0], s[1]) - PLANET_RADIUS) * KM_PER_UNIT),
        speedKms: status.current === "en-vuelo" ? Number(unitsToKms(Math.hypot(s[2], s[3])).toFixed(2)) : 0,
      };
      // Solo se notifica si algo cambia: en reposo no hay renders de los controles.
      const current = useLabStore.getState().flight;
      if (
        readout.status !== current.status ||
        readout.altitudeKm !== current.altitudeKm ||
        readout.speedKms !== current.speedKms
      ) {
        setFlight(readout);
      }
    }
  });

  return (
    <>
      <primitive object={trail} />
      <mesh ref={mesh} position={[0, LAUNCH_RADIUS, 1]} scale={6 * pixel}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial color="#f3efe6" />
      </mesh>
    </>
  );
}

/** Añade un punto a la estela; cuando se llena, desplaza y descarta el más antiguo. */
function pushTrail(line: ThreeLine, count: { current: number }, x: number, y: number) {
  const attribute = line.geometry.getAttribute("position") as BufferAttribute;
  const array = attribute.array as Float32Array;
  if (count.current < TRAIL_POINTS) {
    count.current += 1;
  } else {
    array.copyWithin(0, 3);
  }
  const o = (count.current - 1) * 3;
  array[o] = x;
  array[o + 1] = y;
  array[o + 2] = 0.5;
  attribute.needsUpdate = true;
  line.geometry.setDrawRange(0, count.current);
}

/**
 * Superficie invisible que recoge el arrastre: si empieza cerca del punto de
 * lanzamiento, la flecha sigue al puntero (dirección = ángulo, longitud =
 * velocidad) y al soltar se lanza.
 */
function AimSurface() {
  const setLaunchParams = useLabStore((s) => s.setLaunchParams);
  const fire = useLabStore((s) => s.fire);
  const aiming = useRef(false);

  const aimAt = (e: ThreeEvent<PointerEvent>) => {
    const dx = e.point.x;
    const dy = e.point.y - LAUNCH_RADIUS;
    setLaunchParams({
      speedKms: Math.hypot(dx, dy) / ARROW_UNITS_PER_KMS,
      angleDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
    });
  };

  return (
    <mesh
      position={[0, 0, 2]}
      onPointerDown={(e) => {
        if (Math.hypot(e.point.x, e.point.y - LAUNCH_RADIUS) > 1.5) return;
        aiming.current = true;
        (e.target as Element).setPointerCapture(e.pointerId);
        aimAt(e);
      }}
      onPointerMove={(e) => aiming.current && aimAt(e)}
      onPointerUp={() => {
        if (!aiming.current) return;
        aiming.current = false;
        fire();
      }}
    >
      <planeGeometry args={[VIEW_HALF * 6, VIEW_HALF * 6]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
