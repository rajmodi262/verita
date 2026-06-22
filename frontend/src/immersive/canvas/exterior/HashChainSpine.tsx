import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';

const LINK_COUNT = 12;
const SPINE_X = 6.4;     // right edge of building
const SPINE_Z = -22;
const SPINE_Y_BOTTOM = -9;
const LINK_SPACING = 1.8;

// Each chain link: a torus that transitions from grey → gold on seal
function ChainLink({
  index,
  position,
}: {
  index: number;
  position: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useEffect(() => {
    if (!matRef.current) return;

    // Stagger seal delay by link index — bottom links seal first
    const delay = 0.6 + index * 0.22;

    gsap.to(matRef.current, {
      emissiveIntensity: 0.55,
      duration: 0.6,
      delay,
      ease: 'power2.out',
      onStart: () => {
        if (!matRef.current) return;
        // Transition colour: unsealed grey → gold
        gsap.to(matRef.current.color, {
          r: 0.658, g: 0.518, b: 0.173, // #a8842c
          duration: 0.5,
          delay: 0,
        });
        gsap.to(matRef.current.emissive, {
          r: 0.658, g: 0.518, b: 0.173,
          duration: 0.5,
        });
      },
    });

    // Brief scale pop on seal
    if (meshRef.current) {
      gsap.fromTo(
        meshRef.current.scale,
        { x: 1, y: 1, z: 1 },
        {
          x: 1.18, y: 1.18, z: 1.18,
          duration: 0.14,
          delay: delay + 0.05,
          yoyo: true,
          repeat: 1,
          ease: 'power2.out',
        }
      );
    }

    return () => {
      if (matRef.current) {
        gsap.killTweensOf(matRef.current);
        gsap.killTweensOf(matRef.current.color);
        gsap.killTweensOf(matRef.current.emissive);
      }
      if (meshRef.current) {
        gsap.killTweensOf(meshRef.current.scale);
      }
    };
  }, [index]);

  // Slow idle rotation
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.z += delta * (0.3 + index * 0.04);
    }
  });

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <torusGeometry args={[0.3, 0.075, 8, 20]} />
      <meshStandardMaterial
        ref={matRef}
        color="#6a6050"
        metalness={0.65}
        roughness={0.35}
        emissive={new THREE.Color('#000000')}
        emissiveIntensity={0}
      />
    </mesh>
  );
}

// Connector bar between links
function LinkConnector({ y }: { y: number }) {
  return (
    <mesh position={[SPINE_X, y, SPINE_Z]}>
      <cylinderGeometry args={[0.03, 0.03, LINK_SPACING * 0.55, 6]} />
      <meshStandardMaterial color="#8a7840" metalness={0.5} roughness={0.4} />
    </mesh>
  );
}

export default function HashChainSpine() {
  return (
    <group>
      {Array.from({ length: LINK_COUNT }, (_, i) => {
        const y = SPINE_Y_BOTTOM + i * LINK_SPACING;
        const isAlternate = i % 2 === 1;
        return (
          <group key={i}>
            <ChainLink
              index={i}
              position={[SPINE_X, y, isAlternate ? SPINE_Z + 0.12 : SPINE_Z - 0.12]}
            />
            {i < LINK_COUNT - 1 && <LinkConnector y={y + LINK_SPACING / 2} />}
          </group>
        );
      })}
    </group>
  );
}
