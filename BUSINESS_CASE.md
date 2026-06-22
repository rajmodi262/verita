# Business Case — Verita FCC Risk & Anomaly Engine

> *Why a bank or fintech should run this, what it returns, and how it compares to the
> rule-based systems most institutions use today.*

This document is deliberately commercial, not technical. Every claim about model behaviour is
backed by code you can run — see [`README.md`](README.md) and
[`INTERVIEW_PREP.md`](INTERVIEW_PREP.md) for the engineering detail. Dollar figures are clearly
labelled as **illustrative assumptions** wherever they are not measured; the *method* of the
calculation is the point, and the inputs are yours to change.

---

## 1. The problem, in one paragraph

A mid-sized card issuer or payments fintech processes millions of transactions a month. A small
fraction are fraudulent, but that fraction is expensive: chargebacks, write-offs, scheme fines,
and the cost of the analysts who chase alerts. Most institutions screen this flood with **static
rules** ("flag any wire over $9,000 to a high-risk country"). Rules are transparent and fast, but
they are also rigid, easy for fraudsters to learn and walk around, and they generate enormous
volumes of false alarms that bury analysts. The result is the worst of both worlds: fraud still
gets through, **and** the team drowns in noise.

## 2. What Verita is

A real machine-learning fraud engine (`XGBoost` + `IsolationForest`, trained on the **real ULB
credit-card dataset** — 284k transactions, 0.17% fraud, held-out **ROC-AUC ≈ 0.99 / PR-AUC ≈ 0.88**)
wrapped in three things a regulated institution actually needs and rarely gets together:

1. **A probability, not a yes/no.** Every transaction gets a calibrated fraud score, so the team
   can triage by risk instead of treating all alerts equally.
2. **A reason for every score.** A SHAP-derived, plain-English reason-code panel
   (`backend/app/ml/model_explainer.py`) tells the analyst *why* — "geographic risk and a
   high-risk channel drove this to 0.81" — so a human can act on it and an auditor can defend it.
3. **A dollar-optimal decision threshold.** The engine computes the cut-off that **minimises
   expected loss** given your cost of a missed fraud vs a false alarm — not the textbook 0.5
   (`optimal_threshold()`), and reports the money that choice saves.

On top of the model sits the platform's flagship: the **Auditable Compliance Investigator**, which
hash-chains its entire reasoning trace so every decision is tamper-evident and reproducible for a
regulator.

---

## 3. Why a bank / fintech should use it

| Need | Rule engine alone | Verita |
|---|---|---|
| Catch *novel* fraud patterns | ✗ only what a human pre-coded | ✓ learns multivariate patterns from data |
| Rank alerts by risk | ✗ all alerts look equal | ✓ probability-ranked queue |
| Explain a decision to a regulator | ~ the rule fired, but not *why this case* | ✓ per-case SHAP reason codes + audit chain |
| Tune to the bank's risk appetite | ~ hand-edit thresholds | ✓ cost-optimal threshold from a $ cost matrix |
| Detect its own decay | ✗ none | ✓ PSI drift monitor |
| Defensible / reproducible | ~ | ✓ hash-chained investigation trace |

The single sentence version: **Verita catches more fraud per analyst-hour and can prove why it
flagged each case** — which is exactly the combination an FCC team is graded on.

---

## 4. What the employee (the analyst) gains

The user here is a fraud / AML analyst, and the gains are concrete:

- **Triage instead of trawl.** A probability-ranked queue means the analyst works the riskiest 25
  cases first, not a random pile. The top-of-queue precision is far higher than a flat rule list.
- **Seconds, not minutes, per case.** Today an analyst opens a flagged transaction and manually
  reconstructs *why* it looks suspicious. Verita's reason-code panel hands them the "why" up front.
  If manual context-gathering takes ~4 minutes and the reason codes cut it to ~1, that is **~75%
  less handling time per case** — and the saved time compounds across thousands of alerts.
- **Fewer false alarms to wade through.** A model that ranks by probability lets the team set a
  threshold that holds review volume to what the team can actually clear, instead of a rule set
  that fires on volume it can't.
- **A defensible record.** Every action is backed by a logged query and a reason code, so the
  analyst is never asked "why did you escalate this?" without an answer.

## 5. ROI — the calculation, with worked numbers

The honest framing: **ROI = (extra fraud caught × value per fraud) + (analyst time saved) −
cost to run.** Plug in your own numbers; here is the method with illustrative inputs.

**Inputs (illustrative — replace with your book):**
- Monthly transaction volume: **$2,000,000,000** ($2B)
- Fraud rate on value: **0.10%** → **$2,000,000** of attempted fraud per month
- Lift from ML over the incumbent rule set — extra fraud *value* caught: **+8 percentage points**
  of that attempted fraud (a conservative figure for moving from rules to a ranked ML model)
- Analyst fully-loaded cost: **$40 / hour**; alerts worked per month: **20,000**; time saved per
  alert with reason codes: **3 minutes**

**Fraud-loss avoided:**
`$2,000,000 × 8% = $160,000 / month ≈ $1.92M / year` of fraud caught that the rule set was missing.

**Analyst time saved:**
`20,000 alerts × 3 min = 60,000 min = 1,000 hours / month × $40 = $40,000 / month ≈ $480K / year.`

