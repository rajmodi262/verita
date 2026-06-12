# The War Room — 60 Technical Questions

*Six chapters of ten. Every answer first-person and Verita-specific.
★ = how confidently to project the answer (all are honest; stars are delivery energy).*

---

## CHAPTER 1: The Architecture Trial

---
**Q01 — QUESTION:** Walk me through the architecture end to end.
**THEIR INTENT:** Can you hold the whole system in your head and narrate it cleanly?
**MY ANSWER:** A React+TypeScript frontend talks REST to a FastAPI backend. The backend
has five engines: profiling (semantic types, quality, statistics), ML (GradientBoosting
fraud scorer + IsolationForest), NLP (BSA/AML/OFAC matching), an optional GenAI layer
with deterministic fallback, and the autonomous Investigator. DuckDB runs user SQL over
the uploaded frame; PostgreSQL persists the audit trail; Docker compose boots it all
with Prometheus and Grafana.
**DEPTH SIGNAL:** "The seams matter: engines are modules with typed contracts, so the
investigator can call the same profiling functions the dashboard uses — one source of
truth per statistic."
**THE TRAP:** Reciting folder names instead of *data flow*. Narrate a file's journey.
**CONFIDENCE:** ★★★★★

---
**Q02 — QUESTION:** Why a separate frontend and backend instead of server-rendered?
**THEIR INTENT:** Do you understand the trade-off you took, or did you copy a template?
**MY ANSWER:** The product is an interactive canvas — drag, resize, live threshold
sliders, scrubbing time. That's client-state-heavy work where React earns its weight.
The backend is pure computation, so a clean JSON API keeps it testable in isolation —
my 72 backend tests run with no browser. Server rendering would buy SEO I don't need
and cost me the interactivity that is the product.
**DEPTH SIGNAL:** The typed mirror: Pydantic schemas on one side, TS interfaces on the
other — contract drift breaks the build, not the demo.
**THE TRAP:** Pretending SPA is always right. It's right *here*, for stated reasons.
**CONFIDENCE:** ★★★★★

---
**Q03 — QUESTION:** Why two databases? Justify DuckDB *and* PostgreSQL.
**THEIR INTENT:** Engines-by-workload thinking — the data-engineering instinct the JD wants.
**MY ANSWER:** Different jobs. DuckDB is in-process and columnar — perfect for ad-hoc
analytical SQL over an uploaded file, zero infrastructure, milliseconds. Postgres is
the durable system of record for the audit datamart: analyses, query logs,
investigation traces. Ephemeral analytics versus institutional memory — fusing them
into one engine would make both jobs worse.
**DEPTH SIGNAL:** "It's the lake/datamart pattern at portfolio scale — the JD's own
vocabulary, implemented small but real."
**THE TRAP:** "DuckDB because it's trendy." Name the workload, not the hype.
**CONFIDENCE:** ★★★★★

---
**Q04 — QUESTION:** Where does state live in this system?
**THEIR INTENT:** State discipline separates builders from template-followers.
**MY ANSWER:** Four places, deliberately. Uploaded datasets: disk-backed server cache
keyed by dataset ID — survives restart. Trained model: joblib artifact, warm-boots in
0.36s. Audit records: Postgres. UI state: zustand for the small global slice, local
state per panel, with dashboard layouts persisted per dataset. Nothing is hidden in
globals; every piece has an owner and a lifetime.
**DEPTH SIGNAL:** The restart story — kill the server mid-session, uploads and model
survive, the dashboard reassembles. I demo it.
**THE TRAP:** Hand-waving "it's in the database." Which state? Which database? Why?
**CONFIDENCE:** ★★★★☆

---
**Q05 — QUESTION:** What design pattern shows up most in your backend?
**THEIR INTENT:** Vocabulary check, plus whether patterns were chosen or accidental.
**MY ANSWER:** Strategy with honest selection — it recurs everywhere. The chart
recommender picks visualizations per column semantics; the forecast tournament runs
three strategies and ships the backtest winner; GenAI narration swaps between Gemini
and deterministic fallback. Same shape each time: interchangeable engines behind one
interface, *selection by measured evidence*, never by configuration faith.
**DEPTH SIGNAL:** Also pipeline (upload → profile → recommend → render) and middleware
chain (auth → rate-limit → error handler) on the request path.
**THE TRAP:** Listing GoF patterns you can't point to in your own code.
**CONFIDENCE:** ★★★★☆

---
**Q06 — QUESTION:** How does the auto-dashboard actually decide what charts to build?
**THEIR INTENT:** Is the headline feature real logic or random selection?
**MY ANSWER:** The profiler assigns each column a semantic role — temporal, monetary,
categorical, geographic, identifier — using layered heuristics over dtype, cardinality,
name signals, and distribution stats. The recommender then applies composition rules:
temporal+numeric earns a time series with forecast overlay; geographic earns a
choropleth; low-cardinality categoricals earn share charts; everything competes for
limited canvas slots by an interestingness score. Output is a declarative ECharts spec
list — the renderer just renders.
**DEPTH SIGNAL:** Specs-as-data is what makes the canvas editable and the pin-from-SQL
feature one code path.
**THE TRAP:** Overselling it as ML. It's transparent rules — *fitting, for a
compliance product*, and I say so.
**CONFIDENCE:** ★★★★★

---
**Q07 — QUESTION:** What would you change about the architecture if you started over?
**THEIR INTENT:** Reflection and growth, not perfection theater.
**MY ANSWER:** Three things. A service layer between routers and engines from day one —
orchestration crept into handlers. Design tokens for the frontend instead of inline
styles — visual debt that shows. And an async job model for ingestion from the start,
because retrofitting progress events onto synchronous profiling is harder than building
them in. Notice all three are *boundaries* — the lesson is that boundaries are cheapest
on day one.
**DEPTH SIGNAL:** What I'd keep: engines-by-workload, typed contracts, honest fallbacks
— the skeleton survived contact with reality.
**THE TRAP:** "Nothing" (delusional) or rebuilding everything (no judgment).
**CONFIDENCE:** ★★★★★

