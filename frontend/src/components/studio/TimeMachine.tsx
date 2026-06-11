import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, History } from "lucide-react";
import { API_BASE } from "../../config";
import EChart from "../EChart";
import type { EChartsOption } from "echarts";

interface Frame {
  period: string;
  rows: number;
  total: number;
  mean: number;
  by_dimension?: { dimension: string; data: { label: string; value: number }[] };
}

/** Time Machine — scrub or play the dataset through time; KPIs and the breakdown re-aggregate per month. */
export default function TimeMachine({ datasetId, muted, grid }: { datasetId: string; muted: string; grid: string }) {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [measure, setMeasure] = useState("");
  const timer = useRef<number>();

  useEffect(() => {
    fetch(`${API_BASE}/api/dashboard/frames`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataset_id: datasetId }),
    })
      .then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error(b.detail); return b; })
      .then((b) => { setFrames(b.frames); setMeasure(b.measure); setIdx(b.frames.length - 1); })
      .catch(() => setFrames([]));
  }, [datasetId]);

  useEffect(() => {
    if (!playing) { window.clearInterval(timer.current); return; }
    timer.current = window.setInterval(() => {
      setIdx((i) => {
        if (i + 1 >= frames.length) { setPlaying(false); return i; }
        return i + 1;
      });
    }, 900);
    return () => window.clearInterval(timer.current);
  }, [playing, frames.length]);

  if (frames.length < 2) return null;

  const f = frames[idx];
  const maxVal = Math.max(...frames.flatMap((fr) => fr.by_dimension?.data.map((d) => d.value) || [0]));

  const barOption: EChartsOption = f.by_dimension ? {
    grid: { left: 90, right: 30, top: 8, bottom: 22 },
    xAxis: { type: "value", max: maxVal, axisLabel: { color: muted, fontSize: 9 }, splitLine: { lineStyle: { color: grid, type: "dashed" } } },
    yAxis: {
      type: "category", inverse: true,
      data: f.by_dimension.data.map((d) => d.label),
      axisLabel: { color: muted, fontSize: 10, fontFamily: "JetBrains Mono" },
      axisLine: { lineStyle: { color: grid } },
    },
    // animationDuration* keeps the "racing bars" feel between frames
    animationDurationUpdate: 700, animationEasingUpdate: "cubicOut",
    series: [{ type: "bar", data: f.by_dimension.data.map((d) => d.value), itemStyle: { color: "#4d7cff", borderRadius: [0, 4, 4, 0] }, barMaxWidth: 16, label: { show: true, position: "right", color: muted, fontSize: 9, fontFamily: "JetBrains Mono", formatter: (p: any) => Number(p.value).toLocaleString() } }],
  } : {};

  return (
    <motion.div className="glass" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ padding: "16px 18px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--font-display)", fontWeight: 600 }}>
          <History size={15} color="#22d3ee" /> Time Machine
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", color: "var(--blue)" }}>{f.period}</span>
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 220, maxWidth: 520 }}>
          <button data-cursor onClick={() => setPlaying((p) => !p)}
            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <input type="range" min={0} max={frames.length - 1} step={1} value={idx}
            onChange={(e) => { setPlaying(false); setIdx(parseInt(e.target.value)); }}
            style={{ flex: 1, accentColor: "#22d3ee", cursor: "pointer" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16, marginTop: 14, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[["Records", f.rows.toLocaleString()], [`Total ${measure}`, f.total.toLocaleString()], [`Avg ${measure}`, f.mean.toLocaleString()]].map(([k, v]) => (
            <div key={String(k)} style={{ padding: "8px 12px", borderRadius: 10, background: "var(--surface-2)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.05rem", fontWeight: 600 }}>{v}</div>
              <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{k}</div>
            </div>
          ))}
        </div>
        {f.by_dimension && <EChart option={barOption} height={170} />}
      </div>
    </motion.div>
  );
}
