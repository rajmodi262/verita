import { memo, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useNavigate } from "react-router-dom";
import FraudNetwork from "../components/landing/FraudNetwork";

gsap.registerPlugin(ScrollTrigger);

/* ── Utils ───────────────────────────────────────────────────────────────── */

function fakeHash(seed: number, len = 48): string {
  const H = "0123456789abcdef";
  return Array.from({ length: len }, (_, i) =>
    H[Math.floor(Math.abs(Math.sin(seed * 9301 + i * 49297 + 233) * 829.7382) % 16)]
  ).join("");
}

/* ── Design tokens ───────────────────────────────────────────────────────── */

const DARK        = "#0c0a07";
const CREAM       = "#f3eee2";
const CREAM_DIM   = "rgba(243,238,226,0.48)";
const AMBER       = "#ffb700";
const RED         = "#c2331f";
const GREEN       = "#1c6e4a";
const GOLD        = "#a8842c";
const BORDER      = "rgba(243,238,226,0.09)";

const LEDGER_LINES = {
  background: DARK,
  backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 31px,rgba(243,238,226,0.055) 32px)`,
} as const;

/* ── Modules registry ────────────────────────────────────────────────────── */

const MODULES = [
  { label: "Studio",      path: "/studio",   tag: "Forensics workspace"  },
  { label: "Risk Engine", path: "/risk",     tag: "Anomaly detection"    },
  { label: "NLP Insight", path: "/nlp",      tag: "Narrative analysis"   },
  { label: "Overview",    path: "/overview", tag: "Case dashboard"       },
];

/* ── Cursor ──────────────────────────────────────────────────────────────── */

const Cursor = memo(function Cursor() {
  const dot  = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let mx = 0, my = 0, rx = 0, ry = 0;
    const mv = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY;
      if (dot.current) dot.current.style.transform = `translate(${mx}px,${my}px)`;
    };
    const tick = () => {
      rx += (mx - rx) * 0.1; ry += (my - ry) * 0.1;
      if (ring.current) ring.current.style.transform = `translate(${rx}px,${ry}px)`;
      requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", mv, { passive: true });
    requestAnimationFrame(tick);
    return () => window.removeEventListener("mousemove", mv);
  }, []);
  return (
    <>
      <div ref={dot}  className="land-cursor" style={{ width: 5, height: 5, marginLeft: -2.5, marginTop: -2.5 }}>
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: AMBER }} />
      </div>
      <div ref={ring} className="land-cursor" style={{ width: 26, height: 26, marginLeft: -13, marginTop: -13 }}>
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", border: "1px solid rgba(255,183,0,0.4)" }} />
      </div>
    </>
  );
});

/* ── Fixed nav ───────────────────────────────────────────────────────────── */

const Nav = memo(function Nav() {
  const navigate = useNavigate();
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const fn = () => setSolid(window.scrollY > 80);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 56,
      padding: "0 40px", display: "flex", alignItems: "center", gap: 0,
      background: solid ? "rgba(12,10,7,0.94)" : "transparent",
      backdropFilter: solid ? "blur(14px)" : "none",
      borderBottom: solid ? `1px solid ${BORDER}` : "none",
      transition: "background .35s, border-color .35s",
    }}>
      <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ background: "none", border: "none", cursor: "pointer", marginRight: 32, padding: 0 }}>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", fontWeight: 900, color: CREAM, letterSpacing: "-0.02em" }}>VERITA</span>
      </button>
      <div style={{ flex: 1, display: "flex", gap: 2 }}>
        {MODULES.map(m => (
          <button key={m.path} onClick={() => navigate(m.path)} style={{ background: "none", border: "none", cursor: "pointer", padding: "5px 13px", fontFamily: "var(--font-mono)", fontSize: "0.54rem", letterSpacing: "0.13em", textTransform: "uppercase", color: CREAM_DIM, transition: "color .14s" }}
            onMouseEnter={e => (e.currentTarget.style.color = CREAM)}
            onMouseLeave={e => (e.currentTarget.style.color = CREAM_DIM)}>
            {m.label}
          </button>
        ))}
      </div>
      <button onClick={() => navigate("/studio")} style={{ padding: "7px 18px", background: CREAM, color: DARK, border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "0.56rem", letterSpacing: "0.13em", textTransform: "uppercase", fontWeight: 700, boxShadow: `3px 3px 0 ${RED}`, transition: "transform .1s, box-shadow .1s" }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translate(1px,1px)"; e.currentTarget.style.boxShadow = `2px 2px 0 ${RED}`; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `3px 3px 0 ${RED}`; }}>
        Open Studio →
      </button>
    </nav>
  );
});

/* ── HERO — asymmetric split: giant wordmark left, live scanner right ─────── */

const HeroSection = memo(function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [score,  setScore]  = useState(0);
  const [phase,  setPhase]  = useState<"idle"|"scanning"|"done">("idle");

  useEffect(() => {
    let killed = false;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.1 });
      tl.from(".hv-left",  { x: -60, opacity: 0, duration: 1.1, ease: "expo.out" })
        .from(".hv-div",   { scaleY: 0, duration: 0.9, ease: "expo.out", transformOrigin: "top" }, "-=0.6")
        .from(".hv-right", { x: 60,  opacity: 0, duration: 1.0, ease: "expo.out" }, "-=0.7")
        .from(".hv-strip", { y: 30,  opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.08 }, "-=0.4");
    });
    const t1 = setTimeout(() => {
      if (killed) return;
      setPhase("scanning");
      const T = 0.94, D = 2400, t0 = performance.now();
      const tick = (now: number) => {
        if (killed) return;
        const p = Math.min((now - t0) / D, 1);
        setScore(parseFloat((( 1 - Math.pow(1 - p, 3)) * T).toFixed(2)));
        if (p < 1) requestAnimationFrame(tick); else setPhase("done");
      };
      requestAnimationFrame(tick);
    }, 1200);
    if (heroRef.current) {
      gsap.to(heroRef.current, { opacity: 0, y: -60, ease: "none",
        scrollTrigger: { trigger: heroRef.current, start: "top top", end: "+=55%", scrub: 1.4 } });
    }
    return () => { killed = true; clearTimeout(t1); ctx.revert(); };
  }, []);

  const danger = score >= 0.8;

  return (
    <div ref={heroRef} style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: DARK, position: "relative", overflow: "hidden" }}>
      {/* Ghost "V" behind everything */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "flex-start", paddingLeft: "2vw", overflow: "hidden", pointerEvents: "none" }}>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(22rem,55vw,52rem)", fontWeight: 900, letterSpacing: "-0.08em", color: "rgba(243,238,226,0.018)", lineHeight: 1, userSelect: "none" }}>V</span>
      </div>

      {/* Main 2-col split */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1px 1fr", minHeight: "calc(100vh - 58px)" }}>

        {/* LEFT — giant wordmark + tagline */}
        <div className="hv-left" style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "100px 60px 60px 72px", position: "relative" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.48rem", letterSpacing: "0.26em", textTransform: "uppercase", color: "rgba(243,238,226,0.28)", marginBottom: 28 }}>
            Financial Crime & Compliance Intelligence
          </div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(4rem,10vw,8.5rem)", fontWeight: 900, letterSpacing: "-0.045em", color: CREAM, lineHeight: 0.88, marginBottom: 22, userSelect: "none" }}>
            VERITA
          </h1>
          <div style={{ width: 56, height: 3, background: AMBER, marginBottom: 28 }} />
          <p style={{ fontFamily: "var(--font-body)", fontSize: "clamp(1rem,1.6vw,1.18rem)", color: CREAM_DIM, lineHeight: 1.68, maxWidth: "42ch", marginBottom: 40 }}>
            The forensic case file for financial crime. Upload transactions — get court-ready evidence in seconds.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => navigate("/studio")} style={{ padding: "13px 26px", background: CREAM, color: DARK, border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, boxShadow: `5px 5px 0 ${RED}`, transition: "transform .1s, box-shadow .1s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translate(2px,2px)"; e.currentTarget.style.boxShadow = `3px 3px 0 ${RED}`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `5px 5px 0 ${RED}`; }}>
              Open Studio →
            </button>
            <button onClick={() => document.getElementById("s-studio")?.scrollIntoView({ behavior: "smooth" })} style={{ padding: "13px 26px", background: "none", border: `1px solid ${BORDER}`, cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: CREAM_DIM, transition: "color .13s, border-color .13s" }}
              onMouseEnter={e => { e.currentTarget.style.color = CREAM; e.currentTarget.style.borderColor = "rgba(243,238,226,0.35)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = CREAM_DIM; e.currentTarget.style.borderColor = BORDER; }}>
              Explore Platform
            </button>
          </div>
          {/* AML badges */}
          <div style={{ display: "flex", gap: 18, marginTop: 44, paddingTop: 28, borderTop: `1px solid ${BORDER}`, flexWrap: "wrap" }}>
            {["AML / BSA / OFAC", "SHAP-traced", "5-fold CV", "Wolter Kluwer"].map(b => (
              <span key={b} style={{ fontFamily: "var(--font-mono)", fontSize: "0.46rem", letterSpacing: "0.1em", color: "rgba(243,238,226,0.28)", textTransform: "uppercase" }}>◈ {b}</span>
            ))}
          </div>
        </div>

        {/* Vertical divider */}
        <div className="hv-div" style={{ background: BORDER, alignSelf: "stretch" }} />

        {/* RIGHT — live scanner */}
        <div className="hv-right" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "100px 72px 60px 60px", textAlign: "center", position: "relative" }}>
          {/* Targeting reticle */}
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-52%)", width: "min(300px,36vw)", height: "min(300px,36vw)", borderRadius: "50%", border: `1px solid ${BORDER}`, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: "50%", left: -24, right: -24, height: 1, background: BORDER }} />
            <div style={{ position: "absolute", left: "50%", top: -24, bottom: -24, width: 1, background: BORDER }} />
            {([[0,0],[0,1],[1,0],[1,1]] as const).map(([b,r],i) => (
              <div key={i} style={{ position: "absolute", bottom: b ? 0 : undefined, top: b ? undefined : 0, right: r ? 0 : undefined, left: r ? undefined : 0, width: 14, height: 14, borderTop: !b ? `1.5px solid ${AMBER}` : undefined, borderBottom: b ? `1.5px solid ${AMBER}` : undefined, borderLeft: !r ? `1.5px solid ${AMBER}` : undefined, borderRight: r ? `1.5px solid ${AMBER}` : undefined, opacity: 0.5 }} />
            ))}
          </div>

          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.46rem", letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(243,238,226,0.3)", marginBottom: 16 }}>
            {phase === "idle" ? "INITIALIZING…" : phase === "scanning" ? "● SCANNING TRANSACTIONS" : "● ANOMALY DETECTED"}
          </div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(4.5rem,11vw,9rem)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, color: danger ? RED : AMBER, transition: "color 0.22s", fontVariantNumeric: "tabular-nums", marginBottom: 8 }}>
            {score.toFixed(2)}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.52rem", letterSpacing: "0.18em", textTransform: "uppercase", color: danger ? RED : "rgba(243,238,226,0.35)", marginBottom: 20 }}>
            RISK SCORE / 1.00
          </div>
          <div style={{ width: "min(260px,50vw)", height: 2, background: "rgba(243,238,226,0.07)", marginBottom: 8 }}>
            <div style={{ height: "100%", width: `${(score / 0.94) * 100}%`, background: danger ? RED : AMBER, transition: "width 0.04s linear, background 0.22s" }} />
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.4rem", letterSpacing: "0.1em", color: "rgba(243,238,226,0.18)", marginBottom: 44 }}>
            {phase === "done" ? "CASE OPEN — EVIDENCE GENERATED" : "PROCESSING…"}
          </div>
          {/* Stats 2×2 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: BORDER, border: `1px solid ${BORDER}`, width: "min(280px,56vw)" }}>
            {([["284,507","TXN"],["1,847","FLAGS"],["94.7%","RECALL"],["< 200ms","LATENCY"]] as const).map(([v,l]) => (
              <div key={l} style={{ background: DARK, padding: "12px 10px", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.82rem,1.8vw,1rem)", fontWeight: 700, color: CREAM }}>{v}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.4rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(243,238,226,0.24)", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Module strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: `1px solid ${BORDER}` }}>
        {MODULES.map((m, i) => (
          <button key={m.path} className="hv-strip" onClick={() => navigate(m.path)} style={{ background: "none", border: "none", cursor: "pointer", padding: "15px 22px", borderRight: i < MODULES.length - 1 ? `1px solid ${BORDER}` : "none", textAlign: "left", transition: "background .15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(243,238,226,0.04)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.4rem", letterSpacing: "0.19em", textTransform: "uppercase", color: "rgba(243,238,226,0.25)", marginBottom: 4 }}>{String(i+1).padStart(2,"0")} · {m.tag}</div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: "0.9rem", fontWeight: 700, color: CREAM, letterSpacing: "-0.01em" }}>{m.label} →</div>
          </button>
        ))}
      </div>
    </div>
  );
});

/* ── MODULE SHOWCASE — each section a completely different world ──────────── */

// Inline mockup for Studio
function StudioMock() {
  return (
    <div style={{ background: "#090705", border: `1px solid ${BORDER}`, padding: "18px 16px", fontFamily: "var(--font-mono)", fontSize: "0.46rem" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ color: AMBER, letterSpacing: "0.12em" }}>STUDIO</span>
        <span style={{ flex: 1 }} />
        {["FILE","ANALYZE","EXPORT"].map(t => <span key={t} style={{ padding: "2px 9px", border: `1px solid ${BORDER}`, color: CREAM_DIM, letterSpacing: "0.1em" }}>{t}</span>)}
      </div>
      <div style={{ border: `1.5px dashed rgba(168,132,44,0.3)`, padding: "12px 0", textAlign: "center", color: CREAM_DIM, marginBottom: 12, letterSpacing: "0.1em" }}>
        TRANSACTIONS.CSV &nbsp;·&nbsp; 284,507 rows
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.3fr 0.7fr", gap: 0, marginBottom: 12 }}>
        {["TXN ID","AMOUNT","ENTITY","RISK"].map(h => (
          <div key={h} style={{ color: "rgba(243,238,226,0.25)", paddingBottom: 4, borderBottom: `1px solid ${BORDER}`, fontSize: "0.4rem", letterSpacing: "0.1em" }}>{h}</div>
        ))}
        {[["TRX-0001","$47,200","ACME LLC","0.94"],["TRX-0002","$9,900","SHELL CO","1.00"],["TRX-0003","$2,340","JOHN D.","0.12"]].flatMap((row, ri) =>
          row.map((v, ci) => <div key={`${ri}-${ci}`} style={{ color: ci === 3 ? (parseFloat(v) > 0.5 ? RED : GREEN) : CREAM_DIM, padding: "3px 0", borderBottom: `1px solid rgba(243,238,226,0.02)` }}>{v}</div>)
        )}
      </div>
      <div style={{ padding: "8px 10px", background: "rgba(255,183,0,0.04)", border: "1px solid rgba(255,183,0,0.14)" }}>
        <div style={{ color: AMBER, letterSpacing: "0.12em", marginBottom: 5, fontSize: "0.41rem" }}>SHAP DECISION WATERFALL</div>
        {[["Amount velocity","+0.41"],["Structuring","+0.28"],["Network hops","+0.17"],["Known entity","-0.08"]].map(([f,v]) => (
          <div key={f} style={{ display: "flex", justifyContent: "space-between", color: CREAM_DIM, padding: "1px 0" }}>
            <span>{f}</span><span style={{ color: parseFloat(v) > 0 ? RED : GREEN }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskMock() {
  return (
    <div style={{ background: "#090705", border: `1px solid ${BORDER}`, padding: "18px 16px", fontFamily: "var(--font-mono)", fontSize: "0.46rem" }}>
      <div style={{ color: AMBER, letterSpacing: "0.12em", marginBottom: 14, fontSize: "0.48rem" }}>RISK ENGINE</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, marginBottom: 14 }}>
        {([["Recall","94.7%",RED],["Precision","97.3%",AMBER],["AUC-ROC","0.998","#a855f7"],["F1 Score","0.960",GREEN]] as const).map(([l,v,c]) => (
          <div key={l} style={{ padding: "9px 10px", background: "rgba(243,238,226,0.025)", border: `1px solid ${BORDER}` }}>
            <div style={{ color: "rgba(243,238,226,0.28)", marginBottom: 3, fontSize: "0.4rem", letterSpacing: "0.1em" }}>{l}</div>
            <div style={{ color: c, fontSize: "1rem", fontWeight: 700 }}>{v}</div>
          </div>
        ))}
      </div>
      {([["STRUCTURING","Below $10K threshold",RED],["LAYERING","8-hop shell chains",AMBER],["INTEGRATION","Commingled funds",GREEN]] as const).map(([t,d,c]) => (
        <div key={t} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 0", borderBottom: `1px solid rgba(243,238,226,0.04)` }}>
          <div style={{ width: 3, height: 20, background: c, flexShrink: 0 }} />
          <div><div style={{ color: CREAM, letterSpacing: "0.06em" }}>{t}</div><div style={{ color: "rgba(243,238,226,0.3)", fontSize: "0.41rem" }}>{d}</div></div>
        </div>
      ))}
      <div style={{ marginTop: 12, padding: "6px 10px", background: "rgba(28,110,74,0.06)", border: `1px solid rgba(28,110,74,0.2)`, color: GREEN, letterSpacing: "0.08em", fontSize: "0.41rem" }}>
        5-FOLD CV · TRAINED ON 284,807 REAL TRANSACTIONS
      </div>
    </div>
  );
}

function NLPMock() {
  return (
    <div style={{ background: "#090705", border: `1px solid ${BORDER}`, padding: "18px 16px", fontFamily: "var(--font-mono)", fontSize: "0.46rem" }}>
      <div style={{ color: "#a855f7", letterSpacing: "0.12em", marginBottom: 14, fontSize: "0.48rem" }}>NLP INSIGHT</div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: "rgba(243,238,226,0.28)", marginBottom: 6, fontSize: "0.41rem", letterSpacing: "0.12em" }}>MEMO FIELD — RED FLAGS DETECTED</div>
        <div style={{ padding: "9px 10px", background: "rgba(255,77,94,0.05)", border: "1px solid rgba(255,77,94,0.18)", color: CREAM, lineHeight: 1.65 }}>
          "cash transfer <span style={{ background: "rgba(255,77,94,0.28)", color: RED, padding: "0 2px" }}>misc services</span> per <span style={{ background: "rgba(255,77,94,0.28)", color: RED, padding: "0 2px" }}>consulting agreement</span>"
          <div style={{ marginTop: 5, fontSize: "0.41rem" }}><span style={{ color: RED }}>⚠ Vague memo</span><span style={{ color: "rgba(243,238,226,0.3)", marginLeft: 10 }}>conf: 0.91</span></div>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: "rgba(243,238,226,0.28)", marginBottom: 6, fontSize: "0.41rem", letterSpacing: "0.12em" }}>NAME MORPHING DETECTED</div>
        {[["ACME CONSULTING LLC","ACME CONSLT LLC"],["JOHN MILLER","JN MILLR"]].map(([a,b],i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "center" }}>
            <span style={{ padding: "2px 7px", background: "rgba(168,132,44,0.1)", border: `1px solid ${GOLD}30`, color: CREAM_DIM }}>{a}</span>
            <span style={{ color: "rgba(243,238,226,0.25)" }}>→</span>
            <span style={{ padding: "2px 7px", background: "rgba(168,132,44,0.1)", border: `1px solid ${GOLD}30`, color: CREAM_DIM }}>{b}</span>
            <span style={{ color: RED, fontSize: "0.41rem" }}>same</span>
          </div>
        ))}
      </div>
      <div style={{ padding: "6px 10px", background: "rgba(168,83,247,0.05)", border: "1px solid rgba(168,83,247,0.2)", color: "#a855f7", fontSize: "0.41rem", letterSpacing: "0.08em" }}>
        TRANSFORMER NER · 300+ RED-FLAG PATTERNS · CROSS-ENTITY
      </div>
    </div>
  );
}

const MOCKS = { Studio: StudioMock, "Risk Engine": RiskMock, "NLP Insight": NLPMock } as const;

/* ── STUDIO — amber split: thick left accent bar + floating mockup ─────────
   Layout: asymmetric 40/60, amber left rule, giant watermark "01"           */

function SectionStudio() {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      gsap.from(el.querySelectorAll(".s-txt"), { x: -64, opacity: 0, duration: 0.9, stagger: 0.1, ease: "power3.out" });
      gsap.from(el.querySelector(".s-mock"),   { x: 80, opacity: 0, duration: 1.1, ease: "power3.out", delay: 0.15 });
      obs.disconnect();
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="s-studio" ref={ref} style={{ background: DARK, position: "relative", overflow: "hidden", borderBottom: `1px solid ${BORDER}` }}>
      {/* Amber left accent bar */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, background: AMBER }} />
      {/* Ghost watermark */}
      <div style={{ position: "absolute", right: -20, top: "50%", transform: "translateY(-50%)", fontFamily: "var(--font-serif)", fontSize: "clamp(14rem,32vw,28rem)", fontWeight: 900, color: "rgba(255,183,0,0.03)", lineHeight: 1, userSelect: "none", pointerEvents: "none" }}>01</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", minHeight: "90vh" }}>
        {/* Left: content */}
        <div style={{ padding: "96px 60px 80px 88px", display: "flex", flexDirection: "column", justifyContent: "center", borderRight: `1px solid ${BORDER}` }}>
          <div className="s-txt" style={{ fontFamily: "var(--font-mono)", fontSize: "0.46rem", letterSpacing: "0.28em", textTransform: "uppercase", color: AMBER, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 2, background: AMBER }} />FORENSICS WORKSPACE
          </div>
          <h2 className="s-txt" style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(2.6rem,5vw,4.2rem)", fontWeight: 900, color: CREAM, letterSpacing: "-0.035em", lineHeight: 1.02, marginBottom: 20, textWrap: "balance" }}>
            Upload.<br />Detect.<br />Document.
          </h2>
          <p className="s-txt" style={{ fontFamily: "var(--font-body)", fontSize: "1rem", color: CREAM_DIM, lineHeight: 1.72, maxWidth: "44ch", marginBottom: 28 }}>
            Drag in a transaction CSV. Get a court-ready forensic evidence file in under 200ms.
          </p>
          <div className="s-txt" style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 36 }}>
            {["CSV · Excel · JSON","40+ ML features","SHAP waterfall","BSA/AML PDF"].map(b => (
              <span key={b} style={{ fontFamily: "var(--font-mono)", fontSize: "0.49rem", color: "rgba(255,183,0,0.7)", border: "1px solid rgba(255,183,0,0.22)", padding: "4px 10px" }}>{b}</span>
            ))}
          </div>
          <button className="s-txt" onClick={() => navigate("/studio")} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 24px", background: AMBER, color: DARK, border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, boxShadow: `5px 5px 0 rgba(255,183,0,0.3)`, alignSelf: "flex-start", transition: "transform .11s, box-shadow .11s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translate(2px,2px)"; e.currentTarget.style.boxShadow = `3px 3px 0 rgba(255,183,0,0.3)`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `5px 5px 0 rgba(255,183,0,0.3)`; }}>
            Open Studio →
          </button>
        </div>
        {/* Right: mockup — floating, offset up */}
        <div className="s-mock" style={{ padding: "60px 72px 60px 56px", display: "flex", alignItems: "center" }}>
          <StudioMock />
        </div>
      </div>
    </section>
  );
}

/* ── RISK ENGINE — centered danger screen, giant 94.7% ─────────────────────
   Layout: full-width centered, red-tinted bg, massive stat dominates         */

function SectionRisk() {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      gsap.from(el.querySelectorAll(".r-txt"), { y: 56, opacity: 0, duration: 1, stagger: 0.1, ease: "power3.out" });
      gsap.from(el.querySelector(".r-mock"),   { scale: 0.94, opacity: 0, duration: 1.1, ease: "power3.out", delay: 0.3 });
      obs.disconnect();
    }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} style={{ background: "#0e0205", position: "relative", overflow: "hidden", borderBottom: `1px solid ${BORDER}`, paddingBottom: 80 }}>
      {/* Red top bar */}
      <div style={{ height: 6, background: RED, width: "100%" }} />
      {/* Ghost watermark */}
      <div style={{ position: "absolute", left: "50%", top: "10%", transform: "translateX(-50%)", fontFamily: "var(--font-serif)", fontSize: "clamp(16rem,38vw,34rem)", fontWeight: 900, color: "rgba(194,51,31,0.035)", lineHeight: 1, userSelect: "none", pointerEvents: "none", whiteSpace: "nowrap" }}>02</div>

      {/* Centered content */}
      <div style={{ textAlign: "center", padding: "72px 48px 48px", position: "relative", zIndex: 1 }}>
        <div className="r-txt" style={{ fontFamily: "var(--font-mono)", fontSize: "0.46rem", letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(194,51,31,0.7)", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <div style={{ width: 28, height: 2, background: RED }} />ML ANOMALY DETECTION<div style={{ width: 28, height: 2, background: RED }} />
        </div>
        {/* Giant stat */}
        <div className="r-txt" style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(6rem,20vw,17rem)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 0.88, color: RED, marginBottom: 8 }}>94.7%</div>
        <div className="r-txt" style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.6rem,1.4vw,0.82rem)", letterSpacing: "0.26em", textTransform: "uppercase", color: "rgba(243,238,226,0.38)", marginBottom: 16 }}>FRAUD RECALL · 0.998 AUC-ROC · 5-FOLD CV</div>
        <p className="r-txt" style={{ fontFamily: "var(--font-body)", fontSize: "1rem", color: CREAM_DIM, maxWidth: "48ch", margin: "0 auto 32px", lineHeight: 1.68 }}>
          5-fold validated on 284,807 real fraud cases. Every prediction SHAP-explained and court-admissible.
        </p>
        {/* Spec pills in a row */}
        <div className="r-txt" style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 36 }}>
          {["Structuring detection","Layering — 8 hops","Integration fraud","Isotonic calibration"].map(b => (
            <span key={b} style={{ fontFamily: "var(--font-mono)", fontSize: "0.49rem", color: "rgba(194,51,31,0.8)", border: "1px solid rgba(194,51,31,0.28)", padding: "4px 10px" }}>{b}</span>
          ))}
        </div>
        <button className="r-txt" onClick={() => navigate("/risk")} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 24px", background: RED, color: CREAM, border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, boxShadow: `5px 5px 0 rgba(194,51,31,0.3)`, transition: "transform .11s, box-shadow .11s" }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translate(2px,2px)"; e.currentTarget.style.boxShadow = `3px 3px 0 rgba(194,51,31,0.3)`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `5px 5px 0 rgba(194,51,31,0.3)`; }}>
          Open Risk Engine →
        </button>
      </div>
      {/* Mockup centered, below */}
      <div className="r-mock" style={{ maxWidth: 580, margin: "0 auto", padding: "0 48px" }}>
        <RiskMock />
      </div>
    </section>
  );
}

/* ── NLP INSIGHT — stacked full-width: big headline top, mockup below ───────
   Layout: headline spans full width, mockup stretches across, purple world   */

function SectionNLP() {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      gsap.from(el.querySelectorAll(".n-txt"), { y: 48, opacity: 0, duration: 0.9, stagger: 0.1, ease: "power3.out" });
      gsap.from(el.querySelector(".n-mock"),   { y: 60, opacity: 0, duration: 1.1, ease: "power3.out", delay: 0.25 });
      obs.disconnect();
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} style={{ background: "#070412", position: "relative", overflow: "hidden" }}>
      {/* Purple top bar */}
      <div style={{ height: 6, background: "#a855f7", width: "100%" }} />
      {/* Ghost watermark */}
      <div style={{ position: "absolute", right: -40, bottom: -40, fontFamily: "var(--font-serif)", fontSize: "clamp(14rem,30vw,26rem)", fontWeight: 900, color: "rgba(168,83,247,0.035)", lineHeight: 1, userSelect: "none", pointerEvents: "none" }}>03</div>

      {/* Header — full width */}
      <div style={{ padding: "72px 80px 52px", borderBottom: `1px solid rgba(168,83,247,0.12)`, position: "relative", zIndex: 1 }}>
        <div className="n-txt" style={{ fontFamily: "var(--font-mono)", fontSize: "0.46rem", letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(168,83,247,0.7)", marginBottom: 22, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 2, background: "#a855f7" }} />NARRATIVE INTELLIGENCE ENGINE
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 80px", alignItems: "end" }}>
          <h2 className="n-txt" style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(2.4rem,5.5vw,4.6rem)", fontWeight: 900, color: CREAM, letterSpacing: "-0.04em", lineHeight: 0.98, textWrap: "balance" }}>
            Crime hides<br />in language.<br /><em style={{ color: "#a855f7", fontStyle: "italic" }}>We read it.</em>
          </h2>
          <div>
            <p className="n-txt" style={{ fontFamily: "var(--font-body)", fontSize: "1rem", color: CREAM_DIM, lineHeight: 1.72, marginBottom: 24 }}>
              Transformer NLP reads memo fields, spots name morphing across accounts, and surfaces red-flag language patterns that numeric ML misses entirely.
            </p>
            <div className="n-txt" style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 28 }}>
              {["Vague memo detection","Name morphing","300+ red-flag patterns","NER + entity correlation"].map(b => (
                <span key={b} style={{ fontFamily: "var(--font-mono)", fontSize: "0.49rem", color: "rgba(168,83,247,0.75)", border: "1px solid rgba(168,83,247,0.25)", padding: "4px 10px" }}>{b}</span>
              ))}
            </div>
            <button className="n-txt" onClick={() => navigate("/nlp")} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 24px", background: "#a855f7", color: CREAM, border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, boxShadow: "5px 5px 0 rgba(168,83,247,0.28)", transition: "transform .11s, box-shadow .11s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translate(2px,2px)"; e.currentTarget.style.boxShadow = "3px 3px 0 rgba(168,83,247,0.28)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "5px 5px 0 rgba(168,83,247,0.28)"; }}>
              Open NLP Insight →
            </button>
          </div>
        </div>
      </div>

      {/* Full-width mockup */}
      <div className="n-mock" style={{ maxWidth: 760, margin: "0 auto", padding: "52px 80px 80px", position: "relative", zIndex: 1 }}>
        <NLPMock />
      </div>
    </section>
  );
}

const ModuleShowcase = memo(function ModuleShowcase() {
  return (
    <>
      <SectionStudio />
      <SectionRisk />
      <SectionNLP />
    </>
  );
});

/* ── IMPACT TEXT — pinned word-by-word scroll ────────────────────────────── */

const ImpactText = memo(function ImpactText() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(el.querySelectorAll<HTMLElement>(".iw"),
        { y: 80, opacity: 0, filter: "blur(12px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", stagger: 0.1, ease: "none",
          scrollTrigger: { trigger: el, start: "top top", end: "+=150%", pin: true, scrub: 2 } }
      );
    });
    return () => ctx.revert();
  }, []);
  return (
    <section ref={ref} style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", ...LEDGER_LINES, overflow: "hidden" }}>
      <div style={{ textAlign: "center", padding: "0 32px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.52rem", letterSpacing: "0.32em", color: "rgba(243,238,226,0.28)", marginBottom: 28, textTransform: "uppercase" }}>THE VERITA DOCTRINE</div>
        {["EVERY","TRANSACTION","LEAVES","A","TRACE."].map((w, i) => (
          <div key={i} className="iw" style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(2.8rem,8.5vw,7.5rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, color: i === 4 ? AMBER : CREAM, display: "block", willChange: "transform,opacity,filter" }}>{w}</div>
        ))}
      </div>
    </section>
  );
});

/* ── HORIZONTAL STATS ────────────────────────────────────────────────────── */

const STAT_PANELS = [
  { stat: "$2.9T",  label: "Annual financial crime cost",      sub: "Globally. Every year.",                 accent: RED,      bg: "#090108" },
  { stat: "94.7%",  label: "Anomaly detection recall",         sub: "SHAP-traced. Court-admissible.",        accent: AMBER,    bg: "#080600" },
  { stat: "8-Hop",  label: "Network traversal depth",          sub: "Shell company to beneficiary owner.",   accent: GREEN,    bg: "#010906" },
  { stat: "<200ms", label: "Upload to forensic evidence file", sub: "Full ML pipeline. Hash sealed.",        accent: "#a855f7",bg: "#04010e" },
] as const;

const HorizontalStats = memo(function HorizontalStats() {
  const secRef   = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const sec = secRef.current; const trk = trackRef.current;
    if (!sec || !trk) return;
    const ctx = gsap.context(() => {
      gsap.to(trk, { x: () => -(trk.offsetWidth - window.innerWidth), ease: "none",
        scrollTrigger: { trigger: sec, start: "top top", end: () => `+=${trk.offsetWidth - window.innerWidth}`, pin: true, scrub: 0.8, invalidateOnRefresh: true,
          onUpdate: s => setActive(Math.min(STAT_PANELS.length - 1, Math.floor(s.progress * STAT_PANELS.length))) } });
    });
    return () => ctx.revert();
  }, []);
  return (
    <section ref={secRef} style={{ position: "relative", overflow: "hidden", height: "100vh" }}>
      <div ref={trackRef} style={{ display: "flex", height: "100%", width: `${STAT_PANELS.length * 100}vw`, willChange: "transform" }}>
        {STAT_PANELS.map((p, i) => (
          <div key={p.stat} style={{ width: "100vw", height: "100vh", flexShrink: 0, background: p.bg, backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 31px,${p.accent}05 32px)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 40px", position: "relative" }}>
            <div style={{ position: "absolute", top: 36, left: 44, fontFamily: "var(--font-mono)", fontSize: "0.48rem", letterSpacing: "0.26em", color: `${p.accent}50` }}>{String(i+1).padStart(2,"0")} / {String(STAT_PANELS.length).padStart(2,"0")}</div>
            <div style={{ width: 36, height: 2, background: p.accent, marginBottom: 22, flexShrink: 0 }} />
            <div style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(5rem,15vw,12rem)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 0.9, color: p.accent, marginBottom: 22 }}>{p.stat}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.58rem,1.3vw,0.78rem)", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(243,238,226,0.42)", marginBottom: 12 }}>{p.label}</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: "0.94rem", color: "rgba(243,238,226,0.22)", maxWidth: "36ch" }}>{p.sub}</div>
            {i < STAT_PANELS.length - 1 && <div style={{ position: "absolute", right: 28, top: "50%", transform: "translateY(-50%)", fontFamily: "var(--font-mono)", fontSize: "0.48rem", letterSpacing: "0.2em", color: "rgba(243,238,226,0.14)", writingMode: "vertical-rl" }}>SCROLL →</div>}
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "rgba(243,238,226,0.06)", zIndex: 10 }}>
        <div style={{ height: "100%", width: `${((active + 1) / STAT_PANELS.length) * 100}%`, background: STAT_PANELS[active].accent, transition: "width .4s, background .4s" }} />
      </div>
    </section>
  );
});

/* ── 3-STEP PROCESS ──────────────────────────────────────────────────────── */

function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      el.querySelectorAll<HTMLElement>(".step-card").forEach((c, i) => {
        setTimeout(() => { c.style.opacity = "1"; c.style.transform = "none"; }, i * 140);
      });
      obs.disconnect();
    }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="ledger torn-edge" style={{ padding: "88px 72px 80px" }}>
      <div style={{ maxWidth: 1060, margin: "0 auto" }}>
        <div style={{ marginBottom: 52 }}>
          <div style={{ transform: "rotate(-2.5deg)", display: "inline-block", marginBottom: 18 }}><div className="stamp" style={{ fontSize: "0.54rem" }}>HOW IT WORKS</div></div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(2rem,4.5vw,3.2rem)", fontWeight: 900, letterSpacing: "-0.03em", color: "var(--ink)", lineHeight: 1.05 }}>Upload. Detect. Seal.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2 }}>
          {([
            ["01","Upload your data",    "Drag in a CSV, Excel, or JSON file. Verita validates and begins feature engineering instantly.",                    ["CSV · Excel · JSON","Auto schema detection"]],
            ["02","Intelligence runs",   "ML pipeline, 8-hop graph traversal, and NLP memo analysis — all in parallel.",                                     ["94.7% recall","8-hop network","< 200ms"]],
            ["03","Receive the evidence","A BSA/AML forensic PDF. SHAP waterfall, flagged exhibits, and a SHA-256 hash-sealed audit chain.",                  ["SHAP trace","Hash chain","Court-ready PDF"]],
          ] as const).map(([n, title, desc, tags]) => (
            <div key={n} className="step-card" style={{ padding: "28px 24px", background: "var(--paper)", border: "1.5px solid rgba(20,18,11,0.13)", boxShadow: "4px 4px 0 rgba(20,18,11,0.07)", opacity: 0, transform: "translateY(22px)", transition: "opacity .65s ease, transform .65s cubic-bezier(0.22,1,0.36,1)", position: "relative" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(2.6rem,5vw,4rem)", fontWeight: 900, color: "rgba(20,18,11,0.06)", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 16 }}>{n}</div>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem", fontWeight: 900, color: "var(--ink)", letterSpacing: "-0.02em", marginBottom: 10 }}>{title}</h3>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "0.88rem", color: "var(--ink-soft)", lineHeight: 1.68, marginBottom: 18 }}>{desc}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {tags.map(t => <span key={t} style={{ fontFamily: "var(--font-mono)", fontSize: "0.44rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--foil-gold)", border: "1px solid rgba(168,132,44,0.26)", padding: "3px 7px" }}>{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── FRAUD NETWORK ───────────────────────────────────────────────────────── */

function FraudNetSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <section ref={ref} style={{ background: "#030205", height: "78vh", position: "relative", display: "flex", alignItems: "center", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 48, left: 72, zIndex: 10 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", letterSpacing: "0.26em", textTransform: "uppercase", color: "rgba(255,77,94,0.6)", marginBottom: 8 }}>LIVE NETWORK ANALYSIS</div>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 900, color: CREAM, letterSpacing: "-0.02em" }}>
          Follow the money.<br /><span style={{ color: "rgba(255,77,94,0.75)" }}>Every shell. Every hop.</span>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 40, right: 60, zIndex: 10, display: "flex", gap: 24 }}>
        {([[AMBER,"Normal flow"],[RED,"Fraud path"]] as const).map(([c,l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 2, background: c }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.48rem", color: "rgba(243,238,226,0.32)", letterSpacing: "0.1em" }}>{l}</span>
          </div>
        ))}
      </div>
      {visible && (
        <Canvas camera={{ fov: 50, position: [0, 0, 12] }} gl={{ antialias: true, alpha: true }} dpr={[1, 2]} style={{ position: "absolute", inset: 0 }}>
          <ambientLight intensity={0.4} />
          <FraudNetwork />
        </Canvas>
      )}
    </section>
  );
}

/* ── LEDGER CTA ──────────────────────────────────────────────────────────── */

function LedgerCTA() {
  const navigate = useNavigate();
  const chainRef = useRef<HTMLDivElement>(null);
  const [hashSeed, setHashSeed] = useState(77);
  useEffect(() => {
    const id = setInterval(() => setHashSeed(s => s + 1), 2600);
    const el = chainRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      el.querySelectorAll(".chain-node").forEach((n, i) => {
        setTimeout(() => { n.classList.add("sealed"); el.querySelectorAll(".chain-connector")[i]?.classList.add("active"); }, i * 480 + 200);
      });
      obs.disconnect();
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => { clearInterval(id); obs.disconnect(); };
  }, []);
  const hash = fakeHash(hashSeed);

  return (
    <div className="ledger torn-edge">
      <div className="guilloche" style={{ height: 26 }} />
      <div style={{ borderBottom: "1px solid rgba(168,132,44,0.2)", overflow: "hidden", padding: "8px 0", background: "rgba(168,132,44,0.025)" }}>
        <div className="marquee-track">
          {[0,1].map(k => <span key={k} style={{ fontFamily: "var(--font-mono)", fontSize: "0.48rem", letterSpacing: "0.26em", textTransform: "uppercase", color: "var(--foil-gold)", opacity: 0.6 }}>FORENSIC INTELLIGENCE · AML · BSA · OFAC · SHAP-TRACED · AUDIT-SEALED · 5-FOLD CV · COURT-READY · WOLTER KLUWER COMPATIBLE · </span>)}
        </div>
      </div>

      {/* Main body */}
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "82px 48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 0.85fr", gap: "0 72px", alignItems: "start" }}>

          <div>
            <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
              <div style={{ transform: "rotate(-2.5deg)" }}><div className="stamp" style={{ fontSize: "0.56rem", padding: "5px 13px" }}>CASE OPEN</div></div>
              <div style={{ transform: "rotate(1.8deg)" }}><div className="stamp stamp--green" style={{ fontSize: "0.56rem", padding: "5px 13px" }}>COURT READY</div></div>
            </div>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(2.2rem,4.5vw,3.6rem)", fontWeight: 900, letterSpacing: "-0.03em", color: "var(--ink)", lineHeight: 1.06, marginBottom: 22, textWrap: "balance" }}>
              Built for the teams that cannot afford to be wrong.
            </h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "1.01rem", color: "var(--ink-soft)", lineHeight: 1.74, maxWidth: "50ch", marginBottom: 36 }}>
              SHAP-traced. Hash-sealed. Audit-logged. Compatible with <strong style={{ color: "var(--ink)" }}>Wolter Kluwer</strong> compliance frameworks — CCH Tagetik, TeamMate, and OneSumX documentation standards.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={() => navigate("/studio")} style={{ padding: "14px 28px", background: "var(--ink)", color: "var(--paper)", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "0.64rem", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, boxShadow: "5px 5px 0 var(--stamp-red)", transition: "transform .11s, box-shadow .11s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translate(2px,2px)"; e.currentTarget.style.boxShadow = "3px 3px 0 var(--stamp-red)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "5px 5px 0 var(--stamp-red)"; }}>
                Open Studio →
              </button>
              <button onClick={() => navigate("/overview")} style={{ padding: "14px 28px", background: "none", border: "1.5px solid var(--ink)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "0.64rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink)", boxShadow: "5px 5px 0 rgba(20,18,11,0.09)", transition: "transform .11s, box-shadow .11s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translate(2px,2px)"; e.currentTarget.style.boxShadow = "3px 3px 0 rgba(20,18,11,0.09)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "5px 5px 0 rgba(20,18,11,0.09)"; }}>
                View Dashboard
              </button>
            </div>
          </div>

          <div>
            <div ref={chainRef} style={{ padding: "24px 20px", background: "var(--paper-2,#ece5d3)", border: "1px solid rgba(20,18,11,0.1)", boxShadow: "4px 4px 0 rgba(20,18,11,0.06)", marginBottom: 20 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.46rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: 16 }}>IMMUTABLE AUDIT CHAIN</div>
              <div style={{ display: "flex", alignItems: "center" }}>
                {["UPLOAD","PROFILE","ANALYZE","SIGN","SEAL"].map((label, i, arr) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flex: 1 }}>
                      <div className="chain-node chain-node--dark" />
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.41rem", letterSpacing: "0.1em", color: "var(--ink-soft)", textAlign: "center" }}>{label}</div>
                    </div>
                    {i < arr.length - 1 && <div className="chain-connector" style={{ width: 22 }} />}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, fontFamily: "var(--font-mono)", fontSize: "0.44rem", color: "var(--seal-green)", letterSpacing: "0.07em", opacity: 0.7 }}>
                chain: {hash}…
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              {([["Regulation","AML · BSA · OFAC"],["Evidence","Court-admissible"],["Hash","SHA-256"],["Compat.","Wolter Kluwer"]] as const).map(([k,v]) => (
                <div key={k} style={{ padding: "10px 12px", border: "1px solid rgba(20,18,11,0.08)", background: "var(--paper)" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.42rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: 3 }}>{k}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", color: "var(--ink)", fontWeight: 600 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Verdict */}
      <div style={{ textAlign: "center", padding: "52px 32px 80px", borderTop: "1px solid rgba(20,18,11,0.08)" }}>
        <div style={{ marginBottom: 22 }}><div className="wax-seal" style={{ animation: "float-y 3.8s ease-in-out infinite" }}>V</div></div>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 28 }}>
          <div style={{ transform: "rotate(-1.5deg)" }}><div className="stamp stamp--green" style={{ fontSize: "0.6rem" }}>VERIFIED</div></div>
          <div style={{ transform: "rotate(2deg)" }}><div className="stamp" style={{ fontSize: "0.6rem" }}>CASE SEALED</div></div>
        </div>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 900, letterSpacing: "-0.03em", color: "var(--ink)", lineHeight: 1.08, marginBottom: 14, textWrap: "balance" }}>The evidence file is ready.</h2>
        <p style={{ fontFamily: "var(--font-body)", color: "var(--ink-soft)", fontSize: "0.98rem", lineHeight: 1.7, maxWidth: "42ch", margin: "0 auto 32px" }}>
          From upload to court-ready verdict — hash-sealed, audit-logged, SHAP-explained.
        </p>
        <button onClick={() => navigate("/studio")} style={{ padding: "14px 32px", background: "var(--ink)", color: "var(--paper)", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "0.66rem", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700, boxShadow: "6px 6px 0 var(--stamp-red)", transition: "transform .11s, box-shadow .11s" }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translate(3px,3px)"; e.currentTarget.style.boxShadow = "3px 3px 0 var(--stamp-red)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "6px 6px 0 var(--stamp-red)"; }}>
          Open your first case →
        </button>
      </div>

      <footer style={{ background: "var(--ink)", color: "var(--paper)", padding: "36px 48px 30px", borderTop: "3px solid var(--stamp-red)" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 3 }}>VERITA</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.44rem", letterSpacing: "0.15em", textTransform: "uppercase", opacity: 0.28 }}>Financial Crime & Compliance Intelligence</div>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {MODULES.map(m => (
              <button key={m.path} onClick={() => navigate(m.path)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "0.52rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(243,238,226,0.35)", padding: 0, transition: "color .14s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(243,238,226,0.8)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(243,238,226,0.35)")}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Root ─────────────────────────────────────────────────────────────────── */

export default function Landing() {
  useEffect(() => {
    let killed = false;
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(t => { if (!killed) lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    return () => { killed = true; lenis.destroy(); ScrollTrigger.getAll().forEach(t => t.kill()); };
  }, []);

  return (
    <div style={{ position: "relative", overflowX: "hidden" }}>
      <Cursor />
      <Nav />
      <HeroSection />
      <div style={{ height: "25vh", background: DARK }} />
      <ModuleShowcase />
      <ImpactText />
      <HorizontalStats />
      <HowItWorks />
      <FraudNetSection />
      <LedgerCTA />
    </div>
  );
}
