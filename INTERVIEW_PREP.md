# Verita — Interview Preparation (150 Q&A)

> Everything here maps to code you can open. References use
> `file` and the function/method name, e.g. `risk_engine.py → train()`. Numbers quoted are what
> the code produces on the **real ULB credit-card dataset** (150k-row seeded sample, 0.17% fraud)
> unless stated. Reproduce any of them with the commands in [`README.md`](README.md).

**A 30-second pitch to memorise:** *"Verita is a real fraud engine — XGBoost plus IsolationForest —
trained on the ULB credit-card dataset, held-out ROC-AUC ≈ 0.99 / PR-AUC ≈ 0.88. But the novelty
isn't the algorithm; it's that every decision is defensible: each score ships SHAP reason codes, the
threshold is chosen by expected-dollar-loss rather than a textbook 0.5, a PSI monitor watches for
drift, and the whole compliance investigation is hash-chained so a regulator can reproduce and
audit it. I built it for FCC because that's the one domain where you can't act on a number you
can't defend."*

> ✅ **Reproducibility note:** every metric in this doc is what the code produces on the 150k ULB
> sample (`VERITA_ULB_SAMPLE`); raise that to train on more. Quote numbers from a fresh run, never
> from memory — that's the honesty policy in practice.

---

## A. Project overview & motivation

**Q1. What is this project in one sentence?**
A financial-crime fraud-detection engine that scores transactions with real ML *and* makes every
decision explainable and auditable — model in `backend/app/ml/`, served via FastAPI.

**Q2. Why fraud detection specifically?**
It's the canonical imbalanced-classification problem with a real cost asymmetry and a hard
regulatory explainability requirement — so it lets me show modelling, evaluation, and governance,
not just `model.fit()`.

**Q3. What's the headline novelty?**
Not the algorithm — the *defensibility layer*: SHAP reason codes per case, a cost-optimal decision
threshold, PSI drift detection, and a hash-chained audit trail (`agent/investigator.py → _chain()`).

**Q4. Who is the user?**
A fraud/AML analyst working an alert queue, and behind them a compliance officer and a regulator
who must be able to reproduce any decision.

**Q5. What does the system output?**
A fraud probability per transaction, a ranked alert queue (`risk_engine.py → alerts()`), per-case
reason codes (`model_explainer.py → reason_codes()`), and held-out performance metrics
(`metrics()`).

**Q6. What tech stack?**
Python · FastAPI · pandas · NumPy · scikit-learn · SciPy · DuckDB · SHAP · joblib on the backend;
React + TypeScript + ECharts on the front end.

**Q7. Why FastAPI?**
Async-friendly, automatic OpenAPI docs at `/docs`, Pydantic validation, and clean dependency
injection — and it's what production Python ML services commonly use.

**Q8. How is the project structured?**
Layered: routers (HTTP) → services (business logic) → engine (ML). See `routers/risk.py` →
`services/risk_service.py` → `ml/risk_engine.py`. Each layer has one responsibility and is tested
in isolation.

**Q9. What's the "honesty policy"?**
Every number is computed from data at request time — no hardcoded metrics, no `random()` charts.
Metrics are always **held-out**, never training-set. It's the project's design spine.

**Q10. If you had to defend one design decision, which?**
Computing and returning *held-out* metrics on every `/api/risk/metrics` call rather than caching a
flattering training-set number — it costs a little compute but it's honest.

---

## B. Data & features

**Q11. What dataset do you train on?**
The real **ULB credit-card fraud dataset** (284,807 transactions, 0.172% fraud) if
`data/creditcard.csv` is present (`data.py → _load_ulb()`); otherwise a Kaggle 5M-row fraud set, or
a labelled synthetic fallback.

**Q12. Why a synthetic fallback at all?**
So the app runs zero-config for a reviewer who hasn't downloaded a 150 MB Kaggle file. The
synthetic data has *real* signal — fraud is a noisy logistic function of risk drivers
(`data.py → _generate_synthetic()`), so metrics are honest measurements, not props.

**Q13. How do you avoid lying about which data trained the model?**
Every ML response carries `data_source` (`"ulb_creditcard"` | `"kaggle_financial_fraud"` |
`"synthetic_fcc"`) and a human description, surfaced in the UI. See `metrics()`.

**Q14. What are the ULB features?**
28 PCA components `V1…V28` plus `Time` and `Amount`. The PCA is the dataset authors' privacy
measure — the original features are confidential.

**Q15. If the features are anonymized PCA, how can you explain a prediction?**
Honestly. The reason-code layer (`model_explainer.py → _describe()`) names the driving component
(e.g. "V14") and states plainly that its real-world meaning is intentionally hidden — it does *not*
fabricate a story. On semantic datasets (synthetic/Kaggle) it gives full business reasons.

