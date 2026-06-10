import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * A living "financial signal field": a cloud of glowing points (a transaction graph) that
 * rotates continuously, breathes, and parallaxes toward the cursor. Additive blending gives the
 * luminous bloom without a postprocessing pass (keeps it light + reliable).
 */
const COUNT = 2600;

function Points() {
  const ref = useRef<THREE.Points>(null!);
  const { pointer } = useThree();

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const cInner = new THREE.Color("#22d3ee");
    const cMid = new THREE.Color("#4d7cff");
    const cOuter = new THREE.Color("#a855f7");

    for (let i = 0; i < COUNT; i++) {
      // Distribute in a flattened ellipsoid for a layered, depthy look.
      const r = Math.pow(Math.random(), 0.6) * 9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta) * 0.55;
      const z = r * Math.cos(phi);
      positions.set([x, y, z], i * 3);

      // Colour by radius: cyan core → blue → violet rim.
      const t = r / 9;
      const c = t < 0.5 ? cInner.clone().lerp(cMid, t * 2) : cMid.clone().lerp(cOuter, (t - 0.5) * 2);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    return { positions, colors };
  }, []);

  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    // Continuous slow rotation.
    g.rotation.y += delta * 0.06;
    g.rotation.z += delta * 0.015;
    // Gentle breathing.
    const s = 1 + Math.sin(state.clock.elapsedTime * 0.4) * 0.03;
    g.scale.setScalar(s);
    // Parallax toward the cursor.
    g.rotation.x += (pointer.y * 0.25 - g.rotation.x) * 0.04;
    g.rotation.y += (pointer.x * 0.25) * 0.01;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function SignalField() {
  return (
    <Canvas
      camera={{ position: [0, 0, 14], fov: 60 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ position: "absolute", inset: 0, zIndex: 1 }}
    >
      <Points />
    </Canvas>
  );
}
