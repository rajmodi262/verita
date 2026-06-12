import { useRef } from "react";
import { motion, useInView, useScroll, useSpring } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Github } from "lucide-react";

/* ════════════════════════════════════════════════════════════════════
   FORENSIC LEDGER — the scroll story. The page itself behaves like a
   hash chain: a thread draws down the spine, and each section is a
   "block" whose chain-node seals gold as it verifies into view.
   ════════════════════════════════════════════════════════════════════ */

const EXHIBITS = [
  {
    tag: "EXHIBIT A", img: "/shots/02-studio-dashboard.png", stamp: "AUTO-BUILT",
    title: "Auto-Dashboard Studio",
    body: "Drop any CSV or Excel file. Verita profiles every column, infers what each one means, and composes the dashboard an analyst would have built — editable, draggable, exportable. The first hour of BI work, done in seconds.",
  },
  {
    tag: "EXHIBIT B", img: "/shots/09-investigator.png", stamp: "CHAIN SEALED", green: true,
    title: "Auditable Compliance Investigator",
    body: "An autonomous agent forms AML hypotheses, tests each with a real SQL query, and writes a cited memo. Every reasoning step is SHA-256 hash-chained — doctor one finding and the chain breaks. Agentic AI a regulator could reproduce.",
  },
  {
    tag: "EXHIBIT C", img: "/shots/07-risk-engine.png", stamp: "BACKTESTED",
    title: "FCC Risk & Anomaly Engine",
    body: "A real scikit-learn model with honest, held-out metrics — ROC-AUC, precision-recall, a live decision-threshold slider — and an AML alert queue ranked by risk. No fabricated numbers anywhere in the product.",
  },
  {
    tag: "EXHIBIT D", img: "/shots/06-sql.png", stamp: "READ-ONLY", green: true,
    title: "SQL Playground + NL→SQL",
    body: "Real DuckDB SQL against your upload, guarded read-only at the engine level. Ask in plain English and review the generated SQL before it runs — then pin any result straight onto your dashboard.",
  },
  {
    tag: "EXHIBIT E", img: "/shots/08-nlp.png", stamp: "BSA / AML / OFAC",
    title: "NLP Compliance Analyzer",
    body: "Paste a transaction narrative: entities are extracted, BSA/AML/OFAC/FinCEN terms matched, and a transparent risk score recommends the action — File SAR, Investigate, or Monitor — with every driving signal listed.",
  },
];

const PIPELINE = [
  { n: "01", t: "Ingest", d: "CSV / Excel upload — pandas parses, semantic types inferred per column", tech: "FastAPI · Pandas" },
  { n: "02", t: "Profile", d: "Distributions, missingness, outliers, quality score with itemized deductions", tech: "NumPy · SciPy" },
  { n: "03", t: "Recommend", d: "Chart engine composes the dashboard; insight engine runs real statistics", tech: "Welch t-test · η² · Pearson" },
  { n: "04", t: "Model", d: "Fraud scoring + forecast tournament, all metrics measured on held-out data", tech: "scikit-learn · GBM" },
  { n: "05", t: "Seal", d: "Agent investigations hash-chained step by step — tamper-evident by construction", tech: "SHA-256 chain" },
  { n: "06", t: "Audit", d: "Every analysis, query and investigation persisted to the immutable trail", tech: "PostgreSQL · SQLAlchemy" },
];

const NUMBERS = [
  { v: "82", k: "automated tests, green in CI" },
  { v: "0", k: "fabricated metrics in product code" },
  { v: "6", k: "real SQL hypotheses per investigation" },
  { v: "100%", k: "of insights show their formula" },
  { v: "3", k: "forecast models per backtest tournament" },
  { v: "SHA-256", k: "sealing every reasoning trace" },
];

const MICROTEXT = Array(14).fill("VERITA · EVERY NUMBER SHOWS ITS WORK ·").join(" ");

/* Rubber stamp that SLAMS in when scrolled into view. */
function Stamp({ children, green, style }: { children: React.ReactNode; green?: boolean; style?: React.CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.span
      ref={ref}
      className={`stamp ${green ? "stamp--green" : ""}`}
      style={{ display: "inline-block", ...style }}
      initial={{ opacity: 0, scale: 2.6, rotate: green ? 14 : -16 }}
      animate={inView ? { opacity: 1, scale: 1, rotate: green ? 3 : -4 } : {}}
      transition={{ type: "spring", stiffness: 420, damping: 16, mass: 0.9 }}
    >
      {children}
    </motion.span>
  );
}