**Q16. What engineered features do you build for the Kaggle set?**
`amount_log`, `hour_of_day`, `velocity_score`, `geo_anomaly_score`, `spending_deviation`,
`mins_since_last_tx`, one-hots for channel/type/device, and frequency-encoded merchant/location
(`data.py → _load_kaggle_fraud()`).

**Q17. Why `log1p(amount)` instead of raw amount?**
Transaction amounts are heavily right-skewed (log-normal). `log1p` compresses the tail so the model
isn't dominated by a few huge values, and handles zero safely. See `amount_log`.

**Q18. Why frequency-encode merchant/location instead of one-hot?**
They're high-cardinality (hundreds of values); one-hot would explode dimensionality. Frequency
encoding keeps it to one column and captures "how common is this category" — rare categories often
correlate with fraud.

**Q19. Why does `amount` matter for fraud?**
Two ways: very large amounts move more value per fraudulent event (and are a laundering staple),
and unusual amounts relative to a customer's norm signal account takeover. See glossary in
`model_explainer.py`.

**Q20. Why does `hour_of_day` matter?**
Fraud rings operate off-hours when monitoring staff are thin; a night-time timestamp is a weak but
real signal. Captured as `hour_of_day`.

**Q21. Why `velocity` (transactions per window)?**
Rapid bursts indicate card-testing or fast cash-out before detection — a classic signal. See
`velocity_24h` / `velocity_score`.

**Q22. Why `geo_risk` / `geo_anomaly`?**
Some jurisdictions carry elevated AML/sanctions exposure, and spending far from a customer's normal
footprint is a hallmark of takeover.

**Q23. Why `kyc_risk`?**
Weakly verified customers (low KYC tier) are easier to abuse for laundering, so the tier is
predictive. `data.py → KYC_RISK`.

**Q24. Why `channel_risk`?**
Irreversible rails (crypto, wire) are favoured by fraudsters over reversible cards. Encoded via
`CHANNEL_RISK` in `data.py`.

**Q25. Why `is_cross_border`, and why the interaction term?**
Cross-border flows are harder to trace. In the synthetic generator the strongest term is
`is_cross_border × geo_risk` — cross-border *into a risky geography* (`_generate_synthetic()`),
reflecting that the combination is worse than either alone.

**Q26. How big is the training sample and why cap it?**
150,000 rows (`VERITA_ULB_SAMPLE`), seeded. The cap keeps GBM training to ~1–2 min while preserving
the natural fraud rate via a seeded sample (`_load_ulb()`).

**Q27. Do you preserve the fraud rate when sampling?**
Yes — a plain seeded `df.sample` preserves the 0.17% base rate in expectation; for Kaggle it's a
DuckDB `reservoir` sample. We never re-balance the *evaluation* data.

**Q28. How do you handle missing values?**
Engineered numeric features use `pd.to_numeric(..., errors="coerce").fillna(...)` so a malformed cell
degrades to a sensible default rather than crashing (`_load_kaggle_fraud()`).

**Q29. Is there target leakage?**
No. Features are transaction attributes available at decision time; the label `is_fraud`/`Class` is
dropped from `X` (`data.py`). The held-out split is created before any fitting.

**Q30. Could `Time` leak in ULB?**
`Time` is seconds since the first transaction in the capture — a batch artefact, not a real-world
feature. It's low-importance here; in production I'd drop it or replace it with a genuine timestamp.

---

## C. Model choice & training

**Q31. What model classifies fraud?**
`XGBClassifier` (XGBoost gradient boosting) — `risk_engine.py → train()` — with `scale_pos_weight`
set to the negative/positive ratio to handle the 0.17% imbalance in the loss itself.

**Q32. Why gradient boosting over logistic regression?**
Boosting captures non-linear feature interactions (e.g. cross-border × geo) that a linear model
can't without manual interaction terms, and it handles mixed-scale features without heavy
preprocessing. It typically wins on tabular fraud data.

**Q33. Why gradient boosting over a random forest?**
Boosting fits residuals sequentially, usually giving better ranking (AUC) on imbalanced tabular
data than bagging, at similar interpretability via SHAP.

**Q34. Why not a neural network?**
On tabular data of this size NNs rarely beat gradient boosting, need more tuning/data, and are
harder to explain — a poor trade in a domain that *requires* explanation.

**Q35. Why XGBoost specifically over sklearn's GradientBoosting or LightGBM?**
XGBoost gives me `scale_pos_weight` to put the class imbalance directly in the loss, regularised
histogram boosting that lifted held-out ROC-AUC from ~0.83 (sklearn GBM) to **~0.99** on the same
data, and a numerically stable exact TreeExplainer (sklearn GBM produced billion-scale SHAP here —
Q90). LightGBM would be a fine alternative; XGBoost is the battle-tested default for tabular fraud.

