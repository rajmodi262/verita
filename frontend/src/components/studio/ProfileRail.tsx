import { motion } from "framer-motion";

const ROLE_COLORS: Record<string, string> = {
  measure: "#12b5a3",
  dimension: "#4d7cff",
  geo: "#4d7cff",
  temporal: "#a855f7",
  identifier: "#8c97b5",
  boolean: "#f5a524",
  text: "#6366f1",
};

interface Quality {
  score: number;
  grade: string;
  duplicate_rows: number;
  deductions: { reason: string; points: number }[];
}

/**
 * The Data Profile rail — instant data-quality audit: quality ring, dataset stats,
 * and per-column mini-cards (role badge, missing bar, uniques).
 */
export default function ProfileRail({ profile, quality }: { profile: any; quality: Quality }) {
  const gradeColor = quality.score >= 90 ? "#16c784" : quality.score >= 75 ? "#4d7cff" : quality.score >= 60 ? "#f5a524" : "#ff4d5e";
  const ring = 2 * Math.PI * 26;

  return (
    <div className="glass" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16, maxHeight: "calc(100vh - 140px)", overflow: "auto" }}>
      {/* Quality score ring */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="26" fill="none" stroke="var(--surface-2)" strokeWidth="6" />
          <motion.circle
            cx="32" cy="32" r="26" fill="none" stroke={gradeColor} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={ring} transform="rotate(-90 32 32)"
            initial={{ strokeDashoffset: ring }}
            animate={{ strokeDashoffset: ring * (1 - quality.score / 100) }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
          <text x="32" y="36" textAnchor="middle" fill="var(--text)" fontSize="15" fontFamily="JetBrains Mono" fontWeight="600">
            {quality.grade}
          </text>
        </svg>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.25rem", fontWeight: 600 }}>{quality.score}<span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>/100</span></div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>data quality</div>
        </div>
      </div>

      {quality.deductions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {quality.deductions.map((d, i) => (
            <div key={i} style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span>{d.reason}</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--danger)", flexShrink: 0 }}>−{d.points}</span>
            </div>
          ))}
        </div>
      )}

      {/* dataset stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          ["Rows", profile.row_count.toLocaleString()],
          ["Columns", profile.column_count],
          ["Memory", `${profile.memory_kb.toLocaleString()} KB`],
          ["Duplicates", quality.duplicate_rows],
        ].map(([k, v]) => (
          <div key={String(k)} style={{ padding: "8px 10px", borderRadius: 10, background: "var(--surface-2)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem", fontWeight: 600 }}>{v}</div>
            <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{k}</div>
          </div>
        ))}
      </div>

      {/* per-column cards */}
      <div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10 }}>
          Fields · {profile.columns.length}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {profile.columns.map((col: any) => {
            const color = ROLE_COLORS[col.semantic_type] || "#8c97b5";
            return (
              <div key={col.name} style={{ padding: "9px 11px", borderRadius: 10, background: "var(--surface-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col.name}</span>
                  <span style={{ flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: "0.55rem", letterSpacing: "0.06em", textTransform: "uppercase", padding: "2px 6px", borderRadius: 5, color, background: `${color}1f` }}>
                    {col.semantic_type}
                  </span>
                </div>
                {/* completeness bar */}
                <div style={{ marginTop: 7, height: 3, borderRadius: 2, background: "var(--border)" }}>
                  <div style={{ width: `${100 - col.missing_pct}%`, height: "100%", borderRadius: 2, background: col.missing_pct > 20 ? "var(--danger)" : color, opacity: 0.8 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)" }}>
                  <span>{col.unique_count.toLocaleString()} uniq</span>
                  <span>{col.missing_pct > 0 ? `${col.missing_pct}% null` : "complete"}</span>
                  {col.semantic_type === "measure" && col.mean != null && <span>μ {Number(col.mean).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
