import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sun, Moon, Database, Cpu, ShieldCheck, Sparkles, ExternalLink, Server } from "lucide-react";
import { API_BASE } from "../config";
import { useTheme } from "../store/themeStore";

interface Health {
  status: string;
  service: string;
  version: string;
  auth: string;
  risk_model: string;
  genai: string;
  database?: { dialect: string; ready: boolean };
}

export default function Settings() {
  const { theme, toggle } = useTheme();
  const [health, setHealth] = useState<Health | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/health`).then((r) => r.json()).then(setHealth).catch(() => setErr(true));
  }, []);

  const rows = health
    ? [
        { icon: Server, label: "Service", value: `${health.service} v${health.version}`, ok: health.status === "healthy" },
        { icon: Database, label: "Audit database", value: health.database ? `${health.database.dialect}${health.database.ready ? " · ready" : " · unavailable"}` : "—", ok: !!health.database?.ready },
        { icon: Sparkles, label: "GenAI mode", value: health.genai, ok: true, accent: health.genai.startsWith("llm") ? "#a855f7" : undefined },
        { icon: Cpu, label: "Risk model", value: health.risk_model, ok: true },
        { icon: ShieldCheck, label: "API auth", value: health.auth, ok: true },
      ]
    : [];

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(1.6rem,3vw,2.2rem)" }}>Settings</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 4, marginBottom: 22 }}>Live system status and appearance. Backend configuration is set via environment variables.</p>

      {/* Appearance */}
      <div className="glass" style={{ padding: "18px 20px", marginBottom: 18 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 12 }}>Appearance</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600 }}>Theme</div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Currently {theme === "dark" ? "Dark (Singularity)" : "Light (Porcelain)"}</div>
          </div>
          <button data-cursor onClick={toggle} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontWeight: 600 }}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />} Switch to {theme === "dark" ? "light" : "dark"}
          </button>
        </div>
      </div>

      {/* System status */}
      <div className="glass" style={{ padding: "18px 20px", marginBottom: 18 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 12 }}>System status</div>
        {err && <div style={{ color: "var(--danger)", fontSize: "0.85rem" }}>⚠ Backend unreachable — start the API on :8000.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {rows.map((r, i) => (
            <motion.div key={r.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10, color: "var(--text-muted)" }}><r.icon size={16} /> {r.label}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: (r as any).accent || "var(--text)" }}>
                {r.value}
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.ok ? "#16c784" : "var(--danger)", boxShadow: `0 0 8px ${r.ok ? "#16c784" : "var(--danger)"}` }} />
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Config note + links */}
      <div className="glass" style={{ padding: "18px 20px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 12 }}>Configuration & links</div>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 14 }}>
          Verita is configured entirely through environment variables — <code style={{ color: "var(--blue)" }}>DATABASE_URL</code> (Postgres, else SQLite),
          {" "}<code style={{ color: "var(--violet,#a855f7)" }}>GEMINI_API_KEY</code> (enables LLM narration), and <code style={{ color: "var(--text)" }}>VERITA_API_KEY</code> (enables auth + rate limiting).
          This panel reflects the live server state — no secrets are exposed.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            ["API docs", `${API_BASE}/docs`],
            ["Health JSON", `${API_BASE}/api/health`],
            ["Metrics", `${API_BASE}/metrics`],
          ].map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" data-cursor style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", textDecoration: "none", fontSize: "0.82rem", fontWeight: 600 }}>
              {label} <ExternalLink size={13} />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