**Q36. What are your hyperparameters and why?**
`n_estimators=400, max_depth=5, learning_rate=0.08, subsample=0.85, colsample_bytree=0.8,
scale_pos_weight=neg/pos, eval_metric="aucpr", tree_method="hist"` (`train()`). Moderate depth +
low learning rate + row/column subsampling regularise against overfit; `aucpr` optimises the metric
that matters under imbalance; `scale_pos_weight` rebalances the rare class.

**Q37. Why `random_state=42` everywhere?**
Determinism — the split, the model, the CV folds, and the SHAP background are all seeded so results
are byte-reproducible, which the honesty policy demands.

**Q38. How do you split train/test?**
`train_test_split(test_size=0.25, stratify=y, random_state=42)` — stratified so the 0.17% fraud
rate is identical in train and test (`train()`).

**Q39. Why stratify?**
With 0.17% positives, a random split could hand one side far too few frauds. Stratification keeps
the class ratio constant so metrics are stable and comparable.

**Q40. How long does training take and how do you avoid paying it repeatedly?**
~1–2 min once; the fitted engine is pickled to `models/risk_engine.joblib` (`_save()`) and reloaded
in ~2 s on later boots (`_load()`).

**Q41. What happens if a better dataset appears after caching?**
`get_engine()` compares the cached `data_source` to `expected_source()`; if a real dataset now
exists where the cache was synthetic, it invalidates the cache and retrains automatically.

**Q42. Is training thread-safe?**
Yes — `get_engine()` trains under a `threading.Lock` with double-checked locking, so concurrent
first requests don't train twice.

**Q43. What does IsolationForest do here?**
Unsupervised anomaly scoring — it learns "normal" and flags outliers without labels, feeding an
anomaly score into the alert queue (`alerts()`). It's a second opinion independent of the labels.

**Q44. Why combine a supervised and an unsupervised model?**
The classifier catches *known* fraud patterns; IsolationForest can surface *novel* anomalies the
labels never described. Defence in depth.

**Q45. How is IsolationForest configured?**
`n_estimators=150, contamination=max(y.mean(), 0.005)` — contamination tied to the real fraud rate
with a small floor so it's never zero (`train()`).

**Q46. Do you scale features?**
Not for the tree models — gradient boosting and IsolationForest are scale-invariant to monotone
transforms, so standardisation buys nothing. `amount` is log-transformed for distributional, not
scaling, reasons.

**Q47. How do you know the model actually learned, not memorised noise?**
Held-out AUC well above 0.5, a confirming 5-fold CV (`cross_validate()`), and a top alert queue
that over-indexes on real fraud (asserted in `test_risk_engine.py → test_alerts_rank_and_map_back`).

**Q48. Walk me through the end-to-end flow from raw row to decision.**
`load_dataset()` builds `X`/`y` → stratified split → GBM `fit` → `predict_proba` on the held-out set
→ `metrics()` thresholds those probabilities into a confusion matrix → `alerts()` ranks them →
`reason_codes()` explains each. (`risk_engine.py`, `model_explainer.py`.)

**Q49. Where exactly is the model trained in code?**
`risk_engine.py → RiskEngine.train()` — the `GradientBoostingClassifier(...).fit(X_tr, y_tr)` call.

**Q50. How would you retrain on new labels?**
Drop the new file in `data/` (or point `VERITA_FRAUD_DATA` at it), delete the joblib, and the next
request retrains via `get_engine()`. A scheduled retrain job is the production version.

---

## D. Class imbalance

**Q51. How imbalanced is the data?**
~0.17% fraud on ULB — roughly 1 in 580 transactions. Severe.

**Q52. Why is accuracy a useless metric here?**
A model that predicts "never fraud" scores 99.83% accuracy and catches zero fraud. Accuracy is
dominated by the majority class, so I never report it as the headline.

**Q53. What metrics do you use instead?**
ROC-AUC, **PR-AUC** (the one that matters under imbalance), precision, recall, F1, and the full
confusion matrix — all in `metrics()`.

**Q54. Why PR-AUC over ROC-AUC for imbalanced fraud?**
ROC-AUC can look great even with many false positives because true negatives dominate the FPR.
Precision-recall focuses on the positive (fraud) class, so PR-AUC reflects real-world usefulness.

**Q55. How do you handle the imbalance — resampling?**
I deliberately *don't* SMOTE/oversample the training data here; gradient boosting handles moderate
imbalance, and I'd rather move the **decision threshold** (Q61) than distort the data distribution.
Resampling is on the table for XGBoost via `scale_pos_weight`.

