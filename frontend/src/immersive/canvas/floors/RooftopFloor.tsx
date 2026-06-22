import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const ROOFTOP_FY = 50.5;   // floor base Y (lobby -9.5, step 12, index 5)
const RW = 9.8, RD = 24, RZ = -30;
const PARAPET_H = 1.8;

// ─── Night sky dome ────────────────────────────────────────────────────────────
function makeSkyTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const ctx = c.getContext('2d')!;
  const grd = ctx.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, '#010308');
  grd.addColorStop(0.55, '#040c1c');
  grd.addColorStop(0.85, '#08142a');
  grd.addColorStop(1, '#12243a');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, 1024, 512);
  // Stars
  for (let i = 0; i < 700; i++) {
    const x = Math.random() * 1024, y = Math.random() * 380;
    const r = Math.random() * 1.1 + 0.2;
    const a = Math.random() * 0.6 + 0.35;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill();
  }
  // Aurora hint (violet band near horizon)
  const aur = ctx.createLinearGradient(0, 330, 0, 430);
  aur.addColorStop(0, 'rgba(80,20,140,0)');
  aur.addColorStop(0.5, 'rgba(80,20,140,0.18)');
  aur.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aur; ctx.fillRect(0, 330, 1024, 100);
  // City horizon glow
  const hgrd = ctx.createLinearGradient(0, 420, 0, 512);
  hgrd.addColorStop(0, 'rgba(50,25,5,0)');
  hgrd.addColorStop(1, 'rgba(80,40,8,0.55)');
  ctx.fillStyle = hgrd; ctx.fillRect(0, 420, 1024, 92);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

function SkyDome() {
  const tex = useMemo(() => makeSkyTex(), []);
  return (
    <mesh position={[0, ROOFTOP_FY + 8, RZ]}>
      <sphereGeometry args={[195, 32, 16]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} />
    </mesh>
  );
}

// ─── Efficient star points (in addition to sky texture) ───────────────────────
function StarPoints() {
  const geo = useMemo(() => {
    const pos = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.48;
      const r = 100 + Math.random() * 80;
      pos[i*3]   = Math.cos(theta) * Math.sin(phi) * r;
      pos[i*3+1] = ROOFTOP_FY + 8 + Math.cos(phi) * r;
      pos[i*3+2] = RZ + Math.sin(theta) * Math.sin(phi) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#ffffff" size={0.28} sizeAttenuation transparent opacity={0.82} fog={false} />
    </points>
  );
}

// ─── VERITA illuminated sign ──────────────────────────────────────────────────
function makeSignTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#030612';
  ctx.fillRect(0, 0, 512, 128);
  // Gold halo
  const grd = ctx.createRadialGradient(256, 64, 8, 256, 64, 180);
  grd.addColorStop(0, 'rgba(168,132,44,0.55)');
  grd.addColorStop(1, 'rgba(168,132,44,0)');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, 512, 128);
  // Text glow pass
  ctx.shadowColor = '#ffd090'; ctx.shadowBlur = 28;
  ctx.font = 'bold 76px Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#a8842c';
  ctx.fillText('VERITA', 256, 64);
  // Sharp pass
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffd090';
  ctx.fillText('VERITA', 256, 64);
  return new THREE.CanvasTexture(c);
}

function VeritaSign({ position }: { position: [number,number,number] }) {
  const tex = useMemo(() => makeSignTex(), []);
  const glowRef = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (glowRef.current) {
      glowRef.current.intensity = 1.8 + Math.sin(clock.elapsedTime * 1.1) * 0.25;
    }
  });
  const [x,y,z] = position;
  return (
    <group position={[x, y, z]}>
      {/* Backing panel */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[4.0, 1.0, 0.12]} />
        <meshStandardMaterial color="#0a0812" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Sign face */}
      <mesh position={[0, 0, 0.07]}>
        <planeGeometry args={[3.8, 0.88]} />
        <meshStandardMaterial
          map={tex}
          emissive={new THREE.Color('#a8842c')}
          emissiveMap={tex}
          emissiveIntensity={0.55}
          roughness={0.4}
        />
      </mesh>
      {/* Gold top + bottom trim */}
      {([-0.46, 0.46] as number[]).map((dy,i) => (
        <mesh key={i} position={[0, dy, 0.08]}>
          <boxGeometry args={[4.0, 0.08, 0.06]} />
          <meshStandardMaterial color="#a8842c" metalness={0.72} roughness={0.22}
            emissive={new THREE.Color('#a8842c')} emissiveIntensity={0.3} />
        </mesh>
      ))}
      <pointLight ref={glowRef} position={[0, 0, 1.5]} color="#ffd080" intensity={1.8} distance={8} decay={2} />
    </group>
  );
}

