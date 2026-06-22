import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import LivingLedger from './LivingLedger';

// ─── Constants ─────────────────────────────────────────────────────────────────
// Building: BW=11, BH=20, BD=5 centred at z=-22
// Interior starts at z≈-19.5, extends to z=-47
const LOBBY_X = 0;
const LOBBY_Y = -9.5;       // floor level
const LOBBY_Z = -30;        // centre of room
const ROOM_W = 9.8;
const ROOM_H = 9;
const ROOM_D = 24;

interface LobbyMats {
  floorMat: THREE.MeshStandardMaterial;
  wallMat: THREE.MeshStandardMaterial;
  trimMat: THREE.MeshStandardMaterial;
  stoneMat: THREE.MeshStandardMaterial;
  darkMat: THREE.MeshStandardMaterial;
  lightTileMat: THREE.MeshStandardMaterial;
  darkTileMat: THREE.MeshStandardMaterial;
}

// ─── Marble floor tile pattern ────────────────────────────────────────────────
function LobbyFloor({ mats }: { mats: LobbyMats }) {
  const TILE_SIZE = 1.6;
  const cols = Math.floor(ROOM_W / TILE_SIZE);
  const rows = Math.floor(ROOM_D / TILE_SIZE);

  const tiles = useMemo(() => {
    const result: { x: number; z: number; dark: boolean }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        result.push({
          x: (c - cols / 2 + 0.5) * TILE_SIZE,
          z: LOBBY_Z - ROOM_D / 2 + (r + 0.5) * TILE_SIZE,
          dark: (r + c) % 2 === 1,
        });
      }
    }
    return result;
  }, [cols, rows]);

  return (
    <group>
      {tiles.map(({ x, z, dark }, i) => (
        <mesh key={i} position={[x, LOBBY_Y + 0.005, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[TILE_SIZE - 0.02, TILE_SIZE - 0.02]} />
          <primitive object={dark ? mats.darkTileMat : mats.lightTileMat} />
        </mesh>
      ))}
      {/* Grout lines base */}
      <mesh position={[0, LOBBY_Y, LOBBY_Z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <primitive object={mats.floorMat} />
      </mesh>
    </group>
  );
}

// ─── Wainscoting + walls ──────────────────────────────────────────────────────
function LobbyWalls({ mats }: { mats: LobbyMats }) {
  const WAINSCOT_H = 1.4;
  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, LOBBY_Y + ROOM_H / 2, LOBBY_Z - ROOM_D / 2]}>
        <boxGeometry args={[ROOM_W, ROOM_H, 0.28]} />
        <primitive object={mats.wallMat} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-ROOM_W / 2, LOBBY_Y + ROOM_H / 2, LOBBY_Z]}>
        <boxGeometry args={[0.28, ROOM_H, ROOM_D]} />
        <primitive object={mats.wallMat} />
      </mesh>
      {/* Right wall */}
      <mesh position={[ROOM_W / 2, LOBBY_Y + ROOM_H / 2, LOBBY_Z]}>
        <boxGeometry args={[0.28, ROOM_H, ROOM_D]} />
        <primitive object={mats.wallMat} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, LOBBY_Y + ROOM_H, LOBBY_Z]}>
        <boxGeometry args={[ROOM_W, 0.28, ROOM_D]} />
        <primitive object={mats.stoneMat} />
      </mesh>

      {/* Wainscot panels — left and right walls */}
      {([-ROOM_W / 2 + 0.15, ROOM_W / 2 - 0.15] as number[]).map((x, wi) => {
        const PANELS = 6;
        const pWidth = ROOM_D / PANELS - 0.08;
        return Array.from({ length: PANELS }, (_, i) => (
          <mesh
            key={`w${wi}_${i}`}
            position={[x, LOBBY_Y + WAINSCOT_H / 2, LOBBY_Z - ROOM_D / 2 + (i + 0.5) * (ROOM_D / PANELS)]}
          >
            <boxGeometry args={[0.06, WAINSCOT_H - 0.06, pWidth]} />
            <primitive object={mats.stoneMat} />
          </mesh>
        ));
      })}

      {/* Gold wainscot cap rail */}
      {([-ROOM_W / 2 + 0.15, ROOM_W / 2 - 0.15] as number[]).map((x, i) => (
        <mesh key={`cap${i}`} position={[x, LOBBY_Y + WAINSCOT_H + 0.035, LOBBY_Z]}>
          <boxGeometry args={[0.08, 0.07, ROOM_D - 0.1]} />
          <primitive object={mats.trimMat} />
        </mesh>
      ))}
      {/* Gold base rail */}
      {([-ROOM_W / 2 + 0.15, ROOM_W / 2 - 0.15] as number[]).map((x, i) => (
        <mesh key={`base${i}`} position={[x, LOBBY_Y + 0.1, LOBBY_Z]}>
          <boxGeometry args={[0.06, 0.2, ROOM_D - 0.1]} />
          <primitive object={mats.trimMat} />
        </mesh>
      ))}

      {/* Crown moulding */}
      {([-ROOM_W / 2 + 0.05, ROOM_W / 2 - 0.05] as number[]).map((x, i) => (
        <mesh key={`crown${i}`} position={[x, LOBBY_Y + ROOM_H - 0.18, LOBBY_Z]}>
          <boxGeometry args={[0.22, 0.36, ROOM_D - 0.1]} />
          <primitive object={mats.trimMat} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Coffered ceiling panels ──────────────────────────────────────────────────
function CofferedCeiling({ mats }: { mats: LobbyMats }) {
  const COLS = 4, ROWS = 8;
  const pw = ROOM_W / COLS, pd = ROOM_D / ROWS;
  return (
    <group>
      {Array.from({ length: ROWS }, (_, r) =>
        Array.from({ length: COLS }, (_, c) => (
          <group key={`cf_${r}_${c}`}>
            {/* Coffered panel recess */}
            <mesh
              position={[
                -ROOM_W / 2 + (c + 0.5) * pw,
                LOBBY_Y + ROOM_H - 0.06,
                LOBBY_Z - ROOM_D / 2 + (r + 0.5) * pd,
              ]}
            >
              <boxGeometry args={[pw - 0.18, 0.12, pd - 0.18]} />
              <meshStandardMaterial color="#e4dcca" roughness={0.9} />
            </mesh>
          </group>
        ))
      )}
      {/* Beam grid — horizontal */}
      {Array.from({ length: ROWS + 1 }, (_, r) => (
        <mesh
          key={`br${r}`}
          position={[0, LOBBY_Y + ROOM_H - 0.04, LOBBY_Z - ROOM_D / 2 + r * pd]}
        >
          <boxGeometry args={[ROOM_W, 0.28, 0.18]} />
          <primitive object={mats.trimMat} />
        </mesh>
      ))}
      {/* Beam grid — vertical */}
      {Array.from({ length: COLS + 1 }, (_, c) => (
        <mesh
          key={`bc${c}`}
          position={[-ROOM_W / 2 + c * pw, LOBBY_Y + ROOM_H - 0.04, LOBBY_Z]}
        >
          <boxGeometry args={[0.18, 0.28, ROOM_D]} />
          <primitive object={mats.trimMat} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Chandelier ───────────────────────────────────────────────────────────────
function Chandelier() {
  const CY = LOBBY_Y + ROOM_H - 0.6;
  const ARMS = 8;
  return (
    <group position={[0, CY, LOBBY_Z + 2]}>
      {/* Central boss */}
      <mesh>
        <sphereGeometry args={[0.22, 12, 8]} />
        <meshStandardMaterial color="#a8842c" metalness={0.75} roughness={0.18} emissive={new THREE.Color('#a8842c')} emissiveIntensity={0.3} />
      </mesh>
      {/* Drop rod */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.2, 6]} />
        <meshStandardMaterial color="#8a6820" metalness={0.7} roughness={0.22} />
      </mesh>
      {/* Arms + pendants */}
      {Array.from({ length: ARMS }, (_, i) => {
        const angle = (i / ARMS) * Math.PI * 2;
        const r = 1.4;
        const ax = Math.cos(angle) * r;
        const az = Math.sin(angle) * r;
        return (
          <group key={i}>
            {/* Arm */}
            <mesh
              position={[ax / 2, -0.05, az / 2]}
              rotation={[0, -angle, Math.atan2(0.1, r)]}
            >
              <cylinderGeometry args={[0.018, 0.018, r, 6]} />
              <meshStandardMaterial color="#8a6820" metalness={0.65} roughness={0.25} />
            </mesh>
            {/* Pendant bulb */}
            <mesh position={[ax, -0.25, az]}>
              <sphereGeometry args={[0.1, 8, 6]} />
              <meshStandardMaterial
                color="#ffe8a0"
                emissive={new THREE.Color('#ffd060')}
                emissiveIntensity={2.5}
                roughness={0.1}
              />
            </mesh>
            {/* Point light per pendant */}
            <pointLight
              position={[ax, -0.3, az]}
              color="#ffd080"
              intensity={0.6}
              distance={6}
              decay={2}
            />
          </group>
        );
      })}
    </group>
  );
}

// ─── Reception desk ───────────────────────────────────────────────────────────
function ReceptionDesk({ mats }: { mats: LobbyMats }) {
  return (
    <group position={[0, LOBBY_Y, LOBBY_Z + 6]}>
      {/* Main desk body */}
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[4.2, 1.3, 1.1]} />
        <meshStandardMaterial color="#2a2318" roughness={0.72} metalness={0.1} />
      </mesh>
      {/* Desk top surface */}
      <mesh position={[0, 1.31, 0]}>
        <boxGeometry args={[4.3, 0.06, 1.2]} />
        <primitive object={mats.stoneMat} />
      </mesh>
      {/* Gold front panel */}
      <mesh position={[0, 0.45, 0.56]}>
        <boxGeometry args={[4.2, 0.9, 0.04]} />
        <primitive object={mats.trimMat} />
      </mesh>
      {/* VERITA lettering on panel (extruded slab) */}
      <mesh position={[0, 0.42, 0.58]}>
        <boxGeometry args={[1.4, 0.14, 0.025]} />
        <meshStandardMaterial color="#14120b" roughness={0.8} />
      </mesh>
    </group>
  );
}

// ─── Archival pillars ─────────────────────────────────────────────────────────
function LobbyPillars({ mats }: { mats: LobbyMats }) {
  const PILLAR_H = ROOM_H - 0.4;
  const positions: [number, number][] = [
    [-ROOM_W / 2 + 0.8, LOBBY_Z - ROOM_D / 2 + 4],
    [ ROOM_W / 2 - 0.8, LOBBY_Z - ROOM_D / 2 + 4],
    [-ROOM_W / 2 + 0.8, LOBBY_Z],
    [ ROOM_W / 2 - 0.8, LOBBY_Z],
  ];
  return (
    <>
      {positions.map(([x, z], i) => (
        <group key={i} position={[x, LOBBY_Y + PILLAR_H / 2, z]}>
          {/* Shaft */}
          <mesh castShadow>
            <cylinderGeometry args={[0.28, 0.32, PILLAR_H, 12]} />
            <primitive object={mats.stoneMat} />
          </mesh>
          {/* Capital */}
          <mesh position={[0, PILLAR_H / 2 + 0.12, 0]}>
            <cylinderGeometry args={[0.42, 0.28, 0.24, 12]} />
            <primitive object={mats.trimMat} />
          </mesh>
          {/* Base plinth */}
          <mesh position={[0, -PILLAR_H / 2 - 0.1, 0]}>
            <boxGeometry args={[0.7, 0.2, 0.7]} />
            <primitive object={mats.darkMat} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ─── Wall sconces ─────────────────────────────────────────────────────────────
function WallSconces({ mats }: { mats: LobbyMats }) {
  const sconces: [number, number, number, number][] = [
    [-ROOM_W / 2 + 0.22, LOBBY_Y + 3.8, LOBBY_Z - 6, 0],
    [ ROOM_W / 2 - 0.22, LOBBY_Y + 3.8, LOBBY_Z - 6, Math.PI],
    [-ROOM_W / 2 + 0.22, LOBBY_Y + 3.8, LOBBY_Z + 2, 0],
    [ ROOM_W / 2 - 0.22, LOBBY_Y + 3.8, LOBBY_Z + 2, Math.PI],
  ];
  return (
    <>
      {sconces.map(([x, y, z, ry], i) => (
        <group key={i} position={[x, y, z]} rotation={[0, ry, 0]}>
          {/* Backplate */}
          <mesh>
            <boxGeometry args={[0.06, 0.36, 0.22]} />
            <primitive object={mats.darkMat} />
          </mesh>
          {/* Arm */}
          <mesh position={[0.14, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.025, 0.025, 0.28, 6]} />
            <meshStandardMaterial color="#a8842c" metalness={0.7} roughness={0.2} />
          </mesh>
          {/* Bulb */}
          <mesh position={[0.3, 0, 0]}>
            <sphereGeometry args={[0.07, 8, 6]} />
            <meshStandardMaterial
              color="#ffe8a0"
              emissive={new THREE.Color('#ffd060')}
              emissiveIntensity={3}
            />
          </mesh>
          <pointLight position={[0.3, 0, 0]} color="#ffd090" intensity={0.9} distance={5} decay={2} />
        </group>
      ))}
    </>
  );
}

// ─── Entry arch threshold ─────────────────────────────────────────────────────
function EntryThreshold({ mats }: { mats: LobbyMats }) {
  return (
    <group position={[0, LOBBY_Y, LOBBY_Z + ROOM_D / 2 - 0.5]}>
      {/* Arch frame above door opening */}
      <mesh position={[0, 2.4, 0]}>
        <boxGeometry args={[5.0, 0.5, 0.38]} />
        <primitive object={mats.stoneMat} />
      </mesh>
      {/* Left pier */}
      <mesh position={[-2.15, 1.5, 0]}>
        <boxGeometry args={[0.7, 3.0, 0.38]} />
        <primitive object={mats.stoneMat} />
      </mesh>
      {/* Right pier */}
      <mesh position={[2.15, 1.5, 0]}>
        <boxGeometry args={[0.7, 3.0, 0.38]} />
        <primitive object={mats.stoneMat} />
      </mesh>
      {/* Gold arch band */}
      <mesh position={[0, 2.64, 0]}>
        <boxGeometry args={[5.0, 0.08, 0.42]} />
        <primitive object={mats.trimMat} />
      </mesh>
    </group>
  );
}

// ─── Lobby Room ───────────────────────────────────────────────────────────────
export default function LobbyRoom() {
  const mats = useMemo(() => {
    return {
      floorMat: new THREE.MeshStandardMaterial({
        color: '#e8e0cc', roughness: 0.55, metalness: 0.1,
      }),
      wallMat: new THREE.MeshStandardMaterial({
        color: '#f0e8d8', roughness: 0.88,
      }),
      trimMat: new THREE.MeshStandardMaterial({
        color: '#a8842c', metalness: 0.62, roughness: 0.28,
      }),
      stoneMat: new THREE.MeshStandardMaterial({
        color: '#d4ccb8', roughness: 0.82,
      }),
      darkMat: new THREE.MeshStandardMaterial({
        color: '#1e1a12', roughness: 0.78,
      }),
      lightTileMat: new THREE.MeshStandardMaterial({
        color: '#f2eadc', roughness: 0.45, metalness: 0.08,
      }),
      darkTileMat: new THREE.MeshStandardMaterial({
        color: '#d8ccb4', roughness: 0.48, metalness: 0.06,
      }),
    };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(mats).forEach((m) => m.dispose());
    };
  }, [mats]);

  return (
    <group>
      <LobbyFloor mats={mats} />
      <LobbyWalls mats={mats} />
      <CofferedCeiling mats={mats} />
      <Chandelier />
      <LobbyPillars mats={mats} />
      <WallSconces mats={mats} />
      <EntryThreshold mats={mats} />
      <ReceptionDesk mats={mats} />

      {/* The Living Ledger — centred on its pedestal, pushed back from desk */}
      <LivingLedger position={[0, 0, LOBBY_Z - 3]} />

      {/* Ambient glow inside lobby — archival blue-cream */}
      <ambientLight color="#f0e8d8" intensity={0.65} />
      <pointLight
        position={[0, LOBBY_Y + ROOM_H - 1.5, LOBBY_Z]}
        color="#ffe8b0"
        intensity={1.8}
        distance={18}
        decay={1.5}
      />
    </group>
  );
}

