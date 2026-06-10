# Verita — Financial Crime & Compliance Intelligence

> Upload any financial dataset → get an instant, editable, BI-grade dashboard.
> Score transactions for risk with a **real** ML model. No Power BI license, no learning curve.

Verita is a focused **Financial Crime & Compliance (FCC)** analytics platform built around one
idea: *the insight should come to the analyst, not the other way around.* A compliance officer
shouldn't need to learn a BI tool to understand their data — they upload it, and Verita figures
out the best way to show it.

Built to map 1:1 against the Wolters Kluwer FSS/FCC Data Science role.

---

## Three pillars (all real — no fabricated metrics)

### 1. Auto-Dashboard Studio ⭐ (the differentiator)
Upload a CSV/Excel file. Verita profiles every column with Pandas (type inference, cardinality,
missingness, distributions, outliers, correlations), then a **recommendation engine** selects the
charts that best explain *this specific dataset* — KPIs, time-series, categorical breakdowns,
distributions, a correlation heatmap, and automatic anomaly call-outs. The result renders as an
**editable Power-BI-style canvas**: drag, resize, swap dimensions/measures, export. Zero BI
knowledge required.

### 2. FCC Risk & Anomaly Engine
A genuine scikit-learn pipeline on **real public fraud data**. Honest evaluation — ROC-AUC,
precision-recall (because the classes are 99.8% / 0.2% imbalanced), confusion matrix, an
adjustable decision threshold, and **real** feature importance. IsolationForest surfaces anomalies;
an AML-style alert queue ranks the riskiest transactions.

### 3. NLP Insight (the GenAI "plus")
Ask the data a question in plain English and get the right chart/filter back. A natural-language
layer over the dashboard — the JD's NLP/GenAI differentiator, implemented honestly (works without
an external LLM key; optionally enhanced by one).

---

## Why these choices map to the JD

| JD requirement | Where Verita delivers it |
|---|---|
| AI-driven dashboards, automated reporting | Auto-Dashboard Studio (Pillar 1) |
| Predictive modeling & forecasting | FCC Risk Engine — real scikit-learn (Pillar 2) |
| Anomaly detection | IsolationForest + statistical outliers (Pillars 1 & 2) |
| EDA, data mining, statistics | Automated profiling engine (Pillar 1) |
| SQL / Datamarts | DuckDB SQL over uploaded data |
| Python: Pandas / NumPy / Scikit-learn | The entire backend |
| NLP / Generative AI (a plus) | NL-to-chart layer (Pillar 3) |
| Communication | This README + a scripted demo narrative |

---

## Tech stack
- **Backend:** FastAPI · Pandas · NumPy · scikit-learn · DuckDB
- **Frontend:** React + TypeScript + Vite · ECharts · react-grid-layout
- **Data:** Credit Card Fraud Detection (ULB Machine Learning Group) — real, anonymized.
  A small sample ships in `data/`; drop in the full Kaggle `creditcard.csv` for the full demo.

## Honesty policy
Every number shown in Verita is computed from real data at request time. There are no hardcoded
"model metrics", no `random()` drift charts, and no placeholder explainability. If something is a
sample or synthetic, it is labeled as such in the UI.

## Status
🚧 In active build. See `IMPLEMENTATION.md` for the day-by-day plan.
