# Verita — Page Dependency Trees

## `/` — Landing

```
pages/Landing.tsx
└── immersive/ImmersiveLanding.tsx
    ├── canvas/BuildingScene.tsx
    │   ├── canvas/exterior/BuildingFacade.tsx
    │   ├── canvas/exterior/EntranceDoors.tsx
    │   ├── canvas/exterior/HashChainSpine.tsx
    │   └── canvas/floors/
    │       ├── FloorScene.tsx
    │       ├── DetectiveFloor.tsx
    │       ├── RiskLabFloor.tsx
    │       ├── RooftopFloor.tsx
    │       ├── StudioFloor.tsx
    │       └── VaultFloor.tsx
    │   └── canvas/lobby/
    │       ├── LivingLedger.tsx
    │       └── LobbyRoom.tsx
    │   └── canvas/materials/uvReveal.ts
    ├── context/BuildingContext.tsx
    ├── dom/DossierNav.tsx
    ├── dom/ElevatorHUD.tsx
    ├── dom/ExteriorHint.tsx
    ├── dom/FloorContentOverlay.tsx
    ├── dom/PaperShredTransition.tsx
    ├── dom/Preloader.tsx
    ├── dom/StampIntro.tsx
    ├── dom/UVCursor.tsx
    ├── hooks/useCameraJourney.ts
    ├── hooks/useFloorData.ts
    ├── hooks/useLiveLedger.ts
    ├── hooks/useMouseNDC.ts
    └── hooks/useUVReveal.ts
```

Context files needed for Landing design work:
- `frontend/src/immersive/ImmersiveLanding.tsx`
- `frontend/src/immersive/dom/*.tsx` (all DOM overlays)
- `frontend/src/index.css`

---

## `/overview` — Overview

```
pages/Overview.tsx
└── components/AppShell.tsx (layout)
    └── store/themeStore.ts
```

Context files: `pages/Overview.tsx`, `components/AppShell.tsx`, `index.css`

---

## `/studio` — Studio

```
pages/Studio.tsx
└── components/AppShell.tsx (layout)
└── components/studio/
    ├── GeoMap.tsx
    ├── InsightsPanel.tsx
    ├── Investigator.tsx
    ├── ProfileRail.tsx
    ├── RelationshipMap.tsx
    ├── SqlPlayground.tsx
    ├── TimeMachine.tsx
    └── WhatChanged.tsx
└── components/EChart.tsx
└── lib/chartOptions.ts
```

Context files: `pages/Studio.tsx`, `components/AppShell.tsx`, all `studio/` components, `index.css`

---

## `/risk` — Risk Engine

```
pages/Risk.tsx
└── components/AppShell.tsx (layout)
└── components/EChart.tsx
└── lib/chartOptions.ts
```

Context files: `pages/Risk.tsx`, `components/AppShell.tsx`, `components/EChart.tsx`, `index.css`

---

## `/nlp` — NLP Insight

```
pages/NLP.tsx
└── components/AppShell.tsx (layout)
```

Context files: `pages/NLP.tsx`, `components/AppShell.tsx`, `index.css`

---

## `/settings` — Settings

```
pages/Settings.tsx
└── components/AppShell.tsx (layout)
└── store/themeStore.ts
```

Context files: `pages/Settings.tsx`, `components/AppShell.tsx`, `index.css`
