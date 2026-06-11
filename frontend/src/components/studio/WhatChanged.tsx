import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GitCompareArrows, TrendingUp, TrendingDown } from "lucide-react";
import { API_BASE } from "../../config";

interface Headline {
  period_a: { from: string; to: string; rows: number };
  period_b: { from: string; to: string; rows: number };
  volume_change_pct: number | null;
  total_change_pct: number | null;
  mean_change_pct: number | null;
  measure: string;
}
interface Mover { dimension: string; category: string; before: number; after: number; change_pct: number }

/** "What changed?" — first half vs second half of the time range, biggest movers ranked. */
export default function WhatChanged({ datasetId }: { datasetId: string }) {
  const [headline, setHeadline] = useState<Headline | null>(null);
  const [movers, setMovers] = useState<Mover[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/dashboard/compare`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataset_id: datasetId }),
    })
      .then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error(b.detail); return b; })
      .then((b) => { setHeadline(b.headline); setMovers(b.movers); })
      .catch((e) => setError(e.message));
  }, [datasetId]);

  if (error) return null; // dataset without a usable time axis — hide quietly
  if (!headline) return null;

  const Delta = ({ v }: { v: number | null }) =>
    v === null ? <span>—</span> : (
      <span style={{ color: v >= 0 ? "var(--success)" : "var(--danger)", display: "inline-flex", alignItems: "center", gap: 4 }}>
        {v >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{v > 0 ? "+" : ""}{v}%
      </span>
    );

  return (
    <motion.div className="glass" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ padding: "18px 20px", borderLeft: "3px solid var(--violet, #a855f7)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <GitCompareArrows size={15} color="#a855f7" />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          What changed — {headline.period_a.from} → {headline.period_b.to} (first half vs second half)
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
        {[
          [`Total ${headline.measure}`, headline.total_change_pct],
          [`Avg ${headline.measure}`, headline.mean_change_pct],
          ["Record volume", headline.volume_change_pct],
        ].map(([k, v]) => (
          <div key={String(k)} style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface-2)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.15rem", fontWeight: 600 }}><Delta v={v as number | null} /></div>
            <div style={{ fontSize: "0.64rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 3 }}>{k}</div>
          </div>
        ))}
      </div>

      {movers.length > 0 && (
        <>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 8 }}>Biggest movers (≥15% shift, ranked):</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {movers.slice(0, 5).map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem", gap: 10 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span style={{ color: "var(--text-muted)" }}>{m.dimension} / </span><strong>{m.category}</strong>
                </span>
                <span style={{ fontFamily: "var(--font-mono)", flexShrink: 0 }}><Delta v={m.change_pct} /></span>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
