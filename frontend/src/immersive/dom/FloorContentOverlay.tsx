import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useBuildingContext, FloorId } from '../context/BuildingContext';
import { useFloorData, FloorItem } from '../hooks/useFloorData';

// ─── Floor manifest ────────────────────────────────────────────────────────────
interface FloorMeta {
  code: string;
  title: string;
  subtitle: string;
  classification: string;
  route: string;
  cta: string;
  accent: string;
  dataLabel: string;
}

const FLOOR_META: Record<string, FloorMeta> = {
  studio: {
    code: 'EX-01', title: 'ANALYSIS STUDIO', subtitle: 'Forensic Drafting Room',
    classification: 'UNRESTRICTED', route: '/studio', cta: 'OPEN ANALYSIS STUDIO',
    accent: '#a8842c', dataLabel: 'RECENT DATASETS',
  },
  risk: {
    code: 'EX-02', title: 'RISK LABORATORY', subtitle: 'UV Evidence Chamber',
    classification: 'CONFIDENTIAL', route: '/risk', cta: 'OPEN RISK ENGINE',
    accent: '#7df9ff', dataLabel: 'ACTIVE CASES',
  },
  detective: {
    code: 'EX-03', title: 'DETECTIVE OFFICE', subtitle: 'Case Operations',
    classification: 'RESTRICTED', route: '/nlp', cta: 'OPEN NLP INSIGHT',
    accent: '#c2331f', dataLabel: 'RECENT QUERIES',
  },
  vault: {
    code: 'EX-04', title: 'CHAIN VAULT', subtitle: 'Permanent Record',
    classification: 'TOP SECRET',
    route: '/overview',   // TODO: replace with '/audit' once route exists
    cta: 'OPEN AUDIT VAULT',
    accent: '#a8842c', dataLabel: 'SEALED RECORDS',
  },
  rooftop: {
    code: 'RT-00', title: 'OBSERVATION DECK', subtitle: 'System Overview',
    classification: 'DIRECTOR ONLY', route: '/overview', cta: 'ENTER PLATFORM',
    accent: '#ffd080', dataLabel: 'SYSTEM STATUS',
  },
};

// ─── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, accent }: { status: FloorItem['status']; accent: string }) {
  const cfg = {
    VERIFIED: { color: '#1c6e4a', label: '✓ VERIFIED' },
    FLAGGED:  { color: '#c2331f', label: '⚠ FLAGGED'  },
    PENDING:  { color: '#a8842c', label: '◌ PENDING'   },
  }[status];
  return (
    <span style={{
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 7,
      letterSpacing: '0.08em',
      color: cfg.color,
      border: `1px solid ${cfg.color}`,
      padding: '1px 5px',
      flexShrink: 0,
    }}>
      {cfg.label}
    </span>
  );
}

// ─── Data row ─────────────────────────────────────────────────────────────────
function DataRow({ item, accent }: { item: FloorItem; accent: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 0',
      borderBottom: '1px solid rgba(20,18,11,0.08)',
    }}>
      {/* Row key */}
      <span style={{
        fontFamily: '"JetBrains Mono", monospace', fontSize: 7.5,
        color: 'rgba(74,68,52,0.45)', width: 42, flexShrink: 0,
      }}>
        {item.key}
      </span>
      {/* Label */}
      <span style={{
        fontFamily: '"JetBrains Mono", monospace', fontSize: 8.5,
        color: '#14120b', flex: 1,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {item.label}
      </span>
      {/* Score bar */}
      <div style={{
        width: 48, height: 4, background: 'rgba(20,18,11,0.12)',
        flexShrink: 0, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, right: `${(1 - item.score) * 100}%`,
          background: accent, opacity: 0.7,
        }} />
      </div>
      {/* Meta */}
      <span style={{
        fontFamily: '"JetBrains Mono", monospace', fontSize: 7.5,
        color: 'rgba(74,68,52,0.55)', width: 60, flexShrink: 0, textAlign: 'right',
      }}>
        {item.meta}
      </span>
      <StatusBadge status={item.status} accent={accent} />
    </div>
  );
}

// ─── Exit flash overlay ────────────────────────────────────────────────────────
function ExitFlash({ color, onDone }: { color: string; onDone: () => void }) {
  return (
    <motion.div
      key="exit-flash"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22, ease: 'easeIn' }}
      onAnimationComplete={onDone}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: color, pointerEvents: 'none',
      }}
    />
  );
}

