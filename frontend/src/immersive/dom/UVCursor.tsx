import { useEffect, useRef, useState } from 'react';
import { useBuildingContext } from '../context/BuildingContext';
import { useMouseNDC } from '../hooks/useMouseNDC';

export default function UVCursor() {
  const { setMouseNDC, uvActive } = useBuildingContext();

  const [pos, setPos] = useState({ x: -200, y: -200 });
  const [hovering, setHovering] = useState(false);
  const [clicking, setClicking] = useState(false);

  // Lagged halo position — RAF spring, not framer-motion, for zero overhead
  const laggedRef = useRef({ x: -200, y: -200 });
  const targetRef = useRef({ x: -200, y: -200 });
  const rafRef = useRef<number>(0);
  const [laggedPos, setLaggedPos] = useState({ x: -200, y: -200 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
      setPos({ x: e.clientX, y: e.clientY });
      setHovering(!!(e.target as HTMLElement).closest('a, button, [data-interactive]'));
    };
    const handleDown = () => setClicking(true);
    const handleUp = () => setClicking(false);

    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  // Spring lag for the outer halo ring
  useEffect(() => {
    const tick = () => {
      const SPEED = 0.09;
      const t = targetRef.current;
      const l = laggedRef.current;
      const dx = t.x - l.x;
      const dy = t.y - l.y;

      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
        const nx = l.x + dx * SPEED;
        const ny = l.y + dy * SPEED;
        laggedRef.current = { x: nx, y: ny };
        setLaggedPos({ x: nx, y: ny });
      } else if (l.x !== t.x || l.y !== t.y) {
        laggedRef.current = { x: t.x, y: t.y };
        setLaggedPos({ x: t.x, y: t.y });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Feed NDC coords to context for Three.js shader uniforms
  useMouseNDC(setMouseNDC);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

  const haloSize = clicking ? 68 : hovering ? 116 : 88;
  const opacity = uvActive ? 1 : 0.45;
  const half = haloSize / 2;

  return (
    <>
      {/* Outer UV halo — spring-lagged, blend: screen */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 9999,
          pointerEvents: 'none',
          transform: `translate(${laggedPos.x - half}px, ${laggedPos.y - half}px)`,
          width: haloSize,
          height: haloSize,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(125,249,255,0.16) 0%, rgba(125,249,255,0.07) 55%, transparent 100%)',
          border: '1px solid rgba(125,249,255,0.28)',
          boxShadow: '0 0 22px 8px rgba(125,249,255,0.09)',
          mixBlendMode: 'screen',
          opacity,
          transition: 'width 0.14s ease, height 0.14s ease, opacity 0.35s ease',
          willChange: 'transform',
        }}
      />

      {/* Inner UV dot — exact position, no lag */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 9999,
          pointerEvents: 'none',
          transform: `translate(${pos.x - 4}px, ${pos.y - 4}px)`,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#7df9ff',
          boxShadow: '0 0 10px 4px rgba(125,249,255,0.65)',
          opacity,
          transition: 'opacity 0.35s ease',
          willChange: 'transform',
        }}
      />
    </>
  );
}
