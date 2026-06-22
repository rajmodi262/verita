import { motion, AnimatePresence } from 'framer-motion';
import { useBuildingContext, FloorId } from '../context/BuildingContext';

// ─── Floor registry ────────────────────────────────────────────────────────────
interface FloorStop {
  id: FloorId;
  number: string;
  label: string;
  sublabel: string;
}

const STOPS: FloorStop[] = [
  { id: 'rooftop',   number: 'RT', label: 'ROOFTOP',  sublabel: 'Observation Deck' },
  { id: 'vault',     number: '04', label: 'VAULT',     sublabel: 'Chain Archive' },
  { id: 'detective', number: '03', label: 'DETECTIVE', sublabel: 'Case Operations' },
  { id: 'risk',      number: '02', label: 'RISK LAB',  sublabel: 'UV Evidence' },
  { id: 'studio',    number: '01', label: 'STUDIO',    sublabel: 'Forensic Drafting' },
  { id: 'lobby',     number: 'L',  label: 'LOBBY',     sublabel: 'Grand Hall' },
];

// ─── Floor indicator dot ──────────────────────────────────────────────────────
function FloorButton({
  stop,
  isCurrent,
  isReachable,
  onClick,
}: {
  stop: FloorStop;
  isCurrent: boolean;
  isReachable: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={!isReachable || isCurrent}
      whileHover={isReachable && !isCurrent ? { x: -4 } : {}}
      whileTap={isReachable && !isCurrent ? { scale: 0.94 } : {}}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 10px',
        background: 'transparent',
        border: 'none',
        cursor: isReachable && !isCurrent ? 'pointer' : 'default',
        opacity: isReachable ? 1 : 0.35,
        width: '100%',
      }}
    >
      {/* Floor number pill */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 2,
          background: isCurrent ? '#c2331f' : 'rgba(243,238,226,0.14)',
          border: isCurrent
            ? '1px solid #c2331f'
            : '1px solid rgba(243,238,226,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 0.2s, border 0.2s',
        }}
      >
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            fontWeight: 700,
            color: isCurrent ? '#f3eee2' : 'rgba(243,238,226,0.7)',
            letterSpacing: 0,
          }}
        >
          {stop.number}
        </span>
      </div>

      {/* Label */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 9,
            fontWeight: 700,
            color: isCurrent ? '#f3eee2' : 'rgba(243,238,226,0.7)',
            letterSpacing: '0.08em',
          }}
        >
          {stop.label}
        </span>
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 7.5,
            color: isCurrent ? 'rgba(243,238,226,0.7)' : 'rgba(243,238,226,0.38)',
            letterSpacing: '0.04em',
          }}
        >
          {stop.sublabel}
        </span>
      </div>

      {/* Active arrow */}
      {isCurrent && (
        <motion.span
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            marginLeft: 'auto',
            color: '#c2331f',
            fontSize: 10,
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          ◀
        </motion.span>
      )}
    </motion.button>
  );
}

// ─── Traveling indicator ──────────────────────────────────────────────────────
function TravelIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 0.9, repeat: Infinity }}
      style={{
        padding: '8px 10px',
        borderTop: '1px solid rgba(243,238,226,0.1)',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 8,
        color: '#a8842c',
        letterSpacing: '0.1em',
        textAlign: 'center',
      }}
    >
      ▲ TRAVELING ▲
    </motion.div>
  );
}

// ─── ElevatorHUD ─────────────────────────────────────────────────────────────
export default function ElevatorHUD() {
  const { phase, currentFloor, teleportTo, isTransitioning } = useBuildingContext();

  // Only show inside the building
  const visible =
    phase === 'lobby' ||
    phase === 'floor_studio' ||
    phase === 'floor_risk' ||
    phase === 'floor_detective' ||
    phase === 'floor_vault' ||
    phase === 'rooftop' ||
    phase === 'elevator_traveling' ||
    phase === 'teleporting';

  const activeFlorId: FloorId =
    phase === 'lobby' ? 'lobby'
    : phase === 'rooftop' ? 'rooftop'
    : phase === 'elevator_traveling' || phase === 'teleporting'
      ? (currentFloor ?? 'lobby')
    : (phase.replace('floor_', '') as FloorId);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ x: 200, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 200, opacity: 0 }}
          transition={{ delay: 0.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          transformTemplate={(_, gen) => `translateY(-50%) ${gen}`}
          style={{
            position: 'fixed',
            right: 0,
            top: '50%',
            zIndex: 120,
            width: 170,
          }}
        >
          {/* Rail panel */}
          <div
            style={{
              background: 'rgba(20,18,11,0.88)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(243,238,226,0.1)',
              borderRight: 'none',
              boxShadow: '-4px 0 24px rgba(20,18,11,0.4)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '8px 10px',
                borderBottom: '1px solid rgba(243,238,226,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 8,
                  color: 'rgba(243,238,226,0.4)',
                  letterSpacing: '0.1em',
                }}
              >
                ELEVATOR
              </span>
              <span
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 8,
                  color: '#a8842c',
                  letterSpacing: '0.06em',
                }}
              >
                VERITA
              </span>
            </div>

            {/* Floor stops */}
            <div style={{ padding: '4px 0' }}>
              {STOPS.map(stop => (
                <FloorButton
                  key={stop.id}
                  stop={stop}
                  isCurrent={activeFlorId === stop.id}
                  isReachable={!isTransitioning && stop.id !== activeFlorId}
                  onClick={() => teleportTo(stop.id)}
                />
              ))}
            </div>

            {/* Traveling indicator */}
            {(phase === 'elevator_traveling' || phase === 'teleporting') && (
              <TravelIndicator />
            )}

            {/* Footer chain seal */}
            <div
              style={{
                padding: '6px 10px',
                borderTop: '1px solid rgba(243,238,226,0.07)',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 7,
                  color: 'rgba(168,132,44,0.5)',
                  letterSpacing: '0.08em',
                }}
              >
                ◈ CHAIN SEALED ◈
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
