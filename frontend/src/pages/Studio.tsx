import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileSpreadsheet, Loader2, GripVertical, X, LayoutGrid, Lightbulb, Share2, Terminal, Globe2, Printer, TrendingUp, ScanSearch, type LucideIcon } from "lucide-react";
import RGL, { type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { apiPost, apiUpload } from "../lib/api";
import { errMessage } from "../lib/errors";
import { chartTheme } from "../lib/chartTheme";
import { useTheme } from "../store/themeStore";
import EChart from "../components/EChart";
import { specToOption, forecastOption, type ForecastData } from "../lib/chartOptions";
import InsightsPanel, { type Insight } from "../components/studio/InsightsPanel";
import ProfileRail from "../components/studio/ProfileRail";
import RelationshipMap from "../components/studio/RelationshipMap";
import SqlPlayground from "../components/studio/SqlPlayground";
import Investigator from "../components/studio/Investigator";
import GeoMap from "../components/studio/GeoMap";
import WhatChanged from "../components/studio/WhatChanged";
import TimeMachine from "../components/studio/TimeMachine";
import type {
  ChartDatum,
  ChartSpec,
  DataProfile,
  QualityReport,
  RelationshipGraph,
  SqlQueryResult,
} from "../types/api";


const SPAN: Record<string, number> = { line: 12, heatmap: 6, bar: 6, pie: 4, histogram: 6 };

/** Pack chart specs left-to-right into a 12-col grid as the initial draggable layout. */
function buildLayout(charts: ChartSpec[]): Layout[] {
  let x = 0, y = 0, rowH = 0;
  return charts.map((c) => {
    const w = SPAN[c.chart_type] || 6;
    const h = c.chart_type === "heatmap" ? 6 : 5;
    if (x + w > 12) { x = 0; y += rowH; rowH = 0; }
    const item = { i: c.id, x, y, w, h, minW: 3, minH: 4 };
    x += w; rowH = Math.max(rowH, h);
    return item;
  });
}

interface Result {
  dataset_id: string;
  filename: string;
  title: string;
  sampled: boolean;
  profile: DataProfile;
  dashboard: ChartSpec[];
  insights: Insight[];
  quality: QualityReport;
  executive_summary: string;
  relationships: RelationshipGraph;
}

type Tab = "dashboard" | "investigator" | "insights" | "relationships" | "map" | "sql";

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "investigator", label: "Investigator", icon: ScanSearch },
  { id: "insights", label: "Key Findings", icon: Lightbulb },
  { id: "relationships", label: "Relationships", icon: Share2 },
  { id: "map", label: "Map", icon: Globe2 },
  { id: "sql", label: "SQL", icon: Terminal },
];

/* ── X-ray scan overlay ─────────────────────────────────────────────────── */

const GENERIC_STEPS = [
  "Reading file structure…",
  "Inferring column semantics…",
  "Computing distributions & outliers…",
  "Testing relationships (Pearson, η²)…",
  "Running significance tests…",
  "Scoring data quality…",
  "Composing your dashboard…",
];

function ScanOverlay({ findings }: { findings: string[] }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 450);
    return () => clearInterval(id);
  }, []);
  const lines = findings.length ? findings : GENERIC_STEPS.slice(0, Math.min(tick + 1, GENERIC_STEPS.length));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "grid", placeItems: "center", minHeight: "70vh" }}>
      <div style={{ width: "min(520px, 92%)", padding: "30px 32px", position: "relative", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "4px 4px 0 rgba(0,0,0,0.4)" }}>
        {/* sweeping scan line */}
        <motion.div
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, var(--foil-gold), transparent)" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <Loader2 size={16} color="var(--foil-gold)" style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text)" }}>
            ANALYZING DATASET
          </span>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem", lineHeight: 1.9, color: "var(--text-muted)" }}>
          {lines.map((l, i) => (
            <motion.div key={l + i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
              <span style={{ color: i === lines.length - 1 && !findings.length ? "var(--foil-gold)" : "var(--seal-green)" }}>
                {i === lines.length - 1 && !findings.length ? "▸" : "✓"}
              </span>{" "}
              {l}
            </motion.div>
          ))}
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </motion.div>
  );
}

/* ── Studio page ────────────────────────────────────────────────────────── */