---
**Q08 — QUESTION:** How do frontend and backend stay in sync as the API evolves?
**THEIR INTENT:** Contract thinking; have you felt integration drift pain?
**MY ANSWER:** Pydantic models define the contract; TypeScript interfaces mirror them;
`tsc` runs in CI, so a payload change that the frontend doesn't handle fails the build.
OpenAPI docs regenerate from code automatically, so documentation can't lie. It's
manual mirroring, disciplined — codegen from the OpenAPI spec is the obvious next
hardening.
**DEPTH SIGNAL:** Naming `openapi-typescript` as the tool I'd add shows I know the
ecosystem, not just the gap.
**THE TRAP:** Claiming codegen exists when it doesn't. The discipline is honest;
say it.
**CONFIDENCE:** ★★★★☆

---
**Q09 — QUESTION:** Why monolith and not microservices?
**THEIR INTENT:** Buzzword resistance under social pressure.
**MY ANSWER:** Because nothing about this workload justifies a network hop. One team,
one deploy unit, shared in-memory dataset state — splitting profiling from ML would
add serialization cost and distributed failure modes while removing exactly nothing.
The engines are separate *modules* with clean interfaces, which means the seams exist
if scale ever demands extraction. Modular monolith now, services when the org chart —
not the architecture diagram — requires it.
**DEPTH SIGNAL:** "The first real extraction candidate is ingestion, because it's the
resource-isolated, queue-shaped workload."
**THE TRAP:** Apologizing for the monolith. It's the correct call; defend it.
**CONFIDENCE:** ★★★★★

---
**Q10 — QUESTION:** What's the most complex piece of code in the project?
**THEIR INTENT:** Can you locate complexity honestly and explain why it lives there?
**MY ANSWER:** The Investigator's pipeline. It inspects the profile to *plan*
hypotheses, generates a real SQL test per hypothesis, executes against DuckDB,
computes a statistic with a verdict threshold, then serializes each step into the
SHA-256 chain where every hash folds in its predecessor. The complexity is essential —
it's coordination across profiling, SQL, statistics, and cryptographic sealing — and
it's the most tested path in the repo, including deliberate tamper attempts.
**DEPTH SIGNAL:** Walk the chain construction on the whiteboard: step JSON → canonical
serialization → hash(prev_hash + step). Offer to.
**THE TRAP:** Naming something complex you then can't whiteboard.
**CONFIDENCE:** ★★★★★

---

## CHAPTER 2: The AI Inquisition

---
**Q11 — QUESTION:** How exactly did you use Claude Code — and what's left that's yours?
**THEIR INTENT:** The defining question of your candidacy. Ownership audit.
**MY ANSWER:** Claude Code drafted implementations, accelerated debugging, and let me
interrogate unfamiliar APIs at conversation speed. Mine: the thesis (auditability as
the product), the architecture, every accept/reject decision, the evaluation
discipline, and verification of every claim — I have a designed page in the tech
bundle showing the split honestly. Judgment human, speed artificial.
**DEPTH SIGNAL:** The rejected-draft stories: an SQL guard that failed my injection
corpus; a "fix" that quietly switched a metric to training-set scoring. Caught both.
**THE TRAP:** Defensiveness or minimizing. Transparent pride is the only winning tone.
**CONFIDENCE:** ★★★★★

---
**Q12 — QUESTION:** How do you verify AI-generated code you couldn't have written yourself?
**THEIR INTENT:** Epistemics. Do you have a verification loop or just vibes?
**MY ANSWER:** Three gates. Behavior: tests assert what the code must do — 82 of them,
including adversarial corpora. Comprehension: if I can't explain a block line-by-line,
it gets simplified or re-derived until I can — that rule is why I can whiteboard the
hash chain. Independent verification for claims: metrics recomputed by hand on samples,
the injection corpus run against every guard revision. Trust the output, never the
process.
**DEPTH SIGNAL:** "The same loop your teams need for AI adoption at WK — I'm
describing a reviewable AI development workflow, not a personal habit."
**THE TRAP:** "I read it carefully." Reading is not verification.
**CONFIDENCE:** ★★★★★

---
**Q13 — QUESTION:** Your investigator "plans hypotheses." Is that real AI or templates?
**THEIR INTENT:** Probing for inflated agentic claims — the 2026 bullshit detector.
**MY ANSWER:** It's deterministic planning over the data's shape — column semantics
and distributions decide which of the hypothesis families apply — followed by real SQL
execution and statistical verdicts. The optional LLM narrates the memo; it never
computes. I refuse the word "agentic" where I can't defend it: what I claim is
*autonomous, reproducible investigation* — and reproducible is the property FCC
actually needs.
**DEPTH SIGNAL:** "Deterministic-first is the thesis, not a limitation: a regulator
can re-run my plan. They cannot re-run a temperature-0.7 chain of thought."
**THE TRAP:** Claiming emergent intelligence. They will dismantle you.
**CONFIDENCE:** ★★★★★

---
**Q14 — QUESTION:** Where could GenAI hallucinate in your product, and what prevents it?
**THEIR INTENT:** Do you understand LLM failure modes structurally?
**MY ANSWER:** One rule prevents the class: *the LLM narrates, engines compute*.
Numbers, statistics, and verdicts come from pandas/scipy/sklearn; Gemini only phrases
summaries and translates NL→SQL. The NL→SQL path is the risky one, so generated SQL is
shown to the user before execution and runs through the same SELECT-only sandbox as
human SQL. Hallucinated *language* is possible; hallucinated *evidence* is
architecturally excluded.
**DEPTH SIGNAL:** `/api/health` reports which mode is live — even the degradation is
honest.
**THE TRAP:** "I prompt it carefully." Prompts are not architecture.
**CONFIDENCE:** ★★★★★

---
**Q15 — QUESTION:** Should banks let an AI file a SAR (suspicious activity report)?
**THEIR INTENT:** Domain ethics + regulatory literacy.
**MY ANSWER:** Recommend, never file. The legal accountability for a SAR sits with a
human institution, and an AI can't carry it. That's exactly how Verita's NLP analyzer
behaves: it scores, lists the driving signals, and *recommends* File SAR / Investigate
/ Monitor — the verb belongs to the analyst. The design goal is to make the human
decision faster and better-evidenced, not to remove it.
**DEPTH SIGNAL:** Mention alert-fatigue: the real win is ranking and evidence-
gathering so humans spend attention where it matters.
**THE TRAP:** Techno-optimism. In this building, human-in-the-loop is doctrine.
**CONFIDENCE:** ★★★★★

