# Level 2 — For the Smart CS Student

*Audience: knows the basics, wants the architecture and the interesting bits.
Voice: peer-to-peer. Terms used, but explained on first touch.*

---

## The shape of the thing

Verita is a two-tier web app: a **FastAPI** backend (Python's modern async web
framework) doing all the data science, and a **React + TypeScript** frontend doing all
the presentation. They talk over plain REST. No magic in the transport — the magic is
in what the backend computes and how honestly it reports it.

```
            ┌──────────────────────────────────────────────────┐
            │  REACT + TS (Vite) ── ECharts · Three.js · zustand│
            │  Studio | Risk | NLP | Investigator | SQL console │
            └───────────────▲──────────────────────────────────┘
                            │ REST (JSON)
            ┌───────────────┴──────────────────────────────────┐
            │  FASTAPI  ── middleware: API-key · rate-limit ·   │
            │             global error handler                  │
            │                                                   │
            │  profiling/  semantic types · quality score ·     │
            │              insights (scipy) · relationships ·   │
            │              forecast tournament                  │
            │  ml/         GradientBoosting + IsolationForest   │
            │              (held-out metrics, joblib-persisted) │
            │  nlp/        BSA/AML/OFAC/FinCEN matcher ·        │
            │              entities · risk scoring              │
            │  genai/      optional Gemini (summary, NL→SQL)    │
            │              with deterministic fallback          │
            │  agent/      ⭐ hypothesis → SQL → verdict →       │
            │              SHA-256 hash-chained trace           │
            │  store/      disk-backed dataset cache + DuckDB   │
            └───────────────────────────────────────────────────┘
```

**DuckDB** (an in-process analytical SQL engine — think "SQLite for analytics") runs
the SQL console directly over the uploaded dataframe. **PostgreSQL** persists the audit
trail. Charts are **ECharts**; the landing page has a **Three.js** particle field
because portfolios are allowed one flex.

## The 3 most interesting technical decisions

**1. The hash-chained investigation trace.**
The flagship feature isn't a model — it's a data structure. Each step of the autonomous
investigation (hypothesis → SQL query → statistic → verdict) is serialized and hashed
with SHA-256, *and each hash includes the previous step's hash*. That's the same
construction as a blockchain block header or git's commit DAG. Consequence: you can
hand the JSON trace to a third party, and they can re-verify the whole chain with ten
lines of code. Doctor any step and every subsequent hash mismatches. "Auditable agentic
AI" stops being a slogan and becomes a falsifiable property.

**2. The forecast tournament instead of one fancy model.**
Instead of bolting on Prophet and calling it a day, the forecaster runs three cheap
models (trend+seasonality, Holt, seasonal-naive), backtests each on held-out periods,
and ships the winner *with its MAPE* (mean absolute percentage error — "how wrong was
I, on average, in percent"). The deep lesson: model selection with honest evaluation
beats model sophistication with none. That's also, not coincidentally, the answer to a
classic interview question.

**3. SELECT-only SQL with engine-level sandboxing.**
Letting users run SQL on an uploaded file is a security landmine. Defense in depth:
DuckDB runs with `enable_external_access=False` (the engine literally cannot touch the
filesystem), plus a guard that allows only SELECT, blocks comments (a classic smuggling
vector), and denies catalog access. There's an adversarial test corpus that tries to
break it. It's a small feature with a disproportionate "this person thinks about
security" signal.

## What I'd do differently with more time

- **Async job queue for big uploads.** Profiling runs in-request; a 2 GB file would
  hold a worker hostage. A task queue (e.g. Celery/ARQ) with progress events is the
  grown-up answer.
- **SHAP explainability on the risk model.** The product explains its *statistics* but
  the ML model's per-prediction reasoning is still feature-importance-level. SHAP
  values per transaction would complete the "show your work" thesis. (Engine already
  installed; it's the very next milestone.)
- **A real auth story.** API-key auth is honest for a demo; multi-user
  sessions/roles would be the production version.

## What was harder than expected

- **Semantic type inference.** "Is this column an ID, a category, or a quantity?"
  sounds trivial until you meet real CSVs: numeric-looking IDs, dates in three formats,
  categorical integers. The fix was layered heuristics + statistical tests, and it's
  still the code I trust least — which is why the profiler reports confidence instead
  of pretending certainty.
- **Honest metrics under class imbalance.** With 0.17% fraud, accuracy is a lie
  (predict "never fraud," score 99.8%). Getting to held-out ROC-AUC/PR-AUC, a
  threshold slider, and a confusion matrix that updates live taught me more about
  evaluation than any course did.
- **Making "instant" feel instant.** Model retraining took 21 s on boot; users feel
  anything over 1 s. Persisting the trained model with joblib got boot to 0.36 s.
  Caching profiles, disk-backing the dataset store — the unglamorous engineering is
  where the product feel lives.
