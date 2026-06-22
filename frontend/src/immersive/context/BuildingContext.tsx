import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type BuildingPhase =
  | 'preloading'
  | 'stamp_intro'
  | 'exterior_approach'
  | 'exterior_idle'
  | 'entering'
  | 'lobby'
  | 'elevator_traveling'
  | 'floor_studio'
  | 'floor_risk'
  | 'floor_detective'
  | 'floor_vault'
  | 'rooftop'
  | 'teleporting';

export type FloorId = 'lobby' | 'studio' | 'risk' | 'detective' | 'vault' | 'rooftop';

interface BuildingContextValue {
  phase: BuildingPhase;
  setPhase: (phase: BuildingPhase) => void;
  currentFloor: FloorId | null;
  uvActive: boolean;
  mouseNDC: { x: number; y: number };
  setMouseNDC: (x: number, y: number) => void;
  isTransitioning: boolean;
  setTransitioning: (v: boolean) => void;
  sceneReady: boolean;
  setSceneReady: (v: boolean) => void;
  enterBuilding: () => void;
  goToFloor: (floor: FloorId) => void;
  exitFloor: () => void;
  teleportTo: (floor: FloorId) => void;
}

const BuildingContext = createContext<BuildingContextValue | null>(null);

export function useBuildingContext(): BuildingContextValue {
  const ctx = useContext(BuildingContext);
  if (!ctx) throw new Error('useBuildingContext must be used inside BuildingProvider');
  return ctx;
}

export function BuildingProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhaseState] = useState<BuildingPhase>('preloading');
  const [currentFloor, setCurrentFloor] = useState<FloorId | null>(null);
  const [isTransitioning, setTransitioning] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  // mouseNDC is a mutable ref object — mutations are read each useFrame without
  // triggering React re-renders (which would cause jank on every mouse move).
  const mouseNDCRef = useRef({ x: 0, y: 0 });
  // Single timer ref shared by enterBuilding and teleportTo — prevents stacking
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancel any pending transition timer on unmount
  useEffect(() => () => {
    if (transitionTimerRef.current !== null) clearTimeout(transitionTimerRef.current);
  }, []);

  const setPhase = useCallback((p: BuildingPhase) => setPhaseState(p), []);

  const setMouseNDC = useCallback((x: number, y: number) => {
    mouseNDCRef.current.x = x;
    mouseNDCRef.current.y = y;
  }, []);

  // UV lamp active in all phases after the intro sequence
  const uvActive = phase !== 'preloading' && phase !== 'stamp_intro';

  // Use the paper-shred teleport transition instead of a fly-through animation.
  // The camera snaps to lobby position during the 600ms shred window.
  const enterBuilding = useCallback(() => {
    // Cancel any in-flight transition to prevent double-invocation race
    if (transitionTimerRef.current !== null) clearTimeout(transitionTimerRef.current);
    setTransitioning(true);
    setPhaseState('teleporting');
    transitionTimerRef.current = setTimeout(() => {
      setCurrentFloor('lobby');
      setPhaseState('lobby');
      setTransitioning(false);
      transitionTimerRef.current = null;
    }, 600);
  }, []);

  const floorPhase = useCallback((floor: FloorId): BuildingPhase => {
    if (floor === 'lobby')   return 'lobby';
    if (floor === 'rooftop') return 'rooftop';
    return `floor_${floor}` as BuildingPhase;
  }, []);

  const goToFloor = useCallback((floor: FloorId) => {
    setCurrentFloor(floor);
    setPhaseState(floorPhase(floor));
  }, [floorPhase]);

  const exitFloor = useCallback(() => {
    setCurrentFloor(null);
    setPhaseState('lobby');
  }, []);

  const teleportTo = useCallback((floor: FloorId) => {
    // Cancel any in-flight transition to prevent double-invocation race
    if (transitionTimerRef.current !== null) clearTimeout(transitionTimerRef.current);
    setTransitioning(true);
    setPhaseState('teleporting');
    // 600ms: paper flies in (300ms) + hold (300ms); then paper flies out on phase change
    transitionTimerRef.current = setTimeout(() => {
      setCurrentFloor(floor);
      setPhaseState(floorPhase(floor));
      setTransitioning(false);
      transitionTimerRef.current = null;
    }, 600);
  }, [floorPhase]);

  const value = useMemo<BuildingContextValue>(
    () => ({
      phase,
      setPhase,
      currentFloor,
      uvActive,
      mouseNDC: mouseNDCRef.current,
      setMouseNDC,
      isTransitioning,
      setTransitioning,
      sceneReady,
      setSceneReady,
      enterBuilding,
      goToFloor,
      exitFloor,
      teleportTo,
    }),
    [
      phase, setPhase, currentFloor, uvActive, setMouseNDC,
      isTransitioning, setTransitioning, sceneReady, setSceneReady,
      enterBuilding, goToFloor, exitFloor, teleportTo,
    ]
  );

  return <BuildingContext.Provider value={value}>{children}</BuildingContext.Provider>;
}