---
**Q16 — QUESTION:** Aren't you just dependent on AI? What happens when it's wrong?
**THEIR INTENT:** Resilience and self-awareness under a mild insult.
**MY ANSWER:** It was wrong, regularly — that's why the workflow assumes it. The
injection corpus exists because a generated guard failed it. The metric-switch bug
exists because I checked. Dependence would be shipping unverified output; what I built
is a review discipline where AI speed is harnessed *because* it's fallible. And the
understanding compounds on my side: every correction taught me the underlying concept
deeper than a lecture would have.
**DEPTH SIGNAL:** Flip it: "the dangerous candidate is the one who thinks AI output
doesn't need review — I have scars proving I'm not that candidate."
**THE TRAP:** Taking the bait defensively. Smile; you've prepared your whole life for
this question.
**CONFIDENCE:** ★★★★★

---
**Q17 — QUESTION:** How would you bring AI tooling into a regulated enterprise like ours?
**THEIR INTENT:** Can your personal workflow scale to an org with auditors?
**MY ANSWER:** The same properties I built into Verita, made policy: AI output enters
through review gates (PRs, tests, adversarial corpora for security-sensitive paths);
provenance is recorded — what was generated, what was verified, by whom; and
verification artifacts are first-class deliverables. Start with low-blast-radius wins
— test generation, documentation, refactoring — and expand as the review muscle
matures. Speed where it's safe, gates where it isn't.
**DEPTH SIGNAL:** "My hash-chained trace is a tiny prototype of AI provenance
infrastructure — the enterprise version is signed and centralized, same idea."
**THE TRAP:** Evangelizing speed without governance — wrong building for that.
**CONFIDENCE:** ★★★★☆

---
**Q18 — QUESTION:** What can't AI do in your development process?
**THEIR INTENT:** Mapping where you think judgment lives.
**MY ANSWER:** Decide what's worth building — the thesis came from reading a job
description and an industry, not a prompt. Take responsibility — when my SQL console
had a vulnerability, the accountability was mine. Know what it doesn't know — the
model is confidently wrong; the corrective instrument is my verification loop. And
taste: knowing the investigator needed to be *boringly reproducible* rather than
impressively clever was a judgment call against the obvious demo-optimizing move.
**DEPTH SIGNAL:** "AI compresses the distance from judgment to artifact. It does not
supply the judgment."
**THE TRAP:** Listing technical tasks ("it can't do CSS"). The answer is judgment,
responsibility, taste.
**CONFIDENCE:** ★★★★★

---
**Q19 — QUESTION:** If we banned AI tools on day one of your internship, what happens?
**THEIR INTENT:** Stress-testing whether skills exist without the tool.
**MY ANSWER:** I'm slower and equally capable. The architecture, the statistics, the
evaluation discipline, the security model — those live in my head; the interview
process you're running on me right now verifies that. The build taught me the
concepts *through* the tool, the way calculators taught nobody arithmetic but
spreadsheets taught everyone modeling. And candidly: I'd also gently make the case for
governed AI tooling, because the productivity delta is real and your competitors are
banking it.
**DEPTH SIGNAL:** Offer live proof: "whiteboard any layer of Verita right now, no
tools."
**THE TRAP:** Panic, or arrogance ("I don't need it"). Calm both-and.
**CONFIDENCE:** ★★★★☆

---
**Q20 — QUESTION:** What's the most overhyped thing in AI right now, in your view?
**THEIR INTENT:** Independent thought; can you disagree with the weather?
**MY ANSWER:** Autonomy without auditability — "agents" graded on demo wow rather
than on whether anyone can reconstruct what they did and why. In consumer apps that's
a quality bug; in finance it's disqualifying, because an unexplainable action is an
unactionable one. The under-hyped counterpart: evaluation infrastructure. Verita is
my position paper — the flagship feature isn't the agent, it's the *trace*.
**DEPTH SIGNAL:** "I'd rather own the boring layer everyone needs — evaluation and
provenance — than the demo layer everyone ships."
**THE TRAP:** Cynicism ("it's all hype") or fandom ("AGI next year"). Specific,
positioned, calm.
**CONFIDENCE:** ★★★★★

---

## CHAPTER 3: The Data Interrogation

---
**Q21 — QUESTION:** Trace one uploaded file through the entire system.
**THEIR INTENT:** Pipeline fluency — the JD's "automated data pipelines" in your mouth.
**MY ANSWER:** Multipart upload hits FastAPI; pandas (or openpyxl) parses with size
caps; the profiler types every column semantically and scores quality with itemized
deductions; the store disk-caches the frame under a dataset ID. The recommender
composes chart specs; insights run scipy tests; the frame registers in DuckDB for SQL.
On demand: the risk model scores it, the investigator interrogates it, and every
analysis lands in the Postgres audit trail. One drop, five engines, full provenance.
**DEPTH SIGNAL:** Note what's cached vs recomputed: profile cached once; charts cheap
views over it.
**THE TRAP:** Skipping validation/limits — interrogators live in the unhappy path.
**CONFIDENCE:** ★★★★★

---
**Q22 — QUESTION:** How do you handle missing values?
**THEIR INTENT:** Data-hygiene philosophy — impute blindly or report honestly?
**MY ANSWER:** Report first, never silently repair. Missingness is measured per column,
itemized in the quality score, and surfaced in the profile rail — in FCC, missing data
is *signal* (a transaction without a country is interesting). Statistics use pairwise-
complete observations; the forecaster requires a complete temporal spine; the model
pipeline imputes explicitly inside the sklearn pipeline where it's versioned and
reproducible — not in the raw frame the user sees.
**DEPTH SIGNAL:** "Silent imputation in a compliance product is evidence-tampering
with extra steps."
**THE TRAP:** "I fill with the mean." Not in this building.
**CONFIDENCE:** ★★★★★

---
**Q23 — QUESTION:** Your semantic type inference — how does it actually work, and when does it fail?
**THEIR INTENT:** Depth probe on the most heuristic code you own.
**MY ANSWER:** Layered evidence: dtype first, then cardinality ratios, name-pattern
signals, parse attempts for dates, distribution shape for IDs versus quantities. Each
layer votes; confidence is reported, not hidden. Failure modes I know: numeric
categorical codes that look like quantities, IDs with arithmetic-looking properties,
and date columns in mixed formats — which is exactly why the UI lets the human see and
the profiler says "likely," because pretending certainty there would be a lie.
**DEPTH SIGNAL:** The principled upgrade — a classifier trained on labeled column
stats — and why I didn't fake it without training data.
**THE TRAP:** Defending the heuristics as flawless. Their honesty about uncertainty
IS the defense.
**CONFIDENCE:** ★★★★☆

