# The Tech Dictionary — With Attitude

*Every technology in Verita. One entry each. Memorize the INTERVIEW ANSWER lines;
deploy the analogies based on who's across the table.*

---

═══════════════════════════════
**FASTAPI** `[backend framework]`
═══════════════════════════════
**OFFICIAL DEFINITION:** Modern, high-performance Python web framework with automatic
OpenAPI documentation and Pydantic-based validation.
**WHAT IT ACTUALLY DOES HERE:** Every endpoint — upload, profile, SQL, risk scores,
the investigator — is a FastAPI route with typed, validated request/response models.
**ANALOGY (grandma):** The reception desk of the building — checks who you are, takes
your parcel, gives you a numbered receipt, never loses a package.
**ANALOGY (friends):** Flask after a montage. Same Python, but it types fast, validates
everything, and writes its own documentation like Hermione.
**ANALOGY (engineers):** Flask's ergonomics with Pydantic contracts and free Swagger —
the boilerplate evaporates and the API docs can't drift from the code.
**WHY NOT THE ALTERNATIVE:** Django ships an ORM, admin, and template engine I'd never
use here; Flask would need five plugins to match what FastAPI does natively.
**INTERVIEW ANSWER:** "I chose FastAPI because validation and documentation come from
the type system itself — my request models are contracts, and `/docs` is always
current. For a data-service API that's mostly computation, it's the highest
signal-to-ceremony ratio in Python."
**FUN FACT:** Created by Sebastián Ramírez in 2018; it out-benchmarks many Go
frameworks in TechEmpower rounds thanks to Starlette + uvloop underneath.
**IF I REMOVED IT:** The brain still works but loses its mouth — no API, no docs, no
validation layer.

═══════════════════════════════
**PANDAS** `[data manipulation]`
═══════════════════════════════
**OFFICIAL DEFINITION:** Python library providing DataFrame structures for tabular
data analysis.
**WHAT IT ACTUALLY DOES HERE:** Parses every upload, powers the profiler (types,
missingness, distributions), and feeds every chart, insight, and model.
**ANALOGY (grandma):** A clever kitchen helper who can sort a sack of mixed beans by
type, count them, and tell you which jar is half-empty — in one motion.
**ANALOGY (friends):** Excel if Excel were a programming language and could bench-press
a million rows without crying.
**ANALOGY (engineers):** The columnar lingua franca — every other tool here (DuckDB,
sklearn, ECharts via JSON) speaks DataFrame at the border.
**WHY NOT THE ALTERNATIVE:** Polars is faster, but pandas is the JD-named, ecosystem-
default choice with universal interop; performance ceilings are handled by sampling
guards instead.
**INTERVIEW ANSWER:** "Pandas is the spine of the backend — everything from semantic
type inference to the forecast tournament is vectorized DataFrame work. I avoided
row-wise loops everywhere; profiling a 200k-row file stays interactive."
**FUN FACT:** The name is from "panel data," an econometrics term — not the animal.
**IF I REMOVED IT:** The entire data layer goes dark; nothing downstream has anything
to compute on.

═══════════════════════════════
**NUMPY** `[numerical computing]`
═══════════════════════════════
**OFFICIAL DEFINITION:** Fundamental package for N-dimensional array computation in
Python.
**WHAT IT ACTUALLY DOES HERE:** The raw math under pandas and sklearn — array ops for
distributions, outlier bounds, feature matrices.
**ANALOGY (grandma):** The multiplication tables the whole school secretly relies on.
**ANALOGY (friends):** The bass player. You don't notice it until it's gone and
suddenly nothing has rhythm.
**ANALOGY (engineers):** The C-backed memory layout everything else is a view over.
**WHY NOT THE ALTERNATIVE:** There isn't one; NumPy *is* the substrate.
**INTERVIEW ANSWER:** "NumPy is where the vectorization actually happens — my outlier
detection and feature engineering are array operations, not Python loops, which is why
profiling stays in interactive time."
**FUN FACT:** Its array interface is so canonical that competitors (PyTorch, JAX)
deliberately mimic its API.
**IF I REMOVED IT:** Python becomes a calculator with a queue.

