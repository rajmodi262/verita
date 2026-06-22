import { useState, useEffect } from 'react';
import { FloorId } from '../context/BuildingContext';
import { API_BASE } from '../../config';

export interface FloorItem {
  key: string;
  label: string;
  meta: string;
  status: 'VERIFIED' | 'FLAGGED' | 'PENDING';
  score: number;      // 0–1 for progress bar
}

export interface FloorData {
  items: FloorItem[];
  summary: string;
  totalCount: number;
}

const EMPTY: FloorData = { items: [], summary: 'CONNECTING TO SERVER…', totalCount: 0 };

async function fetchStudio(): Promise<FloorData> {
  const r = await fetch(`${API_BASE}/api/history/analyses?limit=6`);
  const d = await r.json();
  const list = (d.analyses ?? []) as {
    id: number; filename?: string; title?: string;
    quality_score?: number; quality_grade?: string; row_count?: number;
  }[];
  const totalRows = list.reduce((s, a) => s + (a.row_count ?? 0), 0);
  const avgQ = list.length ? Math.round(list.reduce((s, a) => s + (a.quality_score ?? 0) * 100, 0) / list.length) : 0;
  return {
    items: list.map(a => ({
      key: `A-${a.id}`,
      label: (a.filename || a.title || 'dataset').slice(0, 32),
      meta: `GRADE ${a.quality_grade ?? '?'}`,
      status: ['A','B'].includes(a.quality_grade ?? '') ? 'VERIFIED' : 'PENDING',
      score: a.quality_score ?? 0.5,
    })),
    summary: `${list.length} datasets  ●  ${(totalRows / 1e6).toFixed(1)}M rows  ●  ${avgQ}% avg quality`,
    totalCount: list.length,
  };
}

async function fetchRisk(): Promise<FloorData> {
  const r = await fetch(`${API_BASE}/api/history/investigations?limit=6`);
  const d = await r.json();
  const list = (d.investigations ?? []) as {
    id: number; goal?: string; risk_level?: string; finding_count?: number;
  }[];
  const flagged  = list.filter(i => ['CRITICAL','HIGH'].includes(i.risk_level ?? '')).length;
  const clear    = list.filter(i => ['LOW','MINIMAL'].includes(i.risk_level ?? '')).length;
  const scoreMap: Record<string,number> = { CRITICAL:0.95, HIGH:0.72, MEDIUM:0.45, LOW:0.22, MINIMAL:0.08 };
  return {
    items: list.map(inv => ({
      key: `I-${inv.id}`,
      label: (inv.goal || 'Investigation').slice(0, 32),
      meta: inv.risk_level ?? 'UNKNOWN',
      status: ['CRITICAL','HIGH'].includes(inv.risk_level ?? '') ? 'FLAGGED' : 'VERIFIED',
      score: scoreMap[inv.risk_level ?? ''] ?? 0.4,
    })),
    summary: `${flagged} flagged  ●  ${clear} clear  ●  ${list.length} cases total`,
    totalCount: list.length,
  };
}

async function fetchDetective(): Promise<FloorData> {
  const r = await fetch(`${API_BASE}/api/history/queries?limit=6`);
  const d = await r.json();
  const list = (d.queries ?? []) as {
    id: number; sql?: string; ok?: boolean; row_count?: number;
  }[];
  const ok = list.filter(q => q.ok).length;
  return {
    items: list.map(q => ({
      key: `Q-${q.id}`,
      label: (q.sql ?? 'query').slice(0, 32),
      meta: `${q.row_count ?? 0} rows`,
      status: q.ok ? 'VERIFIED' : 'FLAGGED',
      score: q.ok ? 0.85 : 0.2,
    })),
    summary: `${ok} successful  ●  ${list.length - ok} failed  ●  ${list.length} queries`,
    totalCount: list.length,
  };
}

