import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Floor constants ──────────────────────────────────────────────────────────
export const STUDIO_FY = 2.5;   // floor base Y (lobby = -9.5, step = 12)
const RW = 9.8, RH = 9, RD = 24, RZ = -30;

// ─── Blueprint grid floor texture ─────────────────────────────────────────────
function makeBlueprintTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#12284a';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = 'rgba(70,130,200,0.22)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 512; i += 32) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(100,170,235,0.55)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 512; i += 128) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(100,170,235,0.38)';
  ctx.font = '7px monospace';
  for (let i = 1; i < 4; i++) ctx.fillText(`${i * 250}`, i * 128 + 3, 9);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 6);
  return t;
}

// ─── Schematic texture for drafting table surface ─────────────────────────────
function makeSchematicTex(seed: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 180;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f0ead8';
  ctx.fillRect(0, 0, 256, 180);
  ctx.strokeStyle = 'rgba(20,50,120,0.35)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i <= 256; i += 16) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 180); ctx.stroke();
  }
  for (let i = 0; i <= 180; i += 16) {
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
  }
  // schematic shapes
  ctx.strokeStyle = '#1a3a8c';
  ctx.lineWidth = 1.4;
  const shapes = [[40,40,80,60],[150,30,60,80],[80,100,100,50]];
  shapes.slice(0, 2 + seed).forEach(([x,y,w,h]) => {
    ctx.strokeRect(x, y, w, h);
    ctx.beginPath(); ctx.moveTo(x, y + h/2); ctx.lineTo(x + w, y + h/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w/2, y); ctx.lineTo(x + w/2, y + h); ctx.stroke();
  });
  ctx.fillStyle = 'rgba(26,58,140,0.55)';
  ctx.font = 'bold 8px monospace';
  ctx.fillText(['ANALYSIS SCHEMA', 'ENTITY MAP V2', 'QUERY PLAN'][seed % 3], 8, 168);
  return new THREE.CanvasTexture(c);
}

// ─── Drafting table ───────────────────────────────────────────────────────────
function DraftingTable({ position, rotY = 0, schematicIdx }: {
  position: [number, number, number];
  rotY?: number;
  schematicIdx: number;
}) {
  const schTex = useMemo(() => makeSchematicTex(schematicIdx), [schematicIdx]);
  const [x, y, z] = position;
  return (
    <group position={[x, y, z]} rotation={[0, rotY, 0]}>
      {/* Table surface — tilted */}
      <mesh position={[0, 0.78, 0.18]} rotation={[-0.3, 0, 0]} castShadow>
        <boxGeometry args={[1.8, 0.04, 1.2]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.7} />
      </mesh>
      {/* Schematic paper */}
      <mesh position={[0, 0.82, 0.12]} rotation={[-0.3, 0, 0]}>
        <planeGeometry args={[1.5, 1.0]} />
        <meshStandardMaterial map={schTex} roughness={0.9} transparent opacity={0.95} />
      </mesh>
      {/* Left leg */}
      <mesh position={[-0.8, 0.38, 0]}>
        <boxGeometry args={[0.07, 0.76, 0.07]} />
        <meshStandardMaterial color="#a8842c" metalness={0.55} roughness={0.3} />
      </mesh>
      {/* Right leg */}
      <mesh position={[0.8, 0.38, 0]}>
        <boxGeometry args={[0.07, 0.76, 0.07]} />
        <meshStandardMaterial color="#a8842c" metalness={0.55} roughness={0.3} />
      </mesh>
      {/* Cross brace */}
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[1.6, 0.05, 0.05]} />
        <meshStandardMaterial color="#8a6820" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Task lamp */}
      <pointLight position={[0, 1.6, 0.1]} color="#ffe8b0" intensity={0.8} distance={3.5} decay={2} />
    </group>
  );
}

// ─── Track lighting rail ──────────────────────────────────────────────────────
function TrackLighting({ y, z }: { y: number; z: number }) {
  const FIXTURES = 5;
  return (
    <group>
      {/* Rail */}
      <mesh position={[0, y, z]}>
        <boxGeometry args={[RW * 0.9, 0.06, 0.08]} />
        <meshStandardMaterial color="#2a2318" metalness={0.6} roughness={0.35} />
      </mesh>
      {Array.from({ length: FIXTURES }, (_, i) => {
        const x = -RW * 0.4 + (i / (FIXTURES - 1)) * RW * 0.8;
        return (
          <group key={i} position={[x, y - 0.12, z]}>
            <mesh>
              <cylinderGeometry args={[0.05, 0.07, 0.24, 8]} />
              <meshStandardMaterial color="#1e1a12" metalness={0.65} roughness={0.28} />
            </mesh>
            <mesh position={[0, -0.16, 0]}>
              <sphereGeometry args={[0.06, 8, 6]} />
              <meshStandardMaterial color="#ffe8a0" emissive={new THREE.Color('#ffd060')} emissiveIntensity={3} />
            </mesh>
            <pointLight position={[0, -0.2, 0]} color="#ffe8b0" intensity={0.55} distance={5} decay={2} />
          </group>
        );
      })}
    </group>
  );
}

