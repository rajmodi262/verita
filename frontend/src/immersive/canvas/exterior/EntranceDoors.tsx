import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { useBuildingContext } from '../../context/BuildingContext';

const DOOR_W = 1.85;
const DOOR_H = 3.1;
const DOOR_THICKNESS = 0.12;
const DOOR_Z = -17.35;
const DOOR_Y = -8.3;

// ─── Paper scatter particles ─────────────────────────────────────────────────
const PARTICLE_COUNT = 600;

function PaperScatter({ active }: { active: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dataRef = useRef<
    { pos: THREE.Vector3; vel: THREE.Vector3; rot: THREE.Euler; rotVel: THREE.Vector3 }[]
  >([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Init particle data
  useMemo(() => {
    dataRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * 3.6,
        DOOR_Y + DOOR_H / 2 + Math.random() * DOOR_H,
        DOOR_Z + (Math.random() - 0.5) * 2
      ),
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 4 + 1,
        Math.random() * 5 + 1
      ),
      rot: new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, 0),
      rotVel: new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      ),
    }));
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current || !active) return;
    const GRAVITY = -4.5;
    dataRef.current.forEach((p, i) => {
      p.vel.y += GRAVITY * delta;
      p.pos.addScaledVector(p.vel, delta);
      p.rot.x += p.rotVel.x * delta;
      p.rot.y += p.rotVel.y * delta;
      p.rot.z += p.rotVel.z * delta;

      dummy.position.copy(p.pos);
      dummy.rotation.copy(p.rot);
      dummy.scale.setScalar(Math.max(0, 1 - Math.max(0, -p.pos.z + DOOR_Z) * 0.1));
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <planeGeometry args={[0.18, 0.24]} />
      <meshStandardMaterial
        color="#f3eee2"
        side={THREE.DoubleSide}
        roughness={0.9}
        transparent
        opacity={0.88}
      />
    </instancedMesh>
  );
}

// ─── Single door panel ──────────────────────────────────────────────────────
function DoorPanel({
  side,
  onOpen,
}: {
  side: 'left' | 'right';
  onOpen: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const openedRef = useRef(false);
  const { gl } = useThree();

  const isLeft = side === 'left';
  const pivotX = isLeft ? -DOOR_W : DOOR_W;
  const panelOffsetX = isLeft ? DOOR_W / 2 : -DOOR_W / 2;
  const openAngle = isLeft ? -Math.PI / 2 : Math.PI / 2;

  const handleClick = useCallback(() => {
    if (openedRef.current || !groupRef.current) return;
    openedRef.current = true;
    gl.domElement.style.cursor = 'default';
    onOpen();
    gsap.to(groupRef.current.rotation, {
      y: openAngle,
      duration: 0.85,
      ease: 'power2.inOut',
    });
  }, [openAngle, onOpen, gl]);

  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: hovered ? '#e8dcc8' : '#d4c8a8',
        roughness: 0.78,
        metalness: 0.05,
      }),
    [hovered]
  );

  useEffect(() => {
    return () => mat.dispose();
  }, [mat]);

  useEffect(() => {
    return () => {
      gl.domElement.style.cursor = 'default';
    };
  }, [gl]);

  return (
    // Pivot group positioned at the hinge edge
    <group ref={groupRef} position={[pivotX, DOOR_Y + DOOR_H / 2, DOOR_Z]}>
      {/* Door panel offset from pivot to fill the opening */}
      <mesh
        position={[panelOffsetX, 0, 0]}
        onPointerOver={() => {
          setHovered(true);
          if (!openedRef.current) gl.domElement.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          gl.domElement.style.cursor = 'default';
        }}
        onClick={handleClick}
        castShadow
      >
        <boxGeometry args={[DOOR_W, DOOR_H, DOOR_THICKNESS]} />
        <primitive object={mat} />
      </mesh>

      {/* Door detail panels — recessed inset */}
      {([-0.5, 0.5] as number[]).map((dy, i) => (
        <mesh key={i} position={[panelOffsetX, dy * DOOR_H * 0.28, DOOR_THICKNESS / 2 + 0.01]}>
          <boxGeometry args={[DOOR_W * 0.65, DOOR_H * 0.3, 0.025]} />
          <meshStandardMaterial color="#c8b890" roughness={0.85} />
        </mesh>
      ))}

      {/* Gold door handle */}
      <mesh position={[isLeft ? panelOffsetX + DOOR_W * 0.38 : panelOffsetX - DOOR_W * 0.38, 0, DOOR_THICKNESS / 2 + 0.04]}>
        <cylinderGeometry args={[0.035, 0.035, 0.32, 8]} />
        <meshStandardMaterial color="#a8842c" metalness={0.75} roughness={0.2} emissive={new THREE.Color('#a8842c')} emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

// ─── Door frame ──────────────────────────────────────────────────────────────
function DoorFrame() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2318', roughness: 0.9 }), []);
  useEffect(() => {
    return () => mat.dispose();
  }, [mat]);

  return (
    <group position={[0, DOOR_Y + DOOR_H / 2, DOOR_Z + DOOR_THICKNESS / 2 + 0.01]}>
      {/* Left jamb */}
      <mesh position={[-DOOR_W - 0.12, 0, 0]}>
        <boxGeometry args={[0.24, DOOR_H + 0.28, 0.22]} />
        <primitive object={mat} />
      </mesh>
      {/* Right jamb */}
      <mesh position={[DOOR_W + 0.12, 0, 0]}>
        <boxGeometry args={[0.24, DOOR_H + 0.28, 0.22]} />
        <primitive object={mat} />
      </mesh>
      {/* Top lintel */}
      <mesh position={[0, DOOR_H / 2 + 0.12, 0]}>
        <boxGeometry args={[DOOR_W * 2 + 0.48, 0.24, 0.22]} />
        <primitive object={mat} />
      </mesh>
    </group>
  );
}

// ─── Composed entrance ───────────────────────────────────────────────────────
export default function EntranceDoors() {
  const { enterBuilding } = useBuildingContext();
  const [scatterActive, setScatterActive] = useState(false);
  const openCountRef = useRef(0);
  const scatterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDoorOpen = useCallback(() => {
    openCountRef.current += 1;
    setScatterActive(true);
    if (scatterTimerRef.current) clearTimeout(scatterTimerRef.current);
    scatterTimerRef.current = setTimeout(() => {
      setScatterActive(false);
      scatterTimerRef.current = null;
    }, 3000);

    // First click triggers entry — paper shred covers the transition
    if (openCountRef.current === 1) {
      if (entryTimerRef.current) clearTimeout(entryTimerRef.current);
      entryTimerRef.current = setTimeout(() => {
        enterBuilding();
        entryTimerRef.current = null;
      }, 320);
    }
  }, [enterBuilding]);

  useEffect(() => {
    return () => {
      if (scatterTimerRef.current) clearTimeout(scatterTimerRef.current);
      if (entryTimerRef.current) clearTimeout(entryTimerRef.current);
    };
  }, []);

  return (
    <>
      <DoorFrame />
      <DoorPanel side="left" onOpen={handleDoorOpen} />
      <DoorPanel side="right" onOpen={handleDoorOpen} />
      <PaperScatter active={scatterActive} />
    </>
  );
}
