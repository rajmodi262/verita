import { useEffect, useRef, useState } from "react";
import { Database, FlaskConical, BarChart3, Coins, ListChecks } from "lucide-react";
import type { EChartsOption } from "echarts";
import { apiGet } from "../lib/api";
import { errMessage, ApiError } from "../lib/errors";
import { useTheme } from "../store/themeStore";
import EChart from "../components/EChart";
import type {
  RiskMetrics,
  RiskAlert,
  RiskAlertsResponse,
  CurvePoint,
  FeatureImportance,
  ShapImportance,
  CrossValidationResult,
  OptimalThresholdResult,
  RiskExplanation,
  ReasonCode,
} from "../types/api";

// Tier FILL colors (dots, bars — non-text graphics), all tokenized.
const TIER_FILL: Record<string, string> = {
  Critical: "var(--danger)", High: "var(--stamp-red)", Medium: "var(--foil-gold)", Low: "var(--seal-green)",
};

const panelStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-desk-sm)",
  padding: "16px 18px",
};
const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.54rem",
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: 10,
};
const th: React.CSSProperties = { padding: "8px 10px" };
const td: React.CSSProperties = { padding: "9px 10px" };

// Theme-aware concrete hex for echarts (canvas can't resolve CSS variables).
function chartColors(theme: string) {
  const dark = theme === "dark";
  return {
    muted: dark ? "#b9af97" : "#4a4434",
    grid: dark ? "rgba(232,224,204,0.10)" : "rgba(20,18,11,0.10)",
    roc: dark ? "#8fb0ff" : "#2b3a8c",
    rocArea: dark ? "rgba(143,176,255,0.14)" : "rgba(43,58,140,0.12)",
    pr: dark ? "#cba6ff" : "#6b21a8",
    prArea: dark ? "rgba(203,166,255,0.14)" : "rgba(107,33,168,0.12)",
    gold: "#a8842c",
    shapPos: dark ? "#4fd6a0" : "#1c6e4a",
    shapNeg: dark ? "#ff8a96" : "#c2331f",
    cvBar: dark ? "#8fb0ff" : "#2b3a8c",
    cvMean: "#a8842c",
  };
}

