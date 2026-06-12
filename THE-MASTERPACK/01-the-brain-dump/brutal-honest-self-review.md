# What a Senior Engineer Would Say About My Project
### (And How I'd Respond)

*A simulated code review. The reviewer is sharp, fair, and unimpressed by default.
Practicing this conversation is worth more than memorizing any answer in the pack.*

---

**REVIEWER:** Your frontend is full of inline styles. Hundreds of them. Why?

**ME:** Speed of iteration during the build — change, see, change. It was the right
trade for week one and the wrong one by week four. The codebase now has a design-token
spec (`DESIGN.md`) and the refactor to a token-driven stylesheet is the first item in
the frontend backlog. I won't defend it as good practice; I'll defend it as a
consciously deferred debt with a written payoff plan.

**REVIEWER:** Wouldn't Tailwind or CSS modules from day one have been better?

**ME:** Honestly — yes. The lesson I took is that styling architecture is a day-one
decision, like a database schema. You're right, and that mistake is why my next
project starts with tokens.

**REVIEWER:** Your `main.py` has endpoint handlers doing orchestration. That's a god
file in the making.

**ME:** Agreed, partially built. The profiling, ML, NLP, and agent logic live in their
own modules with clean seams — the routers are where orchestration accumulated. The
refactor is mechanical: a service layer between routers and engines. The reason it's
testable today despite the smear is that the tests hit the API contract, not the
internals.

**REVIEWER:** You hash-chain the investigation trace. Cute. But the chain only proves
the trace wasn't *edited after the fact* — it doesn't prove the steps actually ran.

**ME:** Correct, and I'm glad you said it precisely. The chain gives tamper-evidence,
not execution attestation. Two mitigations: each step embeds its literal SQL and
result statistics, so a verifier can *re-run* every query against the same data and
reproduce the verdicts — reproducibility is the execution proof. Full attestation
would need signed timestamps or a trusted execution environment, which is exactly the
kind of infrastructure a company like Wolters Kluwer has and an intern project
shouldn't fake. I built the half that's honest at my scale.

**REVIEWER:** ROC-AUC 0.913 on the ULB dataset. Every Kaggle notebook gets that. Why
should this impress me?

**ME:** It shouldn't — the number is table stakes and I'd be suspicious of a much
higher one. What I'd offer instead: it's *held-out*, reported next to PR-AUC 0.65
because 0.17% prevalence makes ROC flattering, the threshold is user-tunable with the
precision/recall trade-off live on screen, and the model persists with a 0.36s warm
boot. The differentiator isn't the score; it's the evaluation honesty around it.

**REVIEWER:** Your forecast "tournament" is three toy models. Where's Prophet? ARIMA?

**ME:** Deliberate. The tournament's value is the *selection discipline* — backtest on
held-out periods, ship the winner with its MAPE visible. Prophet would slot in as a
fourth competitor in an afternoon; the framework is pluggable. I spent the complexity
budget on making evaluation honest rather than on a heavier model whose wrongness I
couldn't measure. With more time, Prophet enters the bracket — and has to win it.

**REVIEWER:** The semantic type inference. I read it. It's a pile of heuristics with
magic numbers.

**ME:** It is. Layered heuristics with thresholds I tuned on real messy files — and
it's the code I trust least, which is why the UI reports a *confidence*, never a
certainty, and why the profiler's edge cases have their own tests. The principled
version is a trained classifier over column statistics; that needs labeled training
data I didn't have. Heuristics-with-humility was the honest interim.

**REVIEWER:** Sync pandas inside async FastAPI handlers. Do you know what that does
under load?

**ME:** Yes — FastAPI runs sync work in a threadpool, so the event loop survives, but
heavy profiling occupies workers and the GIL makes it worse for CPU-bound paths. At
demo concurrency it's fine; at production concurrency it needs a job queue with
progress events. It's documented as the first scalability ceiling in my own notes —
you found the line I drew myself.

**REVIEWER:** 72 backend tests but your unit coverage of the profiler internals is
thin. You tested the API and called it a day?

**ME:** Fair hit, with one amendment: the tests concentrate where the *risk*
concentrates — the SQL guard has an adversarial corpus, the hash chain has tamper
tests, the metrics endpoints assert held-out discipline. The profiler's internals are
covered behaviorally through golden-file style assertions, which catch regressions but
not logic intent. More granular profiler units are the right next 20 tests.

