import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBuildingContext, FloorId } from '../context/BuildingContext';

// ─── Floor manifest ────────────────────────────────────────────────────────────
interface FloorExhibit {
  id: FloorId;
  code: string;
  title: string;
  subtitle: string;
  tag: string;
  status: 'ACTIVE' | 'SEALED' | 'RESTRICTED';
  classification: string;
}

const FLOORS: FloorExhibit[] = [
  {
    id: 'studio',
    code: 'EX-01',
    title: 'ANALYSIS STUDIO',
    subtitle: 'Dataset ingestion · SQL playground · Quality scoring',
    tag: 'FORENSIC DRAFTING ROOM',
    status: 'ACTIVE',
    classification: 'UNRESTRICTED',
  },
  {
    id: 'risk',
    code: 'EX-02',
    title: 'RISK LABORATORY',
    subtitle: 'ML risk engine · SHAP explainability · 5-fold CV',
    tag: 'UV EVIDENCE CHAMBER',
    status: 'ACTIVE',
    classification: 'CONFIDENTIAL',
  },
  {
    id: 'detective',
    code: 'EX-03',
    title: 'DETECTIVE OFFICE',
    subtitle: 'AML investigation · Entity mapping · SAR filing',
    tag: 'CASE OPERATIONS',
    status: 'ACTIVE',
    classification: 'RESTRICTED',
  },
  {
    id: 'vault',
    code: 'EX-04',
    title: 'CHAIN VAULT',
    subtitle: 'Sealed audit trail · Hash provenance · Archive',
    tag: 'PERMANENT RECORD',
    status: 'SEALED',
    classification: 'TOP SECRET',
  },
];

// ─── Tab button ────────────────────────────────────────────────────────────────
function ExhibitTab({
  floor,
  isSelected,
  onClick,
}: {
  floor: FloorExhibit;
  isSelected: boolean;
  onClick: () => void;
}) {
  const statusColor =
    floor.status === 'ACTIVE'
      ? '#1c6e4a'
      : floor.status === 'SEALED'
      ? '#a8842c'
      : '#c2331f';

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: isSelected ? 0 : 4 }}
      transition={{ duration: 0.15 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '10px 14px',
        background: isSelected ? 'rgba(243,238,226,0.96)' : 'rgba(243,238,226,0.72)',
        border: 'none',
        borderLeft: isSelected ? '3px solid #c2331f' : '3px solid transparent',
        borderBottom: '1px solid rgba(20,18,11,0.12)',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'background 0.2s',
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 9,
            color: 'rgba(74,68,52,0.55)',
            letterSpacing: '0.05em',
          }}
        >
          {floor.code}
        </span>
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 8,
            color: statusColor,
            letterSpacing: '0.08em',
            border: `1px solid ${statusColor}`,
            padding: '1px 4px',
          }}
        >
          {floor.status}
        </span>
      </div>
      <span
        style={{
          fontFamily: '"Fraunces", Georgia, serif',
          fontWeight: 900,
          fontSize: 11,
          color: '#14120b',
          letterSpacing: '0.04em',
        }}
      >
        {floor.title}
      </span>
      <span
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 7.5,
          color: 'rgba(74,68,52,0.6)',
          lineHeight: 1.4,
        }}
      >
        {floor.tag}
      </span>
    </motion.button>
  );
}

// ─── Exhibit card detail panel ─────────────────────────────────────────────────
function ExhibitCard({
  floor,
  onEnter,
}: {
  floor: FloorExhibit;
  onEnter: () => void;
}) {
  return (
    <motion.div
      key={floor.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{
        padding: '16px 18px',
        background: 'rgba(243,238,226,0.96)',
        borderTop: '1px solid rgba(20,18,11,0.1)',
      }}
    >
      {/* Classification banner */}
      <div
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 8,
          color: '#c2331f',
          letterSpacing: '0.14em',
          marginBottom: 10,
          borderBottom: '1px solid rgba(194,51,31,0.22)',
          paddingBottom: 6,
        }}
      >
        ◆ CLASSIFICATION: {floor.classification} ◆
      </div>

      {/* Title block */}
      <div
        style={{
          fontFamily: '"Fraunces", Georgia, serif',
          fontWeight: 900,
          fontSize: 18,
          color: '#14120b',
          lineHeight: 1.2,
          marginBottom: 4,
          letterSpacing: '0.02em',
        }}
      >
        {floor.title}
      </div>
      <div
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 9,
          color: 'rgba(74,68,52,0.65)',
          marginBottom: 14,
          lineHeight: 1.5,
        }}
      >
        {floor.subtitle}
      </div>

      {/* Divider rule */}
      <div
        style={{
          width: '100%',
          height: 1,
          background: 'rgba(20,18,11,0.14)',
          marginBottom: 14,
        }}
      />

      {/* Enter button */}
      <motion.button
        onClick={onEnter}
        whileHover={{ letterSpacing: '0.18em' }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.18 }}
        style={{
          width: '100%',
          padding: '9px 0',
          background: '#14120b',
          color: '#f3eee2',
          border: 'none',
          cursor: 'pointer',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        ENTER EXHIBIT →
      </motion.button>
    </motion.div>
  );
}

