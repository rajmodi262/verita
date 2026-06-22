# How to Explain Verita — Your Complete Layman's Guide

> You don't need to know how to code to explain this project well. You need to know
> **what it does, why it matters, and what makes it special.** This guide gives you all
> of that in plain English, plus a **word-for-word script for every page** at the end.
>
> Read Parts 1–7 once to understand. Memorise Part 1. Keep Part 8 (the script) open
> when you walk in.

---

## How to use this guide

- **Part 1** — the 60-second pitch. Memorise it. If you only learn one thing, learn this.
- **Part 2** — the project in plain English (the story you tell).
- **Part 3** — every technical word, explained like you're five, with simple analogies.
- **Part 4** — the three main parts of the product.
- **Part 5** — what each of the 6 posters shows.
- **Part 6** — questions you might get, with simple answers.
- **Part 7** — what to do if you don't know an answer (stay calm, here's how).
- **Part 8** — THE SCRIPT: exactly what to say for each page of the Tech and HR bundles.

**The golden rule:** You built a *tool that solves a real problem*. You can always explain
the **problem** and the **result** even if you can't explain the **code**. Lead with those.

---

## Part 1 — The 60-second pitch (memorise this)

> "Verita is a tool for fighting financial crime. Banks have to check huge files of
> transactions for fraud and money-laundering. Today that takes hours of setup, and worse —
> when an analyst flags something, they often can't *prove why*, and in finance you can't
> act on a number you can't defend to a regulator.
>
> Verita fixes that. You drop in a file and in seconds you get three things: a dashboard
> that explains your data, a fraud-risk score for every transaction, and a sealed,
> tamper-proof report a regulator could check. The one rule behind everything is:
> **every number it shows, it can prove.** It even shows *why* it flagged each transaction,
> and it honestly admits what it can't do.
>
> I built it against the Wolters Kluwer Financial Crime & Compliance role — so instead of
> sending a list of skills, I shipped the actual thing the job is about."

That's it. If you can say that calmly, you've already won most of the room.

---

## Part 2 — The project in plain English

**The world it lives in.** Banks and financial firms are legally required to watch for
financial crime — fraud, money-laundering, sanctions-busting. This whole area is called
**FCC: Financial Crime & Compliance.** Wolters Kluwer makes software for exactly this.

**The problem.** An analyst opens a file with hundreds of thousands of transactions. Two
things go wrong every day:
1. **Lost time** — before they see a single insight, an hour is gone just setting up charts.
2. **No trust** — even when they spot something suspicious, they often can't *explain why*
   in a way that holds up to a regulator. And a number you can't defend is useless.

**The solution — Verita.** Drop in a file. In seconds you get:
- **A dashboard** that explains the data (no Power BI to learn).
- **A fraud-risk score** for every transaction — and the *reason* for each score.
- **A sealed investigation** — a tamper-proof report that can be re-checked.

**The big idea (the "thesis").** Most analytics tools are *black boxes*: they give you a
number and say "trust me." Verita's rule is the opposite — **every number shows its work.**
Click any figure and it shows the exact formula. Every AI decision shows the question it
asked the data. And the whole thing is sealed so nothing can be quietly changed. *In
compliance, "trust me" is never good enough — that's why this matters.*

**The honesty angle (very important).** Verita never makes up numbers. Everything is
calculated from the real data, live. It even publishes a list of things the model *cannot*
do. Honesty is treated as a feature, not a weakness — because regulators reward it.

---

## Part 3 — Every concept, explained like you're five

Use these analogies. They're accurate enough and easy to say.

**Dataset / CSV / Excel file** — just a big spreadsheet of transactions (date, amount,
who, where). "CSV" is a plain spreadsheet file.

**Machine Learning (ML)** — instead of writing rules by hand, you show a computer *millions
of past examples* (transactions that were fraud and not-fraud) and it *learns the patterns*
on its own. Like a veteran bank teller who's seen so many transactions they can sense when
one is "off."

