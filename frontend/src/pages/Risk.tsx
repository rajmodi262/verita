import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Database } from "lucide-react";
import type { EChartsOption } from "echarts";
import { API_BASE } from "../config";
import { useTheme } from "../store/themeStore";
import EChart from "../components/EChart";

interface Metrics {
  data_source: string;
  data_description: string;
  test_size: number;
  fraud_in_test: number;
  threshold: number;
  roc_auc: number;
  pr_auc: number;
  precision: number;
  recall: number;
  f1: number;
  confusion_matrix: { tn: number; fp: number; fn: number; tp: number };
  roc_curve: { x: number; y: number }[];
  pr_curve: { x: number; y: number }[];
  feature_importance: { feature: string; importance: number }[];
}

interface Alert {
  rank: number;
  transaction_id: string;
  risk_score: number;
  risk_tier: string;
  amount: number;
  channel: string;
  country: string;
  is_fraud_actual: number;
  flagged: boolean;
}

const TIER_COLOR: Record<string, string> = {
  Critical: "#ff2d55",
  High: "#ff7a8a",
  Medium: "#f5a524",
  Low: "#16c784",
};

export default function Risk() {
  const { theme } = useTheme();
  const [threshold, setThreshold] = useState(0.5);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const debounce = useRef<number>();

  const muted = theme === "dark" ? "#8c97b5" : "#5b6680";
  const grid = theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(11,16,32,0.08)";

  useEffect(() => {
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(async () => {
      try {
        const [m, a] = await Promise.all([
          fetch(`${API_BASE}/api/risk/metrics?threshold=${threshold}`).then((r) => r.json()),
          fetch(`${API_BASE}/api/risk/alerts?threshold=${threshold}&limit=20`).then((r) => r.json()),
        ]);
        setMetrics(m);
        setAlerts(a.alerts || []);
        setError("");
      } catch (e: any) {
        setError("Backend unavailable — start the API on :8000");
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => window.clearTimeout(debounce.current);
  }, [threshold]);

  if (loading && !metrics) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "60vh", color: "var(--text-muted)" }}>
        Training fraud model on first load…
      </div>
    );
  }
  if (error && !metrics) {
    return <div style={{ display: "grid", placeItems: "center", minHeight: "60vh", color: "var(--danger)" }}>{error}</div>;
  }
  if (!metrics) return null;

  const cm = metrics.confusion_matrix;
  const isReal = metrics.data_source === "ulb_creditcard";

  return (
    <div>
      {/* honest data-source banner */}
      <div className="glass" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", marginBottom: 18 }}>
        <Database size={15} color={isReal ? "var(--success)" : "var(--ai, #a855f7)"} />
        <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text)" }}>{isReal ? "Real data" : "Synthetic data"}:</strong> {metrics.data_description}
        </span>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 20 }}>
        {[
          { k: "ROC-AUC", v: metrics.roc_auc.toFixed(3) },
          { k: "PR-AUC", v: metrics.pr_auc.toFixed(3) },
          { k: "Precision", v: metrics.precision.toFixed(3) },
          { k: "Recall", v: metrics.recall.toFixed(3) },
          { k: "F1", v: metrics.f1.toFixed(3) },
        ].map((kpi, i) => (
          <motion.div key={kpi.k} className="glass" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} style={{ padding: "16px 18px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>{kpi.k}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 600, marginTop: 4 }}>{kpi.v}</div>
          </motion.div>
        ))}
      </div>

      {/* Threshold slider */}
      <div className="glass" style={{ padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>Decision threshold</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", color: "var(--blue)" }}>{threshold.toFixed(2)}</span>
        </div>
        <input
          type="range" min={0.05} max={0.95} step={0.01} value={threshold}
          onChange={(e) => setThreshold(parseFloat(e.target.value))}
          style={{ width: "100%", accentColor: "#4d7cff", cursor: "pointer" }}
        />
        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 8 }}>
          Lower the threshold to catch more fraud (higher recall) at the cost of more false positives (lower precision). Everything below recomputes live.
        </div>
      </div>

      {/* ROC + PR curves */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Panel title={`ROC curve · AUC ${metrics.roc_auc.toFixed(3)}`}>
          <EChart height={260} option={rocOption(metrics.roc_curve, muted, grid)} />
        </Panel>
        <Panel title={`Precision–Recall · AP ${metrics.pr_auc.toFixed(3)}`}>
          <EChart height={260} option={prOption(metrics.pr_curve, muted, grid)} />
        </Panel>
      </div>

      {/* Confusion matrix + feature importance */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 0.8fr) 1.2fr", gap: 16, marginBottom: 16 }}>
        <Panel title={`Confusion matrix @ ${threshold.toFixed(2)}`}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
            <Cell label="True Negative" value={cm.tn} good />
            <Cell label="False Positive" value={cm.fp} />
            <Cell label="False Negative" value={cm.fn} bad />
            <Cell label="True Positive" value={cm.tp} good />
          </div>
        </Panel>
        <Panel title="Feature importance">
          <EChart height={240} option={importanceOption(metrics.feature_importance, muted, grid)} />
        </Panel>
      </div>

      {/* Alert queue */}
      <Panel title={`AML alert queue · ${alerts.filter((a) => a.flagged).length} flagged @ ${threshold.toFixed(2)}`}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.66rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                <th style={th}>Tier</th><th style={th}>Transaction</th><th style={th}>Amount</th><th style={th}>Channel</th><th style={th}>Geo</th><th style={th}>Risk</th><th style={th}>Actual</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.transaction_id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={td}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: TIER_COLOR[a.risk_tier], boxShadow: `0 0 8px ${TIER_COLOR[a.risk_tier]}` }} />{a.risk_tier}</span></td>
                  <td style={{ ...td, fontFamily: "var(--font-mono)" }}>{a.transaction_id}</td>
                  <td style={{ ...td, fontFamily: "var(--font-mono)" }}>${a.amount.toLocaleString()}</td>
                  <td style={td}>{a.channel}</td>
                  <td style={td}>{a.country}</td>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 5, borderRadius: 3, background: "var(--surface-2)", minWidth: 60 }}>
                        <div style={{ width: `${a.risk_score}%`, height: "100%", borderRadius: 3, background: TIER_COLOR[a.risk_tier] }} />
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>{a.risk_score}</span>
                    </div>
                  </td>
                  <td style={td}>{a.is_fraud_actual ? <span style={{ color: "var(--danger)", fontWeight: 600 }}>FRAUD</span> : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* ---- small pieces ---- */
const th: React.CSSProperties = { padding: "8px 10px" };
const td: React.CSSProperties = { padding: "10px" };

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div className="glass" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} style={{ padding: "16px 18px", minWidth: 0, marginBottom: 0 }}>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.95rem", marginBottom: 8 }}>{title}</div>
      {children}
    </motion.div>
  );
}

