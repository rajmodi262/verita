# The Rapid-Fire Deck

*50 questions, one-line answers, max 12 words each. Print double-sided on ONE A4.
Read on the way there. Do not read anything else that morning.*

---

## SIDE A

| # | Q | A |
|---|---|---|
| 1 | What is Verita? | FCC analytics where every number shows its work. |
| 2 | The one feature to demo first? | Drop a CSV — instant editable dashboard. |
| 3 | The flagship? | The hash-chained autonomous Investigator. |
| 4 | Why hash chains? | Tamper-evidence: doctor a step, the chain snaps. |
| 5 | Backend stack? | FastAPI, pandas, scikit-learn, SciPy, DuckDB, Postgres. |
| 6 | Frontend stack? | React 18, TypeScript, Vite, ECharts, Three.js. |
| 7 | Test count? | 82 — 72 pytest, 10 Vitest, green in CI. |
| 8 | Model? | GradientBoosting + IsolationForest, sklearn. |
| 9 | Headline metric? | Held-out ROC-AUC 0.913, PR-AUC 0.65. |
| 10 | Why not accuracy? | 0.17% fraud — "never fraud" scores 99.8%. |
| 11 | Training data? | ULB credit-card dataset, 284,807 real transactions. |
| 12 | Why two databases? | DuckDB computes, Postgres remembers. |
| 13 | SQL console security? | Engine sandbox + SELECT-only guard + injection corpus. |
| 14 | Proudest test? | The injection corpus — caught a real vulnerability. |
| 15 | Worst bug? | SQL file-read hole. Fixed at engine level. |
| 16 | GenAI role? | Narrates only. Engines compute. Nothing to hallucinate. |
| 17 | Gemini dies mid-demo? | Deterministic fallback; /api/health reports the mode. |
| 18 | Forecasting approach? | Three-model tournament, backtest MAPE picks winner. |
| 19 | Statistical tests? | Welch t-test, Pearson, eta-squared — p-values shown. |
| 20 | Hypothesis testing where? | Key Findings — clickable formula on every claim. |
| 21 | Boot time trick? | joblib-persisted model: 0.36s, not 21s retrain. |
| 22 | First scaling bottleneck? | Synchronous profiling under concurrent uploads. |
| 23 | The fix? | Async job queue with progress events. |
| 24 | Fabricated numbers in product? | Zero. Architecturally zero. |
| 25 | What does the chain NOT prove? | Execution and authorship — it proves integrity. |

## SIDE B

| # | Q | A |
|---|---|---|
| 26 | AI's role in the build? | Drafted and accelerated; I judged and verified. |
| 27 | Your verification rule? | Can't explain it line-by-line? It doesn't ship. |
| 28 | AI code you rejected? | A failing SQL guard; a training-set metric swap. |
| 29 | Biggest technical weakness? | No production operations experience. Yet. |
| 30 | Known frontend debt? | Inline styles — token migration 72% complete. |
| 31 | Known backend debt? | Service layer extracted from routers — ongoing. |
| 32 | What you'd build next? | SHAP waterfall UI panel — data is there, chart pending. |
| 33 | V2 in three words? | Tuned, asynchronous, deployed. |
| 34 | Hardest decision? | Rebuilding the investigator honest. Lost a week. |
| 35 | Why deterministic-first agent? | Regulators can re-run plans, not vibes. |
| 36 | Done means? | A distruster could verify it without me. |
| 37 | Learning style? | Artifact-first, adversarial-always. |
| 38 | Team role? | The clarifier — fuzz into checkable sentences. |
| 39 | Manage me how? | Context and bluntness. |
| 40 | NLP analyzer output? | Signals + score + recommended human action. |
| 41 | Who files the SAR? | A human. Always a human. |
| 42 | The JD coverage? | Every line mapped to a shipped feature. |
| 43 | Demo if Wi-Fi dies? | Fully local. Rehearsed with networking off. |
| 44 | One-click run? | start.bat — both servers, zero config. |
| 45 | Why FCC specifically? | The one domain where explainability is law. |

### THE FINAL FIVE — *larger font in your head; you WILL be asked these*

| # | Q | A |
|---|---|---|
| **46** | **This project in one word?** | **Auditable.** |
| **47** | **Why Wolters Kluwer?** | **You sell trust. I build trustworthy.** |
| **48** | **Your superpower?** | **Turning job descriptions into working software.** |
| **49** | **What do you want from this internship?** | **The lessons that don't fit in a solo repo.** |
| **50** | **Why should we pick you?** | **Others promised. I shipped — for you, specifically.** |

---

### SIDE B — Technical Deep-Dive Additions (V1.1)

| # | Q | A |
|---|---|---|
| **51** | **Can you explain a specific prediction?** | **SHAP waterfall. Base 0.17%. amount_log adds +0.34. kyc_risk adds +0.28. Math, not vibes.** |
| **52** | **Is the model stable across different splits?** | **5-fold CV: mean ± std. 0.913 held-out is consistent — not a lucky partition.** |
| **53** | **TreeSHAP vs LIME?** | **TreeSHAP is exact for trees — satisfies Shapley axioms. LIME approximates locally. We use exact.** |
| **54** | **What changed after your own audit?** | **Hero chip 0.97→0.913. SHAP activated. Chain timestamps added. Service layer extracted. 7 changes, all self-caught.** |
| **55** | **How do you know the 0.913 isn’t a lucky split?** | **5-fold CV. Same seed, 5 different folds, mean ± std. If consistent: credible. If not: honest finding.** |
