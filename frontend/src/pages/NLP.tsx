import { useState } from "react";
import { Loader2, FileSearch } from "lucide-react";
import { apiPost } from "../lib/api";
import { errMessage } from "../lib/errors";
import { normalizeRiskLevel, type NlpResult, type NlpEntity } from "../types/api";

// Risk-level text colors (AAA) + border-fill colors, keyed by canonical level.
const LEVEL_TEXT: Record<string, string> = {
  Critical: "var(--danger-text)", High: "var(--danger-text)", Medium: "var(--foil-gold-text)", Low: "var(--success-text)",
};
const LEVEL_FILL: Record<string, string> = {
  Critical: "var(--danger)", High: "var(--stamp-red)", Medium: "var(--foil-gold)", Low: "var(--seal-green)",
};
// Entity underline/tint colors (non-text fills) — tokenized.
const ENTITY_COLOR: Record<string, string> = {
  MONEY: "var(--success)", JURISDICTION: "var(--danger)", SWIFT_CODE: "var(--blue)",
  ACCOUNT: "var(--violet)", PERCENT: "var(--cyan)", DATE: "var(--text-muted)",
};
const FRAMEWORK_COLOR: Record<string, string> = {
  OFAC: "var(--danger)", AML: "var(--stamp-red)", BSA: "var(--foil-gold)", FinCEN: "var(--blue)",
};

const SAMPLE = "On 03/14/2024 the subject wired $48,500 via SWIFT (CHASUS33) to a shell company in Russia, then structured the remaining funds as multiple small transfers just under the $10,000 reporting threshold to avoid detection. The beneficiary is a politically exposed person (PEP) flagged on the OFAC SDN list.";

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

