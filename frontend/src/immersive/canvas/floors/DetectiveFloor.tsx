import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const DETECTIVE_FY = 26.5;
const RW = 9.8, RH = 9, RD = 24, RZ = -30;

// ─── Cork board texture ───────────────────────────────────────────────────────
function makeCorkBoardTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 384;
  const ctx = c.getContext('2d')!;
  // Cork base
  ctx.fillStyle = '#a8855a';
  ctx.fillRect(0, 0, 512, 384);
  // Cork grain
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 512, y = Math.random() * 384;
    const r = Math.random() * 3 + 1;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${100 + Math.random()*60},${60 + Math.random()*40},${20 + Math.random()*30},0.3)`;
    ctx.fill();
  }
  // Evidence cards
  const cards = [
    { x: 40, y: 30, w: 110, h: 80, color: '#f3eee2', title: 'SUSPECT A', lines: 4 },
    { x: 180, y: 50, w: 110, h: 80, color: '#f3eee2', title: 'TRANSACTION', lines: 5 },
    { x: 330, y: 20, w: 110, h: 80, color: '#ffe8d0', title: 'ENTITY MAP', lines: 3 },
    { x: 60, y: 160, w: 110, h: 80, color: '#f3eee2', title: 'SAR #0042', lines: 4 },
    { x: 220, y: 180, w: 110, h: 80, color: '#ffe8d0', title: 'FLAGGED', lines: 3 },
    { x: 380, y: 150, w: 100, h: 60, color: '#f3eee2', title: 'CHAIN', lines: 3 },
    { x: 80, y: 280, w: 110, h: 80, color: '#f3eee2', title: 'EVIDENCE', lines: 4 },
    { x: 260, y: 290, w: 110, h: 70, color: '#ffe8d0', title: 'AML REF', lines: 3 },
  ];
  cards.forEach(({ x, y, w, h, color, title, lines }) => {
    // Card shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x + 3, y + 3, w, h);
    // Card body
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    // Pin
    ctx.beginPath(); ctx.arc(x + w/2, y + 4, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#c2331f'; ctx.fill();
    // Title
    ctx.fillStyle = '#14120b';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(title, x + 5, y + 18);
    // Lines
    for (let l = 0; l < lines; l++) {
      ctx.fillStyle = 'rgba(20,18,11,0.2)';
      ctx.fillRect(x + 5, y + 24 + l * 11, w - 10, 2);
    }
  });
  // Connection strings
  const pairs = [[0,1],[1,2],[0,3],[2,4],[3,4],[4,5],[5,7]];
  ctx.strokeStyle = 'rgba(194,51,31,0.65)'; ctx.lineWidth = 1.2;
  const centres = cards.map(({x,y,w,h}) => [x+w/2, y+h/2]);
  pairs.forEach(([a,b]) => {
    ctx.beginPath();
    ctx.moveTo(centres[a][0], centres[a][1]);
    ctx.lineTo(centres[b][0], centres[b][1]);
    ctx.stroke();
  });
  return new THREE.CanvasTexture(c);
}

// ─── Noir photograph texture ──────────────────────────────────────────────────
function makePhotographTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#c8c0b0';
  ctx.fillRect(0, 0, 128, 96);
  ctx.fillStyle = '#888070';
  ctx.fillRect(8, 8, 112, 72);
  // silhouette
  ctx.fillStyle = '#444038';
  ctx.fillRect(40, 20, 48, 48);
  ctx.beginPath(); ctx.arc(64, 20, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1208'; ctx.font = '7px monospace';
  ctx.fillText('EXHIBIT A', 30, 90);
  return new THREE.CanvasTexture(c);
}

// ─── Detective desk ───────────────────────────────────────────────────────────
function DetectiveDesk({ position }: { position: [number,number,number] }) {
  const photoTex = useMemo(() => makePhotographTex(), []);
  const [x, y, z] = position;
  return (
    <group position={[x, y, z]}>
      {/* Desk body */}
      <mesh position={[0, 0.72, 0]} castShadow>
        <boxGeometry args={[2.2, 1.44, 1.1]} />
        <meshStandardMaterial color="#3a2410" roughness={0.7} metalness={0.08} />
      </mesh>
      {/* Desk top */}
      <mesh position={[0, 1.45, 0]}>
        <boxGeometry args={[2.2, 0.06, 1.1]} />
        <meshStandardMaterial color="#4a3218" roughness={0.58} metalness={0.05} />
      </mesh>
      {/* Leather desk pad */}
      <mesh position={[0, 1.52, 0]}>
        <planeGeometry args={[1.6, 0.8]} />
        <meshStandardMaterial color="#2a1e10" roughness={0.75} />
      </mesh>
      {/* Case files stack */}
      {Array.from({ length: 4 }, (_, i) => (
        <mesh key={i} position={[0.65 + i * 0.028, 1.5 + i * 0.024, -0.2]}>
          <boxGeometry args={[0.48, 0.024, 0.62]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#f0e4c8' : '#e0d4b4'} roughness={0.9} />
        </mesh>
      ))}
      {/* Photograph */}
      <mesh position={[-0.55, 1.52, 0.15]} rotation={[-Math.PI/2, 0, 0.3]}>
        <planeGeometry args={[0.32, 0.24]} />
        <meshStandardMaterial map={photoTex} roughness={0.85} />
      </mesh>
      {/* Magnifying glass */}
      <mesh position={[-0.2, 1.54, -0.15]} rotation={[-Math.PI/2, 0, 0.5]}>
        <torusGeometry args={[0.09, 0.015, 6, 16]} />
        <meshStandardMaterial color="#a8842c" metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[-0.2, 1.54, -0.15]} rotation={[-Math.PI/2, 0, 0]}>
        <circleGeometry args={[0.085, 12]} />
        <meshStandardMaterial color="#c8e0f0" transparent opacity={0.35} roughness={0.1} />
      </mesh>
      {/* Desk lamp */}
      <group position={[0.8, 1.46, 0.3]}>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
          <meshStandardMaterial color="#2a2318" metalness={0.7} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.65, 0.08]} rotation={[0.5, 0, 0]}>
          <coneGeometry args={[0.15, 0.25, 8, 1, true]} />
          <meshStandardMaterial color="#c8a840" metalness={0.6} roughness={0.3} side={THREE.BackSide} />
        </mesh>
        <pointLight position={[0, 0.5, 0.1]} color="#ffd080" intensity={1.2} distance={4} decay={2} />
      </group>
    </group>
  );
}

// ─── Filing cabinet ───────────────────────────────────────────────────────────
function FilingCabinet({ position }: { position: [number,number,number] }) {
  const [x, y, z] = position;
  return (
    <group position={[x, y, z]}>
      {/* Cabinet body */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[0.55, 1.6, 0.65]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.45} roughness={0.6} />
      </mesh>
      {/* 3 drawer fronts */}
      {Array.from({ length: 3 }, (_, i) => (
        <group key={i}>
          <mesh position={[0, 1.38 - i * 0.46, 0.33]}>
            <boxGeometry args={[0.5, 0.42, 0.04]} />
            <meshStandardMaterial color="#333" metalness={0.5} roughness={0.55} />
          </mesh>
          {/* Handle */}
          <mesh position={[0, 1.38 - i * 0.46, 0.36]}>
            <boxGeometry args={[0.18, 0.03, 0.025]} />
            <meshStandardMaterial color="#a8842c" metalness={0.7} roughness={0.2} />
          </mesh>
          {/* Label slot */}
          <mesh position={[0, 1.28 - i * 0.46, 0.35]}>
            <boxGeometry args={[0.2, 0.06, 0.01]} />
            <meshStandardMaterial color="#f0e8d0" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Pendant lamp ─────────────────────────────────────────────────────────────
function PendantLamp({ x, z, ceilY }: { x: number; z: number; ceilY: number }) {
  const bulbRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (bulbRef.current) {
      const mat = bulbRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 2.8 + Math.sin(clock.elapsedTime * 2.3) * 0.15;
    }
  });
  return (
    <group position={[x, ceilY, z]}>
      <mesh position={[0, -0.08, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.4, 6]} />
        <meshStandardMaterial color="#2a2318" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.9, 0]}>
        <coneGeometry args={[0.22, 0.35, 10, 1, true]} />
        <meshStandardMaterial color="#c8a020" metalness={0.55} roughness={0.35} side={THREE.BackSide} />
      </mesh>
      <mesh ref={bulbRef} position={[0, -0.82, 0]}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial color="#ffe8a0" emissive={new THREE.Color('#ffd060')} emissiveIntensity={2.8} />
      </mesh>
      <pointLight position={[0, -0.9, 0]} color="#ffd090" intensity={1.5} distance={6} decay={2} castShadow />
    </group>
  );
}

// ─── Detective Floor ──────────────────────────────────────────────────────────
export default function DetectiveFloor() {
  const corkTex = useMemo(() => makeCorkBoardTex(), []);

  return (
    <group>
      {/* Dark wood plank floor */}
      <mesh position={[0, DETECTIVE_FY, RZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[RW, RD]} />
        <meshStandardMaterial color="#2a1a0c" roughness={0.72} metalness={0.04} />
      </mesh>
      {/* Plank seams */}
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[0, DETECTIVE_FY + 0.005, RZ - RD/2 + (i+1) * RD/13]}>
          <boxGeometry args={[RW, 0.008, 0.014]} />
          <meshStandardMaterial color="#1a0e06" roughness={0.9} />
        </mesh>
      ))}

      {/* Walls — amber tobacco */}
      <mesh position={[0, DETECTIVE_FY + RH/2, RZ - RD/2]}>
        <boxGeometry args={[RW, RH, 0.24]} />
        <meshStandardMaterial color="#3a2810" roughness={0.85} />
      </mesh>
      <mesh position={[-RW/2, DETECTIVE_FY + RH/2, RZ]}>
        <boxGeometry args={[0.24, RH, RD]} />
        <meshStandardMaterial color="#382610" roughness={0.85} />
      </mesh>
      <mesh position={[RW/2, DETECTIVE_FY + RH/2, RZ]}>
        <boxGeometry args={[0.24, RH, RD]} />
        <meshStandardMaterial color="#382610" roughness={0.85} />
      </mesh>
      {/* Ceiling — dark timber */}
      <mesh position={[0, DETECTIVE_FY + RH, RZ]}>
        <boxGeometry args={[RW, 0.24, RD]} />
        <meshStandardMaterial color="#2a1e0e" roughness={0.88} />
      </mesh>
      {/* Ceiling beams */}
      {Array.from({ length: 4 }, (_, i) => (
        <mesh key={i} position={[0, DETECTIVE_FY + RH - 0.04, RZ - RD/2 + (i+1) * RD/5]}>
          <boxGeometry args={[RW, 0.28, 0.22]} />
          <meshStandardMaterial color="#1e1408" roughness={0.82} />
        </mesh>
      ))}

      {/* Cork board on back wall */}
      <mesh position={[-1.5, DETECTIVE_FY + 3.8, RZ - RD/2 + 0.16]}>
        <boxGeometry args={[3.8, 3.0, 0.08]} />
        <meshStandardMaterial color="#7a5530" roughness={0.9} />
      </mesh>
      <mesh position={[-1.5, DETECTIVE_FY + 3.8, RZ - RD/2 + 0.21]}>
        <planeGeometry args={[3.6, 2.8]} />
        <meshStandardMaterial map={corkTex} roughness={0.92} />
      </mesh>
      {/* Cork board frame */}
      {([[-1.9, 0.08, 3.0], [3.8, 0.08, -0.04]] as number[][]).map((_, fi) => (
        <mesh
          key={fi}
          position={[
            -1.5 + (fi === 0 ? 0 : 0),
            DETECTIVE_FY + 3.8 + (fi === 0 ? 0 : 0),
            RZ - RD/2 + 0.14,
          ]}
        >
          <boxGeometry args={fi === 0 ? [0.08, 3.0, 0.1] : [3.8, 0.08, 0.1]} />
          <meshStandardMaterial color="#2a1a08" roughness={0.8} />
        </mesh>
      ))}

      {/* Detective desk */}
      <DetectiveDesk position={[0.8, DETECTIVE_FY, RZ + 5]} />

      {/* Filing cabinets */}
      <FilingCabinet position={[-RW/2 + 0.45, DETECTIVE_FY, RZ + 7]} />
      <FilingCabinet position={[-RW/2 + 1.1, DETECTIVE_FY, RZ + 7]} />

      {/* Map table */}
      <mesh position={[2.5, DETECTIVE_FY + 0.76, RZ - 4]} castShadow>
        <boxGeometry args={[2.0, 1.52, 1.3]} />
        <meshStandardMaterial color="#2a1a0c" roughness={0.7} />
      </mesh>
      <mesh position={[2.5, DETECTIVE_FY + 1.52, RZ - 4]}>
        <boxGeometry args={[2.0, 0.04, 1.3]} />
        <meshStandardMaterial color="#e4d8b4" roughness={0.8} />
      </mesh>

      {/* Pendant lamps */}
      <PendantLamp x={-0.5} z={RZ + 5} ceilY={DETECTIVE_FY + RH - 0.12} />
      <PendantLamp x={2.0} z={RZ - 5} ceilY={DETECTIVE_FY + RH - 0.12} />

      {/* Wall sconces */}
      {([[RW/2 - 0.22, DETECTIVE_FY + 2.8, RZ - 4, Math.PI],
         [-RW/2 + 0.22, DETECTIVE_FY + 2.8, RZ + 2, 0]] as [number,number,number,number][]).map(([x,y,z2,ry],i) => (
        <group key={i} position={[x, y, z2]} rotation={[0, ry, 0]}>
          <mesh>
            <boxGeometry args={[0.06, 0.3, 0.18]} />
            <meshStandardMaterial color="#1a1208" roughness={0.8} />
          </mesh>
          <mesh position={[0.22, 0, 0]}>
            <sphereGeometry args={[0.07, 8, 6]} />
            <meshStandardMaterial color="#ffe8a0" emissive={new THREE.Color('#ffd060')} emissiveIntensity={2.5} />
          </mesh>
          <pointLight position={[0.22, 0, 0]} color="#ffb060" intensity={0.7} distance={4.5} decay={2} />
        </group>
      ))}

      {/* Evidence boxes on floor */}
      {([[-3.2, 0.2, RZ-7],[-3.2, 0.48, RZ-7],[-2.7, 0.2, RZ-7]] as [number,number,number][]).map(([bx,by,bz],i) => (
        <mesh key={i} position={[bx, DETECTIVE_FY + by, bz]} castShadow>
          <boxGeometry args={[0.42, 0.28, 0.32]} />
          <meshStandardMaterial color={i === 1 ? '#c84820' : '#a87040'} roughness={0.85} />
        </mesh>
      ))}

      {/* Ambient warm */}
      <ambientLight color="#4a2e10" intensity={0.45} />
      <pointLight position={[0, DETECTIVE_FY + 6, RZ]} color="#ffa840" intensity={0.9} distance={18} decay={1.5} />
    </group>
  );
}
