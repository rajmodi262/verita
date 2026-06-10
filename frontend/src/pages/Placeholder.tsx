import { motion } from "framer-motion";

/** Honest placeholder for pages still in build (no fake content). */
export default function Placeholder({ title, note }: { title: string; note?: string }) {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "70vh" }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass"
        style={{ padding: "48px 56px", textAlign: "center", maxWidth: 480 }}
      >
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--violet)" }}>
          In build
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", marginTop: 10 }}>{title}</h2>
        <p style={{ color: "var(--text-muted)", marginTop: 12, lineHeight: 1.6 }}>
          {note || "This module is next on the roadmap. The Auto-Dashboard Studio is live — try it from the sidebar."}
        </p>
      </motion.div>
    </div>
  );
}