export default function Risk() {
  const { theme } = useTheme();
  const [threshold, setThreshold] = useState(0.5);
  const [metrics, setMetrics] = useState<RiskMetrics | null>(null);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Cross-validation state (on-demand, expensive)
  const [cv, setCv] = useState<CrossValidationResult | null>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvError, setCvError] = useState("");

  // Cost-optimal threshold (cheap, computed on the held-out set). Currency-aware: the threshold
  // depends only on the cost RATIO, so ₹ and $ give the same cut-off — only the money scales.
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [opt, setOpt] = useState<OptimalThresholdResult | null>(null);

  // Per-case SHAP reason codes — stepper over the validated sample rows
  const [explainIdx, setExplainIdx] = useState(0);
  const [explain, setExplain] = useState<RiskExplanation | null>(null);
  const [explainErr, setExplainErr] = useState("");
  const [explainMax, setExplainMax] = useState<number | null>(null);

  const c = chartColors(theme);

  // Cost presets per currency (representative blended figures; the analyst can reason from them).
  const CURRENCIES = {
    INR: { symbol: "₹", locale: "en-IN", cost_fn: 40000, cost_fp: 400 },
    USD: { symbol: "$", locale: "en-US", cost_fn: 500, cost_fp: 5 },
  } as const;
  const cur = CURRENCIES[currency];

  // Cost-optimal threshold for the selected currency's cost matrix.
  useEffect(() => {
    const ctrl = new AbortController();
    const qs = `cost_fn=${cur.cost_fn}&cost_fp=${cur.cost_fp}&currency=${encodeURIComponent(cur.symbol)}`;
    apiGet<OptimalThresholdResult>(`/api/risk/optimal-threshold?${qs}`, ctrl.signal)
      .then(setOpt)
      .catch(() => {
        /* non-fatal — the panel simply hides if the engine can't optimise */
      });
    return () => ctrl.abort();
  }, [currency, cur.cost_fn, cur.cost_fp, cur.symbol]);

  // Per-case reason codes for the currently-selected sample row. A 404 means we stepped past
  // the available validated rows — remember that bound and clamp back.
  useEffect(() => {
    const ctrl = new AbortController();
    apiGet<RiskExplanation>(`/api/risk/explain/${explainIdx}`, ctrl.signal)
      .then((r) => {
        setExplain(r);
        setExplainErr("");
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        if (e instanceof ApiError && e.status === 404) {
          setExplainMax(explainIdx - 1);
          setExplainIdx((i) => Math.max(0, i - 1));
        } else {
          setExplainErr(errMessage(e, "Explanation unavailable"));
        }
      });
    return () => ctrl.abort();
  }, [explainIdx]);

  useEffect(() => {
    window.clearTimeout(debounce.current);
    const ctrl = new AbortController();
    debounce.current = setTimeout(async () => {
      try {
        const [m, a] = await Promise.all([
          apiGet<RiskMetrics>(`/api/risk/metrics?threshold=${threshold}`, ctrl.signal),
          apiGet<RiskAlertsResponse>(`/api/risk/alerts?threshold=${threshold}&limit=20`, ctrl.signal),
        ]);
        setMetrics(m);
        setAlerts(a.alerts ?? []);
        setError("");
      } catch (e) {
        if (!ctrl.signal.aborted) setError(errMessage(e, "Backend unavailable — start the API on :8000"));
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      window.clearTimeout(debounce.current);
      ctrl.abort();
    };
  }, [threshold]);

  async function runCrossValidation() {
    setCvLoading(true);
    setCvError("");
    try {
      const result = await apiGet<CrossValidationResult>("/api/risk/cross-validate");
      setCv(result);
    } catch (e) {
      setCvError(errMessage(e, "Cross-validation failed"));
    } finally {
      setCvLoading(false);
    }
  }

  if (loading && !metrics) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <div role="status" style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          Training fraud model on first load…
        </div>
      </div>
    );
  }
  if (error && !metrics) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <div role="alert" style={{ fontFamily: "var(--font-mono)", color: "var(--danger-text)", fontSize: "0.8rem" }}>{error}</div>
      </div>
    );
  }
  if (!metrics) return null;

  const cm = metrics.confusion_matrix ?? { tn: 0, fp: 0, fn: 0, tp: 0 };
  const isReal = metrics.data_source === "ulb_creditcard";
  const flaggedCount = alerts.filter((a) => a.flagged).length;
  const pe = explain?.plain_english;

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
        <div style={labelStyle}>CASE FILE / RISK ENGINE</div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}
        >
          Fraud Risk Engine
        </h1>
      </div>

      {/* Data source banner */}
      <div style={{ ...panelStyle, display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 16 }}>
        <Database size={14} color={isReal ? "var(--success-text)" : "var(--violet-text)"} aria-hidden />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.66rem", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
          <strong style={{ color: isReal ? "var(--success-text)" : "var(--violet-text)" }}>{isReal ? "REAL DATA" : "SYNTHETIC DATA"}</strong>
          {" — "}
          {metrics.data_description}
        </span>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 16 }}>
        {[
          { k: "ROC-AUC",   v: (metrics.roc_auc   ?? 0).toFixed(3) },
          { k: "PR-AUC",    v: (metrics.pr_auc    ?? 0).toFixed(3) },
          { k: "Precision", v: (metrics.precision ?? 0).toFixed(3) },
          { k: "Recall",    v: (metrics.recall    ?? 0).toFixed(3) },
          { k: "F1",        v: (metrics.f1        ?? 0).toFixed(3) },
        ].map((kpi) => (
          <div key={kpi.k} style={panelStyle}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.52rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>
              {kpi.k}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.55rem", fontWeight: 600, color: "var(--text)" }}>{kpi.v}</div>
          </div>
        ))}
      </div>

      {/* Threshold slider */}
      <div style={{ ...panelStyle, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <label htmlFor="risk-threshold" style={labelStyle as React.CSSProperties}>DECISION THRESHOLD</label>
            <div style={{ fontFamily: "var(--font-body)", fontSize: "0.84rem", color: "var(--text-muted)" }}>
              Lower → more recalls, more false positives. Everything recomputes live.
            </div>
          </div>
          <span aria-hidden style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem", fontWeight: 600, color: "var(--foil-gold-text)" }}>
            {threshold.toFixed(2)}
          </span>
        </div>
        <input
          id="risk-threshold"
          type="range"
          min={0.01}
          max={0.95}
          step={0.01}
          value={threshold}
          aria-label="Decision threshold"
          aria-valuetext={threshold.toFixed(2)}
          onChange={(e) => setThreshold(parseFloat(e.target.value))}
          style={{ width: "100%", accentColor: "var(--foil-gold)", cursor: "pointer" }}
        />
      </div>

      {/* ── Cost-optimal threshold — the dollar-rational cut-off ── */}
      {opt && (
        <div style={{ ...panelStyle, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Coins size={13} color="var(--foil-gold-text)" aria-hidden />
              <div style={labelStyle}>COST-OPTIMAL THRESHOLD — MINIMISE EXPECTED LOSS</div>
            </div>
            <div role="group" aria-label="Currency" style={{ display: "flex", border: "1px solid var(--border)" }}>
              {(["INR", "USD"] as const).map((code) => (
                <button
                  key={code}
                  onClick={() => setCurrency(code)}
                  aria-pressed={currency === code}
                  style={{
                    fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.08em",
                    padding: "4px 11px", border: "none", cursor: "pointer",
                    background: currency === code ? "var(--foil-gold)" : "transparent",
                    color: currency === code ? "var(--ink, #131110)" : "var(--text-muted)",
                  }}
                >
                  {CURRENCIES[code].symbol} {code}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 12 }}>
            <Stat label={`Optimal @ ${cur.symbol}${cur.cost_fn.toLocaleString(cur.locale)}/${cur.symbol}${cur.cost_fp.toLocaleString(cur.locale)}`} value={opt.optimal_threshold.toFixed(3)} accent />
            <Stat label="Saved vs 0.5" value={`${cur.symbol}${opt.savings_vs_0_5.toLocaleString(cur.locale)}`} />
            <Stat label="Saving %" value={`${opt.savings_pct.toFixed(0)}%`} />
            <Stat label="Recall @ optimal" value={(opt.optimal.recall * 100).toFixed(0) + "%"} />
            <Stat label="Precision @ optimal" value={(opt.optimal.precision * 100).toFixed(0) + "%"} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.6, flex: 1, minWidth: 240 }}>
              {opt.interpretation}
            </div>
            <button
              onClick={() => setThreshold(Math.max(0.01, Math.round(opt.optimal_threshold * 100) / 100))}
              style={{
                fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.12em",
                textTransform: "uppercase", padding: "7px 14px", border: "2px solid var(--foil-gold)",
                background: "transparent", color: "var(--foil-gold-text)", cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              Apply to slider
            </button>
          </div>
        </div>
      )}

      {/* ROC + PR curves */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <Panel title={`ROC CURVE · AUC ${(metrics.roc_auc ?? 0).toFixed(3)}`}>
          <div role="img" aria-label={`ROC curve, area under curve ${(metrics.roc_auc ?? 0).toFixed(3)}`}>
            <EChart height={240} option={rocOption(metrics.roc_curve, c)} />
          </div>
        </Panel>
        <Panel title={`PRECISION–RECALL · AP ${(metrics.pr_auc ?? 0).toFixed(3)}`}>
          <div role="img" aria-label={`Precision-recall curve, average precision ${(metrics.pr_auc ?? 0).toFixed(3)}`}>
            <EChart height={240} option={prOption(metrics.pr_curve, c)} />
          </div>
        </Panel>
      </div>

      {/* Confusion matrix + features */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px,0.8fr) 1.2fr", gap: 12, marginBottom: 12 }}>
        <Panel title={`CONFUSION MATRIX @ ${threshold.toFixed(2)}`}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            <Cell label="True Negative"  value={cm.tn} good />
            <Cell label="False Positive" value={cm.fp} />
            <Cell label="False Negative" value={cm.fn} bad />
            <Cell label="True Positive"  value={cm.tp} good />
          </div>
        </Panel>
        <Panel title="FEATURE IMPORTANCE">
          <div role="img" aria-label={`Feature importance ranking of ${metrics.feature_importance.length} model features`}>
            <EChart height={220} option={importanceOption(metrics.feature_importance, c)} />
          </div>
        </Panel>
      </div>

      {/* ── SHAP Explainability — Why the Model Decided This ── */}
      {metrics.shap_available && metrics.shap_importances.length > 0 && (
        <Panel title="SHAP — WHY THE MODEL DECIDED THIS" icon={<BarChart3 size={13} color="var(--foil-gold-text)" />}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 12 }}>
            Mean |SHAP value| — TreeExplainer (exact, not sampled). Each bar shows a feature's average contribution to pushing predictions away from the baseline.
          </div>
          <div role="img" aria-label={`SHAP feature importance ranking of ${metrics.shap_importances.length} features`}>
            <EChart height={260} option={shapOption(metrics.shap_importances, c)} />
          </div>
        </Panel>
      )}

      {/* ── Per-case reason codes — adverse-action style explanation for one transaction ── */}
      {metrics.shap_available && (
        <div style={{ ...panelStyle, marginBottom: 12, marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ListChecks size={13} color="var(--foil-gold-text)" aria-hidden />
              <div style={labelStyle}>PER-CASE EXPLANATION — WHY THIS TRANSACTION SCORED AS IT DID</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StepBtn label="‹ Prev" disabled={explainIdx <= 0} onClick={() => setExplainIdx((i) => Math.max(0, i - 1))} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.66rem", color: "var(--text-muted)", minWidth: 60, textAlign: "center" }}>
                Row {explainIdx}{explainMax !== null ? ` / ${explainMax}` : ""}
              </span>
              <StepBtn label="Next ›" disabled={explainMax !== null && explainIdx >= explainMax} onClick={() => setExplainIdx((i) => i + 1)} />
            </div>
          </div>
          {explainErr && (
            <div role="alert" style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--danger-text)" }}>{explainErr}</div>
          )}
          {pe && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
                <div style={{ textAlign: "center", padding: "8px 14px", border: `2px solid ${pe.decision === "REVIEW" ? "var(--danger)" : "var(--seal-green)"}`, minWidth: 92 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.5rem", fontWeight: 700, color: pe.decision === "REVIEW" ? "var(--danger-text)" : "var(--success-text)" }}>
                    {(pe.predicted_probability * 100).toFixed(1)}%
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", letterSpacing: "0.16em", color: "var(--text-muted)" }}>{pe.decision}</div>
                </div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: "0.84rem", color: "var(--text)", lineHeight: 1.5, flex: 1, minWidth: 220 }}>{pe.headline}</div>
              </div>
              {pe.reason_codes.map((r) => <ReasonRow key={r.feature} r={r} />)}
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", color: "var(--text-muted)", marginTop: 10, lineHeight: 1.5 }}>
                {pe.method} · base value {pe.base_value.toFixed(4)}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 5-Fold Cross-Validation (on-demand) ── */}
      <div style={{ ...panelStyle, marginBottom: 12, marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: cv ? 12 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FlaskConical size={13} color="var(--foil-gold-text)" />
            <div style={labelStyle}>5-FOLD CROSS-VALIDATION — THE HONEST STABILITY TEST</div>
          </div>
          {!cv && (
            <button
              onClick={runCrossValidation}
              disabled={cvLoading}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.62rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "7px 14px",
                border: "2px solid var(--foil-gold)",
                background: cvLoading ? "var(--surface-2)" : "transparent",
                color: "var(--foil-gold-text)",
                cursor: cvLoading ? "wait" : "pointer",
                transition: "background 0.2s",
              }}
            >
              {cvLoading ? "Training 5 models…" : "Run CV"}
            </button>
          )}
        </div>
        {cvError && (
          <div role="alert" style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--danger-text)", marginTop: 8 }}>
            {cvError}
          </div>
        )}
        {cv && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <div role="img" aria-label={`Cross-validation scores across ${cv.n_folds} folds`}>
                  <EChart height={200} option={cvOption(cv, c)} />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
                <div style={{ ...panelStyle, padding: "12px 14px", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.48rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>
                    CV MEAN ± STD
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.3rem", fontWeight: 600, color: "var(--text)" }}>
                    {cv.mean.toFixed(4)} <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>± {cv.std.toFixed(4)}</span>
                  </div>
                </div>
                <div style={{ ...panelStyle, padding: "12px 14px", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.48rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>
                    CONSISTENT WITH HELD-OUT
                  </div>
                  <div style={{
                    fontFamily: "var(--font-mono)", fontSize: "1rem", fontWeight: 600,
                    color: cv.consistent_with_held_out ? "var(--success-text)" : "var(--danger-text)"
                  }}>
                    {cv.consistent_with_held_out ? "✓ YES" : "✗ NO"}
                    {cv.held_out_score !== null && (
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: 8 }}>
                        (held-out: {cv.held_out_score.toFixed(4)})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.6, padding: "8px 0" }}>
              {cv.interpretation}
            </div>
          </div>
        )}
      </div>

      {/* Alert queue */}
      <Panel title={`AML ALERT QUEUE · ${flaggedCount} FLAGGED @ ${threshold.toFixed(2)}`}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <caption className="sr-only">
              Ranked AML alert queue, {alerts.length} transactions, {flaggedCount} flagged at threshold {threshold.toFixed(2)}
            </caption>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.56rem", textTransform: "uppercase", letterSpacing: "0.14em" }}>
                <th scope="col" style={th}>Tier</th><th scope="col" style={th}>Transaction</th><th scope="col" style={th}>Amount</th>
                <th scope="col" style={th}>Channel</th><th scope="col" style={th}>Geo</th><th scope="col" style={th}>Risk</th><th scope="col" style={th}>Actual</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.transaction_id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={td}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text)" }}>
                      <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", background: TIER_FILL[a.risk_tier], flexShrink: 0 }} />
                      {a.risk_tier}
                    </span>
                  </td>
                  <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>{a.transaction_id}</td>
                  <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>${a.amount.toLocaleString()}</td>
                  <td style={td}>{a.channel}</td>
                  <td style={td}>{a.country}</td>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 4, background: "var(--surface-2)", minWidth: 50 }}>
                        <div style={{ width: `${a.risk_score}%`, height: "100%", background: TIER_FILL[a.risk_tier] }} />
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text)" }}>{a.risk_score}</span>
                    </div>
                  </td>
                  <td style={td}>
                    {a.is_fraud_actual
                      ? <span style={{ color: "var(--danger-text)", fontFamily: "var(--font-mono)", fontSize: "0.66rem", fontWeight: 600, letterSpacing: "0.1em" }}>FRAUD</span>
                      : <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.66rem" }}>—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function Panel({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div style={{ ...panelStyle, padding: "14px 16px", minWidth: 0, marginBottom: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: "0.54rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10 }}>
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function Cell({ label, value, good, bad }: { label: string; value: number; good?: boolean; bad?: boolean }) {
  const color = good ? "var(--success-text)" : bad ? "var(--danger-text)" : "var(--text-muted)";
  return (
    <div style={{ padding: "14px", background: "var(--surface-2)", border: "1px solid var(--border)", textAlign: "center" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.5rem", fontWeight: 600, color }}>{value.toLocaleString()}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", padding: "11px 12px", textAlign: "center" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.46rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 5 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.15rem", fontWeight: 600, color: accent ? "var(--foil-gold-text)" : "var(--text)" }}>{value}</div>
    </div>
  );
}

function StepBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.08em",
        padding: "5px 10px", border: "1px solid var(--border)", background: "transparent",
        color: disabled ? "var(--text-muted)" : "var(--text)",
        cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}

function ReasonRow({ r }: { r: ReasonCode }) {
  const raises = r.direction === "raises_risk";
  const color = raises ? "var(--danger)" : "var(--seal-green)";
  return (
    <div style={{ padding: "10px 0", borderTop: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem", color: "var(--text)" }}>{r.label}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", fontWeight: 600, color }}>
          {raises ? "+" : ""}{r.shap.toFixed(3)} · {r.weight_pct}%
        </span>
      </div>
      <div style={{ height: 5, background: "var(--surface-2)", marginBottom: 6 }} aria-hidden>
        <div style={{ width: `${Math.min(100, r.weight_pct)}%`, height: "100%", background: color }} />
      </div>
      <div style={{ fontFamily: "var(--font-body)", fontSize: "0.74rem", color: "var(--text-muted)", lineHeight: 1.5 }}>{r.reason}</div>
    </div>
  );
}

/* ── EChart options ─────────────────────────────────────────── */
type Colors = ReturnType<typeof chartColors>;

function axis(c: Colors, name: string, max = 1) {
  return {
    name, nameLocation: "middle" as const, nameGap: 26, min: 0, max,
    nameTextStyle: { color: c.muted, fontSize: 10, fontFamily: "JetBrains Mono" },
    axisLine: { lineStyle: { color: c.grid } },
    axisLabel: { color: c.muted, fontSize: 9, fontFamily: "JetBrains Mono" },
    splitLine: { lineStyle: { color: c.grid, type: "dashed" as const } },
  };
}

const tooltip = {
  trigger: "axis" as const,
  backgroundColor: "rgba(19,17,16,0.96)",
  borderWidth: 0,
  textStyle: { color: "#e8dfc8", fontFamily: "JetBrains Mono", fontSize: 11 },
};

function rocOption(curve: CurvePoint[], c: Colors): EChartsOption {
  return {
    grid: { left: 44, right: 16, top: 16, bottom: 40 },
    tooltip,
    xAxis: { type: "value", ...axis(c, "False positive rate") },
    yAxis: { type: "value", ...axis(c, "True positive rate") },
    series: [
      { type: "line", data: [[0, 0], [1, 1]], symbol: "none", lineStyle: { color: c.muted, type: "dashed", width: 1 } },
      { type: "line", smooth: true, symbol: "none", data: curve.map((p) => [p.x, p.y]), lineStyle: { color: c.roc, width: 2.5 }, areaStyle: { color: c.rocArea } },
    ],
  };
}

function prOption(curve: CurvePoint[], c: Colors): EChartsOption {
  return {
    grid: { left: 44, right: 16, top: 16, bottom: 40 },
    tooltip,
    xAxis: { type: "value", ...axis(c, "Recall") },
    yAxis: { type: "value", ...axis(c, "Precision") },
    series: [
      { type: "line", smooth: true, symbol: "none", data: curve.map((p) => [p.x, p.y]), lineStyle: { color: c.pr, width: 2.5 }, areaStyle: { color: c.prArea } },
    ],
  };
}

function importanceOption(items: FeatureImportance[], c: Colors): EChartsOption {
  const sorted = [...items].sort((a, b) => a.importance - b.importance);
  return {
    grid: { left: 110, right: 24, top: 8, bottom: 24 },
    tooltip: { ...tooltip, trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: { type: "value", axisLabel: { color: c.muted, fontSize: 9, fontFamily: "JetBrains Mono" }, splitLine: { lineStyle: { color: c.grid, type: "dashed" } } },
    yAxis: { type: "category", data: sorted.map((i) => i.feature), axisLabel: { color: c.muted, fontSize: 10, fontFamily: "JetBrains Mono" }, axisLine: { lineStyle: { color: c.grid } } },
    series: [{ type: "bar", data: sorted.map((i) => i.importance), itemStyle: { color: c.gold, borderRadius: [0, 3, 3, 0] }, barMaxWidth: 16 }],
  };
}

function shapOption(items: ShapImportance[], c: Colors): EChartsOption {
  const sorted = [...items].sort((a, b) => a.mean_abs_shap - b.mean_abs_shap);
  return {
    grid: { left: 110, right: 24, top: 8, bottom: 24 },
    tooltip: {
      ...tooltip,
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: unknown) => {
        const p = (Array.isArray(params) ? params[0] : params) as { name: string; value: number };
        return `<b>${p.name}</b><br/>Mean |SHAP|: ${p.value.toFixed(5)}`;
      },
    },
    xAxis: {
      type: "value",
      name: "Mean |SHAP value|",
      nameLocation: "middle",
      nameGap: 26,
      nameTextStyle: { color: c.muted, fontSize: 10, fontFamily: "JetBrains Mono" },
      axisLabel: { color: c.muted, fontSize: 9, fontFamily: "JetBrains Mono" },
      splitLine: { lineStyle: { color: c.grid, type: "dashed" } },
    },
    yAxis: {
      type: "category",
      data: sorted.map((i) => i.feature),
      axisLabel: { color: c.muted, fontSize: 10, fontFamily: "JetBrains Mono" },
      axisLine: { lineStyle: { color: c.grid } },
    },
    series: [{
      type: "bar",
      data: sorted.map((i) => ({
        value: i.mean_abs_shap,
        itemStyle: {
          color: c.shapPos,
          borderRadius: [0, 3, 3, 0],
        },
      })),
      barMaxWidth: 16,
    }],
  };
}

function cvOption(cv: CrossValidationResult, c: Colors): EChartsOption {
  return {
    grid: { left: 44, right: 16, top: 16, bottom: 32 },
    tooltip: { ...tooltip, trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: {
      type: "category",
      data: cv.scores.map((_, i) => `Fold ${i + 1}`),
      axisLabel: { color: c.muted, fontSize: 10, fontFamily: "JetBrains Mono" },
      axisLine: { lineStyle: { color: c.grid } },
    },
    yAxis: {
      type: "value",
      min: Math.max(0, cv.mean - 5 * cv.std),
      max: Math.min(1, cv.mean + 5 * cv.std),
      axisLabel: { color: c.muted, fontSize: 9, fontFamily: "JetBrains Mono", formatter: (v: number) => v.toFixed(3) },
      splitLine: { lineStyle: { color: c.grid, type: "dashed" } },
    },
    series: [
      {
        type: "bar",
        data: cv.scores.map((s) => ({
          value: s,
          itemStyle: { color: c.cvBar, borderRadius: [3, 3, 0, 0] },
        })),
        barMaxWidth: 32,
      },
      {
        type: "line",
        data: cv.scores.map(() => cv.mean),
        symbol: "none",
        lineStyle: { color: c.cvMean, type: "dashed", width: 2 },
        markLine: {
          silent: true,
          data: [{ yAxis: cv.mean, label: { formatter: `mean: ${cv.mean.toFixed(4)}`, color: c.cvMean, fontSize: 10, fontFamily: "JetBrains Mono" } }],
          lineStyle: { color: c.cvMean, type: "dashed" },
        },
      },
    ],
  };
}
