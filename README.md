<div align="center">

# Verita

### Financial Crime & Compliance Intelligence

**Upload any financial dataset → an instant, editable, BI-grade dashboard.
Score transactions for fraud with real machine learning. Ask your data in plain English.
No BI tool to learn, no black boxes.**

`Python · FastAPI · Pandas · scikit-learn · DuckDB` · `React · TypeScript · ECharts · Three.js`

[![CI](https://github.com/rajmodi262/verita/actions/workflows/ci.yml/badge.svg)](https://github.com/rajmodi262/verita/actions/workflows/ci.yml) ![tests](https://img.shields.io/badge/tests-76%20passing-brightgreen) ![backend](https://img.shields.io/badge/backend-66%20pytest-blue) ![frontend](https://img.shields.io/badge/frontend-10%20vitest-blue) ![typecheck](https://img.shields.io/badge/tsc-clean-success) ![license](https://img.shields.io/badge/db-PostgreSQL%20%2B%20DuckDB-336791)

<br/>

![Verita Studio — auto-generated dashboard](docs/screenshots/02-studio-dashboard.png)

</div>

---

## Screenshots

| Auto-Dashboard Studio | Key Findings (with evidence) |
|---|---|
| ![dashboard](docs/screenshots/02-studio-dashboard.png) | ![insights](docs/screenshots/03-key-findings.png) |
| **Relationship map (Pearson + η²)** | **Auto geo-map** |
| ![relationships](docs/screenshots/04-relationships.png) | ![map](docs/screenshots/05-map.png) |
| **SQL playground (DuckDB)** | **FCC Risk & Anomaly Engine** |
| ![sql](docs/screenshots/06-sql.png) | ![risk](docs/screenshots/07-risk-engine.png) |
| **NLP compliance analyzer** | **Animated landing** |
| ![nlp](docs/screenshots/08-nlp.png) | ![landing](docs/screenshots/01-landing.png) |

---

## Why Verita exists

Power BI's real cost isn't the charts — it's the *first hour* of setup before you see one. Verita
collapses that hour to a single file drop: it profiles your data, finds what matters, and builds the
dashboard an analyst would have built — then lets you rearrange it, query it in SQL, and forecast it.

Built to map 1:1 against the **Wolters Kluwer FSS/FCC Data Science** role. The full traceability
matrix (every JD keyword → the feature that satisfies it) lives in
**[`JD_FEATURE_MAP.md`](JD_FEATURE_MAP.md)**.

## The honesty policy (the project's spine)

Every number Verita shows is computed from your data at request time. There are **no hardcoded
metrics, no `random()` charts, no fabricated explanations.** Concretely:

- Every auto-insight carries its exact `pandas`/`scipy` formula — click **"how was this computed?"**
- Forecasts ship their **backtest MAPE** on held-out periods, and the model is chosen by a tournament.
- The relationship map **refuses to draw** relationships that aren't statistically there.
- The risk model reports **held-out** ROC-AUC / precision-recall — never training-set scores.
- GenAI is a real, optional enhancement (Gemini); without a key the deterministic engines run, and
  the active mode is reported honestly at `/api/health`.

---

## Three pillars

### 1 · Auto-Dashboard Studio
Drop a CSV/Excel → an **X-ray scan** profiles every column (semantic type, distribution, missingness,
quality score) → a recommendation engine builds the best charts → an **editable Power-BI-style canvas**
(drag, resize, remove — your layout persists). Plus: auto **executive summary**, **Key Findings** with
significance tests, a **relationship map** (Pearson + η²), a real **DuckDB SQL console** with NL→SQL,
a **world geo-map**, a **forecast overlay**, a **Time Machine** scrubber, **"what changed?"** period
diffs, **pin-SQL-to-dashboard**, and a one-click **PDF report**.

### 2 · FCC Risk & Anomaly Engine
A real `scikit-learn` pipeline (GradientBoosting + IsolationForest) on labeled FCC data. Honest
held-out metrics, a live **decision-threshold slider** (watch precision/recall trade off), ROC &
precision-recall curves, confusion matrix, feature importance, and a ranked **AML alert queue**.

### 3 · NLP Insight
Paste a transaction narrative or alert → entity extraction + **BSA / AML / OFAC / FinCEN** matching +
a transparent risk score with the exact signals that drove it + a recommended action
(File SAR / Investigate / Monitor).

---

## Quickstart

```bash
# 1) Backend  (Python 3.10+)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload          # → http://localhost:8000  (docs at /docs)

# 2) Frontend (Node 20+)
cd frontend
npm install
npm run dev                            # → http://localhost:5175
```

Open **http://localhost:5175**, click **Studio**, and drop
[`data/sample_transactions.csv`](data/sample_transactions.csv).

**Or the whole stack in containers** (backend + frontend + Prometheus + Grafana):

```bash
docker compose up --build
```

### Tests

```bash
cd backend  && python -m pytest -q     # 62 tests
cd frontend && npm run test            # 10 tests
```

---

## Architecture

```
            React + TS + ECharts + Three.js (Vite)
                          │  REST
                          ▼
   FastAPI  ──  middleware: API-key auth · rate limit · global error handler
     │
     ├─ profiling/   semantic typing · quality score · insights (scipy) · relationships · forecast tournament
     ├─ ml/          GradientBoosting + IsolationForest (held-out metrics, joblib-persisted)
     ├─ nlp/         BSA/AML/OFAC/FinCEN matcher · entity extraction · risk scoring
     ├─ genai/       optional Gemini (summary + NL→SQL) with rule-based fallback
     └─ store        disk-backed dataset cache (survives restart) + DuckDB SQL engine
```

**Engineering posture:** the dataset store is disk-backed (uploads survive a restart), the risk model
is persisted (0.36 s boot vs 21 s retrain), profiles are computed once and cached, and the SQL console
runs DuckDB with `enable_external_access=False` behind a SELECT-only, comment-blocking, catalog-denying
guard (covered by an adversarial injection test corpus).

## Tech stack

| Layer | Tech |
|---|---|
| Backend | FastAPI · Pandas · NumPy · scikit-learn · SciPy · DuckDB · joblib |
| Frontend | React 18 · TypeScript · Vite · ECharts · Three.js · framer-motion · react-grid-layout · zustand |
| GenAI | Google Gemini (optional) with deterministic fallback |
| Infra | Docker · docker-compose · GitHub Actions · Prometheus · Grafana |
| Tests | pytest (62) · Vitest + Testing Library (10) |

## Configuration

All optional — Verita runs zero-config. See [`backend/.env.example`](backend/.env.example).
Notably: `VERITA_API_KEY` (turns on `X-API-Key` auth), `VERITA_RATE_LIMIT`, and `GEMINI_API_KEY`
(turns on LLM-enhanced summary + NL→SQL).

## Project layout

```
verita/
├── backend/        FastAPI app, ML, NLP, profiling, tests
├── frontend/       React app, components, tests
├── data/           sample dataset
├── docs/           implementation plan, design system, demo script
├── monitoring/     prometheus + grafana config
├── .github/        CI pipeline
├── JD_FEATURE_MAP.md   ← JD keyword → feature traceability
└── docker-compose.yml
```

See **[`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md)** for the 3-minute walkthrough.