═══════════════════════════════
**SCIKIT-LEARN** `[machine learning]`
═══════════════════════════════
**OFFICIAL DEFINITION:** Python ML library covering classical algorithms, model
selection, and metrics.
**WHAT IT ACTUALLY DOES HERE:** GradientBoostingClassifier scores fraud;
IsolationForest flags anomalies; train_test_split + ROC/PR tooling keep the metrics
honest (held-out ROC-AUC 0.913 on 284k real transactions).
**ANALOGY (grandma):** A sniffer dog you train on old cases so it can point at new
suspicious parcels — and a strict examiner who only grades it on parcels it's never
smelled.
**ANALOGY (friends):** The Pokémon trainer toolkit: train, evaluate, never let your
model fight gyms it memorized.
**ANALOGY (engineers):** The reference implementation of "fit/predict + honest
evaluation" — boring API, bulletproof metrics module.
**WHY NOT THE ALTERNATIVE:** Deep learning is the wrong tool for 8 tabular features
and an explainability mandate; XGBoost/LightGBM are now installed as tournament
challengers, but sklearn's GBM was the right, explainable baseline.
**INTERVIEW ANSWER:** "I used sklearn end to end — GBM plus IsolationForest — and the
detail I'd highlight is evaluation discipline: every reported number is held-out, the
threshold slider exposes the precision/recall trade-off live, and with 0.17% fraud I
report PR-AUC because accuracy would be a lie."
**FUN FACT:** Started as a Google Summer of Code project in 2007.
**IF I REMOVED IT:** The Risk Engine becomes a rules list; pillar two collapses.

═══════════════════════════════
**SCIPY** `[statistics]`
═══════════════════════════════
**OFFICIAL DEFINITION:** Scientific computing library; here, its `stats` module.
**WHAT IT ACTUALLY DOES HERE:** The Welch t-tests, p-values, and effect sizes behind
Key Findings — the actual mathematics under "how was this computed?"
**ANALOGY (grandma):** The notary who won't let you say "everyone agrees" unless
enough people actually signed.
**ANALOGY (friends):** The friend who replies "source?" — except it *is* the source.
**ANALOGY (engineers):** Where the p-values come from, so the insights engine never
ships vibes as findings.
**WHY NOT THE ALTERNATIVE:** statsmodels is heavier than needed; hand-rolling tests is
how you fail an FCC audit.
**INTERVIEW ANSWER:** "Every Key Finding is backed by a real test — Welch t-test for
group differences, with the exact scipy call shown in the UI. The JD lists hypothesis
testing; in Verita it's a shipped, clickable feature."
**FUN FACT:** Welch's t-test (1947) doesn't assume equal variances — which real
financial segments never have.
**IF I REMOVED IT:** "Findings" become opinions.

═══════════════════════════════
**DUCKDB** `[analytical SQL engine]`
═══════════════════════════════
**OFFICIAL DEFINITION:** In-process columnar OLAP database — "SQLite for analytics."
**WHAT IT ACTUALLY DOES HERE:** Runs the SQL Playground directly over the uploaded
DataFrame, read-only, with external access disabled at the engine level.
**ANALOGY (grandma):** A librarian who answers any question about the books in *this*
room but physically cannot leave the room.
**ANALOGY (friends):** A pocket-size data warehouse — no server, no setup, query your
file like it's a database because it now is one.
**ANALOGY (engineers):** Vectorized OLAP in-process; zero infra; and the sandbox flags
mean the security model isn't just my regex.
**WHY NOT THE ALTERNATIVE:** SQLite is row-oriented and slow for aggregation; Postgres
for *this* job would add a server to query a file; Spark would be a yacht in a bathtub.
**INTERVIEW ANSWER:** "DuckDB gives analysts real SQL over their upload in
milliseconds, in-process. I run it with external file access disabled and a SELECT-only
guard in front, and there's an adversarial injection test corpus that tries to break it
in CI — it caught a real file-read vulnerability before shipping."
**FUN FACT:** Named after the lead developer's pet duck, Wilbur.
**IF I REMOVED IT:** The SQL console and NL→SQL die; analysts lose their power tool.

