# Verita — Roadmap (Phase 1, Planning)

Tracked as GitHub Issues + this milestone list. Mirrors the SDLC pipeline in `DEVOPS.md`.

## ✅ Milestone 1 — Auto-Dashboard Studio (done)
- [x] Column profiler with semantic-role inference
- [x] Dashboard recommendation engine
- [x] `/api/dashboard/generate` upload endpoint
- [x] React Studio: upload → live ECharts dashboard + fields panel
- [x] Animated landing hero (Three.js + framer-motion)

## 🚧 Milestone 2 — FCC Risk & Anomaly Engine
- [ ] Train scikit-learn fraud model on real public data
- [ ] Metrics endpoint: ROC-AUC, precision-recall, confusion matrix
- [ ] Decision-threshold tuning
- [ ] AML alert queue UI

## 🔜 Milestone 3 — NLP Insight
- [ ] Natural-language → chart/filter
- [ ] Text analysis over unstructured fields

## 🧱 Platform (continuous)
- [x] CI (GitHub Actions), Docker, Prometheus metrics, JSON logging
- [ ] Drag/resize editable dashboard panels
- [ ] Deploy to a managed cluster