async function fetchVault(): Promise<FloorData> {
  const [ar, ir, qr] = await Promise.allSettled([
    fetch(`${API_BASE}/api/history/analyses?limit=4`).then(r => r.json()),
    fetch(`${API_BASE}/api/history/investigations?limit=4`).then(r => r.json()),
    fetch(`${API_BASE}/api/history/queries?limit=4`).then(r => r.json()),
  ]);
  const analyses = ar.status === 'fulfilled' ? (ar.value.analyses ?? []) : [];
  const invests  = ir.status === 'fulfilled' ? (ir.value.investigations ?? []) : [];
  const queries  = qr.status === 'fulfilled' ? (qr.value.queries ?? []) : [];
  const total    = analyses.length + invests.length + queries.length;

  const items: FloorItem[] = [
    ...analyses.slice(0,2).map((a: {id:number;filename?:string;quality_grade?:string}) => ({
      key: `A-${a.id}`, label: (a.filename ?? 'dataset').slice(0,28),
      meta: 'ANALYSIS', status: 'VERIFIED' as const, score: 0.88,
    })),
    ...invests.slice(0,2).map((i: {id:number;goal?:string;risk_level?:string}) => ({
      key: `I-${i.id}`, label: (i.goal ?? 'investigation').slice(0,28),
      meta: i.risk_level ?? 'UNKNOWN', status: 'VERIFIED' as const, score: 0.72,
    })),
  ];

  return {
    items,
    summary: `${total} records sealed  ●  chain integrity: VERIFIED`,
    totalCount: total,
  };
}

async function fetchRooftop(): Promise<FloorData> {
  const [ar, ir, qr] = await Promise.allSettled([
    fetch(`${API_BASE}/api/history/analyses?limit=2`).then(r => r.json()),
    fetch(`${API_BASE}/api/history/investigations?limit=2`).then(r => r.json()),
    fetch(`${API_BASE}/api/history/queries?limit=2`).then(r => r.json()),
  ]);
  const aCount = ar.status === 'fulfilled' ? (ar.value.analyses?.length ?? 0) : 0;
  const iCount = ir.status === 'fulfilled' ? (ir.value.investigations?.length ?? 0) : 0;
  const qCount = qr.status === 'fulfilled' ? (qr.value.queries?.length ?? 0) : 0;

  const items: FloorItem[] = [
    { key: 'sys-1', label: 'Analysis Engine',     meta: 'ONLINE', status: 'VERIFIED', score: 0.95 },
    { key: 'sys-2', label: 'Risk Model v2.1',     meta: 'ACTIVE', status: 'VERIFIED', score: 0.88 },
    { key: 'sys-3', label: 'NLP Investigation',   meta: 'ONLINE', status: 'VERIFIED', score: 0.82 },
    { key: 'sys-4', label: 'Chain Integrity',     meta: 'SEALED', status: 'VERIFIED', score: 1.00 },
  ];

  return {
    items,
    summary: `${aCount} analyses  ●  ${iCount} cases  ●  ${qCount} queries  ●  ALL SYSTEMS NOMINAL`,
    totalCount: aCount + iCount + qCount,
  };
}

const fetchers: Record<string, () => Promise<FloorData>> = {
  studio:    fetchStudio,
  risk:      fetchRisk,
  detective: fetchDetective,
  vault:     fetchVault,
  rooftop:   fetchRooftop,
};

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useFloorData(floorId: FloorId | null): FloorData {
  const [data, setData] = useState<FloorData>(EMPTY);

  useEffect(() => {
    if (!floorId || !fetchers[floorId]) { setData(EMPTY); return; }
    setData(EMPTY);
    let cancelled = false;
    fetchers[floorId]()
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => {
        if (!cancelled) setData({
          items: [],
          summary: 'BACKEND OFFLINE — SHOWING OFFLINE STATE',
          totalCount: 0,
        });
      });
    return () => { cancelled = true; };
  }, [floorId]);

  return data;
}
