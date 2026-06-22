import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Sparkles,
  ShieldAlert,
  MessageSquareText,
  Settings,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "../store/themeStore";

const NAV = [
  { to: "/overview",  label: "Command Center", short: "OVERVIEW",  icon: LayoutGrid },
  { to: "/studio",    label: "Studio",          short: "STUDIO",    icon: Sparkles },
  { to: "/risk",      label: "Risk Engine",     short: "RISK",      icon: ShieldAlert },
  { to: "/nlp",       label: "NLP Insight",     short: "NLP",       icon: MessageSquareText },
  { to: "/settings",  label: "Settings",        short: "SETTINGS",  icon: Settings },
];

/* Live hash ticker value */
function useHashTick() {
  const [hash, setHash] = useState("a3f2b1c4e8d7a0f9");
  useEffect(() => {
    const id = setInterval(() => {
      setHash(Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join(""));
    }, 2200);
    return () => clearInterval(id);
  }, []);
  return hash;
}

export default function AppShell() {
  const { theme, toggle } = useTheme();
  const loc = useLocation();
  const hash = useHashTick();

  const current = NAV.find((n) => loc.pathname.startsWith(n.to));

  /* Chain nodes — seal one by one on mount */
  const [sealedNodes, setSealedNodes] = useState<number[]>([]);
  const sealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let i = 0;
    const tick = () => {
      setSealedNodes((prev) => [...prev, i]);
      i++;
      if (i < 4) {
        sealTimerRef.current = setTimeout(tick, 600);
      } else {
        sealTimerRef.current = null;
      }
    };
    sealTimerRef.current = setTimeout(tick, 800);
    return () => {
      if (sealTimerRef.current !== null) {
        clearTimeout(sealTimerRef.current);
        sealTimerRef.current = null;
      }
    };
  }, []);

  const isLight = theme === "light";

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      {/* ══════════════════════════════════════
          SIDEBAR — The Forensic Ledger spine
          ══════════════════════════════════════ */}
      <aside
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          background: "var(--bg-2)",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* Gold top band */}
        <div
          style={{
            height: 3,
            background: isLight
              ? "linear-gradient(90deg, var(--foil-gold), rgba(168,132,44,0.3))"
              : "linear-gradient(90deg, rgba(168,132,44,0.6), rgba(168,132,44,0.15))",
          }}
        />

        {/* Logo */}
        <NavLink
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "18px 16px 16px",
            textDecoration: "none",
            color: "var(--text)",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          {/* Stamp-mark */}
          <div
            style={{
              width: 28,
              height: 28,
              border: isLight ? "2px solid var(--stamp-red)" : "2px solid rgba(194,51,31,0.7)",
              borderRadius: 4,
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--font-serif)",
              fontWeight: 900,
              fontSize: "0.9rem",
              color: "var(--stamp-red)",
              flexShrink: 0,
              letterSpacing: "-0.02em",
            }}
          >
            V
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "0.95rem",
                letterSpacing: "0.04em",
                lineHeight: 1,
              }}
            >
              VERITA
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.48rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginTop: 2,
              }}
            >
              INTELLIGENCE
            </div>
          </div>
        </NavLink>

        {/* Section label */}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.52rem",
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            padding: "14px 16px 6px",
            flexShrink: 0,
          }}
        >
          CASE FILE
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "0 8px", overflowY: "auto" }}>
          {NAV.map(({ to, label, short, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              data-cursor
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                textDecoration: "none",
                borderRadius: 0,
                position: "relative",
                fontSize: "0.82rem",
                fontFamily: "var(--font-body)",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--text)" : "var(--text-muted)",
                background: isActive
                  ? isLight
                    ? "rgba(20,18,11,0.06)"
                    : "rgba(232,224,204,0.07)"
                  : "transparent",
                borderLeft: isActive
                  ? "2px solid var(--stamp-red)"
                  : "2px solid transparent",
                marginBottom: 1,
                transition: "background 0.12s, color 0.12s",
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={15}
                    style={{
                      color: isActive ? "var(--stamp-red)" : "var(--text-muted)",
                      flexShrink: 0,
                      transition: "color 0.12s",
                    }}
                  />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {label}
                  </span>
                  {isActive && (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.5rem",
                        letterSpacing: "0.16em",
                        color: "var(--stamp-red)",
                        opacity: 0.7,
                        flexShrink: 0,
                      }}
                    >
                      OPEN
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Integrity chain at sidebar bottom */}
        <div
          style={{
            padding: "12px 16px 16px",
            borderTop: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.48rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: 10,
            }}
          >
            INTEGRITY
          </div>

          {/* Chain nodes horizontal */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 8 }}>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div
                  className={`chain-node chain-node--dark${sealedNodes.includes(i) ? " sealed" : ""}`}
                  style={{
                    transition: `border-color 0.6s ${i * 0.6}s, box-shadow 0.6s ${i * 0.6}s, background 0.6s ${i * 0.6}s`,
                  }}
                />
                {i < 3 && (
                  <div
                    style={{
                      flex: 1,
                      height: 1.5,
                      background:
                        sealedNodes.includes(i) && sealedNodes.includes(i + 1)
                          ? "var(--foil-gold)"
                          : "var(--border)",
                      transition: `background 0.6s ${i * 0.6 + 0.3}s`,
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Live hash */}
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.48rem",
              letterSpacing: "0.1em",
              color: sealedNodes.length === 4 ? "var(--seal-green)" : "var(--text-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              opacity: 0.75,
              transition: "color 0.6s",
            }}
          >
            {hash}
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════
          MAIN — header + page content
          ══════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Header */}
        <header
          style={{
            height: 52,
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {current && (
              <>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.56rem",
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                  }}
                >
                  CASE FILE /
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.56rem",
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    color: "var(--stamp-red)",
                  }}
                >
                  {current.short}
                </span>
              </>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Live hash ticker */}
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.52rem",
                letterSpacing: "0.14em",
                color: "var(--seal-green)",
                opacity: 0.7,
                display: "none",
              }}
              className="hash-ticker-header"
            >
              {hash}
            </div>

            {/* Theme toggle */}
            <button
              data-cursor
              onClick={toggle}
              title="Toggle theme"
              style={{
                width: 32,
                height: 32,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-muted)",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                borderRadius: 0,
                transition: "border-color 0.12s, color 0.12s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--foil-gold)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--foil-gold)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
              }}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            {/* Avatar — vermilion stamp ring */}
            <div
              style={{
                width: 30,
                height: 30,
                border: "2px solid var(--stamp-red)",
                borderRadius: 0,
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: "0.6rem",
                color: "var(--stamp-red)",
                letterSpacing: "0.04em",
              }}
            >
              RM
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: "24px 28px", overflow: "auto" }}>
          <Outlet />
        </main>
      </div>

      {/* Wider screens: show hash ticker */}
      <style>{`
        @media (min-width: 900px) {
          .hash-ticker-header { display: block !important; }
        }
      `}</style>
    </div>
  );
}