**Q56. Why not just oversample the minority class?**
Synthetic oversampling (SMOTE) can create unrealistic fraud points and inflate optimistic metrics if
applied before the split. If used, it must be inside CV folds only. I chose threshold-tuning as the
cleaner lever.

**Q57. Doesn't stratified splitting "handle" imbalance?**
No — it keeps the *ratio* honest across splits; it doesn't make the model catch more fraud. That's
what the threshold and class-aware metrics are for.

**Q58. How does imbalance affect your threshold choice?**
Hugely — the cost-optimal threshold lands around **0.005**, not 0.5 (Q63), because with so few
positives you must lower the bar to catch them, accepting more false positives whose unit cost is
low.

**Q59. How do you make sure the test set has enough fraud to be meaningful?**
Stratification guarantees ~0.17% of the 25% test split are frauds; `test_risk_engine.py` asserts
`fraud_in_test > 0` and that confusion-matrix totals reconcile.

**Q60. If asked "is 0.17% enough positives to learn from?"**
On 150k rows that's ~260 frauds in train — enough for gradient boosting to find signal, confirmed by
held-out AUC and stable CV. More data would help recall further.

---

## E. Threshold & cost-sensitivity

**Q61. What threshold do you classify fraud at, and why not 0.5?**
0.5 silently assumes a false negative and a false positive cost the same. In fraud they don't, so I
compute the **expected-cost-minimising** threshold (`model_explainer.py → optimal_threshold()`),
not 0.5.

**Q62. How does the cost-optimal threshold work mathematically?**
It sweeps thresholds and picks `argmin_t [ cost_fn·FN(t) + cost_fp·FP(t) ]` — straight decision
theory. Returns the optimal cut-off, its confusion matrix, and the dollars saved vs 0.5.

**Q63. What threshold does it actually pick on your data?**
About **0.015** with the default cost matrix (`$500` per missed fraud, `$5` per false alarm) — it
casts a wider net than 0.5 (higher recall, lower precision) for **~19% lower expected loss**.
Reproduce: `GET /api/risk/optimal-threshold`.

**Q64. Where do the `$500` / `$5` costs come from?**
They're configurable inputs, not magic — a missed fraud costs the charged-back value plus
investigation/write-off; a false alarm costs a few minutes of analyst time. The endpoint takes
`cost_fn` and `cost_fp` query params so a bank plugs in its own numbers.

**Q65. What if the bank changes its risk appetite?**
Raise `cost_fp` (false alarms hurt more → threshold rises, fewer alerts) or raise `cost_fn` (misses
hurt more → threshold falls, wider net). The math re-optimises instantly. See
`test_model_explainer.py → test_optimal_threshold_shifts_lower_when_misses_cost_more`.

**Q66. Why expose a manual threshold *slider* too if you auto-optimise?**
Analysts and regulators want to *see* the precision/recall trade-off, not just trust a number. The
slider drives `metrics(threshold)`; the optimiser recommends where to stand on that curve.

**Q67. How do you guarantee lowering the threshold can't reduce recall?**
It's monotone by construction and asserted in `test_risk_engine.py → test_threshold_monotonicity`
(recall at 0.2 ≥ recall at 0.8).

**Q68. Is the cost-optimal threshold fit on the test set — isn't that leakage?**
It's chosen on the *held-out* set, the same set the reported metrics use, so it's an honest estimate
of deployment cost — not refit on training data. In production you'd select it on a validation fold
and confirm on a fresh holdout.

**Q69. What's the single number that sells the threshold work to a CFO?**
"~19% lower expected fraud loss than a naive 0.5 cut-off, on held-out data" — and it's recomputed
from *their* cost inputs, not asserted. (The percentage grows as the cost asymmetry widens.)

---

## F. Metrics & evaluation

**Q70. What ROC-AUC / PR-AUC do you get?**
On the 150k ULB sample: **ROC-AUC ≈ 0.988, PR-AUC ≈ 0.877** (`metrics()`). PR-AUC near 0.88 under
0.17% prevalence is strong — a random classifier's PR-AUC would be ~0.0017.

**Q71. What does ROC-AUC = 0.988 mean in plain English?**
Given one random fraud and one random legit transaction, there's a ~98.8% chance the model scores
the fraud higher. It's a ranking-quality measure independent of any threshold.

**Q72. If precision is 0.90, what does that mean to a bank employee?**
Of every 100 transactions the model flags as fraud at threshold 0.5, ~90 really are fraud and ~10
are false alarms the analyst clears. It's "how trustworthy is a flag."

**Q73. If recall is 0.86, what does that mean to a bank employee?**
Of all the actual fraud in the data, the model catches ~86% and misses ~14% at threshold 0.5. It's
"how much fraud we stop" — and lowering the threshold (Q63) trades precision to push it higher.