═══════════════════════════════
**POSTGRESQL + SQLALCHEMY** `[audit persistence]`
═══════════════════════════════
**OFFICIAL DEFINITION:** Production relational database + Python's standard ORM/SQL
toolkit.
**WHAT IT ACTUALLY DOES HERE:** The audit datamart — analyses, query log, investigation
records persisted append-style; the institutional memory.
**ANALOGY (grandma):** The town registry office. Slow-changing, fireproof, official.
**ANALOGY (friends):** The save file. DuckDB is gameplay; Postgres is what survives the
crash.
**ANALOGY (engineers):** Boring, correct, durable — exactly what an audit path should
be. DuckDB computes; Postgres remembers.
**WHY NOT THE ALTERNATIVE:** Mongo for an audit trail invites schema drift in the one
place schemas are the contract; SQLite (the dev fallback) caps concurrency.
**INTERVIEW ANSWER:** "I split engines by job: DuckDB for ephemeral analytics over
uploads, Postgres for the durable audit datamart. The JD says data lakes and datamarts
— this is that pattern at portfolio scale, and I can walk through the schema."
**FUN FACT:** Postgres descends from Berkeley's POSTGRES project (1986) — older than
the web.
**IF I REMOVED IT:** The product gets amnesia; "auditable" loses its noun.

═══════════════════════════════
**REACT 18 + TYPESCRIPT** `[frontend]`
═══════════════════════════════
**OFFICIAL DEFINITION:** Component-based UI library + statically-typed JavaScript.
**WHAT IT ACTUALLY DOES HERE:** The entire interface — Studio canvas, Risk Engine,
NLP analyzer, Investigator, landing — typed against the API's schemas.
**ANALOGY (grandma):** Lego instructions where every brick is labeled and pieces that
don't fit literally refuse to click.
**ANALOGY (friends):** React builds the cockpit; TypeScript is the co-pilot slapping
your hand before you flip the wrong switch.
**ANALOGY (engineers):** Pydantic on the server, TS interfaces on the client — the
same contract enforced on both ends of the wire.
**WHY NOT THE ALTERNATIVE:** Vue/Svelte are fine; React has the deepest ecosystem for
grid layouts and chart wrappers, and TS-over-JS is non-negotiable once an API has
this many shapes.
**INTERVIEW ANSWER:** "TypeScript mirrors my Pydantic models, so a payload change
breaks the build instead of the demo. `tsc` runs clean in CI alongside 10 Vitest
component tests."
**FUN FACT:** React's reconciliation ("virtual DOM diffing") is why a 12-panel
dashboard re-renders one panel, not twelve, on drag.
**IF I REMOVED IT:** The product becomes a very honest JSON API with no face.

═══════════════════════════════
**VITE** `[build tool]`
═══════════════════════════════
**OFFICIAL DEFINITION:** Frontend build tool with native-ESM dev server and optimized
production bundling.
**WHAT IT ACTUALLY DOES HERE:** Dev server with sub-second hot reload; code-split
production bundle (the Three.js scene lazy-loads so it never blocks first paint).
**ANALOGY (grandma):** A kitchen where the taste-test happens the instant you add salt.
**ANALOGY (friends):** Webpack without the loading screen.
**ANALOGY (engineers):** esbuild-pre-bundled deps, rollup for prod, lazy chunks for
the heavy WebGL — sane defaults I barely had to configure.
**WHY NOT THE ALTERNATIVE:** Webpack config is a part-time job; CRA is deprecated.
**INTERVIEW ANSWER:** "Vite gave me instant feedback in dev and code-splitting in
prod — the 3D hero loads as its own chunk with a static fallback, so the landing never
pays for WebGL it hasn't shown yet."
**FUN FACT:** French for "fast"; created by Evan You of Vue fame.
**IF I REMOVED IT:** Development slows from seconds to sighs.

═══════════════════════════════
**ECHARTS** `[visualization]`
═══════════════════════════════
**OFFICIAL DEFINITION:** Apache's declarative, canvas-based charting library.
**WHAT IT ACTUALLY DOES HERE:** Every chart — KPIs, time series with forecast
overlays and confidence bands, histograms, heatmaps, the force-directed relationship
map, the world choropleth.
**ANALOGY (grandma):** The art student who can draw any graph you describe, neatly,
on the first try.
**ANALOGY (friends):** The chart library with the cheat codes — world maps and physics
graphs are just config.
**ANALOGY (engineers):** Declarative option objects → my recommendation engine can
*generate* chart specs as data. That's the whole auto-dashboard trick.
**WHY NOT THE ALTERNATIVE:** Recharts struggles past a few thousand points; D3 is an
artisanal workshop when I needed a factory with 12 product lines.
**INTERVIEW ANSWER:** "ECharts is declarative, so my backend recommends charts as
JSON specs and the frontend just renders them — the recommendation engine and the
renderer stay decoupled. Canvas rendering keeps 10k-point series smooth."
**FUN FACT:** Apache top-level project, originally from Baidu.
**IF I REMOVED IT:** The dashboard becomes a table. Tables don't get screenshots.