---
**Q24 — QUESTION:** Why is accuracy the wrong metric for your fraud model?
**THEIR INTENT:** The class-imbalance shibboleth — instant credibility test.
**MY ANSWER:** Fraud prevalence in my training data is 0.17%, so "never fraud" scores
99.8% accuracy while catching nothing. I report held-out ROC-AUC (0.913) for ranking
quality and PR-AUC (0.65) because precision-recall is the honest view under extreme
imbalance — and the UI ships a live threshold slider so the precision/recall trade-off
is a visible business decision, not a buried constant.
**DEPTH SIGNAL:** Cost asymmetry: a missed fraud and a false alarm have different
prices; threshold selection is a policy choice that belongs to the institution.
**THE TRAP:** Quoting ROC-AUC alone — under imbalance it flatters. Volunteer PR-AUC
before they ask.
**CONFIDENCE:** ★★★★★

---
**Q25 — QUESTION:** Defend your SQL console. I'm an attacker.
**THEIR INTENT:** Security depth on the scariest feature you ship.
**MY ANSWER:** Defense in depth, four layers. DuckDB runs with
`enable_external_access=False` — the engine cannot touch the filesystem regardless of
what gets past me. Guard layer: SELECT-only allowlist, comments rejected (classic
smuggling vector), catalog/schema probing denied. Resource layer: result and time
caps. Verification layer: an adversarial injection corpus in CI that attacks every
revision of the guard — and which caught a real `read_csv` file-read hole before
shipping. Attack it; that's what it's for.
**DEPTH SIGNAL:** The engine-level flag is the load-bearing wall — "my regex is the
second line, not the first."
**THE TRAP:** Pure-allowlist confidence. Acknowledge that guards rot; corpora don't.
**CONFIDENCE:** ★★★★★

---
**Q26 — QUESTION:** How does the forecast tournament work, and why should I trust its output?
**THEIR INTENT:** Forecasting literacy per the JD; evaluation honesty again.
**MY ANSWER:** Three competitors — trend+seasonality, Holt exponential smoothing,
seasonal-naive — each backtested on held-out periods of the series; the winner ships
with its backtest MAPE displayed beside the projection and a 95% confidence band. You
should trust it *exactly as much as the MAPE says* — that's the design. A forecast
without its error rate is marketing.
**DEPTH SIGNAL:** Seasonal-naive as a competitor is the tell: if your fancy model
can't beat "same as last week," the honest answer is "same as last week."
**THE TRAP:** Apologizing for not using Prophet. The framework is pluggable; the
discipline is the feature.
**CONFIDENCE:** ★★★★★

---
**Q27 — QUESTION:** What statistical tests do you run and why those?
**THEIR INTENT:** Is "statistical modeling" on your map real?
**MY ANSWER:** Welch t-tests for group mean differences — Welch because real financial
segments never have equal variances; Pearson correlation for numeric pairs; eta-squared
for categorical-numeric effect sizes, which powers the relationship map. Findings ship
with p-values, and the map *refuses to draw* relationships that don't clear
significance — restraint as a feature. Every test's exact call is one click away in
the UI.
**DEPTH SIGNAL:** Multiple-comparisons awareness: many tests per upload inflate false
positives; effect-size thresholds temper it, and FDR correction is the named next step.
**THE TRAP:** p-value worship. Significance ≠ importance; that's why effect sizes
gate the map.
**CONFIDENCE:** ★★★★☆

---
**Q28 — QUESTION:** 10 GB file lands on your upload endpoint. What happens, honestly?
**THEIR INTENT:** Do you know your own limits without flinching?
**MY ANSWER:** Today: size caps reject it politely at the door, and the 200k-row
sampling guard protects profiling cost for large-but-accepted files. A 10 GB file is
beyond the current synchronous design — that's the documented ceiling, not a surprise.
The built-for-it version: chunked/columnar ingestion (Polars or DuckDB-native read),
an async job queue, progress events to the UI. The seams for that already exist; the
queue doesn't.
**DEPTH SIGNAL:** Sampling math: profiling needs distributional shape, and 200k rows
estimates that within tolerances the UI honestly could state.
**THE TRAP:** Bluffing scale you don't have. The confident statement of a known
ceiling reads senior; a bluff reads intern.
**CONFIDENCE:** ★★★★★

---
**Q29 — QUESTION:** How do you version data and models?
**THEIR INTENT:** MLOps instincts probe.
**MY ANSWER:** Datasets are immutable per upload — a new file is a new ID, never a
mutation, which is the right default for audit. The model persists via joblib with its
training metadata and held-out metrics stored alongside; boot validates the artifact
(0.36s warm start). What's missing for production — and I'll name it before you do —
is experiment tracking and a model registry: MLflow is the tool I'd reach for, and
drift monitoring is the trigger I'd retrain on.
**DEPTH SIGNAL:** Immutability-as-audit-policy connects versioning to the project
thesis instead of leaving it as ops trivia.
**THE TRAP:** Pretending an MLOps stack exists. Name the gap first; it disarms.
**CONFIDENCE:** ★★★★☆

---
**Q30 — QUESTION:** Your NLP analyzer — what is it technically, and why no transformer?
**THEIR INTENT:** Buzzword resistance, deployment realism.
**MY ANSWER:** Entity extraction plus curated BSA/AML/OFAC/FinCEN term matching plus a
transparent weighted risk score — every driving signal is listed in the output, and
the recommendation (File SAR / Investigate / Monitor) is rule-mapped from the score.
No transformer because the requirement was *explainable* signal detection in a
compliance narrative: a fine-tuned BERT would add latency, hosting, and opacity to
beat a baseline I can fully audit. When semantic similarity is genuinely needed,
embeddings slot in as a candidate generator *feeding* the explainable layer.
**DEPTH SIGNAL:** "In FCC, 'why was this flagged' is a legal question. My answer is a
list of matched signals; a transformer's answer is a 400-dimensional shrug."
**THE TRAP:** Apologizing for rules. Explainability is the requirement; you met it.
**CONFIDENCE:** ★★★★★

---

## CHAPTER 4: The Failure Tribunal

