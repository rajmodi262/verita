# Level 3 — For the Skeptical Senior Engineer

*Audience: has seen everything, assumes intern projects are tutorials in a trench coat.
Voice: precise, honest, no adjectives that aren't earned.*

---

## Stack, justified

| Choice | Why, technically |
|---|---|
| **FastAPI** over Flask/Django | Pydantic request/response models give validated, typed contracts and free OpenAPI docs; async-capable for later streaming; minimal ceremony for a service that is 90% computation. Django's ORM/admin would be dead weight — persistence here is an audit datamart, not an object graph. |
| **Pandas + NumPy + SciPy + scikit-learn** | The JD names them, but also: the profiling engine is vectorized end-to-end (no row loops), SciPy supplies the actual tests (Welch t-test, η²), sklearn supplies GBM + IsolationForest with proper train/test discipline. |
| **DuckDB** for user SQL | In-process, columnar, zero infra, reads dataframes natively. Crucially it has *engine-level* sandbox flags (`enable_external_access=False`) — the security model doesn't rest on my regex alone. |
| **PostgreSQL** for the audit trail | Append-mostly writes, queried by time — a relational store with SQLAlchemy is correct and boring. Boring is a feature in an audit path. |
| **React 18 + TS + Vite** | Typed API client mirrors the Pydantic schemas; ECharts because it handles 10k-point series without choking and theme-ability beats Recharts; react-grid-layout for the editable canvas rather than reinventing drag physics. |
| **joblib persistence** | Model warm-boot 0.36 s vs 21 s retrain. Persisted artifacts + checksum > clever lazy training. |
| **Gemini, optional** | GenAI as progressive enhancement: NL→SQL and narrative summaries when a key exists, deterministic fallbacks when not, `/api/health` reports which mode is live. The system never silently degrades. |

## The defensible-but-controversial decision

**The autonomous investigator is deterministic-first, LLM-second.** Hypothesis
generation comes from the data's *shape* (column semantics, distributions), tests are
real SQL + statistics, and the LLM only narrates the memo when present. A senior
engineer might say "that's not really agentic AI, that's a planner with templates."
My defense: in FCC, that's exactly the point. The plan is reproducible, the evidence is
queryable, the trace is hash-chained — sacrifice open-ended cleverness, gain a
regulator-defensible artifact. I'd rather defend "too deterministic" than "can't
explain itself." It's a thesis, not an accident.

## Scalability ceiling, located honestly

- **Profiling is synchronous and in-memory.** A 200k-row sampling guard caps cost, but
  the ceiling is a single worker's RAM and request timeout; ~low-GB files break the
  UX. Fix: chunked/Polars profiling + async jobs. Known, not built.
- **Dataset store is disk-backed local state.** Survives restart; does not survive
  horizontal scaling. Two replicas = two truths. Fix: object store + metadata DB.
- **DuckDB per-request over the cached frame** is fine to ~10 concurrent analysts,
  not 1,000. The audit datamart (Postgres) scales independently and would be fine.
- **The model is global, not per-tenant.** Real deployment needs per-portfolio
  training, drift monitoring, scheduled retrains. The persistence + metrics plumbing
  for that exists; the orchestration doesn't.

Ceiling summary: **single-team analytical tool today; the seams for a service are cut
in the right places.**

## Security surface

- **Ingress:** optional `X-API-Key` middleware, per-IP rate limiting, global error
  handler that never leaks stack traces.
- **User SQL:** the headline risk. Defense in depth: SELECT-only allowlist, comment
  stripping/rejection, catalog-access denial, and DuckDB's own
  `enable_external_access=False`. Covered by an adversarial injection corpus in CI —
  which **caught a real file-read vulnerability before shipping** (a query path could
  reach `read_csv` on arbitrary paths; now engine-blocked + guard-blocked + regression-tested).
- **Uploads:** parsed with pandas/openpyxl only, size-capped; no pickle, no eval, no
  user-controlled paths.
- **Secrets:** env-only (`.env.example` documents them); no keys in repo; CI is green
  without any secret present — the fallback paths are the tested paths.
- **Honest gap:** no CSRF story (token-header auth, no cookies — acceptable), no
  dependency scanning yet in CI (pip-audit/npm audit are installed and next), and the
  audit trail authenticates the *chain*, not the *operator* — operator identity is a
  production requirement I'd add first.

## What a code review would find

Being honest, because pretending otherwise is the fastest way to fail this audience:

1. **Inline styles across the React frontend** instead of a tokenized stylesheet
   discipline — it shipped fast, it reads worse than it behaves, and a design-token
   refactor is queued.
2. **A `main.py` router that has grown past single-responsibility** — endpoint
   handlers do orchestration that belongs in a service layer; testable, but the
   boundaries smear.
3. **Heuristic blocks in semantic typing with magic thresholds** (e.g. cardinality
   ratios). They're tested at the behavior level, but a reviewer would rightly ask for
   the thresholds to be named constants with rationale comments.
4. **Mixed sync/async** — FastAPI handlers are async but call sync pandas under the
   hood; correct (FastAPI threadpools sync work) but a purist would want explicit
   `run_in_executor` boundaries.
5. **Test pyramid is integration-heavy** — 72 backend tests lean toward API-level
   assertions; unit coverage of the profiler's edge heuristics is thinner than I'd
   accept from myself next time.

None of these embarrass me; all of them are on the board. The codebase's redeeming
quality is that its *claims* are all tested: the metrics are held-out, the SQL guard is
attacked in CI, the hash chain has tamper tests, and there are exactly **0** fabricated
numbers in product code. The discipline went where the thesis lives.
