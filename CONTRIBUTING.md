# Contributing to Verita

Verita is a portfolio project demonstrating Financial Crime & Compliance (FCC) data science
capabilities. These contribution guidelines exist because **solo discipline is how you earn
the right to team discipline**.

---

## Development Setup

**One command to boot everything:**
```bash
# Windows
start.bat

# Manual
cd backend && uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev
```

**Requirements:**
- Backend: Python 3.10+ · all deps in `requirements.txt` · `pip install -r requirements.txt`
- Frontend: Node 20+ · `npm ci && npm run dev`
- Tests: `cd backend && python -m pytest -q` · `cd frontend && npm run test`

---

## Code Standards

### Backend
- **Formatting:** `black .` (line length 100)
- **Linting:** `ruff check .`
- **Imports:** absolute only (no relative `..` chains in production code)
- **Types:** all public functions must have type annotations

### Frontend
- **TypeScript:** `"strict": true` in `tsconfig.json` — must pass with zero errors
- **Styles:** CSS design tokens from `index.css` for static values; inline styles only for
  computed/animated values (Framer Motion). Inline style instances are tracked in `brutal-honest-self-review.md`.
- **No `any`:** unless accompanied by a comment explaining why it's unavoidable

### Tests
- New features need tests before merge.
- The SQL injection corpus in `tests/test_sql_guard.py` is **non-negotiable** — it must always
  pass. These are real attack vectors that were found during development.
- Backend test command: `python -m pytest -q`
- Frontend test command: `npm run test`

---

## The One Rule (It's the Whole Thesis)

> **No fabricated metrics. If a number appears in the product, it must be computed from real
> data at request time, and it must have a formula attached.**

Hardcoding a performance metric (e.g., ROC-AUC: 0.97) when the actual value is different
constitutes a **constitutional violation** — see `THE-MASTERPACK/06-the-artifacts/constitution.pdf`,
Article II.

The product enforces this architecturally:
- All model metrics are computed from the held-out test set at request time.
- The Investigator's findings are the output of real DuckDB SQL queries — not templates.
- The hash chain proves the findings were not altered after the fact.

---

## Commit Message Format

```
type(scope): brief description (imperative, present tense)

Body (optional): explain WHY, not WHAT. The diff shows what.
```

**Types:** `feat` · `fix` · `refactor` · `test` · `docs` · `chore` · `harden`

**Examples:**
```
feat(risk): add SHAP TreeExplainer for per-prediction explanations
fix(hero): correct ROC-AUC chip from training-inflated 0.97 to held-out 0.913
harden(chain): add UTC timestamps to hash payload for temporal tamper-evidence
docs(arch): add ARCHITECTURE.md with design decision rationale
```

---

## Adding a New Endpoint

1. **Engine method** — add the computation to `ml/risk_engine.py` or the relevant engine.
2. **Service function** — add the business logic to `services/risk_service.py`.
3. **Router** — add a thin HTTP wrapper to `routers/risk.py` (≤ 10 lines per endpoint).
4. **Test** — add a test in `tests/`.
5. **Docs** — update the endpoint docstring and the router's module docstring.

---

## Architecture Reference

See [ARCHITECTURE.md](ARCHITECTURE.md) for system design, technology decisions, and known debt.