**The model** — the trained "brain" that scores new transactions. Verita uses two:
- **GradientBoosting** — the main fraud-scorer. Think of it as a *team of simple rules that
  each fix the previous one's mistakes*, building up to a very sharp judge.
- **IsolationForest** — a second opinion that spots *weird, unusual* transactions even if
  it's never seen that exact fraud before. Like a guard who notices "that doesn't belong here."

**Training vs "held-out" (this one is gold)** — When you teach the model, you *hide* a chunk
of the data and never let it study that part. Then you test it on the hidden part. It's like
**studying with practice questions but being graded on a brand-new exam.** If it does well on
questions it has *never seen*, you know it actually *learned* — it didn't just memorise.
Verita only ever reports scores on this hidden "held-out" data. That's what "honest metrics"
means.

**ROC-AUC = 0.913** — a score from 0.5 (random guessing) to 1.0 (perfect) for how well the
model separates fraud from normal. 0.913 is strong. *But* —

**Why PR-AUC = 0.65 matters MORE (the smart point to make)** — Fraud is incredibly rare:
only **0.17%** of transactions (about 17 in every 10,000). When something is that rare,
the usual scores look *too good* and hide the real challenge. Picture **finding a few needles
in an enormous haystack.** ROC-AUC can look brilliant even while you flag a lot of hay.
PR-AUC is the *honest* score — it measures how much hay you wrongly flag for each real needle.
**Saying "PR-AUC matters more in fraud because the data is so imbalanced" is the single line
that makes you sound like you really understand machine learning.**

**Class imbalance** — the fancy name for "fraud is super rare (0.17%)." Because it's rare, a
lazy model that says "never fraud" would be 99.83% "accurate" and completely useless. That's
why plain "accuracy" is misleading here, and why we use PR-AUC.

**Confusion matrix** — a simple 2×2 scorecard: how many frauds we *caught* (good), how many we
*missed* (bad), and how many normal transactions we *falsely flagged* (annoying). It's just a
way to see the trade-offs.

**SHAP (the "show your work" feature)** — For any single transaction, SHAP breaks the score
into *reasons*. Like a maths student showing their working: "I flagged this mainly because the
amount was unusually large (+0.34), the customer was high-risk (+0.28), and it happened at an
odd hour (+0.12); the fact it was a domestic payment pulled the risk down a bit (−0.09).
Final score: 0.79." **That turns a mysterious number into a sentence an analyst can defend.**

**Cross-validation (5-fold)** — to be extra sure the good score wasn't luck, we re-test the
model *five different ways* on five different splits of the data. If it scores well every
time, the result is *stable* and trustworthy — not a fluke.

**The hash chain / "tamper-proof" / "sealed" (the flagship idea)** — Every step of an
investigation gets a unique digital fingerprint (a "hash"), and each fingerprint includes the
previous one — like a **chain of wax seals where breaking one breaks the whole chain.** If
anyone secretly changes a single step, all the following fingerprints stop matching, and you
can *prove* it was tampered with. "SHA-256" is just the (very secure) method used to make the
fingerprints. This is why the investigation is "tamper-evident" and a regulator could re-check it.