═══════════════════════════════
**THREE.JS (+ react-three-fiber)** `[3D / WebGL]`
═══════════════════════════════
**OFFICIAL DEFINITION:** JavaScript 3D library over WebGL; r3f binds it to React.
**WHAT IT ACTUALLY DOES HERE:** The landing's "financial signal field" — 2,600
additive-blended particles drifting like a living transaction graph, parallaxing
toward the cursor.
**ANALOGY (grandma):** The fancy window display that makes people walk into the shop.
**ANALOGY (friends):** The intro cinematic before the game menu.
**ANALOGY (engineers):** One contained WebGL flex: lazy-loaded chunk, FPS-capped,
static gradient fallback, additive blending instead of a postprocessing pass.
**WHY NOT THE ALTERNATIVE:** CSS can't do volumetric depth; a video would weigh more
than the framework.
**INTERVIEW ANSWER:** "It's the one deliberate piece of theater — and it's engineered
like product code: code-split, capped, with a fallback so first paint never blocks.
Even the showmanship has an SLA."
**FUN FACT:** Three.js predates WebGL itself — it began on canvas in 2010.
**IF I REMOVED IT:** The landing loses its goosebumps; the product loses nothing.
That separation is deliberate.

═══════════════════════════════
**FRAMER MOTION** `[animation]`
═══════════════════════════════
**OFFICIAL DEFINITION:** Declarative animation library for React.
**WHAT IT ACTUALLY DOES HERE:** The landing's choreography — stamps that slam,
sections that verify in, the scroll-drawn chain — all spring physics, all respecting
`prefers-reduced-motion`.
**ANALOGY (grandma):** The difference between a door that swings shut nicely and one
that bangs.
**ANALOGY (friends):** The animation director who works in "stiffness and damping"
instead of keyframes.
**ANALOGY (engineers):** Interruptible spring animations on transform/opacity only —
no layout thrash, and the reduced-motion media query is honored everywhere.
**WHY NOT THE ALTERNATIVE:** Raw CSS can't do scroll-linked springs cleanly; GSAP is
now installed for the next iteration's pinned sequences — they'll coexist.
**INTERVIEW ANSWER:** "Motion in Verita is evidence, not decoration — things animate
when the system does something real, and every animation has a reduced-motion
fallback. Accessibility was a constraint from day one, not a retrofit."
**FUN FACT:** Its `useScroll` returns motion *values*, not events — animation off the
React render path.
**IF I REMOVED IT:** The story still tells; it stops feeling alive.

═══════════════════════════════
**ZUSTAND** `[state management]`
═══════════════════════════════
**OFFICIAL DEFINITION:** Minimal hook-based state store for React.
**WHAT IT ACTUALLY DOES HERE:** Global app state — theme, dataset/session state —
without Redux's ritual.
**ANALOGY (grandma):** One shared noticeboard in the hallway instead of memos passed
through every room.
**ANALOGY (friends):** Redux after therapy.
**ANALOGY (engineers):** A store in ~1 kB: subscribe-on-select, no providers, no
actions liturgy.
**WHY NOT THE ALTERNATIVE:** Redux Toolkit is justified at 50 reducers; context-only
re-renders too broadly for canvas interactions.
**INTERVIEW ANSWER:** "State that's truly global is small here — zustand keeps it
explicit without ceremony, and panel-level state stays local where it belongs."
**FUN FACT:** German for "state." The same team also ships react-three-fiber.
**IF I REMOVED IT:** Prop-drilling, the horror genre.

