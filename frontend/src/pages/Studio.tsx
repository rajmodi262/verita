import { useCallback, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { UploadCloud, FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { API_BASE } from "../config";
import { useTheme } from "../store/themeStore";
import EChart from "../components/EChart";
import { specToOption } from "../lib/chartOptions";

interface Result {
  filename: string;
  sampled: boolean;
  profile: any;
  dashboard: any[];
}

const ROLE_COLORS: Record<string, string> = {
  measure: "#12b5a3",
  dimension: "#4d7cff",
  geo: "#4d7cff",
  temporal: "#a855f7",
  identifier: "#8c97b5",
  boolean: "#f5a524",
  text: "#6366f1",
};

// How wide each chart type wants to be in the 12-col grid.
const SPAN: Record<string, number> = { line: 12, heatmap: 6, bar: 6, pie: 4, histogram: 6 };

export default function Studio() {
  const { theme } = useTheme();
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const muted = theme === "dark" ? "#8c97b5" : "#5b6680";
  const grid = theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(11,16,32,0.08)";

  const upload = useCallback(async (file: File) => {
    setPhase("loading");
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE}/api/dashboard/generate`, { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Server error ${res.status}`);
      }
      setResult(await res.json());
      setPhase("ready");
    } catch (e: any) {
      setError(e.message || "Upload failed");
      setPhase("error");
    }
  }, []);

  const kpis = useMemo(() => result?.dashboard.filter((c) => c.chart_type === "kpi") || [], [result]);
  const charts = useMemo(() => result?.dashboard.filter((c) => c.chart_type !== "kpi") || [], [result]);

  if (phase === "idle" || phase === "loading" || phase === "error") {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "70vh" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) upload(e.dataTransfer.files[0]); }}
          onClick={() => inputRef.current?.click()}
          data-cursor
          className="glass"
          style={{
            width: "min(620px, 90%)", padding: "56px 40px", textAlign: "center", cursor: "pointer",
            border: `1.5px dashed ${dragOver ? "var(--blue)" : "var(--border)"}`,
            boxShadow: dragOver ? "0 0 60px -10px var(--blue)" : "none", transition: "all .2s",
          }}
        >
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls,.tsv" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          {phase === "loading" ? (
            <Loader2 size={44} color="var(--blue)" style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <UploadCloud size={44} color="var(--blue)" />
          )}
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", marginTop: 18 }}>
            {phase === "loading" ? "Analyzing your data…" : "Drop a dataset to build a dashboard"}
          </h2>
          <p style={{ color: "var(--text-muted)", marginTop: 10, lineHeight: 1.6 }}>
            CSV or Excel. Verita profiles every column and auto-builds the best dashboard — no setup, no BI tool to learn.
          </p>
          {phase === "error" && <p style={{ color: "var(--danger)", marginTop: 16, fontSize: "0.9rem" }}>⚠ {error}</p>}
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      {/* Header strip */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <FileSpreadsheet size={20} color="var(--blue)" />
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.1rem" }}>{result!.filename}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-muted)" }}>
              {result!.profile.row_count.toLocaleString()} rows · {result!.profile.column_count} columns
              {result!.sampled && " · sampled for speed"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button data-cursor onClick={() => { setResult(null); setPhase("idle"); }} style={btn("ghost")}>New file</button>
          <button data-cursor style={btn("primary")}><Download size={15} /> Export</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 20, alignItems: "start" }}>
        <div>
          {/* KPI row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 18 }}>
            {kpis.map((k, i) => (
              <motion.div key={k.id} className="glass" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} style={{ padding: "18px 20px" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>{k.title}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.9rem", fontWeight: 600, marginTop: 6, color: k.accent === "danger" ? "var(--danger)" : "var(--text)" }}>{k.value}</div>
              </motion.div>
            ))}
          </div>

          {/* Chart grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 16 }}>
            {charts.map((c, i) => (
              <motion.div
                key={c.id}
                className="glass"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                style={{ gridColumn: `span ${SPAN[c.chart_type] || 6}`, padding: "16px 18px", minWidth: 0 }}
              >
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.95rem", marginBottom: 4 }}>{c.title}</div>
                <EChart option={specToOption(c, muted, grid)} height={c.chart_type === "heatmap" ? 280 : 220} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Fields panel */}
        <div className="glass" style={{ padding: 18, position: "sticky", top: 0 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.66rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 14 }}>
            Detected fields · {result!.profile.columns.length}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {result!.profile.columns.map((col: any) => (
              <div key={col.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col.name}</span>
                <span
                  style={{
                    flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: "0.58rem", letterSpacing: "0.06em",
                    textTransform: "uppercase", padding: "3px 7px", borderRadius: 6,
                    color: ROLE_COLORS[col.semantic_type] || "#8c97b5",
                    background: `${ROLE_COLORS[col.semantic_type] || "#8c97b5"}1f`,
                  }}
                >
                  {col.semantic_type}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function btn(kind: "primary" | "ghost"): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10,
    fontSize: "0.85rem", fontWeight: 600, fontFamily: "var(--font-body)",
    border: kind === "ghost" ? "1px solid var(--border)" : "none",
    color: kind === "ghost" ? "var(--text)" : "#fff",
    background: kind === "ghost" ? "var(--surface)" : "var(--signature)",
  };
}