export default function Studio() {
  const { theme } = useTheme();
  const [phase, setPhase] = useState<"idle" | "scanning" | "reveal" | "ready" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [findings, setFindings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>("dashboard");
  const [pinned, setPinned] = useState<ChartSpec[]>([]);
  const [gridLayout, setGridLayout] = useState<Layout[]>([]);
  // Forecast is keyed to the specific chart it's toggled on (not a single global flag).
  const [forecast, setForecast] = useState<{ data: ForecastData | null; loading: boolean; activeId: string | null }>({ data: null, loading: false, activeId: null });
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleForecast = useCallback(async (datasetId: string, chartId: string) => {
    if (forecast.activeId === chartId) { setForecast((f) => ({ ...f, activeId: null })); return; }
    // The forecast endpoint is dataset-level (the dataset's primary measure), so a
    // computed forecast is valid for any line chart in this dataset — reuse the cache.
    if (forecast.data) { setForecast((f) => ({ ...f, activeId: chartId })); return; }
    setForecast((f) => ({ ...f, loading: true }));
    try {
      const data = await apiPost<ForecastData>("/api/dashboard/forecast", { dataset_id: datasetId, periods: 14 });
      setForecast({ data, loading: false, activeId: chartId });
    } catch {
      setForecast((f) => ({ ...f, loading: false }));
    }
  }, [forecast]);

  const pinFromSql = useCallback((result: SqlQueryResult, sql: string) => {
    const labelCol = result.columns.find((c) => typeof result.rows[0]?.[c] === "string") || result.columns[0];
    const valueCol = result.columns.find((c) => typeof result.rows[0]?.[c] === "number" && c !== labelCol);
    if (!valueCol) return;
    const id = `pin_${Date.now()}`;
    setPinned((p) => [...p, {
      id, chart_type: "bar", priority: 99,
      title: `${valueCol} by ${labelCol} (SQL)`,
      sql,
      data: result.rows.slice(0, 12).map((r) => ({ label: String(r[labelCol]), value: Number(r[valueCol]) })),
    }]);
    setTab("dashboard");
  }, []);

  const { muted, grid } = chartTheme(theme);

  const upload = useCallback(async (file: File) => {
    setPhase("scanning"); setFindings([]); setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await apiUpload<Result>("/api/dashboard/generate", fd);

      // Reveal phase: play the REAL findings the engine just computed.
      const p = data.profile;
      const real = [
        `${p.row_count.toLocaleString()} rows × ${p.column_count} columns parsed`,
        `${p.measures.length} measures · ${p.dimensions.length} dimensions · ${p.temporals.length} temporal detected`,
        `Data quality: ${data.quality.score}/100 (grade ${data.quality.grade})`,
        `${data.insights.length} findings · ${data.relationships.edges.length} relationships discovered`,
        `${data.dashboard.length} panels composed`,
      ];
      setFindings(real);
      setPhase("reveal");
      setHidden(new Set());
      setTab("dashboard");
      setTimeout(() => { setResult(data); setPhase("ready"); }, 1600);
    } catch (e: unknown) {
      setError(errMessage(e, "Upload failed"));
      setPhase("error");
    }
  }, []);

  const kpis = useMemo(() => result?.dashboard.filter((c) => c.chart_type === "kpi") || [], [result]);
  const charts = useMemo(() => [...(result?.dashboard.filter((c) => c.chart_type !== "kpi") || []), ...pinned], [result, pinned]);
  const visibleCharts = useMemo(() => charts.filter((c) => !hidden.has(c.id)), [charts, hidden]);

  // Reconcile layout when the chart set changes: existing panels KEEP their dragged position,
  // new panels (e.g. a pinned SQL chart) get a fresh slot. Fixes the "rearrange forgets" bug.
  useEffect(() => {
    setGridLayout((prev) => {
      const byId = Object.fromEntries(prev.map((l) => [l.i, l]));
      return buildLayout(visibleCharts).map((d) => (byId[d.i] ? { ...byId[d.i], i: d.i } : d));
    });
  }, [visibleCharts]);
  const geoChart = useMemo(() => {
    if (!result) return null;
    const geoCols: string[] = result.profile.geos || [];
    return result.dashboard.find((c) => c.dimension && geoCols.includes(c.dimension)) || null;
  }, [result]);
  const availableTabs = useMemo(() => TABS.filter((t) => t.id !== "map" || !!geoChart), [geoChart]);

  // Measure the grid container ourselves (a ResizeObserver) and feed RGL an explicit width.
  // WidthProvider's auto-measurement latches onto a near-zero width during the scan transition
  // and never recovers; this is deterministic and survives responsive reflow.
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(0);
  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setGridWidth(w);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [phase, tab, visibleCharts.length]);

  /* ── upload / scanning states ── */
  if (phase !== "ready") {
    return (
      <AnimatePresence mode="wait">
        {(phase === "scanning" || phase === "reveal") ? (
          <ScanOverlay key="scan" findings={findings} />
        ) : (
          <motion.div key="drop" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: "grid", placeItems: "center", minHeight: "70vh" }}>
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload a CSV or Excel dataset to build a dashboard"
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) upload(e.dataTransfer.files[0]); }}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
              data-cursor
              style={{
                width: "min(600px, 90%)", padding: "52px 40px", textAlign: "center", cursor: "pointer",
                background: "var(--surface)",
                border: `2px dashed ${dragOver ? "var(--foil-gold)" : "var(--border)"}`,
                boxShadow: dragOver ? "4px 4px 0 rgba(168,132,44,0.3)" : "var(--shadow-desk)",
                transition: "border-color .18s, box-shadow .18s",
              }}
            >
              <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls,.tsv" aria-label="Dataset file" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              <UploadCloud size={40} color="var(--foil-gold)" />
              <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: "1.55rem", marginTop: 16, letterSpacing: "-0.02em", color: "var(--text)" }}>
                Drop a dataset to build a dashboard
              </h2>
              <p style={{ color: "var(--text-muted)", marginTop: 10, lineHeight: 1.65, fontSize: "0.88rem" }}>
                CSV or Excel. Verita profiles every column, surfaces key findings, maps relationships,
                and opens a real SQL console — no BI tool to learn.
              </p>
              {phase === "error" && <p style={{ color: "var(--danger)", marginTop: 16, fontFamily: "var(--font-mono)", fontSize: "0.76rem" }}>⚠ {error}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  /* ── ready: smart header + tabs ── */
  if (!result) return null; // type guard — phase==="ready" implies result is set
  const r = result;
  return (
    <div>
      {/* Smart header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: "clamp(1.5rem, 3vw, 2.2rem)", letterSpacing: "-0.02em", color: "var(--text)" }}>
              {r.title}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
              <FileSpreadsheet size={14} color="var(--foil-gold)" />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                {r.filename} · {r.profile.row_count.toLocaleString()} rows · {r.profile.column_count} columns
                {r.sampled && " · sampled"}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            <button data-cursor onClick={() => window.print()} style={ghostBtn}><Printer size={14} style={{ marginRight: 6, verticalAlign: -2 }} />Report</button>
            <button data-cursor onClick={() => { setResult(null); setPinned([]); setGridLayout([]); setForecast({ data: null, loading: false, activeId: null }); setPhase("idle"); }} style={ghostBtn}>New file</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginTop: 16, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
          {availableTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              data-cursor
              onClick={() => setTab(id)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px",
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "var(--font-body)", fontSize: "0.88rem", fontWeight: 600,
                color: tab === id ? "var(--text)" : "var(--text-muted)",
                borderBottom: tab === id ? "2px solid var(--stamp-red)" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              <Icon size={15} /> {label}
              {id === "insights" && <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", padding: "1px 6px", background: "var(--surface-2)", color: "var(--foil-gold)" }}>{r.insights.length}</span>}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tab content */}
      {tab === "dashboard" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-start" }}>
          <div style={{ flex: "1 1 540px", minWidth: 0 }}>
            {/* KPI row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 16 }}>
              {kpis.map((k, i) => (
                <motion.div key={k.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} style={{ padding: "16px 18px", background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "4px 4px 0 rgba(0,0,0,0.35)" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.54rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)" }}>{k.title}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 600, marginTop: 6, lineHeight: 1, color: k.accent === "danger" ? "var(--danger)" : "var(--text)" }}>{k.value}</div>
                </motion.div>
              ))}
            </div>

            <TimeMachine datasetId={r.dataset_id} muted={muted} grid={grid} />

            <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginBottom: 8 }}>
              Drag ⠿ to rearrange · drag a corner to resize · ✕ to remove
            </div>
            <div ref={gridContainerRef}>
            {gridWidth > 0 && (
            <RGL className="layout" width={gridWidth} layout={gridLayout} onLayoutChange={setGridLayout} cols={12} rowHeight={64} margin={[16, 16]} draggableHandle=".drag-handle" isBounded>
              {visibleCharts.map((c) => {
                const isLine = c.chart_type === "line";
                // Narrowed to ForecastData|null — no non-null assertions downstream.
                const fc = isLine && forecast.activeId === c.id ? forecast.data : null;
                const isActive = forecast.activeId === c.id;
                return (
                  <div key={c.id} style={{ padding: "10px 14px", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-desk-sm)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 6 }}>
                      <span className="drag-handle" style={{ cursor: "move", display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.9rem", flex: 1, minWidth: 0 }}>
                        <GripVertical size={14} color="var(--text-muted)" aria-hidden style={{ flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.title}{fc && (
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--violet-text)", marginLeft: 8 }}
                              title={(fc.tournament || []).map((m) => `${m.model}: ${m.mape == null ? "n/a" : m.mape + "%"}`).join("  ·  ")}>
                              won: {fc.method}{fc.backtest_mape != null && ` · MAPE ${fc.backtest_mape}%`}
                              {fc.tournament && fc.tournament.length > 1 && ` (beat ${fc.tournament.length - 1} others)`}
                            </span>
                          )}
                        </span>
                      </span>
                      {isLine && (
                        <button data-cursor aria-label="Toggle forecast overlay" aria-pressed={isActive} onClick={() => toggleForecast(r.dataset_id, c.id)} title="Toggle forecast overlay"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px",
                            fontFamily: "var(--font-mono)", fontSize: "0.58rem", letterSpacing: "0.1em",
                            border: isActive ? "1px solid var(--foil-gold)" : "1px solid var(--border)",
                            cursor: "pointer", flexShrink: 0,
                            background: isActive ? "var(--foil-gold)" : "var(--surface)",
                            color: isActive ? "var(--ink)" : "var(--text-muted)",
                            boxShadow: "var(--shadow-desk-press)",
                          }}>
                          {forecast.loading ? <Loader2 size={11} aria-hidden style={{ animation: "spin 1s linear infinite" }} /> : <TrendingUp size={11} aria-hidden />} Forecast
                        </button>
                      )}
                      <button aria-label={`Remove ${c.title} panel`} onClick={() => setHidden((h) => new Set(h).add(c.id))} title="Remove panel"
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2, flexShrink: 0 }}>
                        <X size={14} aria-hidden />
                      </button>
                    </div>
                    <div style={{ flex: 1, minHeight: 0 }}>
                      <EChart option={fc ? forecastOption(fc, muted, grid) : specToOption(c, muted, grid)} height="100%" />
                    </div>
                  </div>
                );
              })}
            </RGL>
            )}
            </div>
          </div>

          <div style={{ flex: "1 1 240px", maxWidth: 320, minWidth: 220 }}>
            <ProfileRail profile={r.profile} quality={r.quality} />
          </div>
        </div>
      )}

      {tab === "insights" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <WhatChanged datasetId={r.dataset_id} />
          <InsightsPanel insights={r.insights} summary={r.executive_summary} />
        </div>
      )}

      {tab === "relationships" && <RelationshipMap nodes={r.relationships.nodes} edges={r.relationships.edges} muted={muted} />}

      {tab === "map" && geoChart && Array.isArray(geoChart.data) && (
        <GeoMap data={geoChart.data as ChartDatum[]} title={geoChart.title} />
      )}

      {tab === "investigator" && <Investigator datasetId={r.dataset_id} />}

      {tab === "sql" && <SqlPlayground datasetId={r.dataset_id} onPin={pinFromSql} />}

      {/* ── Print-only report (window.print → clean PDF) ── */}
      <div id="verita-report" style={{ display: "none" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "26pt", marginBottom: 4 }}>{r.title}</h1>
        <p style={{ fontSize: "9pt", color: "#555" }}>
          Verita auto-generated report · {r.filename} · {r.profile.row_count.toLocaleString()} rows × {r.profile.column_count} columns
          · Data quality {r.quality.score}/100 ({r.quality.grade})
        </p>
        <h2 style={{ fontSize: "13pt", marginTop: 18 }}>Executive summary</h2>
        <p style={{ fontSize: "10.5pt", lineHeight: 1.6 }}>{r.executive_summary}</p>
        <h2 style={{ fontSize: "13pt", marginTop: 18 }}>Key findings</h2>
        <ol style={{ fontSize: "10.5pt", lineHeight: 1.7, paddingLeft: 18 }}>
          {r.insights.map((ins, i) => (
            <li key={i} style={{ marginBottom: 8 }}>
              {ins.text}
              <div style={{ fontSize: "8pt", color: "#777", fontFamily: "monospace", marginTop: 2 }}>evidence: {ins.evidence}</div>
            </li>
          ))}
        </ol>
        <p style={{ fontSize: "8pt", color: "#999", marginTop: 24 }}>
          Every figure in this report is computed from the uploaded data at generation time. Verita — Financial Crime & Compliance Intelligence.
        </p>
      </div>
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  padding: "8px 14px",
  fontFamily: "var(--font-mono)",
  fontSize: "0.62rem",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  fontWeight: 500,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  flexShrink: 0,
  cursor: "pointer",
  boxShadow: "2px 2px 0 rgba(0,0,0,0.3)",
  display: "inline-flex",
  alignItems: "center",
};