// ─── Water tower ──────────────────────────────────────────────────────────────
function WaterTower({ position }: { position: [number,number,number] }) {
  const [x,y,z] = position;
  return (
    <group position={[x, y, z]}>
      {/* 4 Legs */}
      {([[-0.5,-0.5],[0.5,-0.5],[-0.5,0.5],[0.5,0.5]] as [number,number][]).map(([lx,lz],i) => (
        <mesh key={i} position={[lx, 1.5, lz]}>
          <cylinderGeometry args={[0.045, 0.05, 3.0, 6]} />
          <meshStandardMaterial color="#2a2318" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      {/* Cross braces */}
      <mesh position={[0, 1.5, 0]} rotation={[0, Math.PI/4, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 1.42, 5]} />
        <meshStandardMaterial color="#2a2318" metalness={0.45} roughness={0.55} />
      </mesh>
      {/* Tank body */}
      <mesh position={[0, 3.2, 0]} castShadow>
        <cylinderGeometry args={[0.7, 0.7, 1.8, 14]} />
        <meshStandardMaterial color="#3a2e1e" roughness={0.78} metalness={0.12} />
      </mesh>
      {/* Stave bands */}
      {[2.5, 3.2, 3.9].map((ty,i) => (
        <mesh key={i} position={[0, ty, 0]}>
          <torusGeometry args={[0.72, 0.03, 6, 20]} />
          <meshStandardMaterial color="#a8842c" metalness={0.65} roughness={0.25} />
        </mesh>
      ))}
      {/* Conical roof */}
      <mesh position={[0, 4.22, 0]}>
        <coneGeometry args={[0.8, 1.0, 14]} />
        <meshStandardMaterial color="#2a2318" roughness={0.8} metalness={0.1} />
      </mesh>
    </group>
  );
}

// ─── Art-deco parapet with finials ────────────────────────────────────────────
function Parapet() {
  const mat = new THREE.MeshStandardMaterial({ color: '#1a1812', roughness: 0.82 });
  const capMat = new THREE.MeshStandardMaterial({ color: '#a8842c', metalness: 0.65, roughness: 0.25 });
  // Merlons (battlements) along each side
  const sides: Array<{ axis: 'x'|'z'; pos: number; count: number; len: number }> = [
    { axis: 'z', pos: RZ - RD/2 + 0.14, count: 14, len: RW },
    { axis: 'x', pos: -RW/2 + 0.14,     count: 8,  len: RD },
    { axis: 'x', pos:  RW/2 - 0.14,     count: 8,  len: RD },
  ];

  return (
    <group>
      {sides.map(({ axis, pos, count, len }, si) =>
        Array.from({ length: count }, (_, i) => {
          const t = (i / (count - 1)) * len - len/2;
          const isMerlon = i % 2 === 0;
          const h = isMerlon ? PARAPET_H : PARAPET_H * 0.6;
          const x = axis === 'z' ? t : pos;
          const z = axis === 'z' ? pos : RZ + t;
          return (
            <group key={`${si}_${i}`} position={[x, ROOFTOP_FY + h/2, z]}>
              <mesh castShadow>
                <boxGeometry args={[
                  axis === 'z' ? len/count * 0.88 : 0.28,
                  h,
                  axis === 'z' ? 0.28 : len/count * 0.88,
                ]} />
                <primitive object={mat} />
              </mesh>
              {isMerlon && (
                <mesh position={[0, h/2 + 0.05, 0]}>
                  <boxGeometry args={[
                    axis === 'z' ? len/count * 0.88 : 0.28,
                    0.1,
                    axis === 'z' ? 0.28 : len/count * 0.88,
                  ]} />
                  <primitive object={capMat} />
                </mesh>
              )}
            </group>
          );
        })
      )}
      {/* Corner finials */}
      {([-RW/2+0.14, RW/2-0.14] as number[]).map((fx, fi) =>
        ([RZ-RD/2+0.14, RZ+RD/2-0.14] as number[]).map((fz, fj) => (
          <group key={`fin_${fi}_${fj}`} position={[fx, ROOFTOP_FY + PARAPET_H, fz]}>
            <mesh>
              <coneGeometry args={[0.12, 0.55, 8]} />
              <primitive object={capMat} />
            </mesh>
            <mesh position={[0, -0.34, 0]}>
              <cylinderGeometry args={[0.14, 0.14, 0.18, 8]} />
              <primitive object={capMat} />
            </mesh>
          </group>
        ))
      )}
    </group>
  );
}

// ─── Telescope ────────────────────────────────────────────────────────────────
function Telescope({ position }: { position: [number,number,number] }) {
  const [x,y,z] = position;
  return (
    <group position={[x, y, z]}>
      {/* Tripod */}
      {([0, 2*Math.PI/3, 4*Math.PI/3] as number[]).map((a, i) => (
        <mesh key={i}
          position={[Math.cos(a)*0.4, 0.6, Math.sin(a)*0.4]}
          rotation={[Math.cos(a)*0.38, 0, -Math.sin(a)*0.38]}
        >
          <cylinderGeometry args={[0.025, 0.025, 1.4, 6]} />
          <meshStandardMaterial color="#2a2318" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      {/* Mount */}
      <mesh position={[0, 1.28, 0]}>
        <sphereGeometry args={[0.1, 8, 6]} />
        <meshStandardMaterial color="#a8842c" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Tube */}
      <mesh position={[0, 1.5, 0.22]} rotation={[-0.55, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.06, 0.9, 10]} />
        <meshStandardMaterial color="#2a2318" metalness={0.55} roughness={0.4} />
      </mesh>
      {/* Eyepiece */}
      <mesh position={[0, 1.64, -0.16]} rotation={[-0.55, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.18, 8]} />
        <meshStandardMaterial color="#1a1510" metalness={0.5} roughness={0.5} />
      </mesh>
    </group>
  );
}

// ─── Distant city lights below ────────────────────────────────────────────────
function CityLightsBelow() {
  const lights: [number, number, number, number, number][] = [
    [-55,30,-90,7,5], [-38,22,-85,5,4], [-24,35,-95,9,6],
    [22, 25,-88,6,4], [38, 32,-92,8,5], [55, 28,-86,7,4],
    [-68,18,-100,5,3],[  0,28,-95,6,5],[62,36,-98,9,6],
  ];
  return (
    <>
      {lights.map(([x,h,z,w,d],i) => (
        <group key={i} position={[x, ROOFTOP_FY - h, z]}>
          <mesh>
            <boxGeometry args={[w, h*0.6, d]} />
            <meshStandardMaterial color="#0e0c08" roughness={0.9} />
          </mesh>
          {/* Glowing windows grid */}
          {Array.from({ length: Math.floor(h/3) }, (_, wy) =>
            Array.from({ length: Math.floor(w/2.5) }, (_, wx) => (
              Math.random() > 0.4 ? (
                <mesh key={`${wy}_${wx}`}
                  position={[
                    -w/2 + (wx+0.5)*(w/Math.floor(w/2.5)),
                    -h*0.3 + (wy+0.5)*(h*0.6/Math.floor(h/3)),
                    d/2+0.01,
                  ]}
                >
                  <planeGeometry args={[0.9, 0.7]} />
                  <meshStandardMaterial
                    color="#ffa030"
                    emissive={new THREE.Color('#ff8018')}
                    emissiveIntensity={1.2 + Math.random() * 0.8}
                  />
                </mesh>
              ) : null
            ))
          )}
        </group>
      ))}
      {/* Distant ambient city glow */}
      <pointLight position={[0, ROOFTOP_FY - 15, RZ - 60]} color="#ff6818" intensity={2.5} distance={100} decay={1} />
    </>
  );
}

// ─── Rooftop Floor ─────────────────────────────────────────────────────────────
export default function RooftopFloor() {
  return (
    <group>
      <SkyDome />
      <StarPoints />
      <CityLightsBelow />

      {/* Rooftop deck surface — dark tarmac */}
      <mesh position={[0, ROOFTOP_FY, RZ]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>
        <planeGeometry args={[RW, RD]} />
        <meshStandardMaterial color="#111008" roughness={0.82} metalness={0.08} />
      </mesh>
      {/* Deck tile seams */}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[0, ROOFTOP_FY + 0.005, RZ - RD/2 + (i+1)*RD/6]}>
          <boxGeometry args={[RW, 0.008, 0.02]} />
          <meshStandardMaterial color="#0a0806" roughness={0.9} />
        </mesh>
      ))}

      <Parapet />

      {/* VERITA sign mounted on back parapet */}
      <VeritaSign position={[0, ROOFTOP_FY + PARAPET_H + 0.55, RZ - RD/2 + 0.22]} />

      {/* Water tower */}
      <WaterTower position={[RW/2 - 1.2, ROOFTOP_FY, RZ - 7]} />

      {/* Observation telescope */}
      <Telescope position={[-1.5, ROOFTOP_FY, RZ + 3]} />

      {/* Central chain seal floor medallion */}
      <mesh position={[0, ROOFTOP_FY + 0.01, RZ]} rotation={[-Math.PI/2, 0, 0]}>
        <circleGeometry args={[1.4, 24]} />
        <meshStandardMaterial
          color="#a8842c"
          emissive={new THREE.Color('#a8842c')}
          emissiveIntensity={0.18}
          metalness={0.65}
          roughness={0.25}
        />
      </mesh>
      <mesh position={[0, ROOFTOP_FY + 0.015, RZ]} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[1.2, 1.4, 24]} />
        <meshStandardMaterial color="#14120b" roughness={0.8} />
      </mesh>

      {/* Satellite dish */}
      <group position={[-RW/2 + 0.8, ROOFTOP_FY, RZ - 2]}>
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 1.2, 6]} />
          <meshStandardMaterial color="#2a2318" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.3, 0.18]} rotation={[-0.45, 0, 0]}>
          <sphereGeometry args={[0.28, 10, 8, 0, Math.PI*2, 0, Math.PI*0.55]} />
          <meshStandardMaterial color="#1e1c18" metalness={0.55} roughness={0.45} side={THREE.FrontSide} />
        </mesh>
      </group>

      {/* HVAC units */}
      {([[1.5, RZ+8],[2.8, RZ+6],[-2.2, RZ+9]] as [number,number][]).map(([hx,hz],i) => (
        <mesh key={i} position={[hx, ROOFTOP_FY + 0.28, hz]} castShadow>
          <boxGeometry args={[0.6, 0.56, 0.5]} />
          <meshStandardMaterial color="#1a1a18" metalness={0.4} roughness={0.7} />
        </mesh>
      ))}

      {/* Rooftop lighting — cold night ambience */}
      <ambientLight color="#0a0c1a" intensity={0.55} />
      <pointLight position={[0, ROOFTOP_FY + 3, RZ]} color="#2030a0" intensity={0.4} distance={18} decay={1.8} />
      {/* Sign spillover */}
      <pointLight position={[0, ROOFTOP_FY + 2, RZ - RD/2 + 2]} color="#ffd080" intensity={1.0} distance={12} decay={2} />
      {/* City bounce from below */}
      <pointLight position={[0, ROOFTOP_FY - 1, RZ]} color="#ff6818" intensity={0.35} distance={14} decay={2} />
    </group>
  );
}