**AML typologies** — known *patterns of money-laundering*. The investigator checks for five:
- **Structuring** — breaking a big amount into many small ones to stay *just under* the
  $10,000 reporting limit (so they don't have to report it).
- **Geographic concentration** — too much risk coming from one risky country.
- **Channel concentration** — too much risk through one payment method.
- **Large-value concentration** — a tiny number of huge transactions dominating.
- **Temporal spike** — a sudden unusual burst of activity.

**DuckDB** — a super-fast "filing cabinet" for asking questions of data. It runs *on your own
computer* (no server needed) and is **locked down so it can't reach the internet** — important
for security. It's what answers the investigator's questions.

**FastAPI** — the "waiter." The website (front of house) sends requests; FastAPI carries them
to the kitchen (the engines) and brings back the answer.

**React / TypeScript / ECharts** — the parts that build the *website you see and click*
(the charts, the buttons, the dashboard).

**PostgreSQL / SQLite** — the long-term "logbook" that permanently records what was done
(the audit trail), so there's always a history.

**Forecasting (MAPE / SMAPE / MASE)** — predicting future trends from past data. Verita runs a
little *tournament* of forecasting methods and picks the winner — but it *grades itself
honestly* by testing on data it didn't use, and reports how far off it was. MAPE/SMAPE/MASE are
just different "report cards" for accuracy. Crucially, the winner has to **beat a dumb
baseline** ("just repeat last week") to be chosen.

**Production gaps** — Verita openly lists what it *isn't ready for yet* and how it would fix
each. Naming your own limits is what *senior, trustworthy* engineers do — it's a strength.

---

## Part 4 — The three parts of the product

Verita is really **three tools sharing one file and one rule** ("every number shows its work"):

1. **The Auto-Dashboard** — drop a file, get a polished, business-grade dashboard in seconds.
   *The charts an analyst would have built — without the hour of setup.*

2. **The Fraud Engine** — scores every transaction for fraud risk using real machine learning,
   and (the key part) **shows *why* each one was flagged** in plain language.

3. **The Investigator** — an AI that investigates the data on its own, checks the five
   money-laundering patterns with real queries, writes up what it found, and **seals the report
   so no one can quietly change it.**

---

## Part 5 — The 6 posters, explained (what each one shows)

1. **The Story poster (HR)** — the big one. Three acts: the **Black Box** problem (a number you
   can't defend) → the **Build** → the **Glass Box** result (every number shows its work). If
   someone only looks for 60 seconds, this poster tells the whole story.

2. **User Journey & Pipeline (Tech)** — follows a real person clicking the website at the top,
   and shows the **technical machinery that fires underneath** with every click. Proves you
   understand the whole system end to end.

3. **The Data Universe (Tech)** — a "solar system" showing how data flows inward, from raw file
   to the final sealed output. A pretty way to show the data's journey.

4. **The Project Universe (HR + Tech bridge)** — the human story on the left, the technology on
   the right, joined down the middle by "Built for Wolters Kluwer."

5. **The Value Map (HR)** — a treasure map of your skills (backend, ML, data, frontend,
   compliance, AI) as islands, with the "build journey" route between them.

6. **System Overview (Tech)** — a clean architecture "blueprint" of the whole system for the
   technical reviewer, with a live terminal and the honest numbers.

**How to use them:** lay the **Story poster** on the table first. Bring out the **tech posters**
during the technical conversation ("I actually mapped this — here").

---

## Part 6 — Questions you might get (with simple answers)

**"What does it actually do?"** → "You drop in a financial dataset and it gives you a dashboard,
a fraud score for every transaction with the reason, and a sealed report a regulator could check."

**"What's special about it?"** → "Most tools are black boxes — they give a number and say trust
me. Mine proves every number and seals the result so it can't be secretly changed. In
compliance, that's the whole game."

**"Is the fraud detection real?"** → "Yes — real machine learning trained on a real public fraud
dataset of 284,807 transactions. And I only ever report scores on data the model never saw
during training, so the numbers are honest."

**"Why is PR-AUC better than accuracy here?"** → "Because fraud is only 0.17% of the data. A
model that says 'never fraud' would be 99.8% accurate and useless. PR-AUC is honest about how
many false alarms you raise per real fraud caught."

**"How does the 'tamper-proof' part work?"** → "Each step gets a digital fingerprint that
includes the previous step's fingerprint — a chain. Change one step and the whole chain breaks,
so you can prove nothing was altered."

**"Did AI help you build it?"** → *(Answer honestly and confidently.)* "Yes — I used AI as a tool,
the way a modern engineer does. I directed it: I designed the honesty principle, chose what to
build and why, decided the FCC focus, and made sure every number is real and defensible. The
*judgement* is mine; AI helped me move fast. The project even documents where AI helped and
where it didn't — because the whole point is honesty."

**"What would break first in production?"** → "Right now it processes files one at a time in
memory — under heavy load that's the first thing I'd fix, with a proper job queue. I've written
down all the production gaps and how I'd fix each. Naming your own limits is the job."

**"Why these technologies?"** → "DuckDB because it's fast, needs no server, and can be locked
down for security. FastAPI because it's a clean, fast way to connect the website to the engines.
Trees (GradientBoosting) over deep learning because the data is tabular and fraud is rare —
trees win there and need no heavy setup."

---

## Part 7 — If you don't know an answer (stay calm — here's how)

You will get a question you can't fully answer. That's fine. **Never bluff.** Use one of these:

- **"That's handled in the code — the key idea is [X]. I can walk you through the file if you'd
  like."** (Gives the concept, offers depth, stays honest.)
- **"I'll be honest, I'd want to check the exact detail rather than guess — but the principle is
  [X]."** (Honesty *is* the project's theme — leaning into it is on-brand, not weak.)
- **"Great question — that's actually on my 'production gaps' list, here's how I'd approach it."**
  (Turns a gap into a strength.)

**Bridge back to what you know.** After any hard question, return to the problem and the result:
"…but the core idea is that every number can be proved and the investigation is sealed."

**Body language:** slow down, breathe, it's okay to pause. Calm beats fast.

---

# Part 8 — THE SCRIPT: what to say, page by page

> These are **speakable lines** — say them in your own words. Each page: the *one thing* to land,
> then a couple of supporting sentences, then a line to move on. Keep it conversational.

## TECH BUNDLE — "Verita: Technical Appendix" (for the technical interviewer)

**Page 1 — Cover (VERITA · Technical Appendix · 0.913 / 0.65 / 284K)**
> "This is the technical appendix. The headline numbers are right here: trained on 284,000 real
> transactions, with honest, held-out scores. Let me walk you through the system."
- *Land:* it's real, the numbers are honest. Move on.

**Page 2 — System Architecture**
> "Here's the whole system. The website is React on top. Requests go through FastAPI, which
> checks security and passes them to four engines — profiling, the ML model, the text analyser,
> and the optional AI. Underneath are two databases: DuckDB for fast analysis, and Postgres for
> the permanent audit log."
> "The gold box is important — the query engine is **sandboxed**: it can't reach the internet,
> and it only allows safe read-only queries. I even wrote attack tests to prove it."
- *Land:* clean layers + it's locked down for security.

**Page 3 — The ML Pipeline**
> "This is how the fraud model is built. Real data → split into a part it learns from and a part
> it's tested on but never sees → train two models → score on the hidden part."
> "The red sliver shows the real challenge: fraud is only **0.17%** of the data. That's why this
> is hard. I used gradient-boosted trees because for rare, tabular data, they beat deep learning
> and need no heavy setup. And it's trained once and cached, so it loads in a third of a second."
- *Land:* honest split + 0.17% is why it's hard + sensible model choice.

**Page 4 — Honest Evaluation**
> "Two curves: the ROC curve gives 0.913, which is strong. But the one I care about is the PR
> curve on the right — 0.65 — because fraud is so rare. With 0.17% positives, the usual scores
> flatter you; PR-AUC is the honest measure of false alarms per real catch. And five-fold
> cross-validation confirms the score is stable, not luck."
- *Land:* "PR-AUC matters more in fraud because the data is so imbalanced." **This is your money line.**

**Page 5 — Explainability (SHAP)**
> "This is the heart of the project. For any single prediction, it shows *why*. Read it like a
> sentence: flagged mainly because the amount was large, the customer was high-risk, and the
> velocity was high — the domestic channel pulled it down a little — net score 0.79."
> "And it lists what it *cannot* claim — one issuer's data, no drift monitoring yet, and so on.
> That honesty is deliberate."
- *Land:* it shows its work, and it admits its limits.

**Page 6 — Forecasting**
> "For trends, it runs a tournament of forecasting methods and grades them honestly on data they
> didn't use. The winner has to *beat a dumb baseline* — just repeating last week — or it isn't
> chosen. It reports several accuracy measures, with proper rolling-window testing."
- *Land:* honest, disciplined forecasting — beats the naive baseline.

**Page 7 — The Auditable Investigator**
> "This is the flagship. An AI investigates the data, checks five known money-laundering patterns
> — like *structuring*, where someone splits a big amount to stay under the $10,000 limit — and
> backs every finding with a real query. Then it **seals the whole investigation in a chain**:
> change any step and the chain breaks. A regulator could re-run it offline. It doesn't just log
> conclusions — it binds them to the data and the query that produced them."
- *Land:* tamper-proof, reproducible, regulator-ready. This is the wow.

**Page 8 — Production Gaps I Know**
> "And I'm honest about what isn't production-ready yet — and how I'd fix each: a job queue for
> scale, a shared rate-limiter, drift monitoring, a real sanctions-list integration. Naming your
> own limits is the job."
- *Land:* senior-level honesty. Close confidently.

## HR BUNDLE — "Verita: The Story" (for the non-technical / HR reader)

**Page 1 — Cover**
> "Rather than a résumé, I built the actual thing the role is about. This walks you through it."

**Page 2 — The Problem it Solves**
> "A compliance analyst opens a file of hundreds of thousands of transactions. They lose the
> first hour to setup, and when they flag something, they often can't *prove why* — and in
> finance, you can't act on a number you can't defend to a regulator. Verita removes both
> problems."
- *Land:* the relatable human problem.

**Page 3 — So, What Is Verita?**
> "In one line: it turns any financial dataset into an instant, trustworthy report. Drop in a
> file and it gives you a dashboard, a fraud score for every transaction, and a sealed report.
> The rule behind all of it: **every number it shows, it can prove.**"
- *Land:* the one-sentence definition + the rule.

**Page 4 — Three Things, Each Done Well**
> "It's really three tools. One: an instant dashboard. Two: a fraud engine that scores every
> transaction *and shows why*. Three: an investigator that checks the data and seals a
> tamper-proof report."
- *Land:* the three pillars, simply.

**Page 5 — How It Works, Start to Finish**
> "Five clear steps: Upload, Understand, Detect, Explain, Seal. Most tools stop at 'Detect' —
> they hand you a score and say trust it. The whole point of mine is steps four and five —
> *explain*, then *seal* — that's what turns a number into something you can put your name on."
- *Land:* explain + seal are what's different.

**Page 6 — Why This One Is Different**
> "The old way is a black box: 'here's a number, trust me.' Verita says 'here's a number — and
> here's the proof.' Every figure shows its formula, every decision shows its reasoning, and the
> whole thing is sealed. It even publishes what it *can't* do. That honesty is the feature."
- *Land:* black box vs proof + honesty as a feature.

**Page 7 — Why It Fits, and Who Built It**
> "I built it point-by-point against the Wolters Kluwer role: forecasting, fraud detection, data
> and SQL, reporting, and regulatory rigour — Verita already does each. And I didn't send a list
> of skills; I taught myself the stack and shipped the working product. Every claim here I can
> sit down and demonstrate."
- *Land:* direct fit + "I can demonstrate every claim."

**Page 8 — The First 90 Days**
> "If you hire me, I'd start the way I built this: learn it deeply, own a piece end-to-end, then
> make it production-grade. I came with a solution, not a CV — let's build the next version
> together."
- *Land:* a humble, concrete plan + a warm close.

---

## Final reminders before you walk in

1. **Lead with the problem and the result.** You can always explain those.
2. **Your money line:** "PR-AUC matters more in fraud because the data is so imbalanced."
3. **Your wow:** "The investigation is sealed — change one step and the whole chain breaks."
4. **Your theme:** honesty — every number can be proved; the model admits its limits.
5. **If stuck:** name the principle, offer to show the code, or call it a known gap. Never bluff.
6. **Be calm.** You built a real thing that solves a real problem. That's already rare.

You've got this.