---
**Q31 — QUESTION:** What happens when someone uploads a corrupted or hostile file?
**THEIR INTENT:** Unhappy-path maturity.
**MY ANSWER:** Parsing is wrapped and typed: unreadable files return a clean 4xx with
a human message, never a stack trace — a global error handler guarantees that
invariant product-wide. Size caps bound resources; parsers are pandas/openpyxl only —
no eval, no pickle, no user-controlled paths. Hostile *content* (injection-shaped
column names, formula-looking cells) is inert: data is data, never executed, and
anything user-originated that reaches SQL goes through the sandbox.
**DEPTH SIGNAL:** "The error handler is also a security control — stack traces are
reconnaissance gifts."
**THE TRAP:** Only discussing format errors when they also mean malice.
**CONFIDENCE:** ★★★★★

---
**Q32 — QUESTION:** Tell me about a real bug that hurt. Not a typo — one that taught you.
**THEIR INTENT:** Scar tissue check. Specificity = credibility.
**MY ANSWER:** The SQL console file-read. An adversarial test in my injection corpus
asked DuckDB to `read_csv` an arbitrary server path — and it worked. My guard had
focused on mutation keywords and missed read-side table functions. The fix was
layered: engine-level `enable_external_access=False` so the class is dead even if the
guard regresses, guard rules for function calls, and the attack enshrined as a
permanent regression test. Lesson: enumerate badness fails; capability removal works.
**DEPTH SIGNAL:** "My own tests found it before any human did — that's the entire
argument for adversarial testing in one anecdote."
**THE TRAP:** Picking a trivial bug. This question is a gift; spend it on the scar
with a security lesson.
**CONFIDENCE:** ★★★★★

---
**Q33 — QUESTION:** What happens when the Gemini API is down mid-demo?
**THEIR INTENT:** Dependency failure design.
**MY ANSWER:** Nothing visible breaks — that's the architecture. Every GenAI call has
a deterministic fallback doing the same job plainly: template summaries, rule-based
NL→SQL. Failures and timeouts degrade to fallback automatically, and `/api/health`
reports which mode is live so the degradation is *honest* rather than silent. CI runs
with no API key at all, which means the fallback path is the most-tested path in the
product.
**DEPTH SIGNAL:** "Optional dependencies should fail like a power outage in a
hospital — backup generators, and a sign saying you're on them."
**THE TRAP:** "I'd catch the exception." That's a try/except, not a design.
**CONFIDENCE:** ★★★★★

---
**Q34 — QUESTION:** Kill the server mid-investigation. What state survives?
**THEIR INTENT:** Crash-consistency thinking.
**MY ANSWER:** Datasets survive — disk-backed store. The model survives — joblib
artifact. Completed, persisted investigations survive in Postgres with their chains
intact and verifiable. The in-flight investigation dies and restarts clean — no
partial chain is ever persisted, which is deliberate: a half-written tamper-evident
record is worse than none, because it trains people to accept broken chains.
**DEPTH SIGNAL:** Atomicity as an audit principle, not just a database property.
**THE TRAP:** Claiming resumable investigations exist. Clean-restart is the honest,
defensible design.
**CONFIDENCE:** ★★★★☆

---
**Q35 — QUESTION:** What error handling do you have at the API boundary?
**THEIR INTENT:** Operational hygiene basics.
**MY ANSWER:** A global exception middleware that converts anything unexpected into a
structured JSON error with the right status code and zero internals leaked; typed
validation errors from Pydantic for malformed requests; per-IP rate limiting with 429s;
optional API-key auth with 401s. Frontend-side, error boundaries wrap every route so
one panel's failure renders a contained fallback instead of white-screening the app.
**DEPTH SIGNAL:** The pairing matters: backend never leaks, frontend never collapses —
failure is contained at both ends of the wire.
**THE TRAP:** Listing only happy-path middleware. They asked about errors; lead with
the worst case.
**CONFIDENCE:** ★★★★★

---
**Q36 — QUESTION:** What's the worst thing a malicious *authenticated* user could do?
**THEIR INTENT:** Threat modeling past the perimeter.
**MY ANSWER:** Honest answer: resource abuse is the live surface — large uploads and
expensive queries within the caps; rate limiting bounds it but a determined user
wastes compute. Data exfiltration is scoped to *their own uploads* — the SQL sandbox
denies filesystem and catalog access. The audit trail records their analyses, so abuse
is at least attributable. What they can't do: touch other datasets, reach the disk,
mutate the audit history, or forge an investigation chain.
**DEPTH SIGNAL:** Naming attribution as a control — "in FCC products, the audit trail
is also the deterrent."
**THE TRAP:** "Nothing, it's secure." Every system has a worst thing; knowing yours
is the credential.
**CONFIDENCE:** ★★★★☆

---
**Q37 — QUESTION:** A user disputes a number on the dashboard. Walk me through the resolution.
**THEIR INTENT:** Support thinking + the product's own thesis under fire.
**MY ANSWER:** This is the product's home turf. Step one: click "how was this
computed?" on the disputed figure — the exact formula and inputs are displayed, so the
conversation immediately becomes about *method*, not trust. Step two: reproduce in the
SQL console against the same dataset — independent verification inside the product.
Step three: if method is wrong, that's a bug with a failing test now attached; if data
is wrong, the profiler's quality report usually already flagged the cause. Disputes
are a feature path, not a crisis.
**DEPTH SIGNAL:** "Most BI disputes end in 'trust the tool.' Mine end in 'check the
formula' — that difference is the entire product."
**THE TRAP:** Treating it as a people problem. The architecture answers this question.
**CONFIDENCE:** ★★★★★

---
**Q38 — QUESTION:** What don't you handle? Name the unhandled edge cases.
**THEIR INTENT:** Inventory honesty under pressure.
**MY ANSWER:** A real list: multi-sheet Excel beyond the first sheet; encodings beyond
UTF-8/Latin-1 family handling; streaming/incremental uploads; concurrent dashboard
edits last-write-wins rather than merge; timezone-naive timestamps assumed consistent;
no resumable investigations; no per-column user overrides of inferred types yet. Each
is a known cut with a reason — mostly scope discipline — and the list lives in my own
docs, not just this answer.
**DEPTH SIGNAL:** Having the list *ranked* (type overrides first — highest user value
per effort) shows product judgment on top of honesty.
**THE TRAP:** A short list. A short list means you haven't looked.
**CONFIDENCE:** ★★★★★

