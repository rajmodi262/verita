import { useMemo } from 'react';
import * as THREE from 'three';

// ─── Shared materials ────────────────────────────────────────────────────────
const STONE = new THREE.MeshStandardMaterial({ color: '#f0e8d8', roughness: 0.88, metalness: 0.0 });
const STONE_DEEP = new THREE.MeshStandardMaterial({ color: '#e8dcc8', roughness: 0.90, metalness: 0.0 });
const GOLD = new THREE.MeshStandardMaterial({ color: '#a8842c', metalness: 0.72, roughness: 0.24, emissive: new THREE.Color('#a8842c'), emissiveIntensity: 0.22 });
const VERMILION = new THREE.MeshStandardMaterial({ color: '#c2331f', roughness: 0.80, metalness: 0.0 });
const WINDOW_GLOW = new THREE.MeshStandardMaterial({ color: '#ffb84d', emissive: new THREE.Color('#ff9e2c'), emissiveIntensity: 1.1, transparent: true, opacity: 0.9 });
const WINDOW_FRAME = new THREE.MeshStandardMaterial({ color: '#2a2318', roughness: 0.95 });
const DARK_ENTRANCE = new THREE.MeshStandardMaterial({ color: '#1a1510', roughness: 1.0 });

// Building dimensions
const BW = 11;    // building width
const BH = 20;    // building height
const BD = 5;     // building depth
const BZ = -22;   // building Z position

function Window({ x, y }: { x: number; y: number }) {
  return (
    <group position={[x, y, BZ - BD / 2 + 0.01]}>
      {/* Frame recess */}
      <mesh>
        <boxGeometry args={[1.3, 1.7, 0.3]} />
        <primitive object={STONE_DEEP} />
      </mesh>
      {/* Frame border */}
      <mesh position={[0, 0, 0.12]}>
        <boxGeometry args={[1.3, 1.7, 0.05]} />
        <primitive object={WINDOW_FRAME} />
      </mesh>
      {/* Glass pane — amber glow */}
      <mesh position={[0, 0, 0.17]}>
        <planeGeometry args={[0.92, 1.32]} />
        <primitive object={WINDOW_GLOW} />
      </mesh>
    </group>
  );
}

function ArtDecoCrown() {
  // Three stepped tiers narrowing as they ascend — classic art-deco crown
  return (
    <group position={[0, BH / 2 + 0.1, BZ]}>
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[BW, 1.4, BD]} />
        <primitive object={STONE} />
      </mesh>
      <mesh position={[0, 2.0, 0]}>
        <boxGeometry args={[BW * 0.82, 1.2, BD * 0.82]} />
        <primitive object={STONE} />
      </mesh>
      <mesh position={[0, 3.1, 0]}>
        <boxGeometry args={[BW * 0.60, 1.0, BD * 0.60]} />
        <primitive object={STONE} />
      </mesh>
      {/* Finial */}
      <mesh position={[0, 3.9, 0]}>
        <boxGeometry args={[0.6, 0.5, 0.6]} />
        <primitive object={GOLD} />
      </mesh>
      {/* Gold crown trim */}
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[BW + 0.1, 0.12, BD + 0.1]} />
        <primitive object={GOLD} />
      </mesh>
    </group>
  );
}

function FloorTrimBands() {
  // Gold horizontal bands at each floor level
  const ys = [-5.8, -1.6, 2.6, 6.8];
  return (
    <>
      {ys.map((y, i) => (
        <mesh key={i} position={[0, y, BZ - BD / 2 + 0.06]}>
          <boxGeometry args={[BW + 0.14, 0.2, 0.1]} />
          <primitive object={GOLD} />
        </mesh>
      ))}
    </>
  );
}

function EntrancePortico() {
  return (
    <group position={[0, -BH / 2 + 3.2, BZ - BD / 2 - 0.1]}>
      {/* Canopy slab */}
      <mesh position={[0, 1.8, -0.5]}>
        <boxGeometry args={[6.2, 0.28, 1.2]} />
        <primitive object={STONE_DEEP} />
      </mesh>
      {/* Canopy underside — dark */}
      <mesh position={[0, 1.66, -0.5]}>
        <boxGeometry args={[6.0, 0.06, 1.0]} />
        <primitive object={DARK_ENTRANCE} />
      </mesh>
      {/* Arch face — vermilion stone */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[5.8, 3.8, 0.22]} />
        <primitive object={VERMILION} />
      </mesh>
      {/* Arch opening (dark interior) */}
      <mesh position={[0, -0.3, 0.08]}>
        <boxGeometry args={[3.8, 3.2, 0.18]} />
        <primitive object={DARK_ENTRANCE} />
      </mesh>
      {/* Pilasters — left and right of arch */}
      {([-3.2, 3.2] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 0, 0.1]}>
          <boxGeometry args={[0.55, 3.8, 0.32]} />
          <primitive object={STONE} />
        </mesh>
      ))}
      {/* Steps */}
      {([0, 0.18, 0.36] as number[]).map((dz, i) => (
        <mesh key={i} position={[0, -2.2 + i * 0.12, -dz]}>
          <boxGeometry args={[6.0 + i * 0.4, 0.24, 0.9 + dz]} />
          <primitive object={STONE_DEEP} />
        </mesh>
      ))}
    </group>
  );
}

function VeritaSignMesh() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#f0e8d8';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#14120b';
    ctx.font = 'bold 88px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '8px';
    ctx.fillText('VERITA', 256, 64);
    const t = new THREE.CanvasTexture(c);
    return t;
  }, []);

  return (
    <mesh position={[0, -BH / 2 + 7.2, BZ - BD / 2 + 0.06]}>
      <planeGeometry args={[5.5, 1.2]} />
      <meshStandardMaterial map={tex} roughness={0.85} transparent />
    </mesh>
  );
}

export default function BuildingFacade() {
  return (
    <group>
      {/* ── Main building body ── */}
      <mesh position={[0, 0, BZ]} castShadow receiveShadow>
        <boxGeometry args={[BW, BH, BD]} />
        <primitive object={STONE} />
      </mesh>

      {/* ── Art-deco crown ── */}
      <ArtDecoCrown />

      {/* ── Gold floor trim bands ── */}
      <FloorTrimBands />

      {/* ── Entrance portico ── */}
      <EntrancePortico />

      {/* ── Window grid: 4 columns × 4 rows ── */}
      {([-3.6, -1.2, 1.2, 3.6] as number[]).flatMap((x) =>
        ([-5.0, -1.0, 3.0, 7.0] as number[]).map((y) => (
          <Window key={`${x}-${y}`} x={x} y={y} />
        ))
      )}

      {/* ── VERITA carved into stone above arch — canvas texture, no font fetch ── */}
      <VeritaSignMesh />

      {/* ── Roof parapet ── */}
      <mesh position={[0, BH / 2 + 0.15, BZ]}>
        <boxGeometry args={[BW + 0.3, 0.3, BD + 0.3]} />
        <primitive object={STONE_DEEP} />
      </mesh>

      {/* ── Side pilasters (vertical strips) ── */}
      {([-BW / 2 - 0.05, BW / 2 + 0.05] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 0, BZ]} castShadow>
          <boxGeometry args={[0.55, BH, BD + 0.1]} />
          <primitive object={STONE_DEEP} />
        </mesh>
      ))}
    </group>
  );
}
