import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const VAULT_FY = 38.5;
const RW = 9.8, RH = 9, RD = 24, RZ = -30;

// ─── Record box label texture ─────────────────────────────────────────────────
function makeBoxLabelTex(code: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#e8dcc8';
  ctx.fillRect(0, 0, 128, 64);
  ctx.strokeStyle = '#c2331f'; ctx.lineWidth = 1.5;
  ctx.strokeRect(3, 3, 122, 58);
  ctx.fillStyle = '#14120b'; ctx.font = 'bold 10px monospace';
  ctx.fillText('VERITA ARCHIVE', 8, 17);
  ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(20,18,11,0.55)';
  ctx.fillText(code, 8, 30);
  ctx.fillText('SEALED — DO NOT OPEN', 8, 43);
  ctx.fillStyle = '#1c6e4a'; ctx.font = 'bold 7.5px monospace';
  ctx.fillText('CHAIN VERIFIED ✓', 8, 57);
  return new THREE.CanvasTexture(c);
}

// ─── Archive shelf unit ───────────────────────────────────────────────────────
function ArchiveShelf({
  position,
  startCode,
}: {
  position: [number, number, number];
  startCode: number;
}) {
  const [x, y, z] = position;
  const SHELVES = 5;
  const SHELF_H = RH * 0.16;
  const boxLabels = useMemo(
    () => Array.from({ length: SHELVES * 4 }, (_, i) =>
      makeBoxLabelTex(`ARCH-${String(startCode + i).padStart(4, '0')}`)
    ),
    [startCode]
  );

  return (
    <group position={[x, y, z]}>
      {/* Back panel */}
      <mesh position={[0, RH * 0.4, 0]}>
        <boxGeometry args={[2.0, RH * 0.8, 0.06]} />
        <meshStandardMaterial color="#1a1510" roughness={0.82} />
      </mesh>
      {/* Side panels */}
      {([-0.98, 0.98] as number[]).map((sx, si) => (
        <mesh key={si} position={[sx, RH * 0.4, 0.35]}>
          <boxGeometry args={[0.06, RH * 0.8, 0.76]} />
          <meshStandardMaterial color="#1a1510" roughness={0.82} />
        </mesh>
      ))}
      {/* Shelf boards */}
      {Array.from({ length: SHELVES }, (_, i) => (
        <mesh key={i} position={[0, 0.08 + i * SHELF_H, 0.35]}>
          <boxGeometry args={[1.96, 0.06, 0.72]} />
          <meshStandardMaterial color="#241a10" roughness={0.78} metalness={0.06} />
        </mesh>
      ))}
      {/* Boxes on each shelf */}
      {Array.from({ length: SHELVES }, (_, s) =>
        Array.from({ length: 4 }, (_, b) => {
          const idx = s * 4 + b;
          const boxH = SHELF_H * 0.7;
          const boxW = 1.88 / 4;
          return (
            <group key={`s${s}_b${b}`} position={[-0.84 + b * boxW, 0.08 + s * SHELF_H + boxH/2, 0.35]}>
              <mesh castShadow>
                <boxGeometry args={[boxW - 0.03, boxH, 0.65]} />
                <meshStandardMaterial
                  color={idx % 3 === 0 ? '#2a1e14' : idx % 3 === 1 ? '#1e1a14' : '#241e18'}
                  roughness={0.85}
                />
              </mesh>
              {/* Label */}
              <mesh position={[0, 0, 0.33]}>
                <planeGeometry args={[boxW - 0.06, boxH * 0.55]} />
                <meshStandardMaterial map={boxLabels[idx]} roughness={0.9} />
              </mesh>
              {/* Gold seal dot */}
              <mesh position={[0, boxH * 0.3, 0.34]}>
                <circleGeometry args={[0.025, 8]} />
                <meshStandardMaterial
                  color="#a8842c"
                  emissive={new THREE.Color('#a8842c')}
                  emissiveIntensity={0.5}
                  metalness={0.7}
                  roughness={0.2}
                />
              </mesh>
            </group>
          );
        })
      )}
    </group>
  );
}

