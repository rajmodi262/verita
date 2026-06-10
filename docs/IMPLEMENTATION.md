# Verita — Implementation Plan (2–3 day sprint)

Goal: a focused, **real**, polished FCC analytics app that maps 1:1 to the Wolters Kluwer
FSS/FCC Data Science JD. Fewer features, all genuinely working, zero fabricated numbers.

## Scope priority (build in this order)
1. **Auto-Dashboard Studio** ⭐ — upload → instant editable dashboard. *The differentiator.*
2. **FCC Risk & Anomaly Engine** — real scikit-learn on real fraud data, honest metrics.
3. **NLP Insight** — natural-language → chart. Scoped to fit; the GenAI "plus".

## Day-by-day

### Day 1 — Backend core ✅ (in progress)
- [x] Project scaffold, README, requirements
- [x] Dataset profiler — semantic role inference (measure/dimension/temporal/id/bool/text/geo)
- [x] Dashboard recommendation engine — ranked chart specs with pre-aggregated data
- [x] `/api/dashboard/generate` upload endpoint
- [x] Verified engine end-to-end on a realistic 5k-row FCC dataset
- [ ] FCC risk model: train real scikit-learn pipeline on fraud data; expose metrics endpoint

### Day 2 — Auto-Dashboard Studio frontend ⭐
- [ ] React + TS + Vite scaffold, design system / tokens
- [ ] Upload dropzone → call `/generate`
- [ ] ECharts renderers for kpi / line / bar / pie / histogram / heatmap
- [ ] Editable canvas (react-grid-layout): drag, resize, remove, swap dimension/measure
- [ ] Export (PNG / PDF)

### Day 3 — Risk dashboard + NLP + polish
- [ ] Risk & Anomaly page: ROC-AUC, precision-recall, confusion matrix, threshold slider, alert queue
- [ ] NLP slice: NL query → filtered chart
- [ ] Landing/overview page, theme polish, empty/error states
- [ ] README finalize + scripted 3-minute demo narrative

## Non-negotiables (lessons from the FinSight audit)
- No hardcoded "model metrics"; no `random()` charts; no fake explainability.
- If data is sampled/synthetic, the UI says so.
- Every endpoint is reachable and tested before it's called "done".
