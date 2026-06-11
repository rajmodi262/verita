import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Lightbulb } from "lucide-react";

export interface Insight {
  kind: string;
  icon: string;
  severity: "info" | "warning";
  text: string;
  evidence: string;
}

/**
 * Key Findings — auto-computed insights, each expandable to show the exact
 * computation that produced it ("show the work" — auditability as a feature).
 */
export default function InsightsPanel({ insights, summary }: { insights: Insight[]; summary: string }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Executive summary */}
      <motion.div
        className="glass"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ padding: "18px 20px", borderLeft: "3px solid var(--blue)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Lightbulb size={15} color="var(--blue)" />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            Executive summary — auto-generated
          </span>
        </div>
        <p style={{ fontSize: "0.92rem", lineHeight: 1.65 }}>{summary}</p>
      </motion.div>

      {/* Findings */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
        {insights.map((ins, i) => (
          <motion.div
            key={i}
            className="glass"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * i }}
            style={{
              padding: "14px 16px",
              borderLeft: `3px solid ${ins.severity === "warning" ? "var(--danger)" : "var(--accent, #12b5a3)"}`,
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>{ins.icon}</span>
              <p style={{ fontSize: "0.86rem", lineHeight: 1.55, flex: 1 }}>{ins.text}</p>
            </div>
            <button
              data-cursor
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                marginTop: 10, display: "inline-flex", alignItems: "center", gap: 5,
                background: "none", border: "none", color: "var(--text-muted)",
                fontSize: "0.7rem", fontFamily: "var(--font-mono)", cursor: "pointer", padding: 0,
              }}
            >
              <ChevronDown size={12} style={{ transform: open === i ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
              how was this computed?
            </button>
            {open === i && (
              <motion.code
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                style={{
                  display: "block", marginTop: 8, padding: "10px 12px", borderRadius: 8,
                  background: "var(--surface-2)", fontFamily: "var(--font-mono)", fontSize: "0.68rem",
                  lineHeight: 1.6, color: "var(--text-muted)", whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}
              >
                {ins.evidence}
              </motion.code>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
