import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLiveLedger } from '../../hooks/useLiveLedger';

// ─── Dimensions ────────────────────────────────────────────────────────────────
const PAGE_W = 2.1;
const PAGE_H = 2.7;
const PAGE_D = 0.04;
const PEDESTAL_H = 1.4;

// ─── Gold glow point light that pulses ────────────────────────────────────────
function PedestalGlow() {
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (!lightRef.current) return;
    lightRef.current.intensity = 1.2 + Math.sin(clock.elapsedTime * 1.4) * 0.35;
  });
  return (
    <pointLight
      ref={lightRef}
      position={[0, PEDESTAL_H + 0.6, 0]}
      color="#ffd080"
      intensity={1.2}
      distance={7}
      decay={2}
    />
  );
}

// ─── Book spine ───────────────────────────────────────────────────────────────
function BookSpine() {
  return (
    <mesh position={[0, PEDESTAL_H + PAGE_H / 2 + 0.02, -0.04]}>
      <boxGeometry args={[0.12, PAGE_H + 0.06, PAGE_D + 0.04]} />
      <meshStandardMaterial color="#2a2318" roughness={0.85} metalness={0.1} />
    </mesh>
  );
}

// ─── Open book on pedestal ────────────────────────────────────────────────────
export default function LivingLedger({ position = [0, 0, 0] as [number, number, number] }) {
  const texture = useLiveLedger();
  const bookRef = useRef<THREE.Group>(null);

  // Subtle idle float
  useFrame(({ clock }) => {
    if (!bookRef.current) return;
    bookRef.current.position.y = Math.sin(clock.elapsedTime * 0.6) * 0.025;
    bookRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.3) * 0.03;
  });

  // Fallback blank material when texture not yet ready
  const coverMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1a1308', roughness: 0.85, metalness: 0.08 }),
    []
  );
  useEffect(() => {
    return () => {
      coverMat.dispose();
    };
  }, [coverMat]);

  const [pageMat, setPageMat] = useState<THREE.MeshStandardMaterial | null>(null);
  useEffect(() => {
    const mat = new THREE.MeshStandardMaterial({
      map: texture ?? undefined,
      color: texture ? '#ffffff' : '#f5efdf',
      roughness: 0.88,
      metalness: 0,
      emissive: new THREE.Color('#ffefc8'),
      emissiveIntensity: texture ? 0.04 : 0,
    });
    setPageMat(mat);
    return () => {
      mat.dispose();
    };
  }, [texture]);

  return (
    <group position={position}>
      {/* Pedestal */}
      <mesh position={[0, PEDESTAL_H / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.55, 0.65, PEDESTAL_H, 16]} />
        <meshStandardMaterial color="#2a2318" roughness={0.75} metalness={0.15} />
      </mesh>
      {/* Pedestal plinth ring */}
      <mesh position={[0, PEDESTAL_H, 0]}>
        <cylinderGeometry args={[0.68, 0.68, 0.06, 16]} />
        <meshStandardMaterial color="#a8842c" metalness={0.65} roughness={0.28} />
      </mesh>

      <PedestalGlow />

      {/* Floating book group */}
      <group ref={bookRef}>
        {/* Left page (live ledger texture) */}
        <mesh position={[-PAGE_W / 2 - 0.02, PEDESTAL_H + PAGE_H / 2, 0]} castShadow>
          <boxGeometry args={[PAGE_W, PAGE_H, PAGE_D]} />
          {pageMat && <primitive object={pageMat} />}
        </mesh>

        {/* Right page (cover material, slightly angled) */}
        <mesh
          position={[PAGE_W / 2 + 0.02, PEDESTAL_H + PAGE_H / 2, 0]}
          rotation={[0, -0.08, 0]}
          castShadow
        >
          <boxGeometry args={[PAGE_W, PAGE_H, PAGE_D]} />
          <primitive object={coverMat} />
        </mesh>

        {/* Gold corner brackets on right page */}
        {([-1, 1] as number[]).map((sx) =>
          ([-1, 1] as number[]).map((sy, j) => (
            <mesh
              key={`${sx}_${sy}`}
              position={[
                PAGE_W + 0.02 + sx * (PAGE_W / 2 - 0.12),
                PEDESTAL_H + PAGE_H / 2 + sy * (PAGE_H / 2 - 0.12),
                PAGE_D / 2 + 0.01,
              ]}
            >
              <boxGeometry args={[0.18, 0.04, 0.015]} />
              <meshStandardMaterial color="#a8842c" metalness={0.7} roughness={0.2} />
            </mesh>
          ))
        )}

        <BookSpine />

        {/* VERITA embossed label on spine */}
        <mesh position={[-0.005, PEDESTAL_H + PAGE_H / 2, -0.05]}>
          <boxGeometry args={[0.08, 0.7, 0.008]} />
          <meshStandardMaterial
            color="#a8842c"
            metalness={0.75}
            roughness={0.2}
            emissive={new THREE.Color('#a8842c')}
            emissiveIntensity={0.2}
          />
        </mesh>
      </group>
    </group>
  );
}