// ─── Document wall rack ───────────────────────────────────────────────────────
function DocumentRack({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, STUDIO_FY + 2.8, z]}>
      {/* Frame */}
      <mesh>
        <boxGeometry args={[0.06, 2.2, 1.8]} />
        <meshStandardMaterial color="#2a2318" roughness={0.8} />
      </mesh>
      {/* 4 shelves */}
      {Array.from({ length: 4 }, (_, i) => (
        <mesh key={i} position={[0.04, -0.8 + i * 0.6, 0]}>
          <boxGeometry args={[0.08, 0.04, 1.7]} />
          <meshStandardMaterial color="#a8842c" metalness={0.5} roughness={0.3} />
        </mesh>
      ))}
      {/* Document stacks */}
      {Array.from({ length: 4 }, (_, i) => (
        Array.from({ length: 3 + (i % 2) }, (_, j) => (
          <mesh key={`${i}_${j}`} position={[0.08, -0.78 + i * 0.6 + 0.1, -0.6 + j * 0.35]}>
            <boxGeometry args={[0.04, 0.2, 0.3]} />
            <meshStandardMaterial color={j % 2 === 0 ? '#f0e8d8' : '#e4d8c0'} roughness={0.9} />
          </mesh>
        ))
      ))}
    </group>
  );
}

// ─── Studio Floor ─────────────────────────────────────────────────────────────
export default function StudioFloor() {
  const bpTex = useMemo(() => makeBlueprintTex(), []);

  return (
    <group>
      {/* Blueprint floor */}
      <mesh position={[0, STUDIO_FY, RZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[RW, RD]} />
        <meshStandardMaterial map={bpTex} roughness={0.5} metalness={0.05} />
      </mesh>
      {/* Floor border — gold trim */}
      {([[0, RW, 0.14], [0, RW, 0.14]] as number[][]).map((_, i) => (
        <mesh key={i} position={[0, STUDIO_FY + 0.007, RZ - RD / 2 + i * RD]}>
          <boxGeometry args={[RW, 0.014, 0.25]} />
          <meshStandardMaterial color="#a8842c" metalness={0.65} roughness={0.25} />
        </mesh>
      ))}

      {/* Walls — archival blue-cream */}
      <mesh position={[0, STUDIO_FY + RH / 2, RZ - RD / 2]}>
        <boxGeometry args={[RW, RH, 0.24]} />
        <meshStandardMaterial color="#e8ecf4" roughness={0.88} />
      </mesh>
      <mesh position={[-RW / 2, STUDIO_FY + RH / 2, RZ]}>
        <boxGeometry args={[0.24, RH, RD]} />
        <meshStandardMaterial color="#e8ecf4" roughness={0.88} />
      </mesh>
      <mesh position={[RW / 2, STUDIO_FY + RH / 2, RZ]}>
        <boxGeometry args={[0.24, RH, RD]} />
        <meshStandardMaterial color="#e8ecf4" roughness={0.88} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, STUDIO_FY + RH, RZ]}>
        <boxGeometry args={[RW, 0.24, RD]} />
        <meshStandardMaterial color="#dce0e8" roughness={0.9} />
      </mesh>

      {/* Wainscot gold cap */}
      {([-RW / 2 + 0.13, RW / 2 - 0.13] as number[]).map((wx, i) => (
        <mesh key={i} position={[wx, STUDIO_FY + 1.55, RZ]}>
          <boxGeometry args={[0.06, 0.08, RD - 0.1]} />
          <meshStandardMaterial color="#a8842c" metalness={0.6} roughness={0.28} />
        </mesh>
      ))}

      {/* Drafting tables */}
      <DraftingTable position={[-2.8, STUDIO_FY, RZ + 4]} rotY={0.12} schematicIdx={0} />
      <DraftingTable position={[0.2, STUDIO_FY, RZ + 2]} rotY={-0.06} schematicIdx={1} />
      <DraftingTable position={[2.9, STUDIO_FY, RZ - 3]} rotY={0.18} schematicIdx={2} />

      {/* Track lighting rails */}
      <TrackLighting y={STUDIO_FY + RH - 0.15} z={RZ + 5} />
      <TrackLighting y={STUDIO_FY + RH - 0.15} z={RZ - 3} />

      {/* Document racks */}
      <DocumentRack x={-RW / 2 + 0.14} z={RZ - 6} />
      <DocumentRack x={-RW / 2 + 0.14} z={RZ + 2} />

      {/* Large schematic poster on back wall */}
      <mesh position={[1.5, STUDIO_FY + 3.5, RZ - RD / 2 + 0.15]}>
        <planeGeometry args={[3.5, 2.8]} />
        <meshStandardMaterial color="#f0ead8" roughness={0.9} />
      </mesh>
      <mesh position={[1.5, STUDIO_FY + 3.5, RZ - RD / 2 + 0.18]}>
        <planeGeometry args={[3.3, 2.6]} />
        <meshStandardMaterial
          color="#12284a"
          emissive={new THREE.Color('#1a3a6a')}
          emissiveIntensity={0.15}
          roughness={0.85}
        />
      </mesh>

      {/* Ambient studio light */}
      <ambientLight color="#dce8f8" intensity={0.55} />
      <pointLight position={[0, STUDIO_FY + RH - 1.2, RZ]} color="#ffe8c8" intensity={1.4} distance={18} decay={1.5} />
      {/* Blue fill from blueprints */}
      <pointLight position={[0, STUDIO_FY + 0.5, RZ - 4]} color="#4080c0" intensity={0.4} distance={8} decay={2} />
    </group>
  );
}
