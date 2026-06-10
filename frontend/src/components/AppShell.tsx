import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LayoutGrid, Sparkles, ShieldAlert, MessageSquareText, Settings, Sun, Moon, Eye } from "lucide-react";
import { useTheme } from "../store/themeStore";

const NAV = [
  { to: "/overview", label: "Overview", icon: LayoutGrid },
  { to: "/studio", label: "Studio", icon: Sparkles },
  { to: "/risk", label: "Risk Engine", icon: ShieldAlert },
  { to: "/nlp", label: "NLP Insight", icon: MessageSquareText },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function AppShell() {
  const { theme, toggle } = useTheme();
  const loc = useLocation();
  const current = NAV.find((n) => loc.pathname.startsWith(n.to))?.label || "Verita";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 232,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          background: "var(--bg-2)",
          padding: "20px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <NavLink to="/" style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px 18px", textDecoration: "none", color: "var(--text)" }}>
          <Eye size={22} color="var(--blue)" />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.15rem" }}>Verita</span>
        </NavLink>

        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            data-cursor
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              borderRadius: 12,
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 500,
              color: isActive ? "var(--text)" : "var(--text-muted)",
              background: isActive ? "var(--surface-2)" : "transparent",
              boxShadow: isActive ? "inset 2px 0 0 var(--blue), 0 0 24px -10px var(--blue)" : "none",
              transition: "all .15s",
            })}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header
          style={{
            height: 64,
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
            background: "var(--bg-2)",
          }}
        >
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 600 }}>{current}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              data-cursor
              onClick={toggle}
              title="Toggle theme"
              style={{
                width: 38, height: 38, borderRadius: 10, border: "1px solid var(--border)",
                background: "var(--surface)", color: "var(--text)", display: "grid", placeItems: "center",
              }}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--signature)", display: "grid", placeItems: "center", fontWeight: 700, color: "#fff", fontSize: "0.85rem" }}>
              RM
            </div>
          </div>
        </header>

        <main style={{ flex: 1, padding: 28, overflow: "auto" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
