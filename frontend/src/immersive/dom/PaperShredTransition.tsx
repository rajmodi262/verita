import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useBuildingContext, BuildingPhase } from '../context/BuildingContext';

// ─── Paper piece data ─────────────────────────────────────────────────────────
const PIECE_COUNT = 72;
const COLORS = ['#f3eee2', '#efe8d8', '#f8f2e6', '#e8e0d0', '#f0e8d5', '#fdf6ea'];

interface Piece {
  x: number; y: number;
  vx: number; vy: number;
  w: number; h: number;
  rot: number; vrot: number;
  color: string;
  pts: [number,number][];   // polygon points relative to centre
  alpha: number;
  startX: number; startY: number;
}

function buildPieces(cw: number, ch: number): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => {
    const angle = (i / PIECE_COUNT) * Math.PI * 2 + Math.random() * 0.4;
    const dist = cw * 0.7 + Math.random() * cw * 0.3;
    const sx = cw/2 + Math.cos(angle) * dist;
    const sy = ch/2 + Math.sin(angle) * dist;
    const w = 40 + Math.random() * 80;
    const h = 30 + Math.random() * 60;
    // Torn-edge polygon (5-7 vertices)
    const verts = 5 + Math.floor(Math.random() * 3);
    const pts: [number,number][] = Array.from({ length: verts }, (_, v) => {
      const a = (v / verts) * Math.PI * 2;
      const r = (0.4 + Math.random() * 0.6) * (w/2 * 0.8 + h/2 * 0.2);
      return [Math.cos(a) * r, Math.sin(a) * r];
    });
    return {
      x: sx, y: sy,
      vx: (cw/2 - sx) * (0.8 + Math.random() * 0.5),
      vy: (ch/2 - sy) * (0.8 + Math.random() * 0.5),
      w, h,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 6,
      color: COLORS[i % COLORS.length],
      pts,
      alpha: 1,
      startX: sx, startY: sy,
    };
  });
}

function drawPieces(ctx: CanvasRenderingContext2D, pieces: Piece[]) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (const p of pieces) {
    if (p.alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.beginPath();
    ctx.moveTo(p.pts[0][0], p.pts[0][1]);
    for (let i = 1; i < p.pts.length; i++) ctx.lineTo(p.pts[i][0], p.pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,18,11,0.08)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PaperShredTransition() {
  const { phase } = useBuildingContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const piecesRef = useRef<Piece[]>([]);
  const rafRef = useRef<number>(0);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const prevPhaseRef = useRef<BuildingPhase>('preloading');
  const activeRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cw = window.innerWidth;
    let ch = window.innerHeight;
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d')!;

    const handleResize = () => {
      cw = window.innerWidth;
      ch = window.innerHeight;
      canvas.width = cw;
      canvas.height = ch;
      if (activeRef.current) {
        piecesRef.current = buildPieces(cw, ch);
      }
    };
    window.addEventListener('resize', handleResize);

    // ── Fly-in: pieces rush from edges toward centre ──────────────────────────
    const flyIn = () => {
      if (activeRef.current) return;
      activeRef.current = true;
      piecesRef.current = buildPieces(cw, ch);
      const pieces = piecesRef.current;

      // Reset to starting positions (off-screen edges)
      pieces.forEach(p => { p.x = p.startX; p.y = p.startY; p.alpha = 0; });

      canvas.style.display = 'block';
      canvas.style.pointerEvents = 'none';

      // GSAP: stagger pieces toward centre, then hold
      const proxyArr = pieces.map(p => ({
        x: p.startX, y: p.startY, rot: p.rot, alpha: 0,
      }));

      tlRef.current?.kill();
      tlRef.current = gsap.timeline();

      tlRef.current
        .to(proxyArr, {
          x: (_i: number) => cw/2 + (Math.random() - 0.5) * 120,
          y: (_i: number) => ch/2 + (Math.random() - 0.5) * 80,
          rot: (i: number) => pieces[i].rot + (Math.random() - 0.5) * Math.PI,
          alpha: 1,
          duration: 0.32,
          stagger: { each: 0.004, from: 'random' },
          ease: 'power3.in',
          onUpdate() {
            proxyArr.forEach((pp, i) => {
              pieces[i].x = pp.x;
              pieces[i].y = pp.y;
              pieces[i].rot = pp.rot;
              pieces[i].alpha = pp.alpha;
            });
          },
        });

      // RAF draw loop
      const draw = () => {
        const c2 = canvasRef.current;
        if (!c2) return;
        const cx = c2.getContext('2d')!;
        drawPieces(cx, piecesRef.current);
        rafRef.current = requestAnimationFrame(draw);
      };
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    };

    // ── Fly-out: pieces scatter from centre outward ───────────────────────────
    const flyOut = () => {
      const pieces = piecesRef.current;
      if (!pieces.length) return;
      const proxyArr = pieces.map(p => ({ x: p.x, y: p.y, rot: p.rot, alpha: p.alpha }));

      tlRef.current?.kill();
      tlRef.current = gsap.timeline({
        onComplete() {
          cancelAnimationFrame(rafRef.current);
          const c = canvasRef.current;
          if (c) c.style.display = 'none';
          activeRef.current = false;
        },
      });

      tlRef.current.to(proxyArr, {
        x: (i: number) => pieces[i].startX * 1.1 - cw * 0.05,
        y: (i: number) => pieces[i].startY * 1.1 - ch * 0.05,
        rot: (i: number) => pieces[i].rot + (Math.random() - 0.5) * Math.PI * 1.5,
        alpha: 0,
        duration: 0.38,
        stagger: { each: 0.003, from: 'random' },
        ease: 'power2.out',
        onUpdate() {
          proxyArr.forEach((pp, i) => {
            pieces[i].x = pp.x;
            pieces[i].y = pp.y;
            pieces[i].rot = pp.rot;
            pieces[i].alpha = pp.alpha;
          });
        },
      });
    };

    // Phase transitions
    const prev = prevPhaseRef.current;
    if (phase === 'teleporting' && prev !== 'teleporting') {
      flyIn();
    }
    if (prev === 'teleporting' && phase !== 'teleporting') {
      flyOut();
    }
    prevPhaseRef.current = phase;

    return () => {
      cancelAnimationFrame(rafRef.current);
      tlRef.current?.kill();
      window.removeEventListener('resize', handleResize);
    };
  }, [phase]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 115,
        display: 'none',
        pointerEvents: 'none',
      }}
    />
  );
}