/* A ledger entry = one "block" in the chain; its node seals gold when verified. */
function Entry({ no, children }: { no: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 36 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: "relative", padding: "84px 24px", maxWidth: 1080, margin: "0 auto" }}>
      <div className={`chain-node ${inView ? "sealed" : ""}`} aria-hidden />
      <div className="ledger-label" style={{ marginBottom: 18 }}>
        LEDGER ENTRY {no} · {inView ? "VERIFIED ✓" : "PENDING"}
      </div>
      {children}
    </motion.div>
  );
}

function Redacted({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });
  return <span ref={ref} className={`redact ${inView ? "lifted" : ""}`}>{children}</span>;
}

/* Faint fingerprint watermark (concentric arcs). */
function Fingerprint() {
  return (
    <svg className="fingerprint" width="380" height="380" viewBox="0 0 380 380" aria-hidden>
      {Array.from({ length: 13 }, (_, i) => (
        <ellipse key={i} cx="190" cy="190" rx={20 + i * 13} ry={26 + i * 12}
          fill="none" stroke="var(--ink)" strokeWidth="3.5"
          strokeDasharray={`${40 + i * 22} ${12 + (i % 4) * 9}`}
          transform={`rotate(${i * 7} 190 190)`} />
      ))}
    </svg>
  );
}

