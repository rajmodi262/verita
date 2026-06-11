import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Sparkles, Loader2, Database } from "lucide-react";
import { API_BASE } from "../../config";

interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  row_count: number;
  truncated: boolean;
  elapsed_ms: number;
}

/**
 * SQL Playground — real SQL (DuckDB) against the uploaded dataset, registered as table `data`.
 * Includes a plain-English bar that translates to SQL (shown for review, never auto-run blindly).
 */
export default function SqlPlayground({ datasetId }: { datasetId: string }) {
  const [sql, setSql] = useState("SELECT channel, COUNT(*) AS transactions, ROUND(AVG(amount), 2) AS avg_amount\nFROM data\nGROUP BY channel\nORDER BY avg_amount DESC");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [translating, setTranslating] = useState(false);

  const run = async (overrideSql?: string) => {
    const q = overrideSql ?? sql;
    setRunning(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/api/sql/query`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset_id: datasetId, sql: q }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.detail || `Server ${res.status}`);
      setResult(body);
    } catch (e: any) {
      setError(e.message); setResult(null);
    } finally {
      setRunning(false);
    }
  };

  const translate = async () => {
    if (!question.trim()) return;
    setTranslating(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/api/sql/translate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset_id: datasetId, question }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.detail || `Server ${res.status}`);
      setSql(body.sql);
      await run(body.sql);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* NL bar */}
      <div className="glass" style={{ padding: "12px 14px", display: "flex", gap: 10, alignItems: "center" }}>
        <Sparkles size={16} color="#a855f7" style={{ flexShrink: 0 }} />
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && translate()}
          placeholder='Ask in plain English — e.g. "average amount by channel top 5"'
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: "0.9rem", fontFamily: "var(--font-body)" }}
        />
        <button data-cursor onClick={translate} disabled={translating} style={aiBtn}>
          {translating ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : "→ SQL"}
        </button>
      </div>

      {/* editor */}
      <div className="glass" style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.66rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Database size={12} /> table: <code style={{ color: "var(--blue)" }}>data</code> · read-only · DuckDB
          </span>
          <button data-cursor onClick={() => run()} disabled={running} style={runBtn}>
            {running ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={14} />} Run
          </button>
        </div>
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") run(); }}
          rows={6}
          spellCheck={false}
          style={{
            width: "100%", resize: "vertical", background: "var(--surface-2)", color: "var(--text)",
            border: "1px solid var(--border)", borderRadius: 10, padding: 12,
            fontFamily: "var(--font-mono)", fontSize: "0.84rem", lineHeight: 1.6, outline: "none",
          }}
        />
        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 6 }}>Ctrl+Enter to run · SELECT only · results capped at 500 rows</div>
        {error && <p style={{ color: "var(--danger)", marginTop: 8, fontSize: "0.84rem" }}>⚠ {error}</p>}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>

      {/* results */}
      {result && (
        <motion.div className="glass" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: 14 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.66rem", color: "var(--text-muted)", marginBottom: 8 }}>
            {result.row_count} rows{result.truncated ? " (truncated)" : ""} · {result.elapsed_ms} ms
          </div>
          <div style={{ overflowX: "auto", maxHeight: 420, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr>
                  {result.columns.map((c) => (
                    <th key={c} style={{ textAlign: "left", padding: "8px 10px", position: "sticky", top: 0, background: "var(--bg-2)", fontFamily: "var(--font-mono)", fontSize: "0.66rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    {result.columns.map((c) => (
                      <td key={c} style={{ padding: "7px 10px", fontFamily: typeof row[c] === "number" ? "var(--font-mono)" : "var(--font-body)" }}>
                        {row[c] === null ? <span style={{ color: "var(--text-muted)" }}>∅</span> : String(row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}

const aiBtn: React.CSSProperties = { padding: "7px 14px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, border: "none", color: "#fff", background: "linear-gradient(120deg, #6366f1, #a855f7)", display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 };
const runBtn: React.CSSProperties = { padding: "7px 16px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, border: "none", color: "#fff", background: "var(--signature)", display: "inline-flex", alignItems: "center", gap: 6 };
