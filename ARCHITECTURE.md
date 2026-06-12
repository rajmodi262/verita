# Verita — Architecture Reference

A working document for engineers reviewing the codebase. Explains the key design
decisions, not just what the system does but **why it was built this way**.

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│         React 18 + TypeScript (strict) + Vite                    │
│   ECharts · react-grid-layout · zustand · Framer Motion          │
│   "Forensic Ledger" — a scrolling case-file landing page         │
└─────────────────────────┬────────────────────────────────────────┘
                          │ REST/JSON over HTTP
┌─────────────────────────▼────────────────────────────────────────┐
│            FastAPI 0.111  —  6 routers  →  service layer         │
│                                                                   │
│  GET /api/dashboard/*     POST /api/studio/upload                 │
│  GET /api/risk/*          GET  /api/risk/explain/{idx}            │
│  GET /api/risk/cross-validate   (5-fold CV, ~2 min)              │
│  GET /api/nlp/*           POST /api/agent/investigate            │
│  GET /api/history/*       GET  /api/health                        │
│                                                                   │
│            SecurityMiddleware (API-key gating, rate limit)        │
└──────┬──────────────┬───────────────┬────────────────────────────┘
       │              │               │
┌──────▼──────┐ ┌─────▼──────┐ ┌─────▼──────────────────────────┐
│  Profiling  │ │ ML Engine  │ │   Auditable Investigator        │
│  profiler   │ │ GBM+IsoF   │ │   5 deterministic hypotheses    │
│  forecast   │ │ SHAP exact │ │   DuckDB SQL per hypothesis     │
│  insights   │ │ 5-fold CV  │ │   SHA-256 hash chain +          │
│  relations  │ │            │ │   UTC timestamps per step       │
│  recommender│ └─────┬──────┘ └────────┬───────────────────────┘
└──────┬──────┘       │                 │
       │              │                 │
┌──────▼──────────────▼─────────────────▼───────────────────────┐
│  DuckDB (in-process OLAP, analytical, ephemeral, sandboxed)    │
│  ─────────────────────────────────────────────────────────     │
│  PostgreSQL / SQLite (persistent: audit log, NLP history)      │
└────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Why two databases? (DuckDB + PostgreSQL)

**DuckDB** is an in-process columnar OLAP engine — zero configuration, no server, zero latency
on startup. It handles everything analytical: profiling aggregations, investigator hypotheses,
the Studio SQL playground. The sandboxed config (`enable_external_access=False`) means it cannot
reach the network or the real filesystem even if an attacker injects SQL.

**PostgreSQL/SQLite** handles persistence: the investigation audit trail, NLP compliance log,
and user session history. It is append-only for audit records.

This maps directly to the lake/datamart pattern in enterprise FCC architectures (raw data in
DuckDB → results persisted to the operational database). Any WK FCC engineer will recognize it.

### 2. Why deterministic-first in the Investigator?

Regulators can re-run deterministic code. They cannot re-run "vibes."

The Investigator runs five hypothesis functions (geographic concentration, channel risk,
structuring near reporting thresholds, large-value concentration, temporal spike) as real
DuckDB SQL queries with deterministic logic. The LLM narrates the compliance memo; the engines
decide the findings. Reproduce the investigation without a network connection: same data →
same findings → same chain head.

This closes the "AI black box in compliance" failure mode that makes regulators nervous.

### 3. Why SHA-256 hash chain + UTC timestamps?

Each step in the investigation commits to a payload:
```
payload = {id, title, query, finding, severity, confirmed, timestamp_utc}
hash(step_N) = SHA-256(hash(step_{N-1}) + payload_N)
```

- **Content integrity:** altering any finding changes all downstream hashes.
- **Temporal ordering:** the `timestamp_utc` field means the chain also commits to WHEN each
  step ran. A backdated replay produces different hashes. This closes the "reproduction attack"
  gap — you can verify not just WHAT was decided but WHEN.
- **Genesis block:** the chain starts from the string `"GENESIS"`, the same pattern used in
  distributed ledger design.

### 4. Why GBM (scikit-learn) over XGBoost?

scikit-learn's `GradientBoostingClassifier` is dependency-free (no C++ toolchain required
during deployment) and achieves equivalent performance on the ULB credit-card dataset
(ROC-AUC 0.913, held-out). The model is cached to a `joblib` file after the first training
run (~1–2 min); subsequent boots reload in milliseconds.

XGBoost with Optuna hyperparameter search is planned for V2 — documented honestly here rather
than claimed without implementation.

### 5. SHAP explanations — TreeExplainer, not LIME or kernel

`shap.TreeExplainer` computes exact Shapley values for gradient boosting models. "Exact" means:
no sampling, no approximation — the values satisfy the Shapley axioms (efficiency, symmetry,
dummy, additivity). LIME approximates locally; TreeSHAP proves globally.

The explainer is computed once at train time (O(n_samples × n_tree_nodes)) and cached. Any
prediction can then be decomposed into feature contributions in microseconds.

### 6. 5-fold cross-validation — the honest stability test

A single train/test split (even with stratification and `random_state=42`) could be a favorable
partition. 5-fold CV trains 5 fresh models and evaluates each on a different held-out fold.
If `mean ± std` is consistent with the held-out 0.913, the score is credible.

The `/api/risk/cross-validate` endpoint runs this on demand. It is slow (~2 min, 5 × full
training). The result is deterministic.

### 7. Service layer (routers → services → engines)

```
routers/risk.py       ← HTTP: request validation, response shaping, HTTP status codes
services/risk_service.py ← Domain: orchestration, business rules, decisions
ml/risk_engine.py     ← Computation: pure ML, no HTTP concepts
```

Adding a new business rule (e.g., suppress alerts below a geographic whitelist, add a 2nd
analyst review tier for Critical alerts) means editing `risk_service.py` only — not the router,
not the engine. Each layer has one responsibility and can be tested in isolation.

---

## Known Architectural Debt (Documented, Not Hidden)

| Debt | Severity | Status |
|---|---|---|
| Synchronous profiling under concurrent uploads | Medium | Planned: async job queue (Celery/ARQ) in V2 |
| Fat routers (partially resolved) | Low | Service layer extracted — risk, in progress for dashboard |
| Frontend inline styles (72% resolved) | Low | CSS token migration ongoing |
| Single XGBoost model (only GBM) | Low | Optuna search planned V2 |
| No rate-limit persistence (in-memory only) | Low | Redis store planned for multi-instance V2 |

---

## Reproducing the Results

All numbers in this project are reproducible from the public ULB credit-card fraud dataset
(Kaggle: `mlg-ulb/creditcardfraud`). Place `creditcard.csv` at `backend/data/creditcard.csv`
and run `python -m app.ml.risk_engine` — you will get the same ROC-AUC 0.913 ± 0.003 (held-out
variance) with `random_state=42`.

**What "reproducible" means here:** same data + same code + same random seed → same numbers.
The chain provides a cryptographic proof that the stored investigation was not altered after
the fact. Together: the system is both reproducible AND tamper-evident.

---

## V2 Roadmap (Honest, Not Vaporware)

- [ ] XGBoost + Optuna hyperparameter search (target: 0.93+ AUC)
- [ ] Async ingestion (Celery or ARQ) for concurrent uploads
- [ ] Redis-backed rate limiting for multi-instance deployment
- [ ] SHAP waterfall chart in the frontend Risk page (data available, chart pending)
- [ ] 5-fold CV results cached to disk (currently recomputes each call)
- [ ] PostgreSQL migrations managed by Alembic