---
**Q39 — QUESTION:** How would you debug a report that the dashboard is "slow"?
**THEIR INTENT:** Method under vagueness.
**MY ANSWER:** First, make "slow" measurable: which view, which dataset size, network
or compute — the Prometheus metrics give request latency percentiles to localize
backend versus frontend. Backend suspects: profiling on first load (cached after),
large SQL results. Frontend suspects: too many chart re-renders on drag, the canvas
re-laying-out. Then one hypothesis at a time with a measurement per step — the same
discipline as the investigator, applied to myself.
**DEPTH SIGNAL:** "First question: slow *since when* — regressions have timestamps,
and timestamps have commits."
**THE TRAP:** Jumping to fixes ("I'd memoize") before measurement.
**CONFIDENCE:** ★★★★☆

---
**Q40 — QUESTION:** Your hash chain — break it for me. What does it NOT protect against?
**THEIR INTENT:** Do you know the boundaries of your flagship security claim?
**MY ANSWER:** Three honest limits. It proves integrity after sealing, not execution —
mitigated by embedding the literal SQL and statistics so every step is re-runnable.
It doesn't authenticate the *author* — no signature, so it proves "untampered," not
"untampered by whom"; signing keys are the production answer. And it lives where it's
stored — an attacker who can rewrite the entire chain *and* the stored root
consistently wins; anchoring the root hash externally (even a daily digest email)
closes that. I built tamper-evidence; attestation is the enterprise layer above it.
**DEPTH SIGNAL:** Unprompted enumeration of your own feature's limits is the
single most senior-sounding move available to you. Use it.
**THE TRAP:** Overclaiming "blockchain-grade." It's a hash chain; precision is the brand.
**CONFIDENCE:** ★★★★★

---

## CHAPTER 5: The Scale Hearing

---
**Q41 — QUESTION:** 10x users tomorrow. What breaks first?
**THEIR INTENT:** Bottleneck intuition in order.
**MY ANSWER:** In order: synchronous profiling occupies workers under concurrent
uploads — the request path backs up first. Then memory: the dataset cache holds
frames for active sessions. DuckDB query concurrency strains third. Postgres,
honestly, yawns at 10x. First fixes: async job queue for ingestion, LRU eviction with
spill-to-disk on the store, per-user query concurrency caps — in that order, measured
before each.
**DEPTH SIGNAL:** Ordering by *when* things break, with the measurement step named,
is the difference between intuition and recitation.
**THE TRAP:** "Add more servers" — the store is stateful; horizontal scaling without
fixing state is two servers with two truths.
**CONFIDENCE:** ★★★★★

---
**Q42 — QUESTION:** And 100x? Redesign it.
**THEIR INTENT:** Can you architect beyond your build?
**MY ANSWER:** At 100x the shape changes: object storage (S3-style) for datasets with
a metadata DB; ingestion/profiling as queue-fed workers, horizontally scaled;
analytical SQL moves to a warehouse tier or DuckDB-over-Parquet on workers; the API
tier goes stateless behind a load balancer; per-tenant model training with a registry
and drift-triggered retrains; the audit trail partitions by tenant and time. The
*thesis* survives unchanged — provenance and honest metrics — which is exactly the
part that shouldn't scale away.
**DEPTH SIGNAL:** Noting what you'd keep (the trace, the evaluation discipline)
signals architecture as values, not just boxes.
**THE TRAP:** Microservices confetti. Name the state, the queue, and the tenancy
model and you've out-answered most candidates.
**CONFIDENCE:** ★★★★☆

---
**Q43 — QUESTION:** Where is the single most expensive computation in the product?
**THEIR INTENT:** Performance literacy — do you know your own cost centers?
**MY ANSWER:** Initial profiling of a wide dataset — per-column distributions,
missingness, semantic voting, pairwise relationship statistics; that last one is the
quadratic-ish offender on wide files. It's why profiles compute once and cache, why
the 200k-row sampling guard exists, and why relationship discovery caps candidate
pairs by heuristic pre-filtering. Model *training* is heavier but amortized — it
persists; profiling is per-upload and user-facing.
**DEPTH SIGNAL:** "Wide beats long as the enemy here — columns drive the pair count;
rows just scale linearly under the sample guard."
**THE TRAP:** Guessing the model. Training is amortized; the user-facing hot path is
profiling.
**CONFIDENCE:** ★★★★☆

---
**Q44 — QUESTION:** How would you add multi-tenancy?
**THEIR INTENT:** Enterprise-readiness thinking.
**MY ANSWER:** Tenant ID as a first-class column from the front door: auth resolves
tenant; the dataset store namespaces by tenant; every Postgres audit row carries
tenant ID with row-level security as the enforcement backstop; models train per
tenant (fraud patterns are not transferable across institutions — that's domain, not
just isolation). The SQL sandbox already scopes to one dataset, which becomes
scoped-to-tenant-dataset naturally.
**DEPTH SIGNAL:** The per-tenant *model* point is the differentiator — isolation
isn't only security, it's statistical correctness.
**THE TRAP:** Treating tenancy as "add a WHERE clause." RLS + namespacing + model
isolation or it's a demo.
**CONFIDENCE:** ★★★★☆

---
**Q45 — QUESTION:** Your model trains on 284k transactions. Production sees billions. What changes?
**THEIR INTENT:** ML-at-scale realism.
**MY ANSWER:** Almost everything except the discipline. Training moves to distributed
or smart-sampled pipelines — fraud is so rare that stratified sampling keeps minority
signal while taming volume. Feature engineering becomes a feature store problem
(velocity features need streaming aggregation). Evaluation needs temporal splits —
random splits leak future into past at scale. Scoring becomes a latency-budgeted
online service. The held-out honesty, threshold-as-policy, and per-decision
explainability — those transfer untouched; they were never scale-dependent.
**DEPTH SIGNAL:** Temporal leakage is the expert flag — random CV on time-ordered
fraud data flatters every metric.
**THE TRAP:** "Same thing, bigger machine." Billions change the *shape*, not just
the size.
**CONFIDENCE:** ★★★★☆

