# Verita — Implementation Plan to 9.5/10

> **Thesis of this plan:** You do not reach 9.5 by adding polish. You reach it by removing
> every reason a senior WK data scientist can say *"nice portfolio, not production-minded yet."*
> This plan is **grounded in the actual codebase as it stands today** (audited 2026-06-14),
> not generic advice. Each item states what *already exists*, the exact *gap*, the *work*,
> and a concrete *acceptance test*.

---

## Audit summary — where the code actually is today

A file-level audit against the 10-point brutal-truth list found that **much of the engineering
is already done** (SHAP, 5-fold CV, hash-chain timestamps, 4-model forecast tournament, a real
validation module, a real job module). The score is being held back by three classes of problem:

| Class | Examples found in the audit | Why it kills the score |
|---|---|---|
| **Orphaned code** | `services/jobs.py` and `services/data_validation.py` are fully written but **referenced by nothing** — no router calls them. | "Half-credit" — same trap as SHAP-in-JSON-only. A reviewer greps for usage, finds none, and the feature reads as a stub. |
| **Metric mismatch** | `README.md` badges say `tests-82` / `backend-72 pytest`, but the body says `62 tests` (lines 149, 183). | One inconsistency makes the reviewer doubt **every** number. Directly violates the honesty thesis. |
| **Model-layer thinness** | Risk `metrics()` returns ROC/PR-AUC, precision, recall, F1, confusion — but **no precision@k, recall@k, calibration, or threshold-selection logic**, and no model card. | This is precisely where seniors attack. "ROC-AUC 0.913" alone sounds like a student. |

**Current real state (verified):**
- `backend/app/ml/risk_engine.py` — has SHAP (`TreeExplainer`, global `shap_importances` + 20-row `shap_sample`), 5-fold stratified CV, held-out ROC/PR-AUC. Endpoints `/api/risk/explain/{idx}` and `/api/risk/cross-validate` exist.
- `backend/app/agent/investigator.py` — 5 hypotheses (geo, channel, structuring, amount concentration, temporal), SHA-256 chain that **already commits `timestamp_utc`**, `verify_chain()`.
- `backend/app/profiling/forecast.py` — 4-model tournament (linear+seasonality, holt, holt_winters via statsmodels, seasonal_naive), MAPE backtest, 1.96σ confidence band.
- `backend/app/nlp/analyzer.py` — BSA/AML/OFAC/FinCEN matcher, high-risk jurisdictions, structuring patterns, PEP, transparent scoring.
- `backend/app/services/jobs.py` — `ThreadPoolExecutor`, `create_dashboard_job`, `get_job` — **NOT wired to any router**.
- `backend/app/services/data_validation.py` — `build_validation_report` (dataset hash, column checks, coercion, duplicates, rejected-row sample, domain coverage) — **NOT wired into `generate_dashboard`**.

---

## Priority order (do top-down — ordered by blast radius)

```
P0  Credibility lockdown ........ kill every placeholder/metric mismatch        (1–2h)
P1  Wire the orphans ............ jobs + validation report into live endpoints  (3–4h)
P2  Model card + eval depth ..... precision@k, calibration, threshold logic, MD (4–5h)
P3  SHAP made visible ........... per-alert "why flagged" panel + plain sentence (3–4h)
P4  Forecast discipline ......... rolling-window backtest, SMAPE/MASE, SARIMAX  (3–4h)
P5  FCC typology depth .......... round-amount + velocity + typology tags       (3–4h)
P6  Audit integrity ............. dataset/code/result hash + export report      (2–3h)
P7  "Production Gaps I Know" .... README section owning the limits              (1h)
P8  Technical defense doc ....... surgical answers to the 7 attack questions    (1–2h)
```

---

## P0 — Credibility lockdown (do before anything else)

> If any number contradicts another number, the honesty thesis is dead. This is non-negotiable
> and comes first.

