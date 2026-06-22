import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useBuildingContext } from '../context/BuildingContext';
import BuildingFacade from './exterior/BuildingFacade';
import HashChainSpine from './exterior/HashChainSpine';
import EntranceDoors from './exterior/EntranceDoors';
import LobbyRoom from './lobby/LobbyRoom';
import FloorScene from './floors/FloorScene';
import { useCameraJourney } from '../hooks/useCameraJourney';

// ─── Lighting ─────────────────────────────────────────────────────────────────
function ExteriorLighting() {
  return (
    <>
      {/* Golden-hour sun — low angle, warm amber */}
      <directionalLight
        position={[10, 8, 18]}
        intensity={2.6}
        color="#ffd080"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={150}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0005}
      />
      {/* Warm sky ambient */}
      <ambientLight intensity={1.4} color="#fff5e0" />
      {/* Ground bounce */}
      <hemisphereLight args={['#ffe8b0', '#c8b090', 0.5]} />
      {/* Subtle fill from the left — softens right shadow */}
      <directionalLight position={[-8, 4, 10]} intensity={0.55} color="#ffeec0" />
    </>
  );
}

// ─── Ground + sidewalk ────────────────────────────────────────────────────────
function Ground() {
  return (
    <>
      {/* Main ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -9.5, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#ece5d3" roughness={0.96} />
      </mesh>
      {/* Sidewalk slab in front of building */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -9.48, -10]}>
        <planeGeometry args={[20, 18]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.9} />
      </mesh>
      {/* Sidewalk edge trim */}
      <mesh position={[0, -9.35, -1.5]}>
        <boxGeometry args={[20, 0.14, 0.3]} />
        <meshStandardMaterial color="#d8d0c0" roughness={0.85} />
      </mesh>
    </>
  );
}

// ─── City background silhouettes ──────────────────────────────────────────────
function CityBackground() {
  const buildings: [number, number, number, number, number][] = [
    [-52, 14, -95, 8, 4],
    [-38,  9, -88, 7, 4],
    [-26, 18, -92, 9, 5],
    [-16,  6, -80, 5, 3],
    [ 16,  8, -82, 6, 3],
    [ 28, 16, -90, 8, 5],
    [ 42, 11, -86, 7, 4],
    [ 56, 20, -95, 10, 5],
  ];
  return (
    <>
      {buildings.map(([x, h, z, w, d], i) => (
        <mesh key={i} position={[x, h / 2 - 9.5, z]}>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#d0c8b8" roughness={1} />
        </mesh>
      ))}
    </>
  );
}

// ─── Wind dust — drifting cream particles visible in exterior phases ──────────
function WindDust() {
  const { phase } = useBuildingContext();
  const isExterior = phase === 'exterior_approach' || phase === 'exterior_idle';

  const geo = useMemo(() => {
    const N = 160;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 55;
      pos[i * 3 + 1] = -9 + Math.random() * 20;
      pos[i * 3 + 2] = -5 + Math.random() * -35;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useEffect(() => () => { geo.dispose(); }, [geo]);

  useFrame((_, delta) => {
    if (!isExterior) return;
    const arr = geo.attributes.position.array as Float32Array;
    // Derive count from the buffer to stay in sync if N ever changes
    const count = arr.length / 3;
    for (let i = 0; i < count; i++) {
      arr[i * 3]     -= delta * (0.4 + (i % 7) * 0.18);
      arr[i * 3 + 1] += delta * (0.04 + (i % 5) * 0.025);
      if (arr[i * 3]     < -27)  arr[i * 3]     = 27;
      if (arr[i * 3 + 1] > 12)   arr[i * 3 + 1] = -9;
    }
    geo.attributes.position.needsUpdate = true;
  });

  if (!isExterior) return null;
  return (
    <points geometry={geo}>
      <pointsMaterial color="#e8dcc8" size={0.08} sizeAttenuation transparent opacity={0.42} fog />
    </points>
  );
}

// ─── Floor arrival pulse — warm flash on landing ──────────────────────────────
function FloorArrivalPulse() {
  const { phase } = useBuildingContext();
  const lightRef = useRef<THREE.PointLight>(null);
  const prevRef = useRef(phase);

  useEffect(() => {
    const prev = prevRef.current;
    const arrived = prev === 'teleporting' &&
      (phase.startsWith('floor_') || phase === 'lobby' || phase === 'rooftop');
    if (arrived && lightRef.current) lightRef.current.intensity = 4.5;
    prevRef.current = phase;
  }, [phase]);

  useFrame((_, delta) => {
    if (lightRef.current && lightRef.current.intensity > 0) {
      lightRef.current.intensity = Math.max(0, lightRef.current.intensity - delta * 7);
    }
  });

  return <pointLight ref={lightRef} position={[0, 5, -25]} color="#ffe8c0" intensity={0} distance={22} decay={2} />;
}

// ─── Camera controller ────────────────────────────────────────────────────────
function CameraController() {
  useCameraJourney();
  return null;
}

// ─── Scene ready signal ───────────────────────────────────────────────────────
function ReadySignal({ onReady }: { onReady: () => void }) {
  const firedRef = useRef(false);
  useFrame(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    onReady();
  });
  return null;
}

// ─── Fog + background colour shifts for rooftop night sky ────────────────────
function FogAndBgController() {
  const { phase } = useBuildingContext();
  const { scene } = useThree();
  useEffect(() => {
    const onRoof = phase === 'rooftop';
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.set(onRoof ? '#040810' : '#f0ead8');
      scene.fog.near  = onRoof ? 90  : 55;
      scene.fog.far   = onRoof ? 240 : 160;
    }
    if (scene.background instanceof THREE.Color) {
      scene.background.set(onRoof ? '#020510' : '#f3eee2');
    }
  }, [phase, scene]);
  return null;
}

// ─── Lobby (shown while entering and in lobby phase) ─────────────────────────
function LobbySceneContents() {
  const { phase } = useBuildingContext();
  const show = phase === 'entering' || phase === 'lobby' || phase === 'teleporting' || phase === 'elevator_traveling';
  if (!show) return null;
  return <LobbyRoom />;
}

export default function BuildingScene() {
  const { setSceneReady } = useBuildingContext();

  const handleReady = useCallback(() => {
    setSceneReady(true);
  }, [setSceneReady]);

  return (
    <Canvas
      camera={{ position: [0, 8, 62], fov: 55, near: 0.1, far: 400 }}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      shadows
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#f3eee2']} />
      {/* Golden-hour haze — warm cream fog */}
      <fog attach="fog" args={['#f0ead8', 55, 160]} />

      <ReadySignal onReady={handleReady} />
      <CameraController />
      <ExteriorLighting />
      <Ground />
      <CityBackground />
      <BuildingFacade />
      <HashChainSpine />
      <EntranceDoors />
      <FogAndBgController />
      <WindDust />
      <FloorArrivalPulse />
      <LobbySceneContents />
      {/* FloorScene uses React.lazy internally and provides its own Suspense */}
      <FloorScene />
    </Canvas>
  );
}
