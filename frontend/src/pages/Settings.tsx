import { useEffect, useState } from "react";
import { Sun, Moon, Database, Cpu, ShieldCheck, Sparkles, ExternalLink, Server, type LucideIcon } from "lucide-react";
import { API_BASE } from "../config";
import { apiGet } from "../lib/api";
import { useTheme } from "../store/themeStore";
import type { HealthStatus } from "../types/api";

interface StatusRow {
  icon: LucideIcon;
  label: string;
  value: string;
  ok: boolean;
  accent?: string;
}

const panelStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-desk-sm)",
  padding: "18px 20px",
  marginBottom: 14,
};
const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.54rem",
  letterSpacing: "0.26em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: 14,
};

export default function Settings() {
  const { theme, toggle } = useTheme();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    apiGet<HealthStatus>("/api/health", ctrl.signal)
      .then(setHealth)
      .catch(() => { if (!ctrl.signal.aborted) setErr(true); });
    return () => ctrl.abort();
  }, []);

  const rows: StatusRow[] = health
    ? [
        { icon: Server, label: "Service", value: `${health.service} v${health.version}`, ok: health.status === "healthy" },
        { icon: Database, label: "Audit database", value: health.database ? `${health.database.dialect}${health.database.ready ? " · ready" : " · unavailable"}` : "—", ok: !!health.database?.ready },
        { icon: Sparkles, label: "GenAI mode", value: health.genai, ok: true, accent: health.genai.startsWith("llm") ? "var(--violet-text)" : undefined },
        {
          icon: Cpu,
          label: "Risk model",
          value:
            health.risk_model.status === "loaded"
              ? `${health.risk_model.data_source ?? "model"}${health.risk_model.roc_auc != null ? ` · AUC ${health.risk_model.roc_auc}` : ""}`
              : health.risk_model.status,
          ok: health.risk_model.status === "loaded",
        },
        { icon: ShieldCheck, label: "API auth", value: health.auth, ok: true },
      ]
    : [];

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Page header */}
      <div style={{ marginBottom: 24, paddingBottom: 18, borderBottom: "1px solid var(--border)" }}>
        <div style={labelStyle}>CASE FILE / SETTINGS</div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}
        >
          Configuration
        </h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6, fontSize: "0.86rem" }}>
          Live system status and appearance. Backend configuration is set via environment variables.
        </p>
      </div>

      {/* Appearance */}
      <div style={panelStyle}>
        <h2 style={labelStyle as React.CSSProperties}>APPEARANCE</h2>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text)" }}>Theme</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-muted)", marginTop: 4, letterSpacing: "0.1em" }}>
              {theme === "dark" ? "DARK LEDGER — #131110" : "PORCELAIN LEDGER — #f3eee2"}
            </div>
          </div>
          <button
            data-cursor
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.62rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: "var(--shadow-desk-sm)",
              transition: "box-shadow 0.12s, transform 0.12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-desk-press)"; e.currentTarget.style.transform = "translate(1px,1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-desk-sm)"; e.currentTarget.style.transform = "none"; }}
          >
            {theme === "dark" ? <Sun size={13} aria-hidden /> : <Moon size={13} aria-hidden />}
            {theme === "dark" ? "SWITCH TO LIGHT" : "SWITCH TO DARK"}
          </button>
        </div>
      </div>

      {/* System status */}
      <div style={panelStyle}>
        <h2 style={labelStyle as React.CSSProperties}>SYSTEM STATUS</h2>
        {err && (
          <div role="alert" style={{ color: "var(--danger-text)", fontFamily: "var(--font-mono)", fontSize: "0.75rem", marginBottom: 10 }}>
            ⚠ Backend unreachable — start the API on :8000.
          </div>
        )}
        <div>
          {rows.map((r, i) => (
            <div
              key={r.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 0",
                borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-muted)" }}>
                <r.icon size={14} aria-hidden />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.66rem", letterSpacing: "0.1em" }}>
                  {r.label}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: r.accent || "var(--text)", letterSpacing: "0.06em" }}>
                  {r.value}
                </span>
                <span
                  role="img"
                  aria-label={r.ok ? "operational" : "unavailable"}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: r.ok ? "var(--seal-green)" : "var(--danger)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Config note */}
      <div style={panelStyle}>
        <h2 style={labelStyle as React.CSSProperties}>CONFIGURATION &amp; LINKS</h2>
        <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: 1.65, marginBottom: 16, fontFamily: "var(--font-body)" }}>
          Verita is configured entirely through environment variables —{" "}
          <code style={{ fontFamily: "var(--font-mono)", color: "var(--foil-gold-text)", fontSize: "0.8rem" }}>DATABASE_URL</code>{" "}
          (Postgres, else SQLite),{" "}
          <code style={{ fontFamily: "var(--font-mono)", color: "var(--violet-text)", fontSize: "0.8rem" }}>GEMINI_API_KEY</code>{" "}
          (enables LLM narration), and{" "}
          <code style={{ fontFamily: "var(--font-mono)", color: "var(--text)", fontSize: "0.8rem" }}>VERITA_API_KEY</code>{" "}
          (enables auth + rate limiting). This panel reflects the live server state — no secrets are exposed.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            ["API DOCS", `${API_BASE}/docs`],
            ["HEALTH JSON", `${API_BASE}/api/health`],
            ["METRICS", `${API_BASE}/metrics`],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              data-cursor
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-muted)",
                textDecoration: "none",
                fontFamily: "var(--font-mono)",
                fontSize: "0.6rem",
                letterSpacing: "0.14em",
                boxShadow: "var(--shadow-desk-sm)",
                transition: "color 0.12s, border-color 0.12s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--foil-gold-text)"; e.currentTarget.style.borderColor = "var(--foil-gold)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              {label} <ExternalLink size={10} aria-hidden />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