// ─── Main overlay ──────────────────────────────────────────────────────────────
export default function DossierNav() {
  const { phase, teleportTo, currentFloor } = useBuildingContext();
  const [selected, setSelected] = useState<FloorId | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Only visible in lobby and floor phases
  const visible =
    phase === 'lobby' ||
    phase === 'floor_studio' ||
    phase === 'floor_risk' ||
    phase === 'floor_detective' ||
    phase === 'floor_vault';

  if (!visible) return null;

  const handleEnter = (floorId: FloorId) => {
    setIsOpen(false);
    setSelected(null);
    teleportTo(floorId);
  };

  return (
    <div style={{ position: 'fixed', left: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 120 }}>
    <motion.div
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ delay: 0.6, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width: 228,
        boxShadow: '4px 0 24px rgba(20,18,11,0.22)',
      }}
    >
      {/* Folder tab trigger */}
      <button
        onClick={() => setIsOpen(v => !v)}
        style={{
          position: 'absolute',
          right: -36,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 36,
          height: 80,
          background: 'rgba(243,238,226,0.92)',
          border: 'none',
          borderLeft: 'none',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          boxShadow: '3px 0 12px rgba(20,18,11,0.18)',
        }}
      >
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 7,
            color: '#14120b',
            letterSpacing: '0.06em',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
          }}
        >
          DOSSIER
        </span>
        <span style={{ color: '#c2331f', fontSize: 10 }}>
          {isOpen ? '◀' : '▶'}
        </span>
      </button>

      {/* Sliding panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              background: 'rgba(243,238,226,0.96)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(20,18,11,0.14)',
              overflow: 'hidden',
            }}
          >
            {/* Panel header */}
            <div
              style={{
                padding: '10px 14px',
                background: '#14120b',
                borderBottom: '2px solid #c2331f',
              }}
            >
              <div
                style={{
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontWeight: 900,
                  fontSize: 12,
                  color: '#f3eee2',
                  letterSpacing: '0.06em',
                }}
              >
                VERITA EXHIBITS
              </div>
              <div
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 8,
                  color: 'rgba(243,238,226,0.5)',
                  marginTop: 2,
                  letterSpacing: '0.08em',
                }}
              >
                {currentFloor
                  ? `CURRENT: ${currentFloor.toUpperCase()}`
                  : 'SELECT AN EXHIBIT'}
              </div>
            </div>

            {/* Exhibit tabs */}
            <div>
              {FLOORS.map(floor => (
                <div key={floor.id}>
                  <ExhibitTab
                    floor={floor}
                    isSelected={selected === floor.id}
                    onClick={() =>
                      setSelected(selected === floor.id ? null : floor.id)
                    }
                  />
                  <AnimatePresence>
                    {selected === floor.id && (
                      <ExhibitCard
                        floor={floor}
                        onEnter={() => handleEnter(floor.id)}
                      />
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Footer stamp */}
            <div
              style={{
                padding: '8px 14px',
                borderTop: '1px solid rgba(20,18,11,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 7.5,
                  color: 'rgba(74,68,52,0.45)',
                  letterSpacing: '0.06em',
                }}
              >
                CASE NO. V-{new Date().getFullYear()}-001
              </span>
              <span
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 7.5,
                  color: '#1c6e4a',
                  letterSpacing: '0.06em',
                }}
              >
                VERIFIED
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
    </div>
  );
}