### P0-1 · Reconcile the test count everywhere
- **Run the source of truth:** `cd backend; python -m pytest -q` and `cd frontend; npm run test`.
- **Fix every reference** to the real numbers in `README.md` (badges line 13, body lines 149 & 183),
  `CLAUDE.md`, `JD_FEATURE_MAP.md`, and any masterpack/identity docs.
- **Acceptance:** `grep -rn "62 tests\|82 passing\|72 pytest" .` returns only currently-true values.

### P0-2 · Verify the ROC-AUC / PR-AUC story is consistent
- README claims **ROC-AUC 0.913, PR-AUC 0.65** (line 96). Confirm these match what `/api/risk/metrics`
  returns on the real ULB data *today* (numbers drift if hyperparams changed).
- Check `frontend/src/sections/Hero.tsx` floating chips show the **held-out** numbers with a
  `· held-out` qualifier — never a bare or inflated figure.
- **Acceptance:** the number on the landing page == the number from the live API == the number in README.

### P0-3 · Placeholder sweep
- `grep -rn "\[MY_\|\[INTERVIEW\|\[BRACKET\|TODO\|FIXME\|XXX\|placeholder\|lorem" --include=*.md --include=*.tsx --include=*.py .`
- Resolve or delete every hit. No `[X]`, no `TODO` left in any reviewer-facing file.
- **Acceptance:** the grep above is empty (or only matches intentional, explained content).

---

## P1 — Wire the orphans (highest ROI engineering work)

> `jobs.py` and `data_validation.py` already exist and are good. They are invisible because
> nothing calls them. Wiring them is the single biggest credibility jump for the least code.

### P1-1 · Async ingestion job pipeline (feedback #5)
**Current:** `services/jobs.py` has `create_dashboard_job()` / `get_job()` running on a
`ThreadPoolExecutor`, but the upload path (`routers/dashboard.py` → `POST /generate`) is still synchronous and never touches it.

**Work:**
1. Add to `backend/app/routers/dashboard.py` (or a new `routers/datasets.py`):
   - `POST /api/datasets` → reads the upload, calls `create_dashboard_job(filename, raw)`, returns `{ job_id, status: "queued" }` with **HTTP 202**.
   - `GET /api/jobs/{job_id}` → returns `get_job(job_id)` (status / progress / steps / result / error). Map `JobNotFound` → 404.
2. **Persist job records** so failures are auditable across restart. Add a `jobs` table via `audit.py`/`models_db.py` (status, progress, error, created/updated, result-summary JSON). Write on each `_patch`.
3. Keep `POST /generate` working (back-compat) but mark it legacy in the docstring.
4. **Frontend** (`frontend/src/pages/Studio.tsx` + `lib/api.ts`): on drop → POST `/datasets`, then poll `GET /jobs/{id}` every ~800ms, render the `steps[]` as a live progress log, swap to the dashboard on `succeeded`, show `error` on `failed`.

**Acceptance:** upload returns a `job_id` immediately; the UI shows progressing steps; a deliberately
malformed file produces a `failed` job with a readable `error` that survives a backend restart.

### P1-2 · Data-validation report, wired and scored (feedback #6)
**Current:** `data_validation.build_validation_report(df, profile)` produces dataset hash, per-column
checks (null %, coercion failures, outliers), duplicate detection, rejected-row sample, and domain
coverage — but `generate_dashboard()` never calls it.

**Work:**
1. In `services/dashboard_service.py::generate_dashboard`, after profiling, call
   `build_validation_report(df, profile)` and include it in the returned payload under `"validation"`.
2. Add a **single data-quality score (0–100) with evidence** to the report — e.g. start at 100 and
   subtract weighted penalties for null-heavy columns, coercion failures, duplicates, and missing
   domain signals; return the penalty breakdown alongside the score so it "shows its work."
3. **Frontend:** add a "Data Quality" panel to the Studio dashboard — the score, the review-flagged
   columns, the duplicate counts, and the rejected-row sample table.