---
**Q46 — QUESTION:** What would you monitor in production, and what pages someone at 3 a.m.?
**THEIR INTENT:** Operational maturity; alert taste.
**MY ANSWER:** Already instrumented: request latency/error rates via Prometheus.
Production adds: ingestion queue depth, profile latency percentiles, model score
distribution drift (the silent killer — the model degrades without erroring), GenAI
fallback rate, and chain verification failures. Pages at 3 a.m.: chain verification
failure (integrity incident, not a bug), error-rate spikes, queue saturation. Doesn't
page: drift (morning review), fallback mode (it's designed degradation).
**DEPTH SIGNAL:** Distinguishing "wakes a human" from "morning coffee review" is
alert taste — the rarest operational skill.
**THE TRAP:** Monitoring everything equally. Alert fatigue is how real incidents get
slept through — in monitoring *and* in AML queues; same disease.
**CONFIDENCE:** ★★★★☆

---
**Q47 — QUESTION:** Does your stack change if Verita went real-time — streaming transactions?
**THEIR INTENT:** Batch-vs-stream architectural flexibility.
**MY ANSWER:** The ingestion front changes species: a stream processor (Kafka-shaped)
with windowed aggregations replaces file upload; velocity features compute on the
stream; scoring becomes a low-latency online endpoint the queue feeds. What survives:
the scoring model and its evaluation discipline, the audit trail (now per-event), the
investigator as a *periodic* deep-dive over windows, and DuckDB for the analyst's
retrospective SQL. Batch and stream coexist — the lambda-ish reality every fraud shop
runs.
**DEPTH SIGNAL:** "Alert latency is a product decision before an architecture one —
blocking pre-auth scoring and analyst-queue scoring are different SLAs and different
systems."
**THE TRAP:** Rebuilding everything for streaming when half the value is
retrospective analysis.
**CONFIDENCE:** ★★★☆☆

---
**Q48 — QUESTION:** Cloud deployment — sketch it on this whiteboard.
**THEIR INTENT:** Infra vocabulary in practice.
**MY ANSWER:** Containerized already, so: API containers behind a load balancer
(ECS/Cloud Run tier), managed Postgres (RDS-shape) for audit, object storage for
datasets, a queue (SQS-shape) feeding ingestion workers, model artifacts in object
storage with versioned pulls, Prometheus-compatible managed monitoring, secrets in a
manager not env files, CI deploying on green. Single region, boring services,
infrastructure-as-code — the architecture is already 12-factor-ish because compose
forced the discipline.
**DEPTH SIGNAL:** "The compose file is the rehearsal for this diagram — same five
boxes, managed."
**THE TRAP:** Kubernetes-by-default. Name it as the later answer when service count
justifies the control plane.
**CONFIDENCE:** ★★★★☆

---
**Q49 — QUESTION:** Frontend performance: the dashboard has 12 live charts. How is that not slow?
**THEIR INTENT:** Client-side perf literacy beyond "React is fast."
**MY ANSWER:** ECharts renders to canvas, so chart paint cost doesn't touch the DOM;
React's reconciliation means a drag re-renders the moved panel, not twelve; the
Three.js scene is a lazy-loaded route chunk so the app never pays for the landing's
theater; layouts persist locally so reloads skip recomputation. The honest remaining
cost is initial data fetch per panel — batched per dashboard rather than per chart.
**DEPTH SIGNAL:** Knowing *why* canvas beats SVG at this chart count (DOM node
explosion) marks real frontend literacy.
**THE TRAP:** "Vite makes it fast." Build speed ≠ runtime speed; interviewers enjoy
that confusion too much.
**CONFIDENCE:** ★★★★☆

---
**Q50 — QUESTION:** What's your capacity plan for the demo I'm about to ask you to run?
**THEIR INTENT:** Sneaky-practical: did you engineer the demo itself?
**MY ANSWER:** Yes, deliberately: the model is pre-persisted (0.36s boot, no 21s
retrain ambush), the sample dataset profiles in interactive time, the whole stack
runs local with zero network dependencies — GenAI falls back deterministically if the
venue Wi-Fi dies — and `start.bat` boots everything in one click. The demo has the
same engineering standard as the product because the demo *is* a production incident
with an audience.
**DEPTH SIGNAL:** "I rehearsed failure: I've run the demo with networking off. It
degrades exactly as designed."
**THE TRAP:** Laughing it off. They're asking whether you think operationally about
*your own* events.
**CONFIDENCE:** ★★★★★

---

## CHAPTER 6: The Wisdom Test

---
**Q51 — QUESTION:** What was your hardest trade-off, and how did you decide?
**THEIR INTENT:** Decision quality under constraint — the actual job.
**MY ANSWER:** Impressive-demo versus defensible-evidence on the investigator. The
LLM-driven version demos better — fluent, surprising, alive. The deterministic version
replays identically and survives a regulator. I chose by asking whose judgment I was
optimizing for: a hiring panel watching three minutes, or the domain the product
claims to serve. Choosing the domain *became* the differentiator — the trade-off
resolved itself once I named the real customer.
**DEPTH SIGNAL:** "Naming the decision criterion out loud — 'who is this for' — is
the transferable skill; the specific call is just its output."
**THE TRAP:** Offering a fake trade-off ("tabs vs spaces energy"). Spend this on the
thesis-level decision.
**CONFIDENCE:** ★★★★★

---
**Q52 — QUESTION:** What do you regret about this project?
**THEIR INTENT:** Can you self-assess without self-flagellating?
**MY ANSWER:** Not writing the frontend's design-token system on day one — I knew
better and chose speed, and the inline-style debt now takes a week that would have
cost a day. Smaller regret: not recording my AI-collaboration sessions more
systematically from the start; the transparency page I built later would have been
even stronger with full provenance from week one. Both regrets are process regrets —
the architecture I'd keep.
**DEPTH SIGNAL:** Regretting *process* rather than *outcome* signals someone who
iterates on how they work, not just what they make.
**THE TRAP:** "My only regret is not having more time" — the non-answer they've
heard a thousand times.
**CONFIDENCE:** ★★★★★

---
**Q53 — QUESTION:** If you joined and we told you Verita's approach was wrong for our stack — then what?
**THEIR INTENT:** Ego check; can you hold conviction and humility simultaneously?
**MY ANSWER:** Then I'd want to know *which layer* is wrong, because the project is
separable: the specific tools are swappable opinions; the evaluation discipline and
provenance thesis are the part I'd advocate for harder — and even there, your team
has context I don't: scale, legacy, regulatory specifics. I built Verita alone in
weeks; you've built products serving real institutions for years. I'd expect to be
wrong about implementation and useful about principles, and I'd want the code review
that proves which is which.
**DEPTH SIGNAL:** Separating swappable-opinions from defensible-principles is the
maturity move — it shows your convictions have a structure.
**THE TRAP:** Total capitulation reads as no spine; total defense reads as
uncoachable. The answer is the layering.
**CONFIDENCE:** ★★★★★

---
**Q54 — QUESTION:** What does "done" mean to you?
**THEIR INTENT:** Standards probe — interns who can define done are deployable.
**MY ANSWER:** Done means the claim is tested, the failure mode is handled, and the
work shows its work. Concretely from my own checklist: feature behavior under test,
unhappy path returns something humane, metrics honest, docs current, demo
reproducible from a clean machine. "It works on my machine" is the *start* of done.
And done is per-claim, not per-project — software is never done; *statements about
software* can be.
**DEPTH SIGNAL:** "Done is when someone who distrusts me could verify it without me
in the room" — the FCC-flavored definition.
**THE TRAP:** Perfectionism cosplay ("done is never!"). They want a shipping
standard, not a philosophy seminar.
**CONFIDENCE:** ★★★★★

---
**Q55 — QUESTION:** Where will this project be in a year if you keep going?
**THEIR INTENT:** Vision with feet on the ground.
**MY ANSWER:** V2 is already scoped and the engines are installed: SHAP per-prediction
explanations completing the show-your-work thesis at the model layer; XGBoost and
LightGBM entering the model tournament with Optuna tuning — same honest selection,
stronger competitors; async ingestion killing the file-size ceiling. The more
interesting answer: ideally it stops being *my* project — the best outcome for a
thesis is a team with real scale adopting the principles and retiring my
implementation.
**DEPTH SIGNAL:** "Installed, not aspirational" — naming that the V2 dependencies
already sit in requirements.txt converts vision into evidence.
**THE TRAP:** Feature-list sprawl. Three priorities with reasons beat ten with none.
**CONFIDENCE:** ★★★★★

---
**Q56 — QUESTION:** What's the most important thing you don't know?
**THEIR INTENT:** Epistemics under pressure; the map of your own ignorance.
**MY ANSWER:** What production FCC data actually looks like — the messiness, the
scale, the regulatory edge cases that only exist inside institutions. I built against
public datasets and published patterns, which gets me to "credible"; only inside a
team like yours does "credible" become "correct." Technically: I haven't operated
distributed systems under real load — I've designed for it on paper and I know paper
isn't the territory. That gap is roughly *why I'm applying*.
**DEPTH SIGNAL:** Converting the ignorance map into the motivation for the role —
without it sounding rehearsed — is the close-tier move.
**THE TRAP:** Naming a trivium ("I don't know Rust"). They asked for important.
**CONFIDENCE:** ★★★★★

---
**Q57 — QUESTION:** Teach me something from this project in two minutes. Anything.
**THEIR INTENT:** Communication under open-endedness; teaching as mastery test.
**MY ANSWER:** The hash chain, with hands. Step one is a record — hypothesis, query,
result. Fingerprint it: SHA-256, sixty-four hex characters, changes utterly if one
comma changes. Step two's fingerprint includes step one's fingerprint *inside* it —
that's the chain. Now alter step one after the fact: its fingerprint changes, so step
two's no longer matches, so step three's doesn't — the whole chain visibly snaps
downstream of the lie. Ten lines of code, and an AI investigation becomes evidence a
third party can verify without trusting me. That's the entire project in one
structure: *trust nothing, verify everything, make verification cheap.*
**DEPTH SIGNAL:** Ending a teaching answer with the project's thesis sentence lands
the "this person has a worldview" impression.
**THE TRAP:** Choosing something generic (what's an API). Teach the thing only you
brought.
**CONFIDENCE:** ★★★★★

---
**Q58 — QUESTION:** What engineering opinion do you hold that most people would push back on?
**THEIR INTENT:** Independent thought; conviction quality.
**MY ANSWER:** That for analytical AI products, *evaluation infrastructure should be
built before the feature* — tests, metrics, adversarial corpora first, capability
second. Most builders call that backwards; ship-then-harden is the industry default.
But every claim Verita makes survives scrutiny precisely because the scrutiny was
built first — my injection corpus predates my SQL console's public face, and it
caught a real vulnerability as payment. In FCC, I'd argue it's not even an opinion;
it's the job description.
**DEPTH SIGNAL:** A concrete payoff story (the corpus catch) elevates this from hot
take to tested position.
**THE TRAP:** Manufactured edginess ("comments are useless"). The opinion must have
a receipt.
**CONFIDENCE:** ★★★★☆

---
**Q59 — QUESTION:** How do you learn something completely new? Walk me through your actual process.
**THEIR INTENT:** Meta-skill audit — interns are hired for learning velocity.
**MY ANSWER:** Verita *is* the process, observable: start with a real artifact to
build (never a tutorial); learn the minimum to make one true thing run; interrogate
an expert — for me, AI tooling — with "why" until I can re-derive the answer; then
attack my own understanding with tests until it breaks somewhere instructive. Class
imbalance, injection defense, hash chains — none came from courses; all came from the
build colliding with reality and me refusing to route around the collision.
**DEPTH SIGNAL:** "Artifact-first, adversarial-always" as a two-word summary of your
learning style gives them a handle to remember you by.
**THE TRAP:** "I watch tutorials and take notes." True for everyone; evidence for
nothing.
**CONFIDENCE:** ★★★★★

---
**Q60 — QUESTION:** Last one. Convince me this isn't just a very good demo.
**THEIR INTENT:** The final boss: substance versus theater, stated plainly.
**MY ANSWER:** Demos hide their seams; Verita documents them — the scalability
ceilings, the unhandled edge cases, and the code review findings are written down
*by me*, in the bundle in front of you. Demos fabricate; this has zero hardcoded
metrics, and you can verify that claim by dropping in your own CSV right now — the
product has no script to fall off. Demos avoid attack; this ships an adversarial test
corpus that already drew blood once. And demos end — the audit trail, CI, Docker, and
82 tests are the parts nobody builds for theater. The honest framing: it's a small
product with a real thesis, demo-polished on the *outside* because interviews are
demos. The inside was built for the regulator who never claps.
**DEPTH SIGNAL:** The offer is the proof: "your CSV, right now." Make it and mean it.
**THE TRAP:** Protesting too much. One concrete falsifiable offer beats five
assurances.
**CONFIDENCE:** ★★★★★
