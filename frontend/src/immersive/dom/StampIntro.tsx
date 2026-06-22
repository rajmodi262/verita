import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';

interface StampIntroProps {
  onComplete: () => void;
}

export default function StampIntro({ onComplete }: StampIntroProps) {
  const [visible, setVisible] = useState(true);
  const [stampGone, setStampGone] = useState(false);
  const [inkProgress, setInkProgress] = useState(0);
  const [taglineVisible, setTaglineVisible] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stampWrapRef = useRef<HTMLDivElement>(null);
  const stampInnerRef = useRef<HTMLDivElement>(null);
  const noisePointsRef = useRef<[number, number][]>([]);

  // Pre-compute the noisy ink-circle edge once
  useEffect(() => {
    const N = 480;
    const pts: [number, number][] = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      // Multiple sine harmonics → organic rubber-stamp edge
      const n =
        1.0
        + Math.sin(a * 3.7) * 0.034
        + Math.cos(a * 7.1) * 0.026
        + Math.sin(a * 11.3) * 0.018
        + Math.cos(a * 17.9) * 0.012
        + Math.sin(a * 23.3) * 0.008
        + Math.cos(a * 31.1) * 0.005;
      pts.push([Math.cos(a) * n, Math.sin(a) * n]);
    }
    noisePointsRef.current = pts;
  }, []);

  // Size canvas to viewport
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f3eee2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Redraw canvas on every ink tick
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    ctx.fillStyle = '#f3eee2';
    ctx.fillRect(0, 0, W, H);

    if (inkProgress <= 0) return;

    // Max radius reaches the furthest corner
    const maxR = Math.sqrt(cx * cx + cy * cy) * 1.28;
    const r = inkProgress * maxR;

    const pts = noisePointsRef.current;
    ctx.beginPath();
    ctx.moveTo(cx + pts[0][0] * r, cy + pts[0][1] * r);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(cx + pts[i][0] * r, cy + pts[i][1] * r);
    }
    ctx.closePath();
    ctx.fillStyle = '#14120b';
    ctx.fill();
  }, [inkProgress]);

  // Full animation sequence
  // NOTE: no startedRef — that pattern breaks in React Strict Mode (effect
  // runs twice; the guard fires on run 2, killing the animation permanently).
  // Instead we use a `killed` closure flag so cleanup cancels cleanly and
  // the second (real) run starts fresh.
  useEffect(() => {
    let killed = false;

    gsap.set(stampInnerRef.current, { y: -180, opacity: 1 });

    const runSequence = () => {
      if (killed) return;
      // 1. Stamp descends
      gsap.to(stampInnerRef.current, {
        y: 0,
        duration: 0.30,
        ease: 'power3.in',
        onComplete: () => {
          if (killed) return;
          // 2. Impact squash
          gsap.to(stampInnerRef.current, {
            scaleX: 1.06,
            scaleY: 0.91,
            duration: 0.06,
            ease: 'power2.out',
            yoyo: true,
            repeat: 1,
            onComplete: () => {
              if (killed) return;
              // 3. Stamp fades out instantly — ink takes over
              gsap.to(stampInnerRef.current, {
                opacity: 0,
                duration: 0.10,
                onComplete: () => { if (!killed) setStampGone(true); },
              });

              // 4. Ink spreads from center
              const obj = { p: 0 };
              gsap.to(obj, {
                p: 1,
                duration: 1.30,
                ease: 'power2.out',
                onUpdate: () => { if (!killed) setInkProgress(obj.p); },
                onComplete: () => {
                  if (killed) return;
                  // 5. Tagline fades in
                  setTimeout(() => { if (!killed) setTaglineVisible(true); }, 160);
                  // 6. Hold → whole overlay fades out
                  setTimeout(() => {
                    if (killed) return;
                    setVisible(false);
                    setTimeout(() => { if (!killed) onComplete(); }, 720);
                  }, 1850);
                },
              });
            },
          });
        },
      });
    };

    const t = setTimeout(runSequence, 160);
    return () => {
      killed = true;
      clearTimeout(t);
      gsap.killTweensOf(stampInnerRef.current);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.72, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            overflow: 'hidden',
            cursor: 'none',
          }}
        >
          {/* Ink diffusion canvas — full-screen paper that fills with ink */}
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
            }}
          />

          {/* VERITA text — cream, invisible on cream paper, revealed by dark ink */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 1,
              userSelect: 'none',
            }}
          >
            <div
              style={{
                fontFamily: '"Fraunces", Georgia, serif',
                fontWeight: 900,
                fontSize: 'clamp(5rem, 12vw, 10rem)',
                color: '#f3eee2',
                letterSpacing: '-0.025em',
                lineHeight: 1,
              }}
            >
              VERITA
            </div>

            <AnimatePresence>
              {taglineVisible && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.42, ease: 'easeOut' }}
                  style={{
                    marginTop: 20,
                    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                    fontSize: '0.65rem',
                    letterSpacing: '0.30em',
                    color: '#f3eee2',
                    textTransform: 'uppercase',
                  }}
                >
                  FORENSIC FINANCIAL INTELLIGENCE
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* The stamp — centering wrapper + GSAP-animated inner */}
          {!stampGone && (
            <div
              ref={stampWrapRef}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 2,
                pointerEvents: 'none',
              }}
            >
              <div ref={stampInnerRef} style={{ display: 'inline-block' }}>
                <div
                  style={{
                    padding: '16px 40px',
                    border: '5px double #c2331f',
                    borderRadius: 3,
                    background: 'rgba(194,51,31,0.04)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: '"Fraunces", Georgia, serif',
                      fontWeight: 900,
                      fontSize: 'clamp(3.5rem, 9vw, 7.5rem)',
                      color: '#c2331f',
                      letterSpacing: '-0.025em',
                      lineHeight: 1,
                      display: 'block',
                    }}
                  >
                    VERITA
                  </span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
