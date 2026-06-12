# JD Dissection — Forensic Analysis of the Wolters Kluwer Posting

*Source: "Intern – Data Science," Wolters Kluwer FSS/FCC organization.
Method: read what they wrote, then read what they meant, then read what they'll
actually decide on. The full keyword→feature trace lives in the repo's
`JD_FEATURE_MAP.md`; this file is the interpretation layer above it.*

---

## SECTION 1: THE SURFACE REQUIREMENTS
*What they literally wrote → my literal evidence.*

| They wrote | My evidence |
|---|---|
| "Develop intelligent dashboards… using Python" | Auto-Dashboard Studio: upload → instant editable dashboard; FastAPI + pandas backend powering every panel |
| "Tableau/Power BI" | Power-BI-style editable canvas (drag/resize/persist) — rebuilt the experience, not the license |
| "advanced visualization techniques" | ECharts suite: KPI, line+forecast, donut, histogram, heatmap, force-graph relationship map, world choropleth |
| "automated data pipelines" | upload → profile → recommend → render pipeline, disk-backed store, cached profiles |
| "predictive analytics / forecasting (Revenue, Volume, Cost)" | Forecast overlay: 3-model backtested tournament, MAPE shown, 95% CI bands |
| "machine learning models" | GradientBoosting + IsolationForest on ULB 284k; held-out ROC-AUC 0.913, PR-AUC 0.65; live threshold slider |
| "statistical modeling / hypothesis testing" | Welch t-tests with p-values shipped as clickable Key Findings; Pearson + η² relationship mining |
| "feature engineering" | 8-feature risk pipeline (amount_log, velocity, channel/geo/kyc risk…) |
| "deep EDA" | Profile Rail: semantic types, distributions, missingness, quality score with itemized deductions |
| "Data Lakes and Datamarts" | DuckDB analytical engine + PostgreSQL audit datamart (analyses + query log persisted) |
| "SQL" | Real DuckDB console, read-only sandboxed, injection-tested |
| "NLP techniques" | Compliance analyzer: entities + BSA/AML/OFAC/FinCEN matching + transparent risk score |
| "Generative AI" | Gemini-enhanced summaries and NL→SQL with deterministic fallback; agentic investigator with LLM-narrated memo |
| "automate decision-making workflows" | ⭐ the Investigator: plans hypotheses → tests with SQL → cited memo → hash-chained trace |
| "scenario analysis" | "What changed?" period diffs + Time Machine playback |
| "stakeholder reporting" | One-click print-ready PDF report; executive summary auto-narrative |
| "communication & collaboration" | README, demo script, JD map — and this Masterpack, which is the skill performed live |

**Surface verdict: every named capability has a shipped, tested feature. Two partial
coverages, both named-tool literacy (Tableau/Power BI licenses), both addressed with
honest talking points rather than pretense.**

## SECTION 2: THE HIDDEN REQUIREMENTS
*What they didn't write but will absolutely test for.*

**"Good communicator" at a legal-tech company means:** precision under questioning,
documentation that survives audit, zero ambiguity between claim and evidence. Generic
candidates hear "friendly." This company means *deposition-grade clarity*.
→ My demonstration: every insight in the product carries its formula; every claim in
this package carries its source; the brutal-honest self-review pre-answers the audit.

**"AI exposure" here does NOT mean prompt enthusiasm.** Wolters Kluwer publicly
positions on *responsible, domain-grounded AI* — their products carry professional
liability. The hidden requirement is: can this person use AI without creating risk?
→ My demonstration: the AI-transparency page, the verification rules, the
deterministic-first investigator, the "LLM narrates, engines compute" doctrine.

**"Intern" means: cheap to manage.** The hidden spec is self-direction, status
legibility (does the manager always know where your work stands?), and mistake
non-repetition.
→ My demonstration: a solo project run with team disciplines — CI, documented debt,
roadmaps — plus a written "how to manage me" answer (HR28).

**"FCC organization" means: the customer is afraid.** Compliance officers buy tools
to *reduce personal and institutional risk*. Features that increase confidence
matter more than features that increase capability.
→ My demonstration: the entire thesis. Auditability isn't my feature; it's their
purchase motive, made executable.

## SECTION 3: THE CULTURE SIGNALS
*Reading the JD's language like a document examiner.*

- The JD enumerates **named tools** (Python, Tableau/Power BI, SQL) rather than
  abstractions → a delivery culture that values concrete competence over theory.
  *Adaptation: lead every answer with the artifact, then the principle.*
- **"Cross-functional collaboration" + "stakeholder reporting"** appear in an intern
  JD → interns here are visible to non-engineers early. They're hiring someone safe
  to put in front of adults.
  *Adaptation: the HR bundle exists precisely for this; rehearse the stakeholder
  voice as hard as the technical one.*
- The pairing of **"predictive AND prescriptive"** → a team that ships decisions,
  not just analyses. Outputs end in recommended actions.
  *Adaptation: always narrate features to their action: the NLP analyzer ends in
  File SAR / Investigate / Monitor — say that sentence.*
- The formal, structured JD voice (responsibility areas, skills matrix) → process
  maturity; documentation will be read, not skimmed.
  *Adaptation: never wing a claim. They are a citation culture; cite.*

## SECTION 4: THE THREE THINGS THEY WILL ACTUALLY DECIDE ON
*Not the official criteria. The real ones.*

**1. "Can this person learn fast enough to be worth the supervision?"**
Verita's answer: zero-to-shipped FCC product in [X] weeks, with the learning *visible*
— the brutal self-review documents what was hard, the roadmap shows the slope. Slope
is the asset; the bundle is the slope made legible.

**2. "Will they embarrass us — in front of a client, an auditor, or our own seniors?"**
Verita's answer: the entire honesty architecture. A candidate whose product refuses
to fabricate numbers, who discloses AI use unprompted, who brings their own code
review — that's the anti-embarrassment profile. The interview's composure work
(war room, body language) closes the loop.

**3. "Are they hungry — or are we one of forty applications?"**
Verita's answer is structural: nobody builds a JD-mapped product, 82 tests, and a
designed print package for one of forty applications. The Masterpack's existence is
this answer. It cannot be faked, which is why it works.
