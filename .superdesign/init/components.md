# Verita — Shared UI Components

## CustomCursor — `frontend/src/components/CustomCursor.tsx`

Custom cursor rendered on all routes except `/`. Follows mouse with `data-cursor` attribute targeting.

Key props: none (global singleton)

## EChart — `frontend/src/components/EChart.tsx`

Apache ECharts wrapper for data visualization.

Key props: `option` (ECharts option object), `style` (CSS style object)

## ErrorBoundary — `frontend/src/components/ErrorBoundary.tsx`

React error boundary wrapper. Used in App.tsx to wrap every route.

Key props: `label: string`, `children: ReactNode`

## SignalField — `frontend/src/components/SignalField.tsx`

Ambient signal/noise field visualization component (decorative background element).

---

## Studio Components — `frontend/src/components/studio/`

### GeoMap — `studio/GeoMap.tsx`
Geographic map visualization for transaction locations.

### InsightsPanel — `studio/InsightsPanel.tsx`
AI insights panel, displays analytical findings.

### Investigator — `studio/Investigator.tsx`
Investigative interface component for case analysis.

### ProfileRail — `studio/ProfileRail.tsx`
Side rail showing entity/profile information.

### RelationshipMap — `studio/RelationshipMap.tsx`
Network graph showing entity relationships.

### SqlPlayground — `studio/SqlPlayground.tsx`
In-browser SQL query editor and results viewer.

### TimeMachine — `studio/TimeMachine.tsx`
Temporal analysis / timeline scrubber component.

### WhatChanged — `studio/WhatChanged.tsx`
Diff/change detection display component.

---

## Immersive DOM Components — `frontend/src/immersive/dom/`

### DossierNav — `immersive/dom/DossierNav.tsx`
Navigation overlay styled as a case dossier.

### ElevatorHUD — `immersive/dom/ElevatorHUD.tsx`
Heads-up display for the 3D building elevator navigation.

### ExteriorHint — `immersive/dom/ExteriorHint.tsx`
Hint overlay shown when viewing the building exterior.

### FloorContentOverlay — `immersive/dom/FloorContentOverlay.tsx`
Content overlay shown when a building floor is active.

### PaperShredTransition — `immersive/dom/PaperShredTransition.tsx`
Page transition effect using paper shredding animation.

### Preloader — `immersive/dom/Preloader.tsx`
Loading screen shown while 3D assets initialize.

### StampIntro — `immersive/dom/StampIntro.tsx`
Rubber-stamp intro animation on first load.

### UVCursor — `immersive/dom/UVCursor.tsx`
UV lamp cursor effect for the ledger landing sections.
