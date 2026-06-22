import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ── GLSL ────────────────────────────────────────────────────────────────── */

const VERT = /* glsl */`
  uniform float uTime;
  uniform vec2  uMouse;
  attribute float aRandom;
  varying float vAlpha;
  varying float vWhite;

  void main() {
    vec3 p = position;
    float t = uTime * 0.36;
    float r = aRandom;

    // Organic wave drift — two overlapping sine fields
    p.x += sin(p.y * 0.41 + t * (0.48 + r * 0.52)) * 0.58;
    p.y += cos(p.x * 0.29 + t * (0.31 + r * 0.42)) * 0.44;
    p.z += sin(t * r * 0.53 + p.x * 0.22) * 0.30;

    // Mouse repulsion — exponential falloff
    vec2 mWorld = uMouse * vec2(19.5, 12.0);
    vec2 diff   = p.xy - mWorld;
    float d     = length(diff);
    float rep   = exp(-d * 0.30) * 3.2;
    p.xy       += normalize(diff + vec2(0.0001)) * rep;

    // Per-particle brightness pulse
    vAlpha = 0.16 + 0.84 * abs(sin(t * r * 1.45 + p.x * 0.27));

    // Top ~13% become bright white accent particles
    vWhite = step(0.87, r);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (0.5 + r * 2.6) * (215.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */`
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vAlpha;
  varying float vWhite;

  void main() {
    vec2  uv = gl_PointCoord - 0.5;
    float d  = length(uv);
    if (d > 0.5) discard;

    // Soft glow with bright core
    float core = max(0.0, 1.0 - d * 3.2);
    float halo = max(0.0, 1.0 - d * 1.9);
    float a    = (core * 0.65 + halo * 0.35) * vAlpha;

    vec3 col = mix(uColorA, uColorB, vWhite);
    gl_FragColor = vec4(col, a * 0.90);
  }
`;

/* ── Deterministic geometry ──────────────────────────────────────────────── */

const N = 7200;

function buildGeometryData() {
  const pos = new Float32Array(N * 3);
  const rnd = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r1 = Math.abs(Math.sin(i * 127.1 + 0.5) * 43758.5453 % 1);
    const r2 = Math.abs(Math.sin(i * 311.7 + 1.3) * 43758.5453 % 1);
    const r3 = Math.abs(Math.sin(i * 74.3  + 2.1) * 43758.5453 % 1);
    const r4 = Math.abs(Math.sin(i * 541.1 + 3.7) * 43758.5453 % 1);
    pos[i * 3]     = (r1 - 0.5) * 40;
    pos[i * 3 + 1] = (r2 - 0.5) * 24;
    pos[i * 3 + 2] = (r3 - 0.5) * 10;
    rnd[i] = r4;
  }
  return { pos, rnd };
}

const { pos: POSITIONS, rnd: RANDOMS } = buildGeometryData();

/* ── Component ───────────────────────────────────────────────────────────── */

export default function ParticleField() {
  const { mouse } = useThree();

  const uniforms = useMemo(() => ({
    uTime:   { value: 0 },
    uMouse:  { value: new THREE.Vector2() },
    uColorA: { value: new THREE.Color("#ffb700") },  // amber
    uColorB: { value: new THREE.Color("#fff8e8") },  // warm white
  }), []);

  useFrame(({ clock }) => {
    uniforms.uTime.value  = clock.elapsedTime;
    uniforms.uMouse.value.lerp(mouse, 0.055);
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[POSITIONS, 3]} />
        <bufferAttribute attach="attributes-aRandom"  args={[RANDOMS, 1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