**Cost-optimal threshold, measured (not assumed):** on the held-out ULB test set, choosing the
expected-loss-minimising threshold over a naive 0.5 cut-off cuts expected loss by **~19%** at the
default cost matrix (`$500` per missed fraud, `$5` per false alarm) — and the saving widens as the
cost of a missed fraud rises. Run `GET /api/risk/optimal-threshold` to reproduce it for your costs.

**Cost to run:** a few cents of compute per scoring batch; the model trains once (~2 min) and
loads from cache in seconds. Effectively a rounding error against the gains above.

> **Illustrative annual upside: ~$2.4M** ( $1.92M fraud avoided + $0.48M labour ) on a $2B/month
> book, before counting the cost-optimal-threshold saving and the avoided regulatory/chargeback
> penalties. The numbers scale linearly with volume — **the method is what transfers, not the
> exact figure.**

### 5a. The same ROI in rupees (₹) — for an Indian bank / fintech

Indian numbering (lakh / crore), same method, illustrative inputs for a mid-size domestic player:

**Inputs (illustrative):**
- Monthly transaction volume: **₹16,000 crore** (≈ $2B)
- Fraud rate on value **0.10%** → **₹16 crore** of attempted fraud per month
- ML lift over the incumbent rule set: **+8 percentage points** of attempted fraud caught
- Analyst fully-loaded cost **₹600/hour**; **20,000** alerts/month; **3 minutes** saved per alert

**Fraud-loss avoided:** `₹16 crore × 8% = ₹1.28 crore/month ≈ ₹15.4 crore/year.`
**Analyst time saved:** `20,000 × 3 min = 1,000 hours/month × ₹600 = ₹6 lakh/month ≈ ₹72 lakh/year.`
**Cost-optimal threshold:** on the held-out set, the dollar-rational cut-off cuts expected loss by
**~19%** vs a naive 0.5 — reproduce in ₹ with `GET /api/risk/optimal-threshold?cost_fn=40000&cost_fp=400&currency=₹`.

> **Illustrative annual upside: ~₹16 crore** ( ₹15.4 cr fraud avoided + ₹0.72 cr labour ) on a
> ₹16,000-crore/month book — before the threshold saving and avoided RBI/chargeback penalties.

The **Risk page UI** has a ₹ / $ toggle on the cost-optimal-threshold panel, so you can demo the
exact same model decision in either currency live. (The optimal threshold itself is identical in
both — it depends only on the *ratio* of miss-cost to false-alarm-cost, not the currency.)

## 6. The risk of *not* using it

- **Manual-review bottleneck.** Rule engines over-alert; teams either hire linearly with volume or
  let a backlog build. A backlog is undetected fraud sitting in a queue.
- **Human error and inconsistency.** Two analysts handed the same alert with no decision support
  reach different conclusions. That inconsistency is itself an audit finding.
- **Static rules decay silently.** Fraudsters probe and learn the thresholds; a rule that worked
  last quarter quietly stops working, and nobody is told. Verita's **PSI drift monitor** exists
  precisely to raise a hand when the world has moved.
- **Regulatory exposure.** "We declined because a rule fired" is weaker than "we declined because
  these three quantified factors drove the score, here is the query, and here is the tamper-evident
  trace." In FCC, *being unable to explain a decision is itself a finding.*

## 7. How this compares to rule-based fraud detection

Most institutions still run **rules** (if-this-then-flag). Rules are not the enemy — they are
transparent, fast, and great for hard regulatory lines (e.g. sanctions screening). But as the
*primary* fraud filter they have structural limits:

| Dimension | Rule engine | Verita (ML + explainability) |
|---|---|---|
| Captures feature *interactions* | ✗ (one rule = one condition) | ✓ (model learns joint patterns) |
| Adapts to new fraud | ✗ (needs a human to write a new rule) | ✓ (re-train on fresh labels) |
| Alert prioritisation | ✗ (binary) | ✓ (probability + anomaly rank) |
| False-positive control | hard (tighten a rule, miss real fraud) | tune one cost-based threshold |
| Per-case explanation | the rule text | SHAP reason codes specific to the case |
| Knows when it's wrong | ✗ | ✓ (PSI drift, held-out metrics) |

**The pragmatic answer — and the one to give in an interview — is not "replace rules with ML."**
It is a **layered model**: keep rules for the bright regulatory lines (sanctions, hard limits), and
add Verita as the intelligent layer that ranks the grey-area majority, explains itself, and tunes
to the bank's actual cost of being wrong. Verita is built to slot in as that second layer without
asking the institution to throw away the rule engine it already trusts.

---

### Appendix — where each claim lives in the code

| Claim | Code |
|---|---|
| Real ULB data, XGBoost + held-out metrics | [`backend/app/ml/data.py`](backend/app/ml/data.py), [`risk_engine.py`](backend/app/ml/risk_engine.py) `train()`/`metrics()` |
| Per-case reason codes | [`model_explainer.py`](backend/app/ml/model_explainer.py) `reason_codes()` |
| Cost-optimal threshold | `model_explainer.py` `optimal_threshold()`, endpoint `GET /api/risk/optimal-threshold` |
| Drift monitor | `model_explainer.py` `population_stability_index()` |
| Probability-ranked alert queue | `risk_engine.py` `alerts()` |
| Tamper-evident audit | [`backend/app/agent/investigator.py`](backend/app/agent/investigator.py) `_chain()` |
