import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanSearch, Loader2, ShieldCheck, ChevronDown, Link2, FileText, CircleCheck, CircleSlash, CircleDot } from "lucide-react";
import { API_BASE } from "../../config";

interface Step {
  id: string;
  title: string;
  action: string;
  query: string | null;
  result: any[];
  finding: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  confirmed: boolean;
  prev_hash: string;
  hash: string;
}
interface Result {
  title: string;
  risk_level: string;
  recommended_action: string;
  confirmed_count: number;
  tests_run: number;
  memo: string;
  memo_mode: string;
  trace: Step[];
  chain: { head: string; length: number; verified: boolean };
}

const SEV: Record<string, string> = { Critical: "#ff2d55", High: "#ff7a8a", Medium: "#f5a524", Low: "#16c784" };

export default function Investigator({ datasetId }: { datasetId: string }) {
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<number | null>(null);

  const run = async () => {
    setPhase("running"); setError("");
    try {
      const res = await fetch(`${API_BASE}/api/agent/investigate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset_id: datasetId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.detail || `Server ${res.status}`);
      // brief dramatic pause so the agent feels like it's working
      await new Promise((r) => setTimeout(r, 700));
      setResult(body); setPhase("done");
    } catch (e: any) {
      setError(e.message); setPhase("error");
    }
  };

  if (phase === "idle" || phase === "running" || phase === "error") {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass"
          style={{ maxWidth: 620, padding: "44px 40px", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, margin: "0 auto 18px", borderRadius: 18, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#6366f1,#a855f7)", boxShadow: "0 10px 40px -8px rgba(168,85,247,0.6)" }}>
            {phase === "running" ? <Loader2 size={30} color="#fff" style={{ animation: "spin 1s linear infinite" }} /> : <ScanSearch size={30} color="#fff" />}
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem" }}>Auditable Compliance Investigator</h2>
          <p style={{ color: "var(--text-muted)", marginTop: 10, lineHeight: 1.65 }}>
            An autonomous agent screens this dataset for financial-crime risk — forming AML hypotheses,
            <strong style={{ color: "var(--text)" }}> testing each with a real SQL query</strong>, and writing a cited
            compliance memo. Every step is logged and <strong style={{ color: "var(--text)" }}>hash-chained</strong> —
            tamper-evident and reproducible, the way a regulator needs.
          </p>
          {phase === "running" ? (
            <div style={{ marginTop: 22, fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--blue)" }}>
              Planning hypotheses · running queries · sealing the chain…
            </div>
          ) : (
            <button data-cursor onClick={run} style={{ marginTop: 22, padding: "13px 28px", borderRadius: 12, border: "none", color: "#fff", fontWeight: 600, fontSize: "0.95rem", background: "linear-gradient(120deg,#6366f1,#a855f7)", boxShadow: "0 8px 30px -8px rgba(168,85,247,0.6)", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <ScanSearch size={17} /> Run investigation
            </button>
          )}
          {phase === "error" && <p style={{ color: "var(--danger)", marginTop: 16 }}>⚠ {error}</p>}
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </motion.div>
      </div>
    );
  }

  const r = result!;
  const color = SEV[r.risk_level];

  return (
    <div>
      {/* Verdict + chain badge */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 18 }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass" style={{ padding: "20px 22px", borderLeft: `3px solid ${color}` }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>Investigation verdict</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 6 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, color }}>{r.risk_level} risk</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-muted)" }}>{r.confirmed_count} confirmed / {r.tests_run} tests</span>
          </div>
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: `${color}1f`, fontWeight: 600, fontSize: "0.9rem" }}>
            ⮕ {r.recommended_action}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="glass" style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: r.chain.verified ? "#16c784" : "var(--danger)" }}>
            <ShieldCheck size={18} />
            <span style={{ fontWeight: 700 }}>{r.chain.verified ? "Chain verified" : "Chain broken"}</span>
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 8, lineHeight: 1.5 }}>
            {r.chain.length} reasoning steps, SHA-256 hash-chained &amp; tamper-evident.
          </div>
          <div style={{ marginTop: 10, fontFamily: "var(--font-mono)", fontSize: "0.66rem", color: "var(--blue)", wordBreak: "break-all", background: "var(--surface-2)", padding: "8px 10px", borderRadius: 8 }}>
            head: {r.chain.head.slice(0, 32)}…
          </div>
        </motion.div>
      </div>

      {/* Reasoning timeline */}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 12 }}>
        Reasoning trace — every step shows its work
      </div>
      <div style={{ position: "relative", paddingLeft: 8 }}>
        {r.trace.map((s, i) => {
          const isTest = s.id !== "baseline" && s.id !== "synthesis";
          const dotColor = !isTest ? "var(--blue)" : s.confirmed ? SEV[s.severity] : "var(--text-muted)";
          const Icon = !isTest ? CircleDot : s.confirmed ? CircleCheck : CircleSlash;
          return (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
              style={{ display: "flex", gap: 14, position: "relative" }}>
              {/* connector + node */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Icon size={20} color={dotColor} style={{ flexShrink: 0, background: "var(--bg)", borderRadius: "50%" }} />
                {i < r.trace.length - 1 && <div style={{ width: 2, flex: 1, background: "var(--border)", margin: "2px 0" }} />}
              </div>
              {/* card */}
              <div className="glass" style={{ flex: 1, padding: "12px 16px", marginBottom: 12, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.92rem" }}>{s.title}</span>
                  {isTest && (
                    <span style={{ flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.06em", padding: "2px 8px", borderRadius: 6, color: s.confirmed ? SEV[s.severity] : "var(--text-muted)", background: `${s.confirmed ? SEV[s.severity] : "#8c97b5"}1f` }}>
                      {s.confirmed ? `${s.severity} · confirmed` : "cleared"}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: "0.86rem", color: "var(--text-secondary,var(--text))", marginTop: 6, lineHeight: 1.5 }}>{s.finding}</p>
                {s.query && (
                  <>
                    <button data-cursor onClick={() => setOpen(open === i ? null : i)}
                      style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.7rem", fontFamily: "var(--font-mono)", cursor: "pointer", padding: 0 }}>
                      <ChevronDown size={12} style={{ transform: open === i ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                      evidence &amp; audit hash
                    </button>
                    <AnimatePresence>
                      {open === i && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                          <pre style={{ marginTop: 8, padding: "10px 12px", borderRadius: 8, background: "var(--surface-2)", fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-muted)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{s.query}</pre>
                          {s.result?.length > 0 && (
                            <div style={{ marginTop: 8, overflowX: "auto" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem", fontFamily: "var(--font-mono)" }}>
                                <thead><tr>{Object.keys(s.result[0]).map((c) => <th key={c} style={{ textAlign: "left", padding: "4px 8px", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>{c}</th>)}</tr></thead>
                                <tbody>{s.result.slice(0, 5).map((row, ri) => <tr key={ri}>{Object.values(row).map((v: any, ci) => <td key={ci} style={{ padding: "4px 8px", borderBottom: "1px solid var(--border)" }}>{v === null ? "∅" : String(v)}</td>)}</tr>)}</tbody>
                              </table>
                            </div>
                          )}
                          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-muted)" }}>
                            <Link2 size={11} /> {s.prev_hash.slice(0, 10)}… → <span style={{ color: "var(--blue)" }}>{s.hash.slice(0, 10)}…</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Memo */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass" style={{ padding: "18px 20px", marginTop: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--font-display)", fontWeight: 600 }}><FileText size={16} color="var(--blue)" /> Compliance memo</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", padding: "3px 8px", borderRadius: 999, background: "var(--surface-2)", color: r.memo_mode.startsWith("llm") ? "#a855f7" : "var(--text-muted)" }}>{r.memo_mode}</span>
        </div>
        <pre style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--text)" }}>{r.memo}</pre>
        <button data-cursor onClick={run} style={{ marginTop: 14, padding: "9px 18px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontWeight: 600, fontSize: "0.82rem" }}>Re-run investigation</button>
      </motion.div>
    </div>
  );
}