═══════════════════════════════
**REACT-GRID-LAYOUT** `[dashboard canvas]`
═══════════════════════════════
**OFFICIAL DEFINITION:** Draggable, resizable grid layout system for React.
**WHAT IT ACTUALLY DOES HERE:** The Power-BI-style editable canvas — drag, resize,
remove panels; layout persists per dataset.
**ANALOGY (grandma):** Fridge magnets that remember where you left them.
**ANALOGY (friends):** The Power BI canvas without the Power BI license.
**ANALOGY (engineers):** Collision-handling grid physics I had no business
hand-rolling in a portfolio timeline.
**WHY NOT THE ALTERNATIVE:** dnd-kit is a primitive, not a grid system; building grid
collision from scratch is a week of bugs disguised as a weekend.
**INTERVIEW ANSWER:** "The JD says Power BI — so the canvas behaves like one: drag,
resize, persist. I bought the physics and spent my innovation budget on what's *in*
the panels."
**FUN FACT:** Maintained by the team behind BitMEX's trading UI — it's load-tested by
people who move money for a living.
**IF I REMOVED IT:** The dashboard freezes into a report. "Editable" was the point.

═══════════════════════════════
**DOCKER + DOCKER COMPOSE** `[packaging]`
═══════════════════════════════
**OFFICIAL DEFINITION:** Container runtime + multi-service orchestration file.
**WHAT IT ACTUALLY DOES HERE:** One `docker compose up` boots backend, frontend,
Postgres, Prometheus, and Grafana — the full stack, reproducibly.
**ANALOGY (grandma):** Instead of mailing a recipe and praying about their kitchen,
you mail the finished dish in a self-heating box.
**ANALOGY (friends):** "Works on my machine" — shipped as a product feature.
**ANALOGY (engineers):** Compose as executable architecture documentation: five
services, one command, same bytes everywhere.
**WHY NOT THE ALTERNATIVE:** Kubernetes for a single-node demo is cosplay; bare
venvs don't ship a monitoring stack.
**INTERVIEW ANSWER:** "The whole platform — app, database, metrics, dashboards — is
one compose command. Reviewers don't install anything; that's respect for their time,
and it's the same posture as production packaging."
**FUN FACT:** Docker's 2013 demo at PyCon was five minutes long and changed the
industry's deployment model.
**IF I REMOVED IT:** Setup instructions grow from one line to one page, and pages rot.

═══════════════════════════════
**GITHUB ACTIONS** `[CI]`
═══════════════════════════════
**OFFICIAL DEFINITION:** GitHub-native continuous integration pipelines.
**WHAT IT ACTUALLY DOES HERE:** Every push runs 72 pytest + 10 Vitest + `tsc` + the
production build. Green badge or it didn't happen.
**ANALOGY (grandma):** A teacher who marks every page of homework the moment you
write it — even at 3 a.m.
**ANALOGY (friends):** The gym buddy who actually counts your reps.
**ANALOGY (engineers):** The enforcement layer of the honesty policy — the injection
corpus and the hash-chain tamper tests run on every commit.
**WHY NOT THE ALTERNATIVE:** Jenkins is self-hosted overhead for one repo; the code
lives on GitHub already.
**INTERVIEW ANSWER:** "CI runs the full test matrix on every push — including the
adversarial SQL corpus. The claims in my README are enforced by a robot, not by my
memory."
**FUN FACT:** The CI config is itself version-controlled — the pipeline has a code
review trail.
**IF I REMOVED IT:** Quality becomes a mood.

═══════════════════════════════
**PROMETHEUS + GRAFANA** `[monitoring]`
═══════════════════════════════
**OFFICIAL DEFINITION:** Metrics collection + visualization stack.
**WHAT IT ACTUALLY DOES HERE:** Instrumented FastAPI metrics (latency, request
counts) scraped by Prometheus, dashboarded in Grafana via compose.
**ANALOGY (grandma):** The doctor's chart at the foot of the bed — pulse and
temperature, always current.
**ANALOGY (friends):** The app's fitness tracker.
**ANALOGY (engineers):** `prometheus-fastapi-instrumentator` on the request path;
the observability reflex installed early, even at demo scale.
**WHY NOT THE ALTERNATIVE:** A SaaS APM for a portfolio project is a credit-card
subscription pretending to be architecture.
**INTERVIEW ANSWER:** "Monitoring is in the compose file because a data product you
can't observe is a black box at the infrastructure layer — and the whole project is a
campaign against black boxes."
**FUN FACT:** Prometheus was SoundCloud's internal tool; now it's the CNCF's
second-ever graduated project after Kubernetes.
**IF I REMOVED IT:** Production readiness drops from "demonstrated" to "claimed."