**Q74. What's the precision/recall trade-off here?**
Lower the threshold → recall up (catch more fraud), precision down (more false alarms). The cost
matrix decides the right point; there's no universally "correct" pair.

**Q75. What is F1 and when do you cite it?**
The harmonic mean of precision and recall — a single balanced score. I cite it for a quick
threshold-quality summary but prefer the explicit cost trade-off for decisions.

**Q76. Walk me through your confusion matrix at the default threshold.**
`metrics()` returns `{tn, fp, fn, tp}` from `confusion_matrix(y, y_hat, labels=[0,1])`. TP = caught
fraud, FN = missed fraud (the expensive cell), FP = false alarm, TN = correctly-passed legit.

**Q77. Which confusion-matrix cell matters most in fraud?**
FN — missed fraud — because each one is a realised loss. That asymmetry is exactly why the threshold
is cost-weighted (Q62).

**Q78. How do you validate the metrics aren't a lucky split?**
5-fold stratified cross-validation (`cross_validate()`): it reports per-fold ROC-AUC, mean ± std, and
checks the held-out score sits within `mean ± 2·std`.

**Q79. Why train a *fresh* classifier inside CV instead of reusing `self.clf`?**
Reusing the production model would leak its training data into the fold estimates. `cross_validate()`
fits a brand-new GBM each fold — the comment in the code calls this out explicitly.

**Q80. What does "consistent_with_held_out" mean in the CV output?**
Whether the single held-out AUC falls inside the CV's `[mean−2σ, mean+2σ]` band — if yes, the headline
score is credible, not a fluke. If no, that's an honest red flag.

**Q81. How are the ROC and PR curves computed for the UI?**
`roc_curve()` / `precision_recall_curve()` on held-out probabilities, then `_downsample_curve()`
thins them to ~100 points so the JSON stays small but the shape is preserved.

**Q82. Are these metrics training-set or held-out?**
Always held-out — computed on `X_test`/`y_proba` at request time. That's the honesty policy.

**Q83. How do you know the alert queue is actually useful, not random ranking?**
`test_alerts_rank_and_map_back` asserts the top-10 alerts over-index on real fraud relative to the
base rate, and that scores are monotonically ranked.

**Q84. What's a realistic failure mode of your evaluation?**
A single seeded sample of one dataset. I'd add temporal validation (train on earlier months, test on
later) to catch concept drift the random split hides — see Q132.

**Q85. How would you compare two model versions fairly?**
Same seeded split, compare PR-AUC and cost-at-optimal-threshold (not accuracy), plus a McNemar test
on disagreements. Keep the random_state fixed so the only variable is the model.

---

## G. Explainability — SHAP & reason codes

**Q86. How do you explain an individual prediction?**
`model_explainer.py → reason_codes()` turns the transaction's SHAP vector into ranked, plain-English
"adverse-action" reason codes — the top features, their direction, their % share, and a sentence.

**Q87. What is SHAP, in one sentence?**
A game-theoretic method that fairly attributes a prediction to its features, with the guarantee
`base_value + Σ shap_values = model output` (local accuracy / additivity).

**Q88. Why SHAP rather than the model's built-in feature importances?**
Built-in importances are *global* and impurity-biased; SHAP is *local* (per-prediction) and
consistent. A regulator wants "why *this* case," which only local attribution answers.

**Q89. Why SHAP rather than LIME?**
SHAP has the additivity guarantee and is exact/fast for tree models via TreeExplainer; LIME is a
local surrogate that can be unstable across runs. For audit, reproducibility wins.

**Q90. You hit a real SHAP bug — describe it.**
The cached GBM's TreeExplainer (default `tree_path_dependent`) produced per-feature SHAP values in
the **billions** that cancelled a billion-scale base value. Additivity held, but every "reason" was
meaningless — and the demo would have shown "+1,072,413,051 to risk."

**Q91. What caused it?**
sklearn GradientBoosting on 0.17%-imbalanced data grows a few trees with extreme leaf log-odds; the
path-dependent explainer splits a huge constant base value across features, producing giant
offsetting attributions.

**Q92. How did you fix it?**
Switched to an **interventional** TreeExplainer with a 100-row background sample and
`model_output="probability"`, so each contribution is a bounded share of the `[0,1]` probability.
Then I **validate every row** (additive to within 1e-3 *and* `max|shap| ≤ 1.5`) and keep only
trustworthy rows. See `risk_engine.py → train()` SHAP block.