function highlight(text: string, entities: NlpEntity[]) {
  const sorted = [...entities].sort((a, b) => a.start - b.start);
  const out: React.ReactNode[] = [];
  let cursor = 0;
  sorted.forEach((e, i) => {
    if (e.start < cursor) return;
    if (e.start > cursor) out.push(text.slice(cursor, e.start));
    out.push(
      <mark
        key={i}
        title={e.label}
        style={{
          background: `${ENTITY_COLOR[e.label] || "var(--text-muted)"}22`,
          color: "var(--text)",
          borderBottom: `2px solid ${ENTITY_COLOR[e.label] || "var(--text-muted)"}`,
          borderRadius: 0,
          padding: "0 2px",
        }}
      >
        {text.slice(e.start, e.end)}
      </mark>
    );
    cursor = e.end;
  });
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

export default function NLP() {
  const [text, setText] = useState(SAMPLE);
  const [result, setResult] = useState<NlpResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiPost<NlpResult>("/api/nlp/analyze", { text });
      setResult(data);
    } catch (e: unknown) {
      setError(errMessage(e, "Backend unavailable — start the API on :8000"));
    } finally {
      setLoading(false);
    }
  };

  const level = result ? normalizeRiskLevel(result.risk_level) ?? result.risk_level : "";

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
        <div style={labelStyle}>CASE FILE / NLP INSIGHT</div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}
        >
          Compliance Text Analysis
        </h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6, fontSize: "0.86rem", maxWidth: "68ch" }}>
          Paste a transaction narrative, alert note, or regulatory text. Verita extracts entities,
          matches against BSA / AML / OFAC / FinCEN frameworks, and recommends an action — with
          the exact signals that drove the score.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: result ? "1fr 1fr" : "1fr", gap: 14, alignItems: "start" }}>
        {/* Input */}
        <div style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <label htmlFor="nlp-text" style={labelStyle as React.CSSProperties}>COMPLIANCE TEXT</label>
            <button
              data-cursor
              onClick={() => { setText(SAMPLE); setResult(null); }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.58rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "5px 10px",
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              LOAD SAMPLE
            </button>
          </div>
          <textarea
            id="nlp-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            style={{
              width: "100%",
              resize: "vertical",
              background: "var(--surface-2)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: 0,
              padding: "12px 14px",
              fontFamily: "var(--font-body)",
              fontSize: "0.88rem",
              lineHeight: 1.65,
              boxShadow: "inset 2px 2px 0 rgba(0,0,0,0.2)",
            }}
          />
          <button
            data-cursor
            onClick={analyze}
            disabled={loading || !text.trim()}
            style={{
              marginTop: 10,
              padding: "10px 20px",
              border: "1px solid var(--foil-gold)",
              background: "transparent",
              color: "var(--foil-gold-text)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.66rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor: loading || !text.trim() ? "not-allowed" : "pointer",
              boxShadow: "var(--shadow-desk-sm)",
              opacity: loading || !text.trim() ? 0.5 : 1,
            }}
          >
            {loading
              ? <><Loader2 size={13} aria-hidden style={{ animation: "spin 1s linear infinite" }} /> ANALYZING…</>
              : <>ANALYZE DOCUMENT</>
            }
          </button>
          {error && <p role="alert" style={{ color: "var(--danger-text)", marginTop: 10, fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>⚠ {error}</p>}
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>

        {/* Results */}
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Risk verdict */}
            <div style={{ ...panelStyle, borderLeft: `3px solid ${LEVEL_FILL[level] || "var(--text-muted)"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <div style={labelStyle}>RISK LEVEL</div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "2rem",
                      fontWeight: 700,
                      color: LEVEL_TEXT[level] || "var(--text)",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {String(level).toUpperCase()}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "2.2rem", fontWeight: 600, color: "var(--text)" }}>
                    {result.risk_score}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", letterSpacing: "0.16em", color: "var(--text-muted)" }}>/ 100</div>
                </div>
              </div>
              <div
                style={{
                  marginTop: 14,
                  padding: "8px 12px",
                  border: `1px solid ${LEVEL_FILL[level] || "var(--border)"}`,
                  background: "var(--surface-2)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "var(--font-body)",
                  fontSize: "0.84rem",
                }}
              >
                <FileSearch size={13} color={LEVEL_FILL[level] || "var(--text-muted)"} aria-hidden />
                <span style={{ fontWeight: 600, color: "var(--text)" }}>Recommended: {result.recommended_action}</span>
              </div>
            </div>

            {/* Signals */}
            <div style={panelStyle}>
              <div style={labelStyle}>WHY — SIGNALS</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
                {result.signals.map((s, i) => (
                  <li key={i} style={{ fontSize: "0.84rem", lineHeight: 1.55, color: "var(--text)", fontFamily: "var(--font-body)" }}>{s}</li>
                ))}
              </ul>
            </div>

            {/* Regulatory matches */}
            {result.regulatory_matches.length > 0 && (
              <div style={panelStyle}>
                <div style={labelStyle}>REGULATORY MATCHES</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {result.regulatory_matches.map((m, i) => (
                    <span
                      key={i}
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.62rem",
                        letterSpacing: "0.1em",
                        padding: "4px 10px",
                        color: "var(--text)",
                        background: "var(--surface-2)",
                        border: `1px solid ${FRAMEWORK_COLOR[m.framework] || "var(--border)"}`,
                      }}
                    >
                      <strong>{m.framework}</strong> · {m.keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Highlighted entities */}
      {result && result.entities.length > 0 && (
        <div style={{ ...panelStyle, marginTop: 14 }}>
          <div style={labelStyle}>EXTRACTED ENTITIES · {result.entities.length}</div>
          <p style={{ lineHeight: 2, fontSize: "0.92rem", color: "var(--text)", fontFamily: "var(--font-body)" }}>
            {highlight(text, result.entities)}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 14 }}>
            {Object.entries(ENTITY_COLOR).map(([label, color]) => (
              <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: "0.58rem", letterSpacing: "0.1em", color: "var(--text-muted)" }}>
                <span aria-hidden style={{ width: 8, height: 8, background: color, display: "inline-block" }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
