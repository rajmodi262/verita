# How I Built Something Real When I Didn't Know How

*The origin story, told properly. First person. This is the answer to
"tell me about yourself" — not recited, but lived in.*

---

**THE ORDINARY WORLD.** Before Verita, I was the person who understood problems better
than solutions. I could read a job description like a detective reads a crime scene —
this is what they need, this is what they fear, this is the gap nobody's filling — but
between me and *building* stood a wall with a sign on it: "real engineers only." I had
ideas the way some people have spare change. Loose, jangling, unspent.

**THE CALL TO ADVENTURE.** Then I read the Wolters Kluwer posting. FSS/FCC Data Science.
Dashboards, predictive models, NLP, compliance. And one thought arrived fully formed:
*financial crime is the one domain where an AI that can't explain itself is worthless —
not disappointing, worthless, because a regulator can't act on a number nobody can
defend.* Everyone was building black boxes. The law was begging for a glass one. I
didn't have a portfolio. I had a thesis.

**REFUSAL OF THE CALL.** For a few days, I did what reasonable people do: I prepared
excuses. I'm not a "real" developer. People with computer science degrees and years of
practice apply to these roles. The smart move was to polish a CV like everyone else,
mumble through the same courses everyone lists, hope. I almost did that. The CV
template was open on my screen. That close.

**MEETING THE MENTOR.** Instead, I opened a terminal — and Claude Code was in it. Not a
genie. A mentor with infinite patience and zero flattery. The first thing it taught me
wasn't syntax; it was that my questions were the valuable part. *What should happen
when a file is dropped? What does an analyst do in their first hour? What would a
regulator demand to see?* I knew those answers. It knew how to make them executable.
That division of labor, it turns out, is called software engineering.

**CROSSING THE THRESHOLD.** The first real line of code was an upload endpoint. A file
goes in; Python reads it; columns come back named and typed. Embarrassingly small. But
I remember staring at the JSON response like it was a heartbeat on a monitor. Something
I had *decided* was now something that *ran*.

**TESTS, ALLIES, ENEMIES.** The allies assembled: FastAPI taking shape around typed
contracts, pandas chewing through anything I fed it, DuckDB answering SQL in
milliseconds, ECharts making the numbers visible. And the enemies — the real
education. CSVs with dates in three formats. A fraud dataset so imbalanced that a
model predicting "never fraud" scored 99.8% — my first true lesson in why accuracy
lies and held-out PR curves don't. And the day my own SQL console read a file off the
server's disk when an adversarial test asked it nicely. I didn't sleep well after that
one. The fix — engine-level sandboxing, SELECT-only guards, an injection corpus in CI —
is now the part of the codebase I'd defend with the most pride.

**THE ORDEAL.** The hardest moment wasn't a bug. It was the night I realized my
flagship feature — the autonomous investigator — was *good theater and bad evidence*.
It found suspicious patterns, wrote confident memos… and if anyone asked "prove the AI
actually ran these steps," I had nothing. A black box wearing a trench coat. I'd built
the very thing my thesis was against. I sat with the decision every builder eventually
faces: ship the impressive lie, or rebuild for the boring truth. I rebuilt. Every step
now hashes itself into a chain — SHA-256, each link folding in the last — so the trace
is tamper-evident by construction. Doctor one step and the chain visibly snaps.

**REWARD.** The first time the full pipeline ran clean — file dropped, dashboard
assembled, hypotheses tested, memo written, chain sealed, and the tamper test *failing
to forge it* — I understood what I'd actually built. Not a demo. An argument. Proof
that "auditable agentic AI" can be a property you verify, not a slogan you trust.

**THE ROAD BACK.** Then the unglamorous love: 82 tests. CI. Docker compose with
monitoring. A document mapping every line of the job description to a feature that
ships. Model boot from 21 seconds to 0.36. The difference between "it worked once" and
"it works" is most of the work, and nobody applauds it, and it matters more than
everything that gets applause.

**RESURRECTION.** Walking into this interview is the final test, and I know exactly
what I am and am not. I am not the candidate with a decade of syntax in muscle memory.
I am the candidate who found the gap in an industry, built a working answer to it in
weeks, learned evaluation discipline from class imbalance and security from being
burned, and can explain every decision in the stack — because every decision was mine.

**RETURN WITH THE ELIXIR.** What I bring to Wolters Kluwer isn't Verita — Verita is
just the evidence. What I bring is the loop that produced it: see the real problem,
build the honest version, test the claims adversarially, show the work. Your teams are
about to spend a decade putting AI in front of regulators. I've already rehearsed the
hard part — and I have the sealed notebook to prove it.