**Q93. How do you know the fix is correct, not just different?**
After the fix the top drivers on ULB are **V14, V12, V4** (V10, V11 close behind) — the features
fraud researchers know are strongest in that dataset. The explainer independently rediscovered them.
Values are now small, signed probability contributions that sum to `predict_proba`. Moving to
XGBoost (Q35) removed the root cause entirely, and the per-row validation guard stays as insurance.

**Q94. What does a reason code look like now?**
"*Risk signal 'V14' increased the fraud risk (+0.815 prob, 61.9% of the decision)*." On semantic
data it reads "*Geographic risk increased the fraud risk … some jurisdictions carry elevated AML
exposure*."

**Q95. interventional vs tree_path_dependent SHAP — what's the difference?**
Path-dependent uses the tree's own coverage to weight feature subsets (no data needed, but can mis-
attribute with correlated/extreme trees); interventional integrates over a real background dataset,
giving values anchored to an actual reference distribution.

**Q96. What is `base_value` now?**
The model's **average fraud probability over the background sample** (~0.0003 on ULB) — the starting
point before any feature pushes the score up or down.

**Q97. How do you handle the anonymized features in the explanation?**
`_describe()` matches known feature names to a business glossary; for `V1…V28` it returns an honest
"learned statistical signal, intentionally anonymized" rather than inventing semantics.

**Q98. Why are reason codes a *legal* requirement, not a nice-to-have?**
US FCRA "adverse action" and broader model-governance (SR 11-7) expect that an automated decline
cite specific reasons. A bare probability isn't actionable or defensible.

**Q99. Where are reason codes exposed?**
`GET /api/risk/explain/{idx}` → `risk_service.py → get_shap_explanation()`, which returns the raw
SHAP waterfall *and* the `plain_english` reason codes.

**Q100. Could the explanation ever disagree with the score?**
No — because the reasons *are* the additive pieces of the score (additivity), not a separate
surrogate model. That's the whole point of using SHAP over a post-hoc story.

**Q101. What's global SHAP importance and how is it computed?**
Mean `|SHAP|` per feature over the validated sample, sorted — `shap_importances` in `metrics()`. It's
the dataset-level "what drives fraud overall."

**Q102. Permutation importance vs SHAP — why have both?**
Permutation importance (`train()`, `scoring="roc_auc"`) measures global predictive value model-
agnostically; SHAP gives signed, local attributions. They answer different questions, so I report
both.

**Q103. Why permutation importance instead of GBM's `feature_importances_`?**
Impurity importance is biased toward high-cardinality features and is training-set based.
Permutation importance is measured on held-out data as the AUC drop when a feature is shuffled —
honest and model-agnostic.

---

## H. Novelty — audit chain & the Investigator

**Q104. What is the single most novel thing in this project?**
The **Auditable Compliance Investigator**: an agent that tests AML hypotheses with real queries and
**hash-chains its entire reasoning trace** so it's tamper-evident — `agent/investigator.py`.

**Q105. How does the hash chain work?**
Each step's SHA-256 folds in the previous step's hash: `hash = sha256(prev_hash + payload)`
(`_chain()`). Change any step and every subsequent hash breaks — like a mini-blockchain for a
compliance investigation.

**Q106. What's in the hashed payload?**
`id, title, query, finding, severity, confirmed, timestamp_utc` (`_CHAIN_KEYS`). Including the UTC
timestamp means the chain proves *temporal ordering*, not just content integrity.

**Q107. How do you verify a chain wasn't altered?**
`verify_chain()` recomputes every hash from GENESIS; if any recomputed hash ≠ the stored hash, it
returns False. A regulator can re-run this independently.

**Q108. Why does this matter for FCC specifically?**
You legally can't act on a number you can't defend. A black-box "this is suspicious" is unusable; a
reproducible, tamper-evident trace with the exact query behind each finding is auditable.

**Q109. What hypotheses does the Investigator test?**
Geographic risk concentration, channel concentration, **structuring** near reporting thresholds,
large-value concentration, and temporal activity spikes (`_HYPOTHESES`).

**Q110. What's "structuring" and how do you detect it?**
Splitting transactions to stay just under a reporting threshold (e.g. $10,000). `_h_structuring()`
counts transactions just-below vs just-above $10k/$3k; a ≥1.5× cluster below is flagged as a classic
structuring signal.

**Q111. Are the Investigator's findings deterministic?**
Yes — the reasoning is pure rule+SQL and always runs offline. An LLM (Gemini) only *narrates* the
final memo if a key is configured, and it's told to use only the confirmed findings (`investigate()`).

**Q112. Doesn't using an LLM make it a black box again?**
No — the LLM only rewrites already-confirmed, query-backed facts into prose. Every number it prints
traces to a logged query; remove the key and the deterministic memo runs.