═══════════════════════════════
**GOOGLE GEMINI (optional)** `[GenAI]`
═══════════════════════════════
**OFFICIAL DEFINITION:** Google's LLM family, used via API.
**WHAT IT ACTUALLY DOES HERE:** When a key is present: richer executive summaries,
NL→SQL, narrated investigator memos. When absent: deterministic engines do the same
jobs plainly, and `/api/health` reports which mode is live.
**ANALOGY (grandma):** A guest speaker who makes the report read beautifully — but
the accountants did the numbers either way.
**ANALOGY (friends):** DLC. The campaign is complete without it.
**ANALOGY (engineers):** Progressive enhancement for GenAI: LLM narrates, never
computes; fallback paths are the tested paths; no silent degradation.
**WHY NOT THE ALTERNATIVE:** The pattern is provider-agnostic — Gemini had the
friction-free key for a public demo; swapping providers is a config change.
**INTERVIEW ANSWER:** "GenAI in Verita follows one rule: the LLM narrates, the
engines compute. Numbers never come from the model, so there's nothing to
hallucinate — and the system honestly reports which mode it's running."
**FUN FACT:** The fallback architecture means CI passes with zero API keys —
the demo gods cannot be bribed, so they were made unnecessary.
**IF I REMOVED IT:** Sentences get plainer. Not one number changes. By design.

═══════════════════════════════
**PYTEST + VITEST** `[testing]`
═══════════════════════════════
**OFFICIAL DEFINITION:** Python and Vite-native test frameworks.
**WHAT IT ACTUALLY DOES HERE:** 72 backend tests (profiling edge cases, API
contracts, the SQL injection corpus, hash-chain tamper checks) + 10 frontend
component tests. 82 total, green in CI.
**ANALOGY (grandma):** Tasting the dish at every step, not just hoping at the table.
**ANALOGY (friends):** Save points, but they also tell you *why* you died.
**ANALOGY (engineers):** Integration-leaning pyramid with adversarial corpora where
the risk concentrates — the tests attack the product's actual claims.
**WHY NOT THE ALTERNATIVE:** unittest is pytest with more typing; Jest needs a
transformer pipeline Vitest gets free from Vite.
**INTERVIEW ANSWER:** "82 tests, and the ones I'm proudest of are adversarial — a
SQL injection corpus that caught a real file-read vulnerability before shipping, and
tamper tests that try to forge the hash chain. I test the thesis, not just the
functions."
**FUN FACT:** The injection corpus reads like a tiny museum of attack techniques —
comment smuggling, catalog probing, path tricks.
**IF I REMOVED IT:** The honesty policy becomes an honor system.

═══════════════════════════════
**CLAUDE CODE** `[AI build partner]`
═══════════════════════════════
**OFFICIAL DEFINITION:** Anthropic's agentic coding assistant — terminal-native,
codebase-aware.
**WHAT IT ACTUALLY DOES HERE:** Built *with* me, not *for* me: boilerplate, API
research, debugging sessions, refactoring sweeps — at conversation speed, with every
output reviewed and every decision mine.
**ANALOGY (grandma):** A tireless apprentice who's read every manual ever printed —
but the master still decides what gets built and signs the work.
**ANALOGY (friends):** Pair programming with someone who has perfect recall, infinite
patience, and zero ego — you're still driving.
**ANALOGY (engineers):** A force multiplier on implementation speed that moves the
bottleneck to judgment: architecture, taste, verification. Which is exactly where a
human should sit.
**WHY NOT THE ALTERNATIVE:** Copilot autocompletes lines; this collaborates at the
level of systems — multi-file refactors, test-driven loops, "now attack my SQL guard."
**INTERVIEW ANSWER:** "I used Claude Code the way your teams will use AI tooling: as
acceleration under human judgment. Every output was reviewed, every metric
independently verified, and there's a designed page in my tech bundle showing exactly
what the AI did versus what I did. The judgment in this project is human. The speed
is not."
**FUN FACT:** This interview package was also produced in that workflow — the meta-
demonstration is intentional.
**IF I REMOVED IT:** The same project takes a semester instead of weeks — and the
candidate in front of you knows measurably less, because the fastest way I learned
was interrogating an expert that never tires.
