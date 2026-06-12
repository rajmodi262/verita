# Fill In These Placeholders

*Everything known was pre-filled (name, email, GitHub, project facts — all real and
sourced from the repo). What remains is below. One file controls most of it.*

## The one file that matters: `00-design-system/identity.tex`

Every LaTeX document reads its personal tokens from this single file. Edit once,
recompile, done:

| Macro | Currently | Action |
|---|---|---|
| `\MyPhone` | `[MY_PHONE]` | your phone number |
| `\MyLinkedin` | `[MY_LINKEDIN]` | linkedin.com/in/... |
| `\InterviewDate` | `[INTERVIEW_DATE]` | e.g. `24 June 2026` |
| `\BuildWeeks` | `[X]` | honest number of weeks, zero → shipped |

Pre-filled and worth double-checking: `\MyName` (Raj Modi), `\MyEmail`
(rajmodi262@gmail.com), `\MyGithub` (github.com/rajmodi262/verita), all `\Stat*`
numbers (sourced from the repo on 2026-06-12).

## Markdown files (CTRL+F these tokens)

| Token | Appears in | Action |
|---|---|---|
| `[X] weeks` / `\BuildWeeks` | origin myth, HR answers, pitches | same number as identity.tex |
| `[INTERVIEW_DATE]` | (none — md files avoid dates) | — |

## Judgment calls to make before printing

1. **The ROC-AUC discrepancy** — the landing page hero chip says `0.97`; the JD map
   and this entire package say the honest **0.913 held-out**. Fix the landing chip
   before the demo (the package's integrity story depends on it — and HR13 literally
   tells this anecdote).
2. **QR codes** — two placeholders exist (HR bundle p.10, business card front).
   Generate a QR for the GitHub repo (any generator), save as `qr-github.png`, and
   either swap into the TikZ or paste physically onto printed cards. Or leave the
   frames empty — they read as deliberate minimalism.
3. **The offer letter** — decide the night before whether your read of the company
   suggests it will land. Pack it regardless; decide in the room (rule: two real
   laughs first).
4. **`docs/screenshots/`** — the comic and newspaper reference the product
   truthfully; no action needed, but refresh screenshots if the UI changed this week.

## Verification pass (10 minutes, after filling)

```bash
grep -rn "MY_PHONE\|MY_LINKEDIN\|INTERVIEW_DATE\|\[X\]" THE-MASTERPACK --include="*.tex" --include="*.md"
```

Empty output = clean. Then `./compile-masterpack.sh` and flip every PDF once.
