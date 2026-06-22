import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useRiskLabUVReveal } from '../../hooks/useUVReveal';

export const RISK_FY = 14.5;
const RW = 9.8, RH = 9, RD = 24, RZ = -30;

// UV-reactive text strip texture
function makeUVStripTex(label: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 32;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0a0812';
  ctx.fillRect(0, 0, 256, 32);
  ctx.fillStyle = '#7df9ff';
  ctx.font = 'bold 11px "JetBrains Mono", monospace';
  ctx.fillText(label, 6, 22);
  return new THREE.CanvasTexture(c);
}

// Evidence grid texture on examination table
function makeEvidenceTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#060410';
  ctx.fillRect(0, 0, 512, 256);
  // grid
  ctx.strokeStyle = 'rgba(125,249,255,0.18)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 512; i += 32) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,256); ctx.stroke(); }
  for (let i = 0; i <= 256; i += 32) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(512,i); ctx.stroke(); }
  // evidence markers
  const markers = [
    [80, 80, 'E-001'], [200, 120, 'E-002'], [340, 60, 'E-003'],
    [420, 160, 'E-004'], [130, 190, 'E-005'],
  ];
  markers.forEach(([x, y, lbl]) => {
    ctx.strokeStyle = '#7df9ff'; ctx.lineWidth = 1.2;
    ctx.strokeRect(Number(x) - 12, Number(y) - 12, 24, 24);
    ctx.fillStyle = '#7df9ff'; ctx.font = '8px monospace';
    ctx.fillText(String(lbl), Number(x) - 10, Number(y) + 20);
  });
  // fingerprint smudge
  ctx.strokeStyle = 'rgba(200,100,255,0.35)'; ctx.lineWidth = 0.5;
  for (let r = 4; r <= 20; r += 4) {
    ctx.beginPath(); ctx.arc(260, 130, r, 0, Math.PI * 2); ctx.stroke();
  }
  return new THREE.CanvasTexture(c);
}

// ─── UV Lamp rig ──────────────────────────────────────────────────────────────
function UVLampRig({ y, z }: { y: number; z: number }) {
  const armRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (armRef.current) {
      armRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.4) * 0.06;
    }
  });
  return (
    <group position={[0, y, z]}>
      {/* Ceiling mount */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.18, 0.12, 0.18]} />
        <meshStandardMaterial color="#1a1824" metalness={0.7} roughness={0.3} />
      </mesh>
      <group ref={armRef}>
        {/* Arm */}
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 1.0, 8]} />
          <meshStandardMaterial color="#1a1824" metalness={0.65} roughness={0.3} />
        </mesh>
        {/* Lamp head */}
        <mesh position={[0, -1.1, 0]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.6, 0.1, 0.22]} />
          <meshStandardMaterial color="#0d0b18" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* UV tube */}
        <mesh position={[0, -1.1, -0.04]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.52, 0.04, 0.06]} />
          <meshStandardMaterial
            color="#7df9ff"
            emissive={new THREE.Color('#7df9ff')}
            emissiveIntensity={2.5}
          />
        </mesh>
        <pointLight
          position={[0, -1.15, 0.1]}
          color="#7df9ff"
          intensity={2.0}
          distance={4.5}
          decay={2}
        />
      </group>
    </group>
  );
}

