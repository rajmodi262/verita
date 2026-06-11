import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ScanSearch, FileSpreadsheet, Database, ArrowRight } from "lucide-react";
import { API_BASE } from "../config";

interface Analysis {
  id: number; dataset_id: string; filename: string; title: string;
  row_count: number; column_count: number; quality_score: number; quality_grade: string;
  insights_count: number; created_at: string;
}
interface Investigation {
  id: number; dataset_id: string; goal: string; risk_level: string;
  finding_count: number; chain_head: string; memo_mode: string; created_at: string;
}

const GRADE: Record<string, string> = { A: "#16c784", B: "#4d7cff", C: "#f5a524", D: "#ff7a8a", F: "#ff2d55" };
const RISK: Record<string, string> = { Critical: "#ff2d55", High: "#ff7a8a", Medium: "#f5a524", Low: "#16c784" };

function ago(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export default function Overview() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({ analyses: 0, investigations: 0, queries: 0 });
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const j = (p: string): Promise<any> => fetch(`${API_BASE}/api/history/${p}`).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
    Promise.all([j("summary"), j("analyses?limit=8"), j("investigations?limit=8")]).then(([s, a, i]) => {
      setSummary({ analyses: s.analyses || 0, investigations: s.investigations || 0, queries: s.queries || 0 });
      setAnalyses(a.analyses || []);
      setInvestigations(i.investigations || []);
      setLoaded(true);
    });
  }, []);

  const empty = loaded && analyses.length === 0 && investigations.length === 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(1.6rem,3vw,2.2rem)" }}>Command Center</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 4 }}>Your analysis & investigation history — every run is logged to the audit trail.</p>
        </div>
        <button data-cursor onClick={() => navigate("/studio")} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 12, border: "none", color: "#fff", fontWeight: 600, background: "var(--signature)", boxShadow: "0 8px 28px -8px rgba(77,124,255,0.5)" }}>
          <Sparkles size={16} /> New analysis
        </button>
      </div>

      {/* Stat tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        {[
          { k: "Datasets analyzed", v: summary.analyses, icon: FileSpreadsheet, c: "#4d7cff" },
          { k: "Investigations run", v: summary.investigations, icon: ScanSearch, c: "#a855f7" },
          { k: "Audit-logged queries", v: summary.queries, icon: Database, c: "#12b5a3" },
        ].map((t, i) => (
          <motion.div key={t.k} className="glass" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: `${t.c}1f`, color: t.c }}><t.icon size={20} /></div>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 600 }}>{t.v.toLocaleString()}</div>
              <div style={{ fontSize: "0.66rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>{t.k}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {empty ? (
        <div className="glass" style={{ padding: "48px 40px", textAlign: "center" }}>
          <FileSpreadsheet size={40} color="var(--blue)" />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", marginTop: 14 }}>No analyses yet</h2>
          <p style={{ color: "var(--text-muted)", marginTop: 8 }}>Upload a dataset in Studio and your history will appear here.</p>
          <button data-cursor onClick={() => navigate("/studio")} style={{ marginTop: 18, padding: "11px 22px", borderRadius: 10, border: "none", color: "#fff", fontWeight: 600, background: "var(--signature)" }}>Go to Studio →</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 18 }}>
          {/* Recent analyses */}
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10 }}>Recent analyses</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {analyses.map((a) => (
                <div key={a.id} className="glass" style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-muted)" }}>{a.row_count.toLocaleString()} rows · {a.column_count} cols · {a.insights_count} findings · {ago(a.created_at)}</div>
                  </div>
                  <span style={{ flexShrink: 0, width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontWeight: 700, color: GRADE[a.quality_grade] || "#8c97b5", border: `2px solid ${GRADE[a.quality_grade] || "#8c97b5"}` }}>{a.quality_grade}</span>
                </div>
              ))}
              {analyses.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: 8 }}>None yet.</div>}
            </div>
          </div>

          {/* Recent investigations */}
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10 }}>Recent investigations</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {investigations.map((iv) => (
                <div key={iv.id} className="glass" style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, borderLeft: `3px solid ${RISK[iv.risk_level] || "#8c97b5"}` }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 600, color: RISK[iv.risk_level] || "var(--text)" }}>{iv.risk_level} risk</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>· {iv.finding_count} findings</span>
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.66rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={iv.chain_head}>chain {iv.chain_head.slice(0, 12)}… · {iv.memo_mode} · {ago(iv.created_at)}</div>
                  </div>
                  <span style={{ flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: "0.58rem", color: "#16c784" }}>✓ sealed</span>
                </div>
              ))}
              {investigations.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: 8 }}>None yet — run the Investigator in Studio.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