function Cell({ label, value, good, bad }: { label: string; value: number; good?: boolean; bad?: boolean }) {
  const color = good ? "#16c784" : bad ? "#ff4d5e" : "var(--text-muted)";
  return (
    <div style={{ padding: "16px", borderRadius: 12, background: "var(--surface-2)", textAlign: "center" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", fontWeight: 600, color }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 4 }}>{label}</div>
    </div>
  );
}

/* ---- ECharts options ---- */
function axis(muted: string, grid: string, name: string, max = 1) {
  return {
    name, nameLocation: "middle" as const, nameGap: 26, min: 0, max,
    nameTextStyle: { color: muted, fontSize: 10 },
    axisLine: { lineStyle: { color: grid } },
    axisLabel: { color: muted, fontSize: 9 },
    splitLine: { lineStyle: { color: grid, type: "dashed" as const } },
  };
}

function rocOption(curve: { x: number; y: number }[], muted: string, grid: string): EChartsOption {
  return {
    grid: { left: 44, right: 16, top: 16, bottom: 40 },
    tooltip: { trigger: "axis", backgroundColor: "rgba(11,14,26,0.92)", borderWidth: 0, textStyle: { color: "#f2f5ff" } },
    xAxis: { type: "value", ...axis(muted, grid, "False positive rate") },
    yAxis: { type: "value", ...axis(muted, grid, "True positive rate") },
    series: [
      { type: "line", data: [[0, 0], [1, 1]], symbol: "none", lineStyle: { color: muted, type: "dashed", width: 1 } },
      {
        type: "line", smooth: true, symbol: "none",
        data: curve.map((p) => [p.x, p.y]),
        lineStyle: { color: "#4d7cff", width: 2.5 },
        areaStyle: { color: "rgba(77,124,255,0.15)" },
      },
    ],
  };
}

function prOption(curve: { x: number; y: number }[], muted: string, grid: string): EChartsOption {
  return {
    grid: { left: 44, right: 16, top: 16, bottom: 40 },
    tooltip: { trigger: "axis", backgroundColor: "rgba(11,14,26,0.92)", borderWidth: 0, textStyle: { color: "#f2f5ff" } },
    xAxis: { type: "value", ...axis(muted, grid, "Recall") },
    yAxis: { type: "value", ...axis(muted, grid, "Precision") },
    series: [
      {
        type: "line", smooth: true, symbol: "none",
        data: curve.map((p) => [p.x, p.y]),
        lineStyle: { color: "#a855f7", width: 2.5 },
        areaStyle: { color: "rgba(168,85,247,0.15)" },
      },
    ],
  };
}

function importanceOption(items: { feature: string; importance: number }[], muted: string, grid: string): EChartsOption {
  const sorted = [...items].sort((a, b) => a.importance - b.importance);
  return {
    grid: { left: 110, right: 24, top: 8, bottom: 24 },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "rgba(11,14,26,0.92)", borderWidth: 0, textStyle: { color: "#f2f5ff" } },
    xAxis: { type: "value", axisLabel: { color: muted, fontSize: 9 }, splitLine: { lineStyle: { color: grid, type: "dashed" } } },
    yAxis: { type: "category", data: sorted.map((i) => i.feature), axisLabel: { color: muted, fontSize: 10, fontFamily: "JetBrains Mono" }, axisLine: { lineStyle: { color: grid } } },
    series: [{ type: "bar", data: sorted.map((i) => i.importance), itemStyle: { color: "#22d3ee", borderRadius: [0, 4, 4, 0] }, barMaxWidth: 18 }],
  };
}
