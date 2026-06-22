import { motion, AnimatePresence } from 'framer-motion';
import { useBuildingContext } from '../context/BuildingContext';

export default function ExteriorHint() {
  const { phase } = useBuildingContext();
  const visible = phase === 'exterior_idle';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="ext-hint"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ delay: 0.9, duration: 0.55, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            bottom: 36,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            pointerEvents: 'none',
          }}
        >
          {/* Door icon sketch */}
          <svg width="28" height="36" viewBox="0 0 28 36" fill="none" style={{ opacity: 0.55 }}>
            <rect x="2" y="2" width="11" height="32" rx="0.5" stroke="#14120b" strokeWidth="1.2" />
            <rect x="15" y="2" width="11" height="32" rx="0.5" stroke="#14120b" strokeWidth="1.2" />
            <circle cx="12" cy="18" r="1.4" fill="#14120b" />
            <circle cx="16" cy="18" r="1.4" fill="#14120b" />
            <line x1="0" y1="34" x2="28" y2="34" stroke="#14120b" strokeWidth="1.2" />
          </svg>

          {/* Label */}
          <div style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 9,
            letterSpacing: '0.16em',
            color: 'rgba(20,18,11,0.5)',
            textTransform: 'uppercase',
          }}>
            Click the doors to enter
          </div>

          {/* Pulse arrow */}
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3], y: [0, -3, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 8,
              color: 'rgba(168,132,44,0.65)',
              letterSpacing: '0.12em',
            }}
          >
            ↑
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