**Q113. How is the Investigator's SQL kept safe?**
It runs agent-generated SQL on an in-memory DuckDB with `enable_external_access=False`
(`investigator.py → _q()`); the separate user-facing SQL console adds a SELECT-only, comment-
blocking guard.

**Q114. Is the audit chain cryptographically strong?**
It's tamper-*evident* (SHA-256 hash chain), which is the right bar for an internal reproducible
trace. It's not a distributed ledger; for legal non-repudiation I'd add signed, append-only storage.

**Q115. How would you extend the chain to be tamper-*proof*, not just evident?**
Sign each head hash with an HSM-held key and write to append-only WORM storage or anchor periodic
heads to an external timestamping authority.

**Q116. The threshold work and reason codes — are those novel too?**
They're standard *techniques* used uncommonly *together* and tied to the FCC thesis: cost-based
thresholds + per-case reason codes + drift + a hash-chained trace is a coherent "defensible AI"
story, which is the differentiator.

---

## I. Drift & monitoring

**Q117. How do you know when the model goes stale?**
A **Population Stability Index** monitor (`model_explainer.py → population_stability_index()`)
compares the live feature/score distribution to training and flags drift.

**Q118. What is PSI and how do you read it?**
A distribution-shift statistic. Rule of thumb: `<0.10` no shift, `0.10–0.25` moderate (investigate),
`≥0.25` major (re-train). The function returns the value, severity, and advice.

**Q119. How is PSI computed?**
Quantile-bin the *baseline* so each bin holds ~equal mass, then
`Σ (actual% − expected%) · ln(actual%/expected%)` across bins, with a tiny epsilon flooring empty
bins. Outer edges are widened to `±inf` so live values beyond the training range still bin.

**Q120. Why PSI rather than a KS test?**
PSI is the bank/credit-risk standard with interpretable thresholds tied to action, is symmetric in a
useful way, and is trivial to compute per feature for a monitoring dashboard. KS is fine too; PSI is
the industry vernacular.

**Q121. What would you monitor in production?**
PSI on each input feature *and* on the output score, plus realised precision/recall as labels arrive
(with lag), alerting when PSI ≥ 0.25 or live recall drops below an SLA.

**Q122. How is PSI tested?**
`test_model_explainer.py`: PSI ≈ 0 for the same distribution (`test_psi_zero_for_same_distribution`)
and ≥ 0.25 for a 3σ mean shift (`test_psi_flags_major_shift`).

**Q123. What do you do when drift fires?**
Investigate which segment moved, increase monitoring, and trigger a re-validation/re-train. The
retrain path already exists (`get_engine()` cache invalidation).

**Q124. Concept drift vs data drift — do you handle both?**
PSI catches *data* drift (input distribution moves). *Concept* drift (the X→y relationship changes)
needs labels; I'd track realised performance over time and use temporal validation (Q132).

---

## J. Engineering & architecture

**Q125. Describe the request path for `/api/risk/metrics`.**
`routers/risk.py → risk_metrics()` validates `threshold ∈ [0,1]` → `risk_service.py → get_metrics()`
→ `risk_engine.py → metrics()`; the router maps domain exceptions to HTTP codes.

**Q126. Why separate router / service / engine layers?**
Single responsibility: routers own HTTP, services own business rules, the engine owns ML. A new rule
(e.g. "suppress whitelisted geographies") edits the service only — documented in
`risk_service.py`'s header.

**Q127. How do you handle errors cleanly?**
Services raise domain exceptions (`services/exceptions.py`, e.g. `RiskExplanationNotFound`); routers
translate them to 404/503/500. The ML layer never imports FastAPI.

**Q128. What are your API endpoints?**
`/api/risk/metrics`, `/alerts`, `/explain/{idx}`, **`/optimal-threshold`** (new), and
`/cross-validate` — all in `routers/risk.py`.

**Q129. How is the model persisted and loaded?**
`joblib.dump`/`load` of a dict holding the classifier, IsolationForest, held-out arrays, importances,
and SHAP sample (`_save()`/`_load()`), keyed by `data_source`.

**Q130. Why cache `X_test`/`y_proba` in the pickle?**
So metrics, curves, and the cost-optimal threshold are all computed on the *exact* held-out
predictions every boot — consistent and instant, no recompute.

**Q131. How would you serve this at scale?**
Stateless FastAPI workers behind a load balancer, the model in a shared object store loaded at
startup, batch scoring via a queue, and the metrics/curves precomputed. The layering already
supports it.

**Q132. What's missing for production-grade rigor?**
Temporal (out-of-time) validation, probability calibration (Q134), a proper model registry + CI
retraining, and label-feedback capture. I scoped honestly rather than fake these.

