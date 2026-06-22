import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";

/* Magnetic button — translates toward the cursor while hovered. */
function Magnetic({ children, primary, onClick }: { children: React.ReactNode; primary?: boolean; onClick?: () => void }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 300, damping: 18 });
  const sy = useSpring(y, { stiffness: 300, damping: 18 });
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <motion.button
      ref={ref}
      data-cursor
      style={{
        x: sx,
        y: sy,
        padding: "14px 26px",
        borderRadius: 999,
        fontFamily: "var(--font-body)",
        fontWeight: 600,
        fontSize: "0.98rem",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        border: primary ? "none" : "1px solid var(--border)",
        color: primary ? "#fff" : "var(--text)",
        background: primary ? "var(--signature)" : "var(--surface)",
        backdropFilter: "blur(20px)",
        boxShadow: primary ? "0 8px 40px -8px rgba(77,124,255,0.6)" : "none",
      }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * 0.35);
        y.set((e.clientY - (r.top + r.height / 2)) * 0.4);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.button>
  );
}

/* A glass stat chip that floats forever on its own loop. */
function FloatingChip({
  label,
  value,
  delay,
  style,
}: {
  label: string;
  value: string;
  delay: number;
  style: React.CSSProperties;
}) {
  return (
    <motion.div
      className="glass"
      style={{ position: "absolute", padding: "12px 18px", zIndex: 5, ...style }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, y: [0, -14, 0] }}
      transition={{
        opacity: { delay, duration: 0.6 },
        scale: { delay, duration: 0.6 },
        y: { duration: 6 + delay, repeat: Infinity, ease: "easeInOut" },
      }}
    >
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.3rem", fontWeight: 600 }}>{value}</div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.62rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}
      >
        {label}
      </div>
    </motion.div>
  );
}

/* Typewriter — writes the subtitle in front of the visitor, with a blinking caret. */
function Typewriter({ text }: { text: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(text.length); return; }
    let id: any;
    const start = window.setTimeout(() => {
      id = window.setInterval(() => {
        setN((v) => {
          if (v >= text.length) { window.clearInterval(id); return v; }
          return v + 2;
        });
      }, 24);
    }, 900);
    return () => {
      window.clearTimeout(start);
      if (id !== undefined) window.clearInterval(id);
    };
  }, [text]);
  return (
    <>
      {text.slice(0, n)}
      {n < text.length && <span style={{ borderRight: "2px solid var(--cyan, #22d3ee)", marginLeft: 1, animation: "blink 0.8s step-end infinite" }} />}
      <style>{`@keyframes blink{50%{border-color:transparent}}`}</style>
    </>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: 0.15 * i, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Hero() {
  const navigate = useNavigate();
  return (
    <section
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "0 24px",
        zIndex: 2,
      }}
    >
      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass"
        style={{
          position: "fixed",
          top: 20,
          display: "flex",
          alignItems: "center",
          gap: 28,
          padding: "10px 12px 10px 22px",
          borderRadius: 999,
          zIndex: 50,
        }}
      >
        <span
          data-cursor
          onClick={() => navigate("/")}
          style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", cursor: "pointer" }}
        >
          Verita
        </span>
        {[
          { label: "Product", to: "/overview" },
          { label: "Risk Engine", to: "/risk" },
          { label: "Studio", to: "/studio" },
          { label: "Docs", to: "/nlp" },
        ].map((l) => (
          <a
            key={l.label}
            data-cursor
            onClick={() => navigate(l.to)}
            style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "0.9rem", cursor: "pointer" }}
          >
            {l.label}
          </a>
        ))}
        <Magnetic primary onClick={() => navigate("/studio")}>
          Request Access <ArrowUpRight size={16} />
        </Magnetic>
      </motion.nav>

      {/* Floating stat chips */}
      <FloatingChip label="transactions analyzed" value="284K" delay={0.6} style={{ top: 104, left: 40 }} />
      <FloatingChip label="ROC-AUC · held-out" value="0.913" delay={1.1} style={{ top: 150, right: 48 }} />
      <FloatingChip label="PR-AUC · imbalanced" value="0.65" delay={1.5} style={{ bottom: 170, left: 52 }} />
      <FloatingChip label="fraud prevalence" value="0.17%" delay={1.9} style={{ bottom: 120, right: 56 }} />

      {/* Headline block */}
      <motion.div
        initial="hidden"
        animate="show"
        style={{ maxWidth: 940, position: "relative", zIndex: 3 }}
      >
        <motion.div
          custom={0}
          variants={fadeUp}
          className="glass"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            borderRadius: 999,
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            marginBottom: 28,
          }}
        >
          <Sparkles size={14} color="var(--violet)" /> AI-native financial crime & compliance
        </motion.div>

        <motion.h1
          custom={1}
          variants={fadeUp}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(2.6rem, 7vw, 6.2rem)",
            lineHeight: 1.04,
            letterSpacing: "-0.03em",
          }}
        >
          Turn raw financial data
          <br />
          into <span className="gradient-text">compliance intelligence</span>
        </motion.h1>

        <motion.p
          custom={2}
          variants={fadeUp}
          style={{
            color: "var(--text-muted)",
            fontSize: "clamp(1rem, 1.6vw, 1.25rem)",
            maxWidth: 620,
            margin: "24px auto 0",
            lineHeight: 1.6,
            minHeight: "3.2em",
          }}
        >
          <Typewriter text="Upload any dataset and get an instant, editable dashboard. Score transactions for risk with real machine learning. No BI tool to learn, no black boxes." />
        </motion.p>

        <motion.div
          custom={3}
          variants={fadeUp}
          style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 40, flexWrap: "wrap" }}
        >
          <Magnetic primary onClick={() => navigate("/studio")}>
            Upload a dataset <ArrowUpRight size={16} />
          </Magnetic>
          <Magnetic onClick={() => navigate("/risk")}>
            <ShieldCheck size={16} /> See the risk engine
          </Magnetic>
        </motion.div>
      </motion.div>

      {/* Scroll cue — the case file opens below */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 0.8 }}
        style={{
          position: "absolute", bottom: 64, left: 0, right: 0,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          pointerEvents: "none", zIndex: 3,
        }}
      >
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.26em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          Scroll — the case file opens
        </span>
        <motion.span
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ color: "var(--cyan, #22d3ee)", fontSize: "1rem", lineHeight: 1 }}
        >
          ▾
        </motion.span>
      </motion.div>

      {/* Marquee trust strip */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          overflow: "hidden",
          padding: "18px 0",
          borderTop: "1px solid var(--border)",
          maskImage: "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
          zIndex: 3,
        }}
      >
        <motion.div
          style={{ display: "flex", gap: 64, whiteSpace: "nowrap", fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: "0.85rem" }}
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        >
          {[...Array(2)].flatMap((_, k) =>
            ["BSA / AML", "OFAC SCREENING", "SAR FILING", "KYC / CDD", "ANOMALY DETECTION", "FinCEN", "RISK SCORING"].map((t) => (
              <span key={`${k}-${t}`}>{t}</span>
            ))
          )}
        </motion.div>
      </div>
    </section>
  );
}
