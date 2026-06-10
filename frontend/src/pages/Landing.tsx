import { Suspense } from "react";
import SignalField from "../components/SignalField";
import Hero from "../sections/Hero";

/** Marketing landing — always dark; the heavy 3D scene lives only here. */
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
      </main>
    </>
  );
}
