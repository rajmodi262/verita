import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { API_BASE } from '../../config';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface LedgerEntry {
  id: string;
  type: 'ANALYSIS' | 'QUERY' | 'INVESTIGATION';
  label: string;
  status: 'VERIFIED' | 'FLAGGED' | 'PENDING';
  hash: string;
  timestamp: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shortHash(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h) ^ seed.charCodeAt(i);
  return '0x' + (h >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toISOString().replace('T', ' ').slice(0, 19) + 'Z';
  } catch {
    return iso.slice(0, 19) + 'Z';
  }
}

function tickHash(): string {
  const t = Math.floor(Date.now() / 1800);
  let h = t ^ 0xdeadbeef;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return '0x' + (h >>> 0).toString(16).padStart(8, '0').toUpperCase() + '…';
}

// ─── Backend fetch ────────────────────────────────────────────────────────────
async function fetchEntries(): Promise<LedgerEntry[]> {
  const results: LedgerEntry[] = [];
  try {
    const [ar, qr, ir] = await Promise.allSettled([
      fetch(`${API_BASE}/api/history/analyses?limit=10`).then(r => r.json()),
      fetch(`${API_BASE}/api/history/queries?limit=10`).then(r => r.json()),
      fetch(`${API_BASE}/api/history/investigations?limit=8`).then(r => r.json()),
    ]);

    if (ar.status === 'fulfilled') {
      for (const a of ar.value.analyses ?? []) {
        results.push({
          id: `A-${String(a.id).padStart(4, '0')}`,
          type: 'ANALYSIS',
          label: (a.filename || a.title || 'dataset').slice(0, 28),
          status: ['A', 'B'].includes(a.quality_grade) ? 'VERIFIED' : 'PENDING',
          hash: shortHash(`A${a.id}${a.dataset_id}`),
          timestamp: fmtTime(a.created_at || ''),
        });
      }
    }
    if (qr.status === 'fulfilled') {
      for (const q of qr.value.queries ?? []) {
        results.push({
          id: `Q-${String(q.id).padStart(4, '0')}`,
          type: 'QUERY',
          label: (q.sql || '').slice(0, 28),
          status: q.ok ? 'VERIFIED' : 'FLAGGED',
          hash: shortHash(`Q${q.id}${q.dataset_id}`),
          timestamp: fmtTime(q.created_at || ''),
        });
      }
    }
    if (ir.status === 'fulfilled') {
      for (const inv of ir.value.investigations ?? []) {
        results.push({
          id: `I-${String(inv.id).padStart(4, '0')}`,
          type: 'INVESTIGATION',
          label: (inv.goal || 'Investigation').slice(0, 28),
          status: ['CRITICAL', 'HIGH'].includes(inv.risk_level) ? 'FLAGGED' : 'VERIFIED',
          hash: inv.chain_head
            ? `0x${inv.chain_head.slice(0, 8).toUpperCase()}`
            : shortHash(`I${inv.id}`),
          timestamp: fmtTime(inv.created_at || ''),
        });
      }
    }
  } catch {
    // Backend offline — placeholder renders below
  }
  return results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// ─── Placeholder for when backend is offline ──────────────────────────────────
function placeholder(): LedgerEntry[] {
  const TYPES: LedgerEntry['type'][] = ['ANALYSIS', 'QUERY', 'INVESTIGATION'];
  const STATUSES: LedgerEntry['status'][] = ['VERIFIED', 'VERIFIED', 'FLAGGED', 'PENDING'];
  const LABELS = [
    'transactions_2026.csv', 'SELECT amount, entity…', 'AML entity screening',
    'credit_card_fraud.csv', 'SELECT * FROM flagged…', 'SAR threshold check',
    'kyc_dataset_q2.csv',   'SELECT COUNT(*) WHERE…', 'Sanctions list match',
  ];
  return Array.from({ length: 14 }, (_, i) => ({
    id: `${['A','Q','I'][i % 3]}-${String(1000 + i).padStart(4,'0')}`,
    type: TYPES[i % 3],
    label: LABELS[i % 9],
    status: STATUSES[i % 4],
    hash: shortHash(`placeholder_${i}`),
    timestamp: fmtTime(new Date(Date.now() - i * 2700000).toISOString()),
  }));
}

// ─── Canvas renderer ──────────────────────────────────────────────────────────
const CW = 720, CH = 490, LH = 21, ML = 18;

function render(ctx: CanvasRenderingContext2D, rows: LedgerEntry[], scroll: number) {
  // Paper background
  ctx.fillStyle = '#f9f4e8';
  ctx.fillRect(0, 0, CW, CH);

  // Ruled lines
  ctx.strokeStyle = 'rgba(20,18,11,0.09)';
  ctx.lineWidth = 1;
  for (let y = LH; y < CH - 26; y += LH) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke();
  }

  // Left margin red rule
  ctx.strokeStyle = 'rgba(194,51,31,0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(46, 0); ctx.lineTo(46, CH - 26); ctx.stroke();

  // Header row
  ctx.font = 'bold 10px "JetBrains Mono", monospace';
  ctx.fillStyle = '#14120b';
  ctx.fillText('VERITA — FORENSIC AUDIT LEDGER', ML + 36, 14);

  ctx.font = '8px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(74,68,52,0.55)';
  ctx.fillText('NO    ID           TIMESTAMP              TYPE            STATUS      HASH', ML + 36, 28);

  ctx.strokeStyle = 'rgba(20,18,11,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(ML, 32); ctx.lineTo(CW - ML, 32); ctx.stroke();

  // Scroll data rows
  const displayRows = rows.length > 0 ? rows : placeholder();
  const offsetY = scroll % LH;
  const startIdx = Math.floor(scroll / LH) % displayRows.length;

  for (let slot = 0; slot < 20; slot++) {
    const y = 36 + slot * LH - offsetY;
    if (y > CH - 28) break;
    const entry = displayRows[(startIdx + slot) % displayRows.length];

    // Row number
    ctx.font = '7px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(74,68,52,0.4)';
    ctx.textAlign = 'right';
    ctx.fillText(String((startIdx + slot) % displayRows.length + 1).padStart(2,'0'), 42, y);
    ctx.textAlign = 'left';

    // ID
    ctx.fillStyle = '#4a4434';
    ctx.font = '8.5px "JetBrains Mono", monospace';
    ctx.fillText(entry.id, ML + 54, y);

    // Timestamp
    ctx.fillStyle = 'rgba(74,68,52,0.65)';
    ctx.fillText(entry.timestamp, ML + 132, y);

    // Type
    ctx.fillStyle = '#14120b';
    ctx.fillText(entry.type, ML + 342, y);

    // Status stamp
    const sx = ML + 452, sy = y - 12, sh = 15;
    if (entry.status === 'VERIFIED') {
      ctx.strokeStyle = '#1c6e4a'; ctx.lineWidth = 1.2;
      ctx.strokeRect(sx, sy, 58, sh);
      ctx.fillStyle = '#1c6e4a'; ctx.font = 'bold 7.5px "JetBrains Mono", monospace';
      ctx.fillText('VERIFIED', sx + 4, sy + 10);
    } else if (entry.status === 'FLAGGED') {
      ctx.strokeStyle = '#c2331f'; ctx.lineWidth = 1.2;
      ctx.strokeRect(sx, sy, 52, sh);
      ctx.fillStyle = '#c2331f'; ctx.font = 'bold 7.5px "JetBrains Mono", monospace';
      ctx.fillText('FLAGGED', sx + 4, sy + 10);
    } else {
      ctx.fillStyle = '#a8842c'; ctx.font = '7.5px "JetBrains Mono", monospace';
      ctx.fillText('PENDING…', sx + 4, sy + 10);
    }

    // Hash
    ctx.fillStyle = 'rgba(168,132,44,0.75)';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillText(entry.hash, ML + 516, y);
  }

  // Footer
  ctx.fillStyle = 'rgba(20,18,11,0.14)';
  ctx.fillRect(0, CH - 26, CW, 26);
  ctx.fillStyle = '#1c6e4a';
  ctx.font = '8.5px "JetBrains Mono", monospace';
  ctx.fillText(`CHAIN HEAD: ${tickHash()}`, ML + 36, CH - 10);
  ctx.fillStyle = 'rgba(74,68,52,0.5)';
  ctx.fillText(`${displayRows.length} RECORDS SEALED`, CW - 175, CH - 10);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useLiveLedger(): THREE.CanvasTexture | null {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const entriesRef = useRef<LedgerEntry[]>([]);
  const scrollRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = CW;
    canvas.height = CH;

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    setTexture(tex);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('[useLiveLedger] Could not get 2D context');
      return;
    }

    const animate = () => {
      scrollRef.current += 0.35;
      render(ctx, entriesRef.current, scrollRef.current);
      tex.needsUpdate = true;
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    // Poll backend
    const poll = async () => {
      const data = await fetchEntries();
      entriesRef.current = data;
    };
    poll();
    const interval = setInterval(poll, 4000);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(interval);
      tex.dispose();
    };
  }, []);

  return texture;
}