**Q133. How is the code tested?**
`pytest`: `test_risk_engine.py` (trains, asserts AUC > 0.7, threshold monotonicity, confusion-matrix
reconciliation, ranked alerts) and `test_model_explainer.py` (reason-code additivity, cost-threshold
behaviour, PSI). All green.

**Q134. Are your probabilities calibrated?**
GBM probabilities aren't guaranteed calibrated. For a true "this is 80% likely fraud" claim I'd wrap
it in `CalibratedClassifierCV` (Platt/isotonic) and check a reliability curve — a known next step.

**Q135. How do you keep the demo reproducible across machines?**
Everything is seeded (`random_state=42`), the dataset sample is seeded, and `data_source` is
reported, so two machines with the same `creditcard.csv` produce identical numbers.

**Q136. What does the figure script do?**
`backend/scripts/generate_report_figures.py` renders confusion matrix, ROC, PR, feature importance,
SHAP summary, and the cost-vs-threshold curve to `backend/reports/*.png` for slides — all from the
trained model, nothing hardcoded.

**Q137. How do you prevent SQL injection in the SQL features?**
The user console enforces SELECT-only, blocks comments, denies catalog access, and runs with external
access disabled (covered by an adversarial test corpus); the Investigator's SQL is agent-generated
and equally sandboxed.

---

## K. Honesty, limitations & "what would you improve"

**Q138. Did the README metric ever match the code?**
Honest backstory worth telling: an earlier README quoted ROC-AUC 0.913, but the sklearn-GBM model
reproducibly gave ~0.825. Rather than quote a number I couldn't regenerate, I moved the model to
XGBoost — which now produces **ROC-AUC ≈ 0.988 / PR-AUC ≈ 0.877**, *exceeding* the old claim
honestly — and updated the README to match. The lesson I'd give in the interview: never quote a
metric you can't reproduce live; fix the model or fix the doc.

**Q139. What's the biggest weakness of the project?**
A single random (not temporal) split on one dataset, and probabilities that aren't formally
calibrated yet. Both are honest, bounded limitations with clear fixes (Q141, Q142).

**Q140. What's the first thing you'd improve and why?**
Optuna hyperparameter search over the XGBoost space (Optuna is already a dependency), tuned on a
validation fold against PR-AUC, then confirmed on a fresh holdout — squeezing the last few points of
recall at fixed precision. A LightGBM comparison is a cheap second baseline.

**Q141. What's the second improvement?**
Out-of-time validation — train on earlier transactions, test on later — to measure performance the
way production actually experiences it, exposing concept drift a random split hides.

**Q142. Third improvement?**
Probability calibration (`CalibratedClassifierCV`) so the reported probabilities are trustworthy for
cost calculations and analyst triage.

**Q143. A real fourth: feedback loop.**
Capture analyst dispositions (confirmed fraud / cleared) as fresh labels and schedule retraining — a
human-in-the-loop active-learning cycle. The retrain plumbing exists; it needs a label store and a
job.

**Q144. How would you reduce false positives without missing fraud?**
Better features (device fingerprint, graph/network signals between accounts), calibration, and the
cost-tuned threshold — plus a secondary review tier for the mid-probability band instead of a hard
cut.

**Q145. What would you do with 100× more data?**
Move to a distributed trainer or GPU XGBoost/LightGBM, add temporal cross-validation, and engineer
entity-level aggregates (per-card/per-merchant velocity over multiple windows).

**Q146. What ethical/fairness concerns apply?**
Geography/KYC features can proxy for protected attributes. I'd run subgroup performance analysis,
monitor for disparate impact, and keep reason codes so declines are explainable and contestable.

**Q147. How do you avoid overfitting?**
Shallow trees, `subsample=0.85`, modest learning rate, held-out + 5-fold CV, and watching the CV
std. If train≫test AUC, I'd regularise further or cut estimators.

**Q148. Why should we trust your numbers at all?**
Because none are hardcoded — every metric recomputes from held-out data at request time, the code is
seeded and tested, and I just demonstrated I'll flag my own README when it overstates (Q138).

**Q149. If the model and a hard rule disagree, who wins?**
Hard regulatory rules (sanctions, legal limits) always win — they're bright lines. The model ranks
the grey-area majority. Verita is the *second layer*, not a rule replacement (see
[`BUSINESS_CASE.md`](BUSINESS_CASE.md) §7).

**Q150. Sell the whole project in 20 seconds.**
"Real ML fraud detection where every decision is defensible: SHAP reason codes per case, a threshold
chosen by dollar-cost not 0.5, drift monitoring, and a tamper-evident hash-chained audit trail.
Built for FCC, because that's the one domain where you legally can't act on a number you can't
defend — and I'll show you each number being computed live, including the one place my README was
ahead of my code."
