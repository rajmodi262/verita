import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ScanSearch, FileSpreadsheet, Database } from "lucide-react";
import { apiGet } from "../lib/api";
import {
  normalizeRiskLevel,
  type AnalysisRun,
  type InvestigationRecord,
  type HistorySummary,
  type AnalysesResponse,
  type InvestigationsResponse,
} from "../types/api";

// Border (non-text, brand colors) + AAA-safe text colors, keyed by quality grade.
const GRADE_BORDER: Record<string, string> = {
  A: "var(--seal-green)", B: "var(--foil-gold)", C: "var(--foil-gold)",
  D: "var(--stamp-red)", F: "var(--danger)",
};
const GRADE_TEXT: Record<string, string> = {
  A: "var(--success-text)", B: "var(--foil-gold-text)", C: "var(--foil-gold-text)",
  D: "var(--danger-text)", F: "var(--danger-text)",
};
const RISK_BORDER: Record<string, string> = {
  Critical: "var(--danger)", High: "var(--danger)", Medium: "var(--foil-gold)", Low: "var(--seal-green)",
};
const RISK_TEXT: Record<string, string> = {
  Critical: "var(--danger-text)", High: "var(--danger-text)", Medium: "var(--foil-gold-text)", Low: "var(--success-text)",
};

function ago(iso: string | null): string {
  if (!iso) return "—";
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

const panelStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-desk-sm)",
  padding: "16px 18px",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.56rem",
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: 10,
};