**REVIEWER:** You used AI heavily. How much of this code would you recognize in a
lineup?

**ME:** All of it — because reviewing was the job. My honest split: the AI drafted
implementations fast; I owned architecture, every accept/reject, and verification.
There were drafts I rejected outright — an SQL guard that looked right and failed my
corpus, a "fix" that silently changed a metric to training-set scoring. Catching that
second one is the moment I'd point to when you ask if I understand this codebase.

**REVIEWER:** Last one. If I deleted Verita tomorrow, what survives?

**ME:** The loop that built it: find the real constraint — here, auditability — build
the honest version, attack your own claims, show the work. And the specific scars:
class imbalance, injection defense, the night I rebuilt my best feature because it
was a beautiful black box. Those transfer. The repo is just where they're stored.

---

## The Three Things I'd Change With One More Month

1. **SHAP explainability per prediction** — finish the "show your work" thesis at the
   model level (engine already installed; UI panel designed).
2. **Async job pipeline for ingestion** — kill the synchronous profiling ceiling;
   progress events to the frontend.
3. **The token refactor** — frontend styles onto the design-token system, paying off
   the one debt that shows.

## The Three Things I'm Actually Proud Of

1. **The hash-chained, reproducible investigation trace** — the one feature I haven't
   seen in any comparable tool, and the project's thesis made executable.
2. **The adversarial test corpus that caught a real vulnerability** — my tests found
   a file-read hole before any human did. That's the whole point of tests.
3. **Zero fabricated numbers** — every metric in the product is computed from the
   user's data at request time, every claim shows its formula, and the demo needs no
   staged data to be impressive. Honesty held under deadline pressure.

---

## What Changed in V1.1 (Post-Audit Fixes, 2026-06-13)

After running a forensic self-audit of every file in the project — the same rigor I'd
apply to a dataset I didn't trust — I found and fixed three critical issues:

**1. SHAP explanations fully activated** (was: installed but not in product)
The "show your work" thesis had a hole at the model layer. TreeSHAP now computes
exact feature attributions at train time and caches them. `/api/risk/explain/{idx}`
returns a per-prediction waterfall. `/api/risk/metrics` now returns `shap_importances`.
The gap between thesis and implementation: closed.

**2. Hero chip corrected: 0.97 → 0.913 · held-out** (was: inflated, wrong)
A training-set-inflated number was in the landing page hero. Self-audit found it.
Fixed to the actual held-out test score. Added `· held-out` label so any ML engineer
knows immediately this is not the training score. PR-AUC chip also added.

**3. Chain timestamps added** (was: content-only proof)
Each investigation step now commits to a UTC timestamp inside the SHA-256 payload.
The chain previously proved content integrity. It now also proves temporal ordering —
a backdated replay produces different hashes. Closes the reproduction attack gap.

**4. 5-fold cross-validation endpoint added** (was: not available)
A single held-out split could be a lucky partition. `/api/risk/cross-validate` runs
stratified 5-fold CV and returns mean ± std with a consistency check against 0.913.
If they're consistent, the held-out score is credible. If they diverge, that's an
honest finding. Either way, the interviewer gets the truth.

**5. Holt-Winters added as 4th forecast model** (was: 3-model tournament)
Manual Holt + linear + naive was the original tournament. Added statsmodels
Holt exponential smoothing with auto-optimised parameters as the 4th contestant.
The tournament note now says "4-model tournament."

**6. Service layer extracted** (was: business logic in routers)
`backend/app/services/risk_service.py` now owns domain orchestration. The router
is a thin HTTP wrapper (≤ 10 lines per endpoint). Adding a business rule no longer
means editing the router AND the engine.

**7. `ARCHITECTURE.md` and `CONTRIBUTING.md` created**
Documents that signal production thinking: design decision rationale, the
"one rule" (constitutional violation = fabricated metric), commit format, and the
known architectural debt list (documented, not hidden).

**Meta-point:** The audit was self-administered. The fixes were self-initiated. No
supervisor caught the 0.97 chip — I did, via the same forensic process I'm claiming
to apply to financial data. That loop is the credential.