**Acceptance:** every upload's dashboard shows a data-quality score; a CSV with duplicate IDs and a
bad numeric column visibly drops the score with the reasons listed.

---

## P2 — Model card + evaluation depth (where seniors attack)

> This is the difference between "ROC-AUC 0.913" (student) and explaining *why PR-AUC matters more
> in fraud* (employable).

### P2-1 · Extend `metrics()` in `ml/risk_engine.py`
Add to the returned dict (all computed on the held-out set):
- **`precision_at_k` / `recall_at_k`** for k ∈ {50, 100, 500} — the analyst-queue metric: "of the top
  100 flagged, how many are truly fraud." This is the metric an FCC team actually operates on.
- **Calibration curve** — `sklearn.calibration.calibration_curve(y, p, n_bins=10)` → bin midpoints vs
  observed fraud rate, plus a **Brier score**. Lets you say "a 0.8 score really means ~80% fraud."
- **Threshold-selection logic** — return the threshold that maximizes F1 (or hits a target
  precision), with the rationale, instead of a bare 0.5 default.
- **FP/FN trade-off** at a few thresholds (already have the slider; expose the table).

### P2-2 · Write `MODEL_CARD.md` (root)
A real model card — the document seniors look for:
- Dataset source + class imbalance (ULB, 284,807 tx, 0.172% fraud).
- ROC-AUC, **PR-AUC (and why it's the headline for imbalanced fraud)**, precision@k, recall@k.
- Threshold selection logic and the operating point chosen.
- Calibration curve + Brier score.
- 5-fold CV summary (mean ± std) — already computed by `cross_validate()`.
- FP/FN trade-off discussion.
- **"What this model cannot claim"** — explicitly: trained on one issuer's 2013 EU card data;
  PCA-anonymized `V1..V28` features mean no human-readable feature semantics; not validated on wire/
  ACH/crypto rails; no concept-drift monitoring; not a substitute for a tuned production sanctions
  screen.

### P2-3 · Frontend: calibration curve + precision@k on the Risk page
Add a calibration plot (predicted vs observed) and a precision@k bar to `frontend/src/pages/Risk.tsx`
using the existing `EChart` component.

**Acceptance:** `/api/risk/metrics` returns precision@k, recall@k, calibration bins, Brier; `MODEL_CARD.md`
exists and every number in it is reproducible from the API; the Risk page renders the calibration curve.

---

## P3 — Make SHAP visible, not just implemented (feedback #3)

> "Every number shows its work" — then the model must *literally* show its work, in the product.

**Current:** SHAP is computed and `/api/risk/explain/{idx}` exists, but it only covers 20 stored
sample rows and there is no analyst-readable narrative.

**Work:**
1. **Global importance** — render `shap_importances` (mean |SHAP|) as a horizontal bar on the Risk page,
   titled *"SHAP — why the model decides"* with subtitle *"mean |SHAP value|, exact TreeSHAP"*.
2. **Per-alert "Why flagged" panel** — in the alert queue (`alerts()` / Risk page), clicking a row
   opens a SHAP waterfall for **that transaction**. Extend the engine to compute SHAP on demand for any
   alert row (not only the 20-row sample), or precompute for the alert set.
3. **Analyst-readable sentence** — generate a plain-English line from the top ± SHAP contributors:
   *"Flagged mainly because amount_log (+0.34), velocity (+0.21) and geo_risk (+0.18) pushed risk up;
   domestic channel (−0.09) pulled it down. Net score 0.79."* Build this server-side from the SHAP
   values so it's deterministic and honest.

**Acceptance:** clicking any alert shows a waterfall + a one-sentence explanation whose numbers match
the SHAP values; global importance bar renders on first load.

---

## P4 — Forecasting from demo to discipline (feedback #4)

> Forecasting is explicitly in the JD. The current single 80/20 split is decent but not 9.5.

**Current:** `profiling/forecast.py` does a single 80/20 holdout, MAPE only, 1.96σ band, 4-model
tournament including statsmodels `Holt`.

**Work:**
1. **Rolling-window (walk-forward) backtest** — replace/augment the single split with expanding-window
   backtesting (refit at each step, forecast 1 ahead, accumulate errors). Report fold count.
2. **More error metrics** — add **SMAPE** and **MASE** (MASE normalizes against the naive forecast — the
   honest "are we beating naive?" metric) alongside MAPE.
3. **Explicit naive baseline in the rankings** — `seasonal_naive` already exists; surface it as the
   benchmark every model must beat, and state the margin.
4. **Confidence-interval explanation** — one line in the payload explaining the band is ±1.96σ of
   holdout residuals (already true; make it explicit in the UI tooltip).
5. **Winner rationale** — a sentence: *"Holt-Winters won (MASE 0.71 < naive 1.0, SMAPE 11.2%) — it
   captures trend the naive baseline misses."*
6. **One stronger statistical model** — add **ETS** or **SARIMAX** from `statsmodels` (seasonal) as a
   5th competitor with graceful fallback if it fails to converge.

**Acceptance:** forecast payload returns MAPE+SMAPE+MASE per model, a rolling-window note, a winner
rationale, and SARIMAX/ETS appears in the tournament table.

---

## P5 — Deeper FCC typologies (your edge over generic fraud ML, feedback #7)

> Generic fraud ML is common. FCC-aware detection with named typologies is the differentiator.

**Current:** investigator covers geo / channel / structuring / large-value / temporal; NLP covers
structuring language, high-risk jurisdiction, PEP, shell-company keywords.

**Work:**
1. **Add hypotheses** to `agent/investigator.py`:
   - **Repeated round amounts** — over-representation of round-number transactions (e.g. exact
     multiples of 500/1000) vs expected.
   - **Rapid fund movement / velocity** — same entity, many transactions in a short window (needs an
     account/customer id column; degrade gracefully if absent).
2. **Tag every finding with the typology that fired** — add a `typology` field to each step
   (`structuring`, `high_risk_jurisdiction`, `round_amount`, `rapid_movement`, `velocity`,
   `large_value`, `temporal_spike`) and surface it in the memo and the UI.
3. **Tag risk-engine alerts** — in `alerts()`, annotate each alert with which typology signals it
   matched, so the queue reads as FCC scenarios, not anonymous risk scores.
4. Ensure NLP `shell company` / `nominee` / `front company` matches and PEP/sanctions text are already
   wired into the displayed signals (they are — confirm in `NLP.tsx`).

**Acceptance:** an investigation lists which named typologies fired per finding; alerts show typology
tags; a constructed round-amount dataset triggers the new hypothesis.

---

## P6 — Harden audit integrity (feedback #8)

> The chain already proves content + temporal integrity. The gap is binding to **data and code**.

**Current:** `investigator._chain()` commits `id, title, query, finding, severity, confirmed,
timestamp_utc` and folds in the previous hash. `data_validation` already produces a `dataset_hash`.

**Work:**
1. **Bind the dataset** — pass the `dataset_hash` (from `dataframe_fingerprint`) into the investigation
   and include it in the genesis/first step's hash payload. Now the chain commits to *which data*.
2. **Bind the code version** — compute a `code_version` (git short SHA, or hash of the investigator
   module source) and commit it into the chain. Now the chain commits to *which logic* ran.
3. **Bind the full result** — store and hash a `result_hash` of the *complete* query result (currently
   only `result[:6]` is kept and only `finding` is hashed). Commit the full-result hash so a doctored
   downstream result breaks the chain.
4. **Exportable verification report** — add `GET /api/agent/investigations/{id}/export` returning a
   self-contained report (memo + every step + queries + hashes + dataset_hash + code_version +
   chain head + `verified` flag) suitable for a regulator. Optionally render to PDF.

**Acceptance:** the chain head changes if the dataset, code, or any full result is altered;
`verify_chain` still passes on an untampered trace; the export endpoint returns a complete,
re-verifiable record.

---

## P7 — README "Production Gaps I Know" (feedback #9)

> Seniors trust people who can name their system's limits. Owning weaknesses reads as senior.

Add a section to `README.md` (and/or link from `ARCHITECTURE.md`'s existing debt list). For each gap,
state the limit **and the fix you'd ship**:

| Gap | Fix I'd ship |
|---|---|
| Pandas synchronous profiling ceiling | Polars/Dask or chunked streaming; the job pipeline (P1) is the first step. |
| In-memory rate limiter | Redis token-bucket shared across workers. |
| Local DuckDB single-node limit | MotherDuck / external OLAP for multi-GB datasets. |
| No real OFAC API integration | Wire the OFAC SDN list + fuzzy name matching behind the NLP matcher. |
| No human feedback loop | Analyst disposition (true/false positive) captured → retraining set. |
| No model-drift monitoring | PSI/KS on feature + score distributions, alert on drift. |
| Single-issuer 2013 card data | Validate on additional rails (wire/ACH) before any production claim. |

**Acceptance:** README has an honest, owned "Production Gaps" section; nothing in it is vague.

---

## P8 — Rehearse the technical defense (feedback #10)

Create `DEFENSE.md` (root) — surgical, fast answers to the predictable attacks:
- **Why DuckDB?** In-process OLAP, zero-config, sandboxed (`enable_external_access=False`), maps to the
  analytical datamart pattern; Postgres handles persistence.
- **Why GBM over deep learning?** Tabular + 0.17% positives → trees win; dependency-free sklearn;
  XGBoost+Optuna is roadmap, not needed for this data.
- **Why PR-AUC?** With 0.17% positives, ROC-AUC is optimistic; PR-AUC reflects the precision/recall
  trade-off the analyst queue actually lives on.
- **What does SHAP prove?** Exact (TreeSHAP) per-prediction attribution → deposition-grade "why."
- **How would this scale?** Job pipeline → async workers → Polars/MotherDuck → Redis limiter (see P7).
- **What fails first in production?** Synchronous profiling under concurrent uploads (P1 addresses it).
- **Where did AI help and where not?** Honest, specific — scaffolding/boilerplate yes; the honesty
  thesis, the typology logic, and the audit-chain design were your calls.

**Acceptance:** you can answer all seven in under 30 seconds each without notes.

---

## Definition of done (the 9.5 bar)

- [ ] P0: zero metric mismatches, zero placeholders — every number agrees with the live API.
- [ ] P1: upload → `job_id` → polled progress → persisted, auditable failures; data-quality score on every dashboard.
- [ ] P2: `MODEL_CARD.md` exists; precision@k, recall@k, calibration, Brier, threshold logic in the API and UI.
- [ ] P3: per-alert SHAP waterfall + plain-English "why flagged" sentence.
- [ ] P4: rolling-window backtest, MAPE+SMAPE+MASE, naive benchmark margin, SARIMAX/ETS, winner rationale.
- [ ] P5: named FCC typologies (incl. round-amount + velocity), every finding/alert tagged.
- [ ] P6: chain binds dataset_hash + code_version + full result_hash; exportable verification report.
- [ ] P7: README "Production Gaps I Know" with a fix per gap.
- [ ] P8: `DEFENSE.md` and a rehearsed, surgical oral defense.
- [ ] All tests green; test count consistent everywhere; new endpoints covered by new tests.

> **The harshest test:** a senior WK data scientist greps for the usage of every "feature" you claim.
> After this plan, every claim has a live endpoint, a test, and a number that agrees with every other
> number. That is what stops them wondering *what is real* — and that is the 9.5.