// ─── Examination Table ─────────────────────────────────────────────────────────
function ExaminationTable({ position }: { position: [number, number, number] }) {
  const evidTex = useMemo(() => makeEvidenceTex(), []);
  const [x, y, z] = position;
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.18 + Math.sin(clock.elapsedTime * 1.2) * 0.06;
    }
  });

  return (
    <group position={[x, y, z]}>
      {/* Table surface */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[2.4, 0.06, 1.4]} />
        <meshStandardMaterial color="#0d0b18" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Evidence grid on surface */}
      <mesh position={[0, 0.935, 0]}>
        <planeGeometry args={[2.3, 1.3]} />
        <meshStandardMaterial map={evidTex} transparent opacity={0.9} roughness={0.8} />
      </mesh>
      {/* Under-table UV glow panel */}
      <mesh ref={glowRef} position={[0, 0.5, 0]}>
        <boxGeometry args={[2.2, 0.02, 1.2]} />
        <meshStandardMaterial
          color="#7df9ff"
          emissive={new THREE.Color('#7df9ff')}
          emissiveIntensity={0.18}
          transparent
          opacity={0.6}
        />
      </mesh>
      <pointLight position={[0, 0.5, 0]} color="#7df9ff" intensity={0.6} distance={3} decay={2} />
      {/* Legs */}
      {([-1.1, 1.1] as number[]).map((lx, i) =>
        ([-0.6, 0.6] as number[]).map((lz, j) => (
          <mesh key={`${i}_${j}`} position={[lx, 0.45, lz]}>
            <boxGeometry args={[0.06, 0.9, 0.06]} />
            <meshStandardMaterial color="#1a1824" metalness={0.7} roughness={0.25} />
          </mesh>
        ))
      )}
    </group>
  );
}

// ─── SHAP readout screen ──────────────────────────────────────────────────────
function SHAPScreen({ position }: { position: [number, number, number] }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 160;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#060410';
    ctx.fillRect(0, 0, 256, 160);
    ctx.strokeStyle = 'rgba(125,249,255,0.12)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 256; i += 20) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,160); ctx.stroke(); }
    for (let i = 0; i <= 160; i += 20) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(256,i); ctx.stroke(); }
    // bar chart
    const bars = [0.85, 0.62, 0.44, 0.38, 0.29, 0.21, 0.15, 0.09];
    const labels = ['velocity','frequency','amount','location','device','time','merchant','network'];
    bars.forEach((v, i) => {
      const w = v * 150;
      const cy = 18 + i * 17;
      ctx.fillStyle = `rgba(125,249,255,${0.25 + v * 0.5})`;
      ctx.fillRect(60, cy - 5, w, 9);
      ctx.fillStyle = '#7df9ff'; ctx.font = '7px monospace';
      ctx.fillText(labels[i], 2, cy + 3);
      ctx.fillText(v.toFixed(2), 215, cy + 3);
    });
    ctx.fillStyle = '#7df9ff'; ctx.font = 'bold 8px monospace';
    ctx.fillText('SHAP FEATURE IMPORTANCE', 4, 155);
    return new THREE.CanvasTexture(c);
  }, []);

  return (
    <mesh position={position}>
      <planeGeometry args={[2.2, 1.4]} />
      <meshStandardMaterial
        map={tex}
        emissive={new THREE.Color('#7df9ff')}
        emissiveMap={tex}
        emissiveIntensity={0.3}
        roughness={0.5}
      />
    </mesh>
  );
}