// ─── Vault door ────────────────────────────────────────────────────────────────
function VaultDoor({ position }: { position: [number, number, number] }) {
  const [x, y, z] = position;
  return (
    <group position={[x, y, z]}>
      {/* Door frame */}
      <mesh position={[0, 1.9, 0]}>
        <boxGeometry args={[2.8, 4.2, 0.38]} />
        <meshStandardMaterial color="#1a1510" metalness={0.55} roughness={0.5} />
      </mesh>
      {/* Door opening (dark void) */}
      <mesh position={[0, 1.9, 0.04]}>
        <boxGeometry args={[2.2, 3.6, 0.38]} />
        <meshStandardMaterial color="#080604" roughness={1} />
      </mesh>
      {/* Door slab — slightly ajar (angled) */}
      <group rotation={[0, -0.3, 0]} position={[-1.1, 0, 0.22]}>
        <mesh position={[0, 1.9, 0]} castShadow>
          <boxGeometry args={[2.2, 3.6, 0.42]} />
          <meshStandardMaterial color="#1e1c18" metalness={0.65} roughness={0.38} />
        </mesh>
        {/* Locking bolts */}
        {Array.from({ length: 4 }, (_, i) => (
          <mesh key={i} position={[1.05, 0.6 + i * 0.8, 0.22]}>
            <cylinderGeometry args={[0.06, 0.06, 0.36, 8]} />
            <meshStandardMaterial color="#a8842c" metalness={0.72} roughness={0.22} emissive={new THREE.Color('#a8842c')} emissiveIntensity={0.2} />
          </mesh>
        ))}
        {/* Dial */}
        <mesh position={[0.2, 1.9, 0.22]}>
          <cylinderGeometry args={[0.28, 0.28, 0.1, 16]} />
          <meshStandardMaterial color="#a8842c" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[0.2, 1.9, 0.27]}>
          <torusGeometry args={[0.2, 0.03, 6, 20]} />
          <meshStandardMaterial color="#888060" metalness={0.65} roughness={0.3} />
        </mesh>
      </group>
      {/* Gold trim on frame */}
      <mesh position={[0, 1.9, -0.14]}>
        <boxGeometry args={[2.8, 0.08, 0.44]} />
        <meshStandardMaterial color="#a8842c" metalness={0.68} roughness={0.25} />
      </mesh>
      <mesh position={[0, 3.88, -0.14]}>
        <boxGeometry args={[2.8, 0.08, 0.44]} />
        <meshStandardMaterial color="#a8842c" metalness={0.68} roughness={0.25} />
      </mesh>
    </group>
  );
}

// ─── Torch sconce ─────────────────────────────────────────────────────────────
function TorchSconce({ position, flipX = false }: { position: [number,number,number]; flipX?: boolean }) {
  const flameRef = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (!flameRef.current) return;
    const t = clock.elapsedTime;
    flameRef.current.intensity = 0.9 + Math.sin(t * 7.3) * 0.18 + Math.sin(t * 13.1) * 0.1;
    flameRef.current.position.x = Math.sin(t * 9.7) * 0.03;
    flameRef.current.position.z = Math.cos(t * 8.1) * 0.02;
  });
  const [px, py, pz] = position;
  const sx = flipX ? -1 : 1;
  return (
    <group position={[px, py, pz]}>
      {/* Wall bracket */}
      <mesh position={[sx * 0.12, 0, 0]}>
        <boxGeometry args={[0.08, 0.38, 0.14]} />
        <meshStandardMaterial color="#2a2010" metalness={0.55} roughness={0.6} />
      </mesh>
      {/* Arm */}
      <mesh position={[sx * 0.22, 0, 0]} rotation={[0, 0, sx * 0.3]}>
        <cylinderGeometry args={[0.022, 0.022, 0.3, 6]} />
        <meshStandardMaterial color="#a8842c" metalness={0.65} roughness={0.28} />
      </mesh>
      {/* Bowl */}
      <mesh position={[sx * 0.34, -0.04, 0]}>
        <cylinderGeometry args={[0.08, 0.05, 0.12, 10, 1, true]} />
        <meshStandardMaterial color="#2a2010" metalness={0.5} roughness={0.6} />
      </mesh>
      {/* Flame */}
      <mesh position={[sx * 0.34, 0.08, 0]}>
        <coneGeometry args={[0.05, 0.16, 6]} />
        <meshStandardMaterial
          color="#ff8020"
          emissive={new THREE.Color('#ff6010')}
          emissiveIntensity={2.8}
          transparent opacity={0.8}
        />
      </mesh>
      <pointLight ref={flameRef} position={[sx * 0.34, 0.1, 0]} color="#ff8020" intensity={0.9} distance={5} decay={2} />
    </group>
  );
}