export default function LedgerSections() {
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ["start 0.8", "end end"] });
  const thread = useSpring(scrollYProgress, { stiffness: 90, damping: 26 });

  return (
    <div ref={wrapRef} className="ledger torn-edge" style={{ position: "relative", zIndex: 3 }}>
      <div className="guilloche" />

      {/* the chain thread — draws down the spine as you scroll */}
      <motion.div aria-hidden style={{
        position: "absolute", left: "50%", top: 0, bottom: 0, width: 3, transformOrigin: "top",
        scaleY: thread, marginLeft: -1.5,
        background: "linear-gradient(180deg, var(--foil-gold), var(--seal-green))",
        boxShadow: "0 0 14px rgba(168,132,44,0.5)", opacity: 0.7,
      }} />

      {/* §1 THE PROBLEM */}
      <Entry no="0001">
        <div style={{ textAlign: "center" }}>
          <Stamp style={{ fontSize: "0.7rem" }}>CASE FILE · VERITA</Stamp>
          <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: "clamp(2.2rem, 5.4vw, 4.4rem)", lineHeight: 1.12, marginTop: 26 }}>
            AI you can't <Redacted>audit</Redacted><br />is AI you can't <Redacted>use</Redacted>.
          </h2>
          <p style={{ maxWidth: 620, margin: "26px auto 0", fontSize: "1.06rem", lineHeight: 1.75, color: "var(--ink-soft)" }}>
            Every AI analytics tool can find a "suspicious transaction." Almost none can show a regulator
            <em> how</em>. In financial crime &amp; compliance, an unexplainable number isn't insight —
            it's liability. That's the problem Verita was built around.
          </p>
        </div>
      </Entry>

      <div className="microtext">{MICROTEXT}</div>

      {/* §2 THE MANIFESTO */}
      <Entry no="0002">
        <div style={{ position: "relative", overflow: "hidden", borderTop: "3px solid var(--ink)", borderBottom: "3px solid var(--ink)", padding: "56px 8px", textAlign: "center" }}>
          <Fingerprint />
          <div className="ledger-label" style={{ marginBottom: 16 }}>THE GLASS-BOX PRINCIPLE</div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontStyle: "italic", fontSize: "clamp(1.6rem, 3.6vw, 2.7rem)", lineHeight: 1.35, maxWidth: 880, margin: "0 auto", position: "relative" }}>
            "Every number shows its formula. Every forecast shows its backtest.
            Every agent decision shows its query — and the whole trace is sealed
            in a tamper-evident chain."
          </h2>
          <div style={{ marginTop: 28, display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Stamp green style={{ fontSize: "0.66rem" }}>NO BLACK BOXES</Stamp>
            <Stamp style={{ fontSize: "0.66rem" }}>NO FABRICATED METRICS</Stamp>
          </div>
        </div>
      </Entry>

      {/* §3 EXHIBITS */}
      {EXHIBITS.map((ex, i) => (
        <Entry key={ex.tag} no={`000${i + 3}`}>
          <div style={{ display: "flex", gap: 44, alignItems: "center", flexWrap: "wrap", flexDirection: i % 2 ? "row-reverse" : "row" }}>
            <motion.div whileHover={{ rotate: 0, scale: 1.015 }} className="exhibit-frame"
              style={{ flex: "1 1 440px", minWidth: 300, rotate: i % 2 ? 1.2 : -1.2 }}>
              <img src={ex.img} alt={ex.title} loading="lazy" />
              <div className="ledger-label" style={{ paddingTop: 9, display: "flex", justifyContent: "space-between" }}>
                <span>{ex.tag}</span><span>VERITA / {String(i + 1).padStart(2, "0")}</span>
              </div>
            </motion.div>
            <div style={{ flex: "1 1 340px", minWidth: 280 }}>
              <Stamp green={ex.green} style={{ fontSize: "0.62rem" }}>{ex.stamp}</Stamp>
              <h3 style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: "clamp(1.7rem, 3vw, 2.4rem)", lineHeight: 1.15, margin: "16px 0 14px" }}>{ex.title}</h3>
              <p style={{ fontSize: "1rem", lineHeight: 1.75, color: "var(--ink-soft)" }}>{ex.body}</p>
            </div>
          </div>
        </Entry>
      ))}

      <div className="microtext">{MICROTEXT}</div>

      {/* §4 THE PIPELINE */}
      <Entry no="0008">
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Stamp green style={{ fontSize: "0.66rem" }}>CHAIN OF CUSTODY</Stamp>
          <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: "clamp(2rem, 4.4vw, 3.4rem)", marginTop: 18 }}>
            How a file becomes evidence
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 0, border: "2px solid var(--ink)", background: "var(--paper)" }}>
          {PIPELINE.map((s) => (
            <div key={s.n} style={{ padding: "26px 24px", borderRight: "1px solid var(--ledger-line)", borderBottom: "1px solid var(--ledger-line)" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: "2rem", color: "var(--foil-gold)" }}>{s.n}</span>
                <span style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: "1.25rem" }}>{s.t}</span>
              </div>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.65, color: "var(--ink-soft)", margin: "10px 0 12px" }}>{s.d}</p>
              <span className="ledger-label" style={{ color: "var(--seal-green)" }}>{s.tech}</span>
            </div>
          ))}
        </div>
      </Entry>

      {/* §5 BY THE NUMBERS */}
      <Entry no="0009">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 30, textAlign: "center" }}>
          {NUMBERS.map((n) => (
            <div key={n.k}>
              <div style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: "clamp(2.4rem, 4.4vw, 3.6rem)", color: "var(--ink)" }}>{n.v}</div>
              <div className="ledger-label" style={{ marginTop: 8, letterSpacing: "0.12em" }}>{n.k}</div>
            </div>
          ))}
        </div>
      </Entry>

      {/* §6 CLOSING / CTA — sealed in wax */}
      <Entry no="0010">
        <div style={{ textAlign: "center", paddingBottom: 30 }}>
          <motion.div initial={{ opacity: 0, scale: 2.2 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }} transition={{ type: "spring", stiffness: 320, damping: 18 }}
            className="wax-seal" style={{ marginBottom: 30 }}>
            V
          </motion.div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: "clamp(2rem, 4.6vw, 3.6rem)", lineHeight: 1.15 }}>
            The case is open.<br />Bring your own data.
          </h2>
          <div style={{ marginTop: 34, display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <button data-cursor onClick={() => navigate("/studio")}
              style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "15px 30px", border: "2px solid var(--ink)", background: "var(--ink)", color: "var(--paper)", fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "1rem", borderRadius: 4, cursor: "pointer" }}>
              Open the Studio <ArrowUpRight size={17} />
            </button>
            <a data-cursor href="https://github.com/rajmodi262/verita" target="_blank" rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "15px 30px", border: "2px solid var(--ink)", background: "transparent", color: "var(--ink)", fontWeight: 700, fontSize: "1rem", borderRadius: 4, textDecoration: "none" }}>
              <Github size={17} /> Inspect the source
            </a>
          </div>
          <div className="ledger-label" style={{ marginTop: 44 }}>
            VERITA · FINANCIAL CRIME &amp; COMPLIANCE INTELLIGENCE · EVERY NUMBER SHOWS ITS WORK
          </div>
        </div>
      </Entry>

      <div className="guilloche" />
    </div>
  );
}
