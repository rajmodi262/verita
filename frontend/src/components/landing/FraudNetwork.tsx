import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";

/* ── Network topology (hand-crafted for visual clarity) ──────────────────── */

const NODES: [number, number, number][] = [
  // Source cluster — left
  [-4.2,  1.0,  0.2],  // 0 — origin
  [-3.6, -0.6,  0.5],  // 1
  [-4.8,  0.1, -0.4],  // 2
  // Intermediary layer
  [-1.8,  0.9,  0.0],  // 3  ← fraud
  [-2.0, -0.8,  0.4],  // 4
  // Central hub
  [ 0.0,  0.0,  0.0],  // 5  ← fraud
  [ 0.2,  1.6, -0.4],  // 6
  // Shell companies — top right
  [ 2.1,  2.0,  0.5],  // 7  ← fraud
  [ 2.6,  0.4, -0.3],  // 8  ← fraud
  [ 3.2,  1.7,  0.2],  // 9
  // Endpoints — right
  [ 3.6, -0.4,  0.1],  // 10  ← fraud
  [ 4.2,  0.6, -0.4],  // 11  ← fraud
  [ 3.8, -1.6,  0.3],  // 12
  // Peripheral
  [-2.6,  1.8,  0.7],  // 13
  [ 1.1, -1.0,  0.6],  // 14
  [-0.4, -1.6, -0.5],  // 15
  [ 1.6, -0.9,  0.8],  // 16
  [-3.1,  2.1, -0.4],  // 17
  [ 2.1, -1.4, -0.6],  // 18
  [ 4.4, -0.1,  0.4],  // 19
];

type Edge = [number, number];

// Money flows: 0 → 3 → 5 → 7 → 8 → 10 → 11
const FRAUD_EDGES: Edge[] = [[0,3],[3,5],[5,7],[7,8],[8,10],[10,11]];
const FRAUD_NODES = new Set([0, 3, 5, 7, 8, 10, 11]);

const NORMAL_EDGES: Edge[] = [
  [0,1],[1,2],[2,4],[4,13],[13,3],
  [5,6],[6,9],[9,12],[12,18],[18,14],
  [5,14],[14,15],[15,4],[4,6],
  [7,17],[17,1],[8,16],[16,19],[19,11],
  [9,19],[12,16],[6,14],[13,17],
];

const V3 = (p: [number, number, number]) => new THREE.Vector3(p[0], p[1], p[2]);

/* ── Pulsing node ────────────────────────────────────────────────────────── */

function Node({ pos, fraud, index }: { pos: [number,number,number]; fraud: boolean; index: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pulse = 0.85 + 0.15 * Math.sin(t * 1.8 + index * 0.7);
    if (meshRef.current) meshRef.current.scale.setScalar(pulse);
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1.5 + 0.5 * Math.sin(t * 1.4 + index));
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        fraud ? 0.18 + 0.12 * Math.sin(t * 2 + index) : 0.06 + 0.04 * Math.sin(t * 1.5 + index);
    }
  });

  const color  = fraud ? "#ff4d5e" : "#ffb700";
  const radius = fraud ? 0.13 : 0.07;

  return (
    <group position={V3(pos)}>
      {/* Glow halo */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[radius * 2.8, 10, 10]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} depthWrite={false} />
      </mesh>
      {/* Core */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 14, 14]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

/* ── Animated fraud edge (marching dashes) ───────────────────────────────── */

function FraudEdge({ a, b }: { a: [number,number,number]; b: [number,number,number] }) {
  const ref = useRef<any>(null);
  useFrame(({ clock }) => {
    if (ref.current?.material) {
      ref.current.material.dashOffset = -clock.elapsedTime * 0.5;
    }
  });
  return (
    <Line
      ref={ref}
      points={[V3(a), V3(b)]}
      color="#ff4d5e"
      lineWidth={2.2}
      dashed
      dashSize={0.18}
      gapSize={0.09}
    />
  );
}

/* ── Scene ───────────────────────────────────────────────────────────────── */

export default function FraudNetwork() {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    groupRef.current.rotation.y  = t * 0.10;
    groupRef.current.rotation.x  = Math.sin(t * 0.06) * 0.12;
  });

  return (
    <group ref={groupRef}>
      {/* Normal edges */}
      {NORMAL_EDGES.map(([a, b], i) => (
        <Line
          key={`n-${i}`}
          points={[V3(NODES[a]), V3(NODES[b])]}
          color="#ffb700"
          lineWidth={0.5}
          transparent
          opacity={0.20}
        />
      ))}

      {/* Fraud path edges — dashed, animated */}
      {FRAUD_EDGES.map(([a, b], i) => (
        <FraudEdge key={`f-${i}`} a={NODES[a]} b={NODES[b]} />
      ))}

      {/* All nodes */}
      {NODES.map((pos, i) => (
        <Node key={i} pos={pos} fraud={FRAUD_NODES.has(i)} index={i} />
      ))}
    </group>
  );
}