// ─── Main overlay ──────────────────────────────────────────────────────────────
export default function FloorContentOverlay() {
  const { phase, currentFloor, isTransitioning } = useBuildingContext();
  const navigate = useNavigate();
  const [exiting, setExiting] = useState(false);
  const [exitColor, setExitColor] = useState('#f3eee2');

  // Determine active floor from phase
  const activeFloor: FloorId | null =
    phase === 'floor_studio'    ? 'studio'    :
    phase === 'floor_risk'      ? 'risk'      :
    phase === 'floor_detective' ? 'detective' :
    phase === 'floor_vault'     ? 'vault'     :
    phase === 'rooftop'         ? 'rooftop'   :
    null;

  const meta = activeFloor ? FLOOR_META[activeFloor] : null;
  const data = useFloorData(activeFloor);

  const visible = !!activeFloor && !isTransitioning && phase !== 'teleporting';

  const handleEnter = useCallback(() => {
    if (!meta) return;
    setExitColor(meta.accent === '#7df9ff' ? '#050818' : meta.accent);
    setExiting(true);
  }, [meta]);

  const handleFlashDone = useCallback(() => {
    if (!meta) return;
    navigate(meta.route);
  }, [meta, navigate]);

  if (!meta) return null;

  return (
    <>
      {exiting && <ExitFlash color={exitColor} onDone={handleFlashDone} />}

      <AnimatePresence>
        {visible && !exiting && (
          <motion.div
            key={activeFloor}
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ delay: 0.35, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 228,        // clear DossierNav
              right: 175,       // clear ElevatorHUD
              zIndex: 118,
              background: 'rgba(243,238,226,0.96)',
              backdropFilter: 'blur(6px)',
              borderTop: `2px solid ${meta.accent}`,
              boxShadow: '0 -4px 32px rgba(20,18,11,0.22)',
              padding: '12px 20px',
            }}
          >
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                <span style={{
                  fontFamily: '"JetBrains Mono", monospace', fontSize: 8,
                  color: meta.accent, letterSpacing: '0.1em',
                }}>
                  {meta.code}
                </span>
                <span style={{
                  fontFamily: '"Fraunces", Georgia, serif', fontWeight: 900,
                  fontSize: 14, color: '#14120b', letterSpacing: '0.04em',
                }}>
                  {meta.title}
                </span>
                <span style={{
                  fontFamily: '"JetBrains Mono", monospace', fontSize: 8,
                  color: 'rgba(74,68,52,0.55)', letterSpacing: '0.05em',
                }}>
                  — {meta.subtitle}
                </span>
              </div>
              <span style={{
                fontFamily: '"JetBrains Mono", monospace', fontSize: 7,
                color: '#c2331f', letterSpacing: '0.12em',
                border: '1px solid rgba(194,51,31,0.4)', padding: '2px 7px',
              }}>
                ◆ {meta.classification}
              </span>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(20,18,11,0.1)', marginBottom: 8 }} />

            {/* Data section */}
            <div style={{ display: 'flex', gap: 24 }}>
              {/* Items list */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: '"JetBrains Mono", monospace', fontSize: 7.5,
                  color: 'rgba(74,68,52,0.5)', letterSpacing: '0.1em',
                  marginBottom: 4,
                }}>
                  {meta.dataLabel}
                </div>
                {data.items.length === 0 ? (
                  <div style={{
                    fontFamily: '"JetBrains Mono", monospace', fontSize: 8,
                    color: 'rgba(74,68,52,0.45)', padding: '6px 0',
                  }}>
                    {data.summary}
                  </div>
                ) : (
                  data.items.slice(0, 4).map(item => (
                    <DataRow key={item.key} item={item} accent={meta.accent} />
                  ))
                )}
              </div>

              {/* Summary + CTA */}
              <div style={{
                display: 'flex', flexDirection: 'column',
                justifyContent: 'space-between', flexShrink: 0, width: 220,
              }}>
                <div style={{
                  fontFamily: '"JetBrains Mono", monospace', fontSize: 7.5,
                  color: 'rgba(74,68,52,0.55)', lineHeight: 1.6,
                  marginBottom: 8,
                }}>
                  {data.summary}
                </div>

                {/* CTA */}
                <motion.button
                  onClick={handleEnter}
                  whileHover={{ letterSpacing: '0.18em', background: '#14120b' }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    padding: '10px 14px',
                    background: '#14120b',
                    color: '#f3eee2',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 9.5,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                  }}
                >
                  <span>{meta.cta}</span>
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                    style={{ color: meta.accent }}
                  >
                    →
                  </motion.span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