// ─── Hash chain ceiling links ─────────────────────────────────────────────────
function CeilingChain({ y, z }: { y: number; z: number }) {
  const linksRef = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    linksRef.current.forEach((m, i) => {
      if (m) m.rotation.z = clock.elapsedTime * 0.15 + i * 0.4;
    });
  });
  const LINKS = 14;
  return (
    <group>
      {Array.from({ length: LINKS }, (_, i) => {
        const x = -RW * 0.38 + i * (RW * 0.76 / (LINKS - 1));
        return (
          <mesh
            key={i}
            ref={el => { linksRef.current[i] = el; }}
            position={[x, y, z]}
          >
            <torusGeometry args={[0.14, 0.035, 6, 16]} />
            <meshStandardMaterial
              color="#a8842c"
              metalness={0.72}
              roughness={0.2}
              emissive={new THREE.Color('#a8842c')}
              emissiveIntensity={0.4}
            />
          </mesh>
        );
      })}
      {/* Chain bar */}
      <mesh position={[0, y, z]}>
        <cylinderGeometry args={[0.02, 0.02, RW * 0.76, 6]} rotation-z={Math.PI / 2} />
        <meshStandardMaterial color="#8a6820" metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}

// ─── Vault Floor ──────────────────────────────────────────────────────────────
export default function VaultFloor() {
  return (
    <group>
      {/* Dark stone floor */}
      <mesh position={[0, VAULT_FY, RZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[RW, RD]} />
        <meshStandardMaterial color="#111009" roughness={0.78} metalness={0.1} />
      </mesh>
      {/* Stone tile joints */}
      {Array.from({ length: 5 }, (_, r) =>
        Array.from({ length: 3 }, (_, c) => (
          <mesh key={`t${r}_${c}`} position={[-RW/2 + (c+1) * RW/4, VAULT_FY + 0.004, RZ - RD/2 + (r+1) * RD/6]}>
            <planeGeometry args={[RW/4, 0.012]} />
            <meshStandardMaterial color="#0a0806" roughness={0.9} />
          </mesh>
        ))
      )}

      {/* Walls — dark charcoal stone */}
      <mesh position={[0, VAULT_FY + RH/2, RZ - RD/2]}>
        <boxGeometry args={[RW, RH, 0.28]} />
        <meshStandardMaterial color="#111009" roughness={0.85} />
      </mesh>
      <mesh position={[-RW/2, VAULT_FY + RH/2, RZ]}>
        <boxGeometry args={[0.28, RH, RD]} />
        <meshStandardMaterial color="#111009" roughness={0.85} />
      </mesh>
      <mesh position={[RW/2, VAULT_FY + RH/2, RZ]}>
        <boxGeometry args={[0.28, RH, RD]} />
        <meshStandardMaterial color="#111009" roughness={0.85} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, VAULT_FY + RH, RZ]}>
        <boxGeometry args={[RW, 0.3, RD]} />
        <meshStandardMaterial color="#0e0c08" roughness={0.9} />
      </mesh>

      {/* Stone arch ribs along ceiling */}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[0, VAULT_FY + RH - 0.04, RZ - RD/2 + (i+1) * RD/6]}>
          <boxGeometry args={[RW, 0.22, 0.18]} />
          <meshStandardMaterial color="#0e0c08" roughness={0.88} />
        </mesh>
      ))}

      {/* Archive shelves — back wall + sides */}
      <ArchiveShelf position={[-3.6, VAULT_FY, RZ - 10.5]} startCode={1000} />
      <ArchiveShelf position={[-1.4, VAULT_FY, RZ - 10.5]} startCode={1020} />
      <ArchiveShelf position={[ 0.8, VAULT_FY, RZ - 10.5]} startCode={1040} />
      <ArchiveShelf position={[ 3.0, VAULT_FY, RZ - 10.5]} startCode={1060} />

      {/* Vault door on left wall */}
      <group rotation={[0, Math.PI / 2, 0]} position={[-RW/2 + 0.4, VAULT_FY, RZ + 7]}>
        <VaultDoor position={[0, 0, 0]} />
      </group>

      {/* Central examination table */}
      <mesh position={[1.5, VAULT_FY + 0.76, RZ + 4]} castShadow>
        <boxGeometry args={[2.0, 1.52, 1.1]} />
        <meshStandardMaterial color="#1a1510" roughness={0.72} metalness={0.15} />
      </mesh>
      <mesh position={[1.5, VAULT_FY + 1.52, RZ + 4]}>
        <boxGeometry args={[2.0, 0.06, 1.1]} />
        <meshStandardMaterial color="#2a2018" roughness={0.55} metalness={0.25} />
      </mesh>
      {/* Open record box on table */}
      <mesh position={[1.5, VAULT_FY + 1.6, RZ + 4.1]}>
        <boxGeometry args={[0.44, 0.26, 0.34]} />
        <meshStandardMaterial color="#2a1e14" roughness={0.85} />
      </mesh>
      <mesh position={[1.8, VAULT_FY + 1.65, RZ + 3.8]} rotation={[0.4, 0.3, 0]}>
        <boxGeometry args={[0.36, 0.005, 0.48]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.9} />
      </mesh>

      {/* Hash chain along ceiling */}
      <CeilingChain y={VAULT_FY + RH - 0.22} z={RZ} />
      <CeilingChain y={VAULT_FY + RH - 0.22} z={RZ + 6} />

      {/* Torch sconces */}
      <TorchSconce position={[-RW/2 + 0.22, VAULT_FY + 3.0, RZ - 2]} />
      <TorchSconce position={[ RW/2 - 0.22, VAULT_FY + 3.0, RZ - 2]} flipX />
      <TorchSconce position={[-RW/2 + 0.22, VAULT_FY + 3.0, RZ + 6]} />
      <TorchSconce position={[ RW/2 - 0.22, VAULT_FY + 3.0, RZ + 6]} flipX />

      {/* SEALED banner on back wall */}
      <mesh position={[0, VAULT_FY + 6.5, RZ - RD/2 + 0.15]}>
        <boxGeometry args={[3.2, 0.6, 0.06]} />
        <meshStandardMaterial color="#2a1e10" roughness={0.8} />
      </mesh>
      <mesh position={[0, VAULT_FY + 6.5, RZ - RD/2 + 0.18]}>
        <boxGeometry args={[3.1, 0.5, 0.02]} />
        <meshStandardMaterial color="#a8842c" emissive={new THREE.Color('#a8842c')} emissiveIntensity={0.35} metalness={0.65} roughness={0.22} />
      </mesh>

      {/* Ambient — very low */}
      <ambientLight color="#1a1208" intensity={0.3} />
      <pointLight position={[0, VAULT_FY + 5, RZ - 4]} color="#a86820" intensity={0.8} distance={14} decay={1.8} />
      <pointLight position={[1.5, VAULT_FY + 1.8, RZ + 4]} color="#a8842c" intensity={0.6} distance={5} decay={2} />
    </group>
  );
}