export default function Overview() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<HistorySummary>({ analyses: 0, investigations: 0, queries: 0 });
  const [analyses, setAnalyses] = useState<AnalysisRun[]>([]);
  const [investigations, setInvestigations] = useState<InvestigationRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    // Each call is independent — a failure of one shouldn't blank the others.
    Promise.allSettled([
      apiGet<HistorySummary>("/api/history/summary", ctrl.signal),
      apiGet<AnalysesResponse>("/api/history/analyses?limit=8", ctrl.signal),
      apiGet<InvestigationsResponse>("/api/history/investigations?limit=8", ctrl.signal),
    ]).then(([s, a, i]) => {
      if (s.status === "fulfilled") setSummary(s.value);
      if (a.status === "fulfilled") setAnalyses(a.value.analyses ?? []);
      if (i.status === "fulfilled") setInvestigations(i.value.investigations ?? []);
      setLoaded(true);
    });
    return () => ctrl.abort();
  }, []);

  const empty = loaded && analyses.length === 0 && investigations.length === 0;

  return (
    <div>
      {/* Page header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 14,
          flexWrap: "wrap",
          marginBottom: 24,
          paddingBottom: 18,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div>
          <div style={labelStyle}>CASE FILE / OVERVIEW</div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: "var(--text)",
            }}
          >
            Command Center
          </h1>
          <p style={{ color: "var(--text-muted)", marginTop: 6, fontSize: "0.86rem", fontFamily: "var(--font-body)" }}>
            Analysis and investigation history — every run is logged to the audit trail.
          </p>
        </div>
        <button
          data-cursor
          onClick={() => navigate("/studio")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            border: "1px solid var(--border)",
            background: "var(--surface-2)",
            color: "var(--text)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.64rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            cursor: "pointer",
            boxShadow: "var(--shadow-desk-sm)",
            transition: "box-shadow 0.12s, transform 0.12s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-desk-press)"; e.currentTarget.style.transform = "translate(1px,1px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-desk-sm)"; e.currentTarget.style.transform = "none"; }}
        >
          <Sparkles size={13} aria-hidden /> NEW ANALYSIS
        </button>
      </div>

      {/* Stat tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { k: "Datasets analyzed",    v: summary.analyses,       icon: FileSpreadsheet, accent: "var(--foil-gold)" },
          { k: "Investigations run",   v: summary.investigations, icon: ScanSearch,      accent: "var(--stamp-red)" },
          { k: "Audit-logged queries", v: summary.queries,        icon: Database,        accent: "var(--seal-green)" },
        ].map((t) => (
          <div key={t.k} style={{ ...panelStyle, display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 36,
                height: 36,
                border: `1px solid ${t.accent}`,
                display: "grid",
                placeItems: "center",
                color: t.accent,
                flexShrink: 0,
              }}
            >
              <t.icon size={16} aria-hidden />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", fontWeight: 600, lineHeight: 1, color: "var(--text)" }}>
                {t.v.toLocaleString()}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.52rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-muted)", marginTop: 4 }}>
                {t.k}
              </div>
            </div>
          </div>
        ))}
      </div>

      {empty ? (
        <div style={{ ...panelStyle, padding: "48px 40px", textAlign: "center" }}>
          <FileSpreadsheet size={36} color="var(--foil-gold)" aria-hidden />
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.4rem", marginTop: 14, color: "var(--text)" }}>
            No analyses yet
          </h2>
          <p style={{ color: "var(--text-muted)", marginTop: 8, fontSize: "0.88rem" }}>
            Upload a dataset in Studio and your history will appear here.
          </p>
          <button
            data-cursor
            onClick={() => navigate("/studio")}
            style={{
              marginTop: 20,
              padding: "10px 22px",
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              color: "var(--text)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.64rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            GO TO STUDIO →
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
          {/* Recent analyses */}
          <section aria-labelledby="recent-analyses">
            <h2 id="recent-analyses" style={labelStyle as React.CSSProperties}>RECENT ANALYSES</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {analyses.map((a) => (
                <div
                  key={a.id}
                  style={{ ...panelStyle, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-body)",
                        fontWeight: 600,
                        fontSize: "0.88rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: "var(--text)",
                      }}
                    >
                      {a.title}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)", marginTop: 3, letterSpacing: "0.06em" }}>
                      {a.row_count.toLocaleString()} rows · {a.column_count} cols · {a.insights_count} findings · {ago(a.created_at)}
                    </div>
                  </div>
                  <span
                    title={`Data quality grade ${a.quality_grade}`}
                    style={{
                      flexShrink: 0,
                      width: 30,
                      height: 30,
                      border: `2px solid ${GRADE_BORDER[a.quality_grade] || "var(--text-muted)"}`,
                      display: "grid",
                      placeItems: "center",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      color: GRADE_TEXT[a.quality_grade] || "var(--text-muted)",
                    }}
                  >
                    {a.quality_grade}
                  </span>
                </div>
              ))}
              {analyses.length === 0 && (
                <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", padding: "8px 0" }}>None yet.</div>
              )}
            </div>
          </section>

          {/* Recent investigations */}
          <section aria-labelledby="recent-investigations">
            <h2 id="recent-investigations" style={labelStyle as React.CSSProperties}>RECENT INVESTIGATIONS</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {investigations.map((iv) => {
                const level = normalizeRiskLevel(iv.risk_level) ?? iv.risk_level;
                return (
                  <div
                    key={iv.id}
                    style={{
                      ...panelStyle,
                      padding: "12px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      borderLeft: `3px solid ${RISK_BORDER[level] || "var(--text-muted)"}`,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: "0.85rem", color: RISK_TEXT[level] || "var(--text)" }}>
                          {level} risk
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-muted)" }}>
                          · {iv.finding_count} findings
                        </span>
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.58rem",
                          color: "var(--text-muted)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginTop: 3,
                          letterSpacing: "0.06em",
                        }}
                        title={iv.chain_head}
                      >
                        chain {iv.chain_head.slice(0, 12)}… · {iv.memo_mode} · {ago(iv.created_at)}
                      </div>
                    </div>
                    <span style={{ flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: "0.58rem", color: "var(--success-text)", letterSpacing: "0.1em" }}>
                      ✓ sealed
                    </span>
                  </div>
                );
              })}
              {investigations.length === 0 && (
                <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", padding: "8px 0" }}>
                  None yet — run the Investigator in Studio.
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
