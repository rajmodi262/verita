import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, FileSearch } from "lucide-react";
import { API_BASE } from "../config";

interface Entity { text: string; label: string; start: number; end: number }
interface Match { framework: string; keyword: string; context: string }
interface Result {
  risk_score: number;
  risk_level: string;
  recommended_action: string;
  signals: string[];
  entities: Entity[];
  regulatory_matches: Match[];
  framework_hits: Record<string, number>;
  summary: Record<string, number>;
}

const LEVEL_COLOR: Record<string, string> = { Critical: "#ff2d55", High: "#ff7a8a", Medium: "#f5a524", Low: "#16c784" };
const ENTITY_COLOR: Record<string, string> = {
  MONEY: "#16c784", JURISDICTION: "#ff7a8a", SWIFT_CODE: "#4d7cff",
  ACCOUNT: "#a855f7", PERCENT: "#22d3ee", DATE: "#8c97b5",
};
const FRAMEWORK_COLOR: Record<string, string> = { OFAC: "#ff2d55", AML: "#ff7a8a", BSA: "#f5a524", FinCEN: "#4d7cff" };

const SAMPLE = "On 03/14/2024 the subject wired $48,500 via SWIFT (CHASUS33) to a shell company in Russia, then structured the remaining funds as multiple small transfers just under the $10,000 reporting threshold to avoid detection. The beneficiary is a politically exposed person (PEP) flagged on the OFAC SDN list.";

function highlight(text: string, entities: Entity[]) {
  const sorted = [...entities].sort((a, b) => a.start - b.start);
  const out: React.ReactNode[] = [];
  let cursor = 0;
  sorted.forEach((e, i) => {
    if (e.start < cursor) return; // skip overlaps
    if (e.start > cursor) out.push(text.slice(cursor, e.start));
    out.push(
      <mark key={i} title={e.label} style={{ background: `${ENTITY_COLOR[e.label] || "#8c97b5"}26`, color: "var(--text)", borderBottom: `2px solid ${ENTITY_COLOR[e.label] || "#8c97b5"}`, borderRadius: 3, padding: "0 2px" }}>
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
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/api/nlp/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      setResult(await res.json());
    } catch (e: any) {
      setError("Backend unavailable — start the API on :8000");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p style={{ color: "var(--text-muted)", marginBottom: 18, maxWidth: 720 }}>
        Paste a transaction narrative, alert note, or regulatory text. Verita extracts entities,
        matches it against BSA / AML / OFAC / FinCEN frameworks, and recommends an action — with the
        exact signals that drove the score. Fully transparent, no black box.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: result ? "1fr 1fr" : "1fr", gap: 18, alignItems: "start" }}>
        {/* Input */}
        <div className="glass" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>Compliance text</span>
            <button data-cursor onClick={() => { setText(SAMPLE); setResult(null); }} style={ghostBtn}>Load sample</button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            style={{
              width: "100%", resize: "vertical", background: "var(--surface-2)", color: "var(--text)",
              border: "1px solid var(--border)", borderRadius: 12, padding: 14, fontFamily: "var(--font-body)",
              fontSize: "0.9rem", lineHeight: 1.6, outline: "none",
            }}
          />
          <button data-cursor onClick={analyze} disabled={loading || !text.trim()} style={aiBtn}>
            {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={16} />}
            {loading ? "Analyzing…" : "Analyze"}
          </button>
          {error && <p style={{ color: "var(--danger)", marginTop: 10, fontSize: "0.85rem" }}>⚠ {error}</p>}
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>

        {/* Results */}
        {result && (
          <motion.div initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* risk verdict */}
            <div className="glass" style={{ padding: 20, borderLeft: `3px solid ${LEVEL_COLOR[result.risk_level]}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>Risk level</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: 700, color: LEVEL_COLOR[result.risk_level] }}>{result.risk_level}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "2.2rem", fontWeight: 600 }}>{result.risk_score}</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>/ 100</div>
                </div>
              </div>
              <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: `${LEVEL_COLOR[result.risk_level]}1f`, display: "inline-flex", alignItems: "center", gap: 8 }}>
                <FileSearch size={15} color={LEVEL_COLOR[result.risk_level]} />
                <span style={{ fontWeight: 600 }}>Recommended: {result.recommended_action}</span>
              </div>
            </div>

            {/* signals */}
            <div className="glass" style={{ padding: 18 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10 }}>Why — signals</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
                {result.signals.map((s, i) => <li key={i} style={{ fontSize: "0.86rem", lineHeight: 1.5 }}>{s}</li>)}
              </ul>
            </div>

            {/* regulatory matches */}
            {result.regulatory_matches.length > 0 && (
              <div className="glass" style={{ padding: 18 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10 }}>Regulatory matches</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {result.regulatory_matches.map((m, i) => (
                    <span key={i} style={{ fontSize: "0.78rem", padding: "4px 10px", borderRadius: 999, color: FRAMEWORK_COLOR[m.framework] || "#8c97b5", background: `${FRAMEWORK_COLOR[m.framework] || "#8c97b5"}1f`, border: `1px solid ${FRAMEWORK_COLOR[m.framework] || "#8c97b5"}40` }}>
                      <strong>{m.framework}</strong> · {m.keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* highlighted entities (full width) */}
      {result && result.entities.length > 0 && (
        <div className="glass" style={{ padding: 20, marginTop: 18 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 12 }}>
            Extracted entities · {result.entities.length}
          </div>
          <p style={{ lineHeight: 2, fontSize: "0.95rem" }}>{highlight(text, result.entities)}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
            {Object.entries(ENTITY_COLOR).map(([label, color]) => (
              <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.72rem", color: "var(--text-muted)" }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />{label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const ghostBtn: React.CSSProperties = { padding: "6px 12px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" };
const aiBtn: React.CSSProperties = { marginTop: 12, padding: "11px 20px", borderRadius: 10, fontSize: "0.9rem", fontWeight: 600, border: "none", color: "#fff", background: "linear-gradient(120deg, #6366f1, #a855f7)", boxShadow: "0 6px 24px -8px rgba(168,85,247,0.6)", display: "inline-flex", alignItems: "center", gap: 8 };
