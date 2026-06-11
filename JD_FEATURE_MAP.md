# Verita ↔ Wolters Kluwer JD — Feature Coverage Map

> **Living document.** Updated every time a feature lands. Legend: ✅ shipped & verified · 🔨 in build · ⬜ planned · ❌ not covered yet.
> JD source: "Intern – Data Science", Wolters Kluwer FSS/FCC organization.

---

## 1. JD Responsibility Areas → Verita Features

### R1. AI-Driven Dashboards & Data Solutions
| JD keyword / phrase | Verita feature | Status |
|---|---|---|
| "Develop intelligent dashboards" | Auto-Dashboard Studio — upload → instant dashboard, chart recommendation engine | ✅ |
| "reporting solutions using Python" | FastAPI + Pandas backend powering every panel | ✅ |
| "Tableau/Power BI" | Power-BI-style editable canvas (drag/resize/remove panels), no license needed | ✅ |
| "advanced visualization techniques" | ECharts suite: KPI, line, donut, bar, histogram, heatmap, force-graph | ✅ |
| "automated data pipelines" | Upload → profile → recommend → render pipeline; in-memory dataset store | ✅ |
| "real-time business insights" | Auto-Insights engine ("Key Findings") computed live per upload | ✅ |
| "predictive analytics" (in dashboards) | Forecast overlay on time-series panels (dashed projection + 95% CI) | ✅ |
| "anomaly detection" (in dashboards) | IsolationForest anomaly scores in Risk alert queue; outlier flags in profile | ✅ |

### R2. Predictive Modeling & Forecasting
| JD keyword / phrase | Verita feature | Status |
|---|---|---|
| "machine learning … models" | GradientBoosting fraud classifier (scikit-learn), honest held-out ROC-AUC 0.865 | ✅ |
| "time-series forecasting models for Revenue, Volume, Cost" | Forecast overlay: trend + weekly seasonality, 14-period projection w/ CI | ✅ |
| "statistical modeling" | Welch t-tests, Pearson r, eta², skew/outlier analytics in insights | ✅ |
| "feature engineering" | 8-feature risk pipeline (amount_log, velocity, channel/geo/kyc risk, …) | ✅ |
| "improve forecasting accuracy" | Backtest MAPE on held-out periods, shown next to every forecast | ✅ |

### R3. Business Optimization & Data Science
| JD keyword / phrase | Verita feature | Status |
|---|---|---|
| "identify trends, risks, and optimization opportunities" | Trend insights (+41% growth), risk concentration (RU 1.9×), dominance findings | ✅ |
| "predictive and prescriptive models" | Risk engine (predictive) + recommended actions in NLP (File SAR / Investigate) | ✅ |
| "hypothesis testing" | Welch t-test with p-values surfaced in Key Findings | ✅ |
| "scenario analysis" | "What changed?" period comparison (first vs second half, biggest movers) + Time Machine playback | ✅ |
| "data-driven business case development" | Executive summary auto-narrative | ✅ |

### R4. Advanced Analytics & Data Engineering
| JD keyword / phrase | Verita feature | Status |
|---|---|---|
| "deep exploratory data analysis (EDA)" | Profile Rail: per-column stats, distributions, missingness, quality score | ✅ |
| "data mining" | Relationship Map (Pearson + η² discovery across all columns) | ✅ |
| "statistical analysis on large enterprise datasets" | 200k-row sampling guard; vectorized Pandas/NumPy throughout | ✅ |
| "Data Lakes and Datamarts … extraction, transformation" | DuckDB analytical engine over uploaded data; semantic type coercion layer | ✅ |
| "SQL" | SQL Playground — real DuckDB queries on the upload, read-only guarded | ✅ |
| "NLP … techniques" | Compliance NLP analyzer: entities, BSA/AML/OFAC/FinCEN matching, risk signals | ✅ |
| "Generative AI" | NL→SQL translator; auto-generated executive summary & insight narratives | ✅ |
| "intelligent data processing and automation" | Semantic column inference (measure/dimension/temporal/geo/id/bool) | ✅ |

### R5. Cross-Functional Collaboration
| JD keyword / phrase | Verita feature | Status |
|---|---|---|
| "deliver AI-powered solutions" (communication) | README, this map, scripted demo narrative | 🔨 |
| "stakeholder … reporting systems" | One-click PDF report (print-ready: title, summary, findings + evidence) | ✅ |
| "drive … AI adoption" | "How was this computed?" — every insight shows its formula (trust/auditability) | ✅ |

## 2. Key Skills section → Evidence
| JD skill | Evidence in Verita | Status |
|---|---|---|
| Python (Pandas, NumPy, Scikit-learn) | Entire backend: profiling, insights, ML, forecasting | ✅ |
| ML / statistical analysis / predictive modeling fundamentals | GBM + IsolationForest, ROC/PR analysis, threshold tuning, t-tests | ✅ |
| Data preprocessing & EDA | Type coercion, missing-value analysis, profiling engine | ✅ |
| Structured AND unstructured data | CSV/Excel (structured) + free-text compliance narratives (unstructured NLP) | ✅ |
| NLP / GenAI / LLMs exposure | NLP analyzer + NL→SQL + auto-narratives | ✅ |
| SQL, APIs, connecting data sources | DuckDB SQL playground; REST API (FastAPI, OpenAPI docs at /docs) | ✅ |
| Tableau/Power BI-style visualization | Auto-dashboard canvas + editable grid | ✅ |
| Analytical thinking / problem solving | Honest metrics philosophy; evidence trails on every claim | ✅ |
| Communication & collaboration | Demo script + documentation | 🔨 |

---

## 3. ⚠ KEYWORDS NOT YET COVERED (the gap list — keep shrinking this)

| JD keyword | Planned coverage | Status |
|---|---|---|
| "Tableau/Power BI" (named-tool literacy) | Covered by the editable-canvas lookalike; talking point: "I rebuilt the experience, not the license" | ⚠ partial by design |
| "Data Lakes" (named tech) | DuckDB stands in as the analytical store; call out in README | ⚠ partial by design |
| Communication deliverables | Final README + scripted 3-minute demo narrative | 🔨 last remaining |

**Everything else in the JD now has a shipped, verified feature behind it.**

## 4. The 11 Jaw-Drop Features — build status
| # | Feature | Status |
|---|---|---|
| 1 | X-Ray scan upload sequence | ✅ |
| 2 | Smart title header + typewriter subtitle | ✅ |
| 3 | Executive Summary card | ✅ |
| 4 | Auto geo-map (world choropleth, geo column auto-detected) | ✅ |
| 5 | Forecast overlay on time panels (backtest MAPE + 95% CI) | ✅ |
| 6 | Statistical tests in insights (Welch t-test, p-values) | ✅ |
| 7 | Time Machine scrubber (play the dashboard through time) | ✅ |
| 8 | "What changed?" comparison (period diff + biggest movers) | ✅ |
| 9 | SQL → pin to dashboard | ✅ |
| 10 | "How was this computed?" evidence trails | ✅ |
| 11 | One-click PDF report (print-ready) | ✅ |

**11 / 11 shipped and browser-verified.**

*Last updated: all 11 jaw-drop features landed; remaining gap = final README + demo script.*
