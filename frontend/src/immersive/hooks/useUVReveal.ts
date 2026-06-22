import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useBuildingContext } from '../context/BuildingContext';
import {
  createUVRevealMaterial,
  makeUVInkTex,
  drawRiskLabUVInk,
} from '../canvas/materials/uvReveal';

export function useRiskLabUVReveal() {
  const { mouseNDC } = useBuildingContext();
  const mouseRef = useRef(new THREE.Vector2(0, 0));

  const material = useMemo(() => {
    const baseMap = makeUVInkTex(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#0a0812';
      ctx.fillRect(0, 0, w, h);
      // Subtle existing grid (same as RiskLabFloor floor color)
      ctx.strokeStyle = 'rgba(125,249,255,0.18)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= w; i += 32) {
        ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(w,i); ctx.stroke();
      }
    });

    const uvMap = makeUVInkTex(512, 512, drawRiskLabUVInk);
    uvMap.repeat.set(2, 4);

    const mat = createUVRevealMaterial(baseMap, uvMap);
    return mat;
  }, []);

  useFrame(({ clock, size }) => {
    // Sync mouse NDC to shader uniform via ref (avoids re-render)
    mouseRef.current.set(mouseNDC.x, mouseNDC.y);
    material.uniforms.uMouse.value.copy(mouseRef.current);
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uAspect.value = size.width / size.height;
  });

  return material;
}