// ─── UV Wall Strip ─────────────────────────────────────────────────────────────
function UVStrip({ position, label }: { position: [number,number,number]; label: string }) {
  const tex = useMemo(() => makeUVStripTex(label), [label]);
  return (
    <mesh position={position}>
      <planeGeometry args={[1.8, 0.18]} />
      <meshStandardMaterial
        map={tex}
        emissive={new THREE.Color('#7df9ff')}
        emissiveMap={tex}
        emissiveIntensity={0.8}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

// ─── Risk Lab Floor ───────────────────────────────────────────────────────────
function UVFloor() {
  const mat = useRiskLabUVReveal();
  return (
    <mesh position={[0, RISK_FY, RZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[RW, RD, 1, 1]} />
      <primitive object={mat} />
    </mesh>
  );
}

export default function RiskLabFloor() {
  return (
    <group>
      {/* UV-reveal floor — hover cursor to expose hidden evidence */}
      <UVFloor />
      {/* Floor UV grid lines */}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={`fg${i}`} position={[-RW/2 + (i+1) * RW/8, RISK_FY + 0.005, RZ]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[0.012, RD]} />
          <meshStandardMaterial color="#7df9ff" emissive={new THREE.Color('#7df9ff')} emissiveIntensity={0.4} transparent opacity={0.25} />
        </mesh>
      ))}

      {/* Walls — near-black */}
      <mesh position={[0, RISK_FY + RH/2, RZ - RD/2]}>
        <boxGeometry args={[RW, RH, 0.24]} />
        <meshStandardMaterial color="#0d0b18" roughness={0.82} />
      </mesh>
      <mesh position={[-RW/2, RISK_FY + RH/2, RZ]}>
        <boxGeometry args={[0.24, RH, RD]} />
        <meshStandardMaterial color="#0d0b18" roughness={0.82} />
      </mesh>
      <mesh position={[RW/2, RISK_FY + RH/2, RZ]}>
        <boxGeometry args={[0.24, RH, RD]} />
        <meshStandardMaterial color="#0d0b18" roughness={0.82} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, RISK_FY + RH, RZ]}>
        <boxGeometry args={[RW, 0.24, RD]} />
        <meshStandardMaterial color="#080612" roughness={0.9} />
      </mesh>

      {/* UV ceiling tube strips */}
      {([-2.5, 0, 2.5] as number[]).map((x, i) => (
        <group key={i}>
          <mesh position={[x, RISK_FY + RH - 0.04, RZ]}>
            <boxGeometry args={[0.08, 0.06, RD * 0.7]} />
            <meshStandardMaterial
              color="#7df9ff"
              emissive={new THREE.Color('#7df9ff')}
              emissiveIntensity={1.8}
            />
          </mesh>
          <pointLight position={[x, RISK_FY + RH - 0.2, RZ]} color="#7df9ff" intensity={0.5} distance={14} decay={1.2} />
        </group>
      ))}

      {/* UV lamp rig over examination table */}
      <UVLampRig y={RISK_FY + RH - 0.12} z={RZ + 3} />

      {/* Examination tables */}
      <ExaminationTable position={[0, RISK_FY, RZ + 3]} />
      <ExaminationTable position={[-2.5, RISK_FY, RZ - 3]} />

      {/* SHAP readout screens */}
      <SHAPScreen position={[RW/2 - 0.14, RISK_FY + 3.5, RZ + 2]} />
      <SHAPScreen position={[RW/2 - 0.14, RISK_FY + 3.5, RZ - 5]} />

      {/* UV wall strips */}
      <UVStrip position={[-RW/2 + 0.14, RISK_FY + 1.8, RZ - 8]} label="EVIDENCE SEALED — VERITA v2.1" />
      <UVStrip position={[-RW/2 + 0.14, RISK_FY + 1.5, RZ - 4]} label="CHAIN HEAD: 0xA8F2C3D1" />
      <UVStrip position={[-RW/2 + 0.14, RISK_FY + 1.5, RZ + 2]} label="RISK SCORE: 0.847 / FLAGGED" />

      {/* Reagent cabinet */}
      <mesh position={[-RW/2 + 0.38, RISK_FY + 1.0, RZ - 9]}>
        <boxGeometry args={[0.6, 2.0, 1.0]} />
        <meshStandardMaterial color="#0d0b18" metalness={0.4} roughness={0.65} />
      </mesh>
      {Array.from({ length: 3 }, (_, i) => (
        <mesh key={i} position={[-RW/2 + 0.38, RISK_FY + 0.38 + i * 0.6, RZ - 9 + 0.51]}>
          <boxGeometry args={[0.55, 0.08, 0.04]} />
          <meshStandardMaterial color="#1a1830" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}

      {/* Ambient UV atmosphere */}
      <ambientLight color="#1a0a30" intensity={0.4} />
      <pointLight position={[0, RISK_FY + 4, RZ]} color="#3a1a70" intensity={0.8} distance={12} decay={1.5} />
      <pointLight position={[0, RISK_FY + 0.5, RZ - 3]} color="#7df9ff" intensity={0.5} distance={8} decay={2} />
    </group>
  );
}
