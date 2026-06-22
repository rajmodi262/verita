import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface PreloaderProps {
  sceneReady: boolean;
  onComplete: () => void;
}

const MESSAGES = [
  'INITIALISING FORENSIC SYSTEMS',
  'LOADING EVIDENCE ARCHIVE',
  'COMPILING SHADER PROGRAMMES',
  'ESTABLISHING CHAIN OF CUSTODY',
  'CALIBRATING UV LAMP',
  'VERIFYING HASH INTEGRITY',
  'SEALING AUDIT TRAIL',
  'CLEARANCE GRANTED',
] as const;

// Deterministic pseudo-hash display — progress-driven, no Math.random in render
function buildHashDisplay(progress: number): string {
  const hex = '0123456789abcdef';
  let result = '0x';
  for (let i = 0; i < 16; i++) {
    const seed = Math.floor(progress * 997 + i * 127) % 256;
    result += hex[Math.floor(seed / 16)] + hex[seed % 16];
  }
  return result;
}

export default function Preloader({ sceneReady, onComplete }: PreloaderProps) {
  const [progress, setProgress] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const progressRef = useRef(0);
  const completedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    clearInterval(intervalRef.current);
    setVisible(false);
    setTimeout(onComplete, 680);
  }, [onComplete]);

  // Drive progress forward, stall at 83 until sceneReady
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (!sceneReady && progressRef.current >= 83) return;
      const delta = Math.random() * 9 + 3;
      progressRef.current = Math.min(progressRef.current + delta, 100);
      const p = progressRef.current;
      setProgress(p);
      setMsgIdx(Math.min(Math.floor((p / 100) * (MESSAGES.length - 1)), MESSAGES.length - 1));
      if (p >= 100) setTimeout(complete, 420);
    }, 155);
    return () => clearInterval(intervalRef.current);
  }, [sceneReady, complete]);

  // Hard failsafe of 12 seconds from mount that force-completes preloading
  useEffect(() => {
    const failsafe = setTimeout(() => {
      complete();
    }, 12_000);
    return () => clearTimeout(failsafe);
  }, [complete]);

  // Unblock when sceneReady arrives
  useEffect(() => {
    if (sceneReady && progressRef.current >= 83 && !completedRef.current) {
      clearInterval(intervalRef.current);
      progressRef.current = 100;
      setProgress(100);
      setMsgIdx(MESSAGES.length - 1);
      setTimeout(complete, 420);
    }
  }, [sceneReady, complete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.68, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: '#f3eee2',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          }}
        >
          {/* Ledger ruled lines */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              backgroundImage:
                'repeating-linear-gradient(transparent, transparent 27px, rgba(20,18,11,0.09) 28px)',
              backgroundSize: '100% 28px',
            }}
          />

          {/* Left margin red rule — ledger authenticity */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 72,
              width: 1,
              background: 'rgba(194,51,31,0.25)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            {/* Wordmark */}
            <div
              style={{
                fontFamily: '"Fraunces", Georgia, serif',
                fontWeight: 900,
                fontSize: '2.8rem',
                color: '#14120b',
                letterSpacing: '-0.02em',
                lineHeight: 1,
                marginBottom: 52,
              }}
            >
              VERITA
            </div>

            {/* Progress track */}
            <div
              style={{
                width: 312,
                height: 1,
                background: 'rgba(20,18,11,0.2)',
                position: 'relative',
                margin: '0 auto 16px',
              }}
            >
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  background: '#14120b',
                }}
              />
              {/* Leading tick */}
              <motion.div
                animate={{ left: `${progress}%` }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  top: -3,
                  width: 1,
                  height: 7,
                  background: '#14120b',
                  transform: 'translateX(-50%)',
                }}
              />
            </div>

            {/* Message + percent */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: 312,
                margin: '0 auto',
                fontSize: '0.6rem',
                letterSpacing: '0.2em',
                color: '#4a4434',
                textTransform: 'uppercase',
              }}
            >
              <motion.span
                key={msgIdx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.18 }}
              >
                {MESSAGES[msgIdx]}
              </motion.span>
              <span style={{ flexShrink: 0, paddingLeft: 16 }}>
                {String(Math.floor(progress)).padStart(3, '0')}%
              </span>
            </div>

            {/* Chain integrity + live hash */}
            <div style={{ marginTop: 56 }}>
              <div
                style={{
                  fontSize: '0.55rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: '#a8842c',
                  marginBottom: 8,
                }}
              >
                CHAIN INTEGRITY —{' '}
                <span style={{ color: progress >= 100 ? '#1c6e4a' : '#a8842c' }}>
                  {progress >= 100 ? 'VERIFIED ✓' : 'CHECKING…'}
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.5rem',
                  letterSpacing: '0.08em',
                  color: 'rgba(74,68,52,0.38)',
                }}
              >
                {buildHashDisplay(progress)}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
