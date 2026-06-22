import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { useBuildingContext, BuildingPhase } from '../context/BuildingContext';

// ─── Floor Y layout ────────────────────────────────────────────────────────────
// Lobby floor at y=-9.5; each floor rises 12 units above the previous.
// Camera rides at floor_y + 1.7 (eye height inside the room).
const LOBBY_FLOOR_Y = -9.5;
const FLOOR_STEP = 12;

const FLOOR_INDEX: Partial<Record<BuildingPhase, number>> = {
  lobby:          0,
  floor_studio:   1,
  floor_risk:     2,
  floor_detective:3,
  floor_vault:    4,
  rooftop:        5,
};

function floorCamY(idx: number)  { return LOBBY_FLOOR_Y + idx * FLOOR_STEP + 1.7; }
function floorLookY(idx: number) { return LOBBY_FLOOR_Y + idx * FLOOR_STEP + 1.6; }

// ─── Named camera anchors ──────────────────────────────────────────────────────
const POS = {
  // Start reasonably close so the building fills ~17% of screen immediately
  approach_start: new THREE.Vector3(0, 5, 42),
  exterior_idle:  new THREE.Vector3(0, 2, 34),
};

const LOOK = {
  exterior: new THREE.Vector3(0, 1, -22),
};

function buildFloorCam(idx: number) {
  return {
    pos:  new THREE.Vector3(0, floorCamY(idx),  -19),
    look: new THREE.Vector3(0, floorLookY(idx), -34),
  };
}

export function useCameraJourney(): void {
  const { camera } = useThree();
  const { phase, mouseNDC, setPhase } = useBuildingContext();
  const activeTween = useRef<gsap.core.Tween | null>(null);
  const lookTarget = useRef(LOOK.exterior.clone());
  const parallax = useRef({ x: 0, y: 0 });

  const kill = () => {
    activeTween.current?.kill();
    activeTween.current = null;
  };

  useEffect(() => {
    // ── Exterior approach ─────────────────────────────────────────────────────
    if (phase === 'exterior_approach') {
      camera.position.copy(POS.approach_start);
      lookTarget.current.copy(LOOK.exterior);
      kill();
      activeTween.current = gsap.to(camera.position, {
        x: POS.exterior_idle.x,
        y: POS.exterior_idle.y,
        z: POS.exterior_idle.z,
        duration: 2.0,
        ease: 'power2.out',
        onComplete: () => setPhase('exterior_idle'),
      });
    }

    // ── Floor phases — animate camera to the right floor level ───────────────
    const floorIdx = FLOOR_INDEX[phase];
    if (floorIdx !== undefined) {
      kill();
      const target = buildFloorCam(floorIdx);

      // Big jump (e.g. coming from exterior): snap instantly so the paper-shred
      // transition covers the cut rather than showing a jarring fly-through
      if (Math.abs(camera.position.z - target.pos.z) > 18) {
        camera.position.copy(target.pos);
        lookTarget.current.copy(target.look);
        return;
      }

      // Snap Y immediately to avoid long vertical travel being visible
      if (Math.abs(camera.position.y - target.pos.y) > 8) {
        camera.position.y = target.pos.y;
        lookTarget.current.y = target.look.y;
      }

      gsap.to(lookTarget.current, {
        x: target.look.x, y: target.look.y, z: target.look.z,
        duration: 0.7, ease: 'power2.out',
      });
      activeTween.current = gsap.to(camera.position, {
        x: target.pos.x, y: target.pos.y, z: target.pos.z,
        duration: 0.7,
        ease: 'power2.out',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useFrame(() => {
    const isExterior = phase === 'exterior_approach' || phase === 'exterior_idle';

    if (isExterior) {
      const notMoving = !activeTween.current?.isActive();
      parallax.current.x += (mouseNDC.x * 1.4 - parallax.current.x) * 0.035;
      parallax.current.y += (mouseNDC.y * 0.7 - parallax.current.y) * 0.035;
      if (notMoving) {
        camera.position.x += (POS.exterior_idle.x + parallax.current.x - camera.position.x) * 0.04;
        camera.position.y += (POS.exterior_idle.y + parallax.current.y - camera.position.y) * 0.04;
      }
    }

    // Gentle parallax inside building (lobby + all floors)
    const floorIdx = FLOOR_INDEX[phase];
    if (floorIdx !== undefined && !activeTween.current?.isActive()) {
      parallax.current.x += (mouseNDC.x * 0.5 - parallax.current.x) * 0.025;
      parallax.current.y += (mouseNDC.y * 0.25 - parallax.current.y) * 0.025;
      const base = buildFloorCam(floorIdx);
      camera.position.x += (base.pos.x + parallax.current.x - camera.position.x) * 0.03;
      camera.position.y += (base.pos.y + parallax.current.y - camera.position.y) * 0.03;
    }

    camera.lookAt(lookTarget.current);
  });
}
