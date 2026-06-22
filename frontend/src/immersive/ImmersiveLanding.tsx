import { useCallback, useState } from 'react';
import { BuildingProvider, useBuildingContext } from './context/BuildingContext';
import BuildingScene from './canvas/BuildingScene';
import Preloader from './dom/Preloader';
import StampIntro from './dom/StampIntro';
import UVCursor from './dom/UVCursor';
import DossierNav from './dom/DossierNav';
import ElevatorHUD from './dom/ElevatorHUD';
import PaperShredTransition from './dom/PaperShredTransition';
import FloorContentOverlay from './dom/FloorContentOverlay';
import ExteriorHint from './dom/ExteriorHint';

function ImmersiveContent() {
  const { sceneReady, setPhase } = useBuildingContext();
  const [preloaderDone, setPreloaderDone] = useState(false);
  const [stampDone, setStampDone] = useState(false);

  const handlePreloaderComplete = useCallback(() => {
    setPreloaderDone(true);
    setPhase('stamp_intro');
  }, [setPhase]);

  const handleStampComplete = useCallback(() => {
    setStampDone(true);
    setPhase('exterior_approach');
  }, [setPhase]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        cursor: 'none',
        background: '#f3eee2',
      }}
    >
      {/* 3D canvas — mounted immediately, behind all overlays */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <BuildingScene />
      </div>

      {/* Preloader — blocks until scene + progress both ready */}
      {!preloaderDone && (
        <Preloader sceneReady={sceneReady} onComplete={handlePreloaderComplete} />
      )}

      {/* VERITA stamp slam — plays once after preloader exits */}
      {preloaderDone && !stampDone && (
        <StampIntro onComplete={handleStampComplete} />
      )}

      {/* Exterior hint — appears 2s after reaching exterior_idle */}
      <ExteriorHint />

      {/* In-building navigation overlays */}
      <DossierNav />
      <ElevatorHUD />
      <PaperShredTransition />

      {/* Floor data bottom bar */}
      <FloorContentOverlay />

      {/* UV flashlight cursor — always on top */}
      <UVCursor />
    </div>
  );
}

export default function ImmersiveLanding() {
  return (
    <BuildingProvider>
      <ImmersiveContent />
    </BuildingProvider>
  );
}
