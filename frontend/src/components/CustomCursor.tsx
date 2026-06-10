import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/**
 * A glowing custom cursor with a spring-lagged trailing ring.
 * - The dot tracks the pointer instantly; the ring follows with spring lag (the "trail").
 * - The ring expands + brightens over interactive elements (a, button, [data-cursor]).
 * - Disabled on coarse pointers (touch) and when reduced motion is requested.
 */
export default function CustomCursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 350, damping: 28, mass: 0.6 });
  const ringY = useSpring(y, { stiffness: 350, damping: 28, mass: 0.6 });

  const [hovering, setHovering] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    setEnabled(true);

    const move = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const el = e.target as HTMLElement;
      setHovering(!!el.closest("a, button, [data-cursor]"));
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [x, y]);

  if (!enabled) return null;

  return (
    <>
      {/* trailing ring */}
      <motion.div
        style={{
          translateX: ringX,
          translateY: ringY,
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 9999,
          pointerEvents: "none",
          marginLeft: -20,
          marginTop: -20,
          mixBlendMode: "screen",
        }}
        animate={{ scale: hovering ? 1.8 : 1, opacity: hovering ? 0.9 : 0.6 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1.5px solid #4d7cff",
            boxShadow: "0 0 24px 2px rgba(77,124,255,0.5)",
          }}
        />
      </motion.div>

      {/* instant dot */}
      <motion.div
        style={{
          translateX: x,
          translateY: y,
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 9999,
          pointerEvents: "none",
          marginLeft: -3,
          marginTop: -3,
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#22d3ee",
          boxShadow: "0 0 12px 2px rgba(34,211,238,0.8)",
        }}
      />
    </>
  );
}
