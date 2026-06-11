import { Suspense } from "react";
import SignalField from "../components/SignalField";
import Hero from "../sections/Hero";
import LedgerSections from "../sections/LedgerSections";

/**
 * Marketing landing — a two-act scroll story.
 * Act I (dark): the "black box" world — WebGL signal field, aurora, the hero.
 * Act II (paper): the Forensic Ledger — scrolling breaks out of the black box into
 * evidence: exhibits, the pipeline as chain-of-custody, stamps, and a scroll-drawn chain.
 */
export default function Landing() {
  return (
    <>
      <div className="aurora">
        <div className="aurora__blob aurora__blob--1" />
        <div className="aurora__blob aurora__blob--2" />
        <div className="aurora__blob aurora__blob--3" />
      </div>
      <div style={{ position: "fixed", inset: 0, zIndex: 1 }}>
        <Suspense fallback={null}>
          <SignalField />
        </Suspense>
      </div>
      <div className="grain" />
      <main style={{ position: "relative", zIndex: 2 }}>
        <Hero />
        <LedgerSections />
      </main>
    </>
  );
}
