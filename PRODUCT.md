# Product

## Register

product

> The app workspace (Studio, Risk, NLP, Overview, Settings) is the default register.
> The landing page (`/`) runs in **brand** register per-task — it is the narrative showpiece.

## Users

Two audiences, layered:

1. **Primary: recruiters and hiring managers** (specifically the Wolters Kluwer FSS/FCC Data
   Science panel) evaluating craft in a ~3-minute demo. Their context: skimming many portfolios,
   deciding fast. The job: be convinced this candidate ships production-grade, honest, auditable
   data work. See `JD_FEATURE_MAP.md` for the traceability matrix.
2. **In-fiction: compliance analysts and FCC investigators** screening transactions for fraud/AML.
   Their context: regulated work where every number must be defensible to a regulator. The job:
   investigate, score, and document financial crime with a full evidence trail.

Design choices must serve both: the demo audience needs immediate visual conviction; the
in-fiction analyst needs density, provenance, and zero ambiguity.

## Product Purpose

Verita is a Financial Crime & Compliance intelligence platform: drop a CSV → instant editable
BI-grade dashboard, real ML fraud scoring, plain-English querying, and the flagship **Auditable
Compliance Investigator** — an autonomous agent whose entire reasoning trace is hash-chained and
tamper-evident. The thesis: agentic AI is unusable in finance if it's a black box, so Verita makes
every auto-generated number show its formula and every agent decision show its query.

Success: a reviewer finishes the 3-minute demo (`docs/DEMO_SCRIPT.md`) convinced of both the
engineering and the design thesis — and the interface itself reads as evidence of the honesty
policy, not a costume over it.

## Brand Personality

**Forensic, confident, alive.**

- *Forensic*: evidentiary, tamper-evident, case-file. The Forensic Ledger identity (paper, ink,
  stamps, hash chains, wax seals) **leads** the brand; its DNA migrates into the app over time.
- *Confident*: committed choices, generous type, no hedging chrome. Expensive, not loud.
- *Alive*: premium purposeful motion — things draw, count, seal, and verify in front of you.
  Motion demonstrates the system working; it never decorates idleness.

Voice: an investigator presenting evidence — precise, declarative, lightly dramatic. Never
marketing-fluffy, never sterile-corporate.

## Anti-references

- **Generic dark-AI-SaaS template**: near-black canvas + aurora/mesh gradient glows +
  glassmorphism cards + gradient text. This is the saturated 2025 AI-startup look — and it is
  Verita's *own legacy aesthetic* (the "luminous aurora" v2 system in `docs/design-system.md`
  and the top of `frontend/src/index.css`). The Forensic Ledger direction supersedes it: new
  surfaces should pull from ledger DNA (ink, paper, stamps, evidentiary texture, mono
  micro-labels), and existing aurora surfaces are migration candidates, not patterns to extend.

## Design Principles

1. **Show the work.** Provenance is the product: every metric exposes its formula, every agent
   step its query, every chain its hash. UI should surface "how was this computed?" affordances
   prominently, never bury them.
2. **Tamper-evident by design.** The hash-chain is a design language, not just a feature —
   integrity, sealing, and verification should be *visible and felt* (chains, seals, stamps,
   verification ticks) wherever trust is the message.
3. **The demo is the user journey.** Every screen must land its point within seconds for a
   skimming evaluator. Lead with the most convincing artifact; cut anything that needs
   explanation to impress.
4. **Honesty over spectacle.** No fabricated numbers, no `random()` charts, no motion that
   implies computation that didn't happen. If it animates, it's animating real state.
5. **Ledger leads, machine follows.** The forensic case-file identity is canonical. When
   touching app surfaces, prefer migrating toward ink/evidence DNA over extending the legacy
   aurora/glass system.

## Accessibility & Inclusion

- **WCAG AAA contrast (7:1 body text, 4.5:1 large text).** A deliberate, strict bar — it
  constrains the ledger's ink-on-paper palette (`--ink` on `--paper` must hold 7:1), the UV-mode
  palette, and all muted-text tokens. Audit both worlds.
- **Full `prefers-reduced-motion` alternatives.** The site is motion-heavy (custom cursor,
  magnetic buttons, stamp slams, scroll reveals, 3D signal field); every effect needs a crossfade
  or instant fallback, and the custom cursor must yield to the native one.
- Keyboard-navigable app workspace; touch devices get native cursor and tap-safe interactions.
