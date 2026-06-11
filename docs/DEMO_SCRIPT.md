# Verita — 3-Minute Demo Script

A tight, rehearsed walkthrough for an interview or recording. Total ~3 minutes. The throughline:
**"the insight comes to the analyst, and every number can show its work."**

> Setup before you start: backend on `:8000`, frontend on `:5175`, and `data/sample_transactions.csv`
> handy. Open on the **landing page**.

---

### 0:00 — The hook (15s)
> "Power BI's real cost isn't the charts — it's the first hour of setup before you see one. Verita
> collapses that to a single file drop. And it's built for financial crime and compliance — the FSS/FCC
> domain. Let me show you."

Click **Upload a dataset**.

### 0:15 — The X-ray scan (20s)
Drop `sample_transactions.csv`.
> "Watch the scan — it's not a fake spinner. It's reporting what it actually found: 9 columns,
> semantic types inferred, a temporal column detected, data quality scored. This is the analyst's
> first hour, done in two seconds."

### 0:35 — The dashboard + profile rail (25s)
> "It de-slugged the filename into a real title. On the right is an instant data-quality audit —
> a quality grade with the exact deductions, and every field's type, completeness, and stats. And the
> dashboard it chose is **editable** — I can drag, resize, remove. My layout sticks."

Drag a panel; remove one.

### 1:00 — Key Findings + "show your work" (30s)  ⭐ the money moment
Click **Key Findings**.
> "This is the part nobody expects. Plain-English findings, computed live — including a **Welch
> t-test with a p-value**. The job description literally lists hypothesis testing. And here's the
> trust move—"

Click **"how was this computed?"** on the t-test insight.
> "—every claim shows the exact `scipy` call behind it. In compliance, auditability *is* the product.
> No black box."

Point at the **What changed?** card.
> "And it auto-compares periods — the biggest movers, ranked."

### 1:30 — Forecast + Relationships + Map (30s)
Back to **Dashboard**, toggle **Forecast** on the time chart.
> "Forecasting Revenue/Volume — another JD bullet. But notice: it ran a **three-model tournament**,
> picked the winner by backtest MAPE on held-out data, and tells me the score. Honest accuracy."

Click **Relationships**, drag a node.
> "It mined every column relationship — correlation and categorical influence — and refuses to draw
> ones that aren't statistically real."

Click **Map**.
> "A geo column was detected, so a world map just... appeared."

### 2:00 — SQL + NL→SQL (25s)
Click **SQL**.
> "And it's real SQL — DuckDB over the uploaded file. I'll ask in plain English—"

Type *"average amount by channel top 5"* in the NL bar → **→ SQL** → it runs.
> "—it writes the SQL, runs it in milliseconds. I can pin any result straight onto the dashboard.
> Read-only and sandboxed, with an injection test corpus behind it."

### 2:25 — Risk Engine (25s)
Sidebar → **Risk Engine**.
> "Pillar two: a real scikit-learn fraud model. These metrics are **held-out**, not training scores.
> Watch the threshold slider — precision and recall trade off live. And the alert queue's top flags
> are genuinely fraud. ROC-AUC 0.87, honest."

Drag the threshold slider.

### 2:50 — Close (10s)
> "Three pillars, eleven flagship features, 72 tests, full CI/Docker — and a `JD_FEATURE_MAP` that
> traces every line of the job description to a working feature. Every number you saw was real."

---

## One-liners to have ready (likely questions)

- **"Is the data real?"** — "The risk model trains on a labeled FCC dataset; the sample is synthetic
  *with real signal*, and it's labeled synthetic in the UI. The architecture is built so dropping in a
  real Kaggle fraud file just works. Nothing is faked — synthetic-but-honest, never fabricated."
- **"Why not Prophet/ARIMA for forecasting?"** — "I ran a 3-model tournament (trend+seasonality, Holt,
  seasonal-naive) selected by backtest MAPE. The framework is pluggable — Prophet would slot in as a
  fourth competitor. I prioritized honest model selection over one heavyweight model."
- **"Is the SQL safe?"** — "SELECT-only, comments blocked, catalog access denied, and DuckDB runs with
  external file access disabled at the engine level. There's an adversarial injection test corpus."
- **"Where's the GenAI?"** — "Real and optional: Gemini enhances the summary and NL→SQL when a key is
  set, with a deterministic fallback so it never becomes a hidden dependency. `/api/health` reports
  which mode is live."
