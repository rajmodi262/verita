# Level 1 — For the Curious Friend

*Audience: smart, non-technical, knows what apps are. Voice: excited, fast, pop culture.*

---

## The Elevator Pitch Version (30 seconds)

You know how Excel can hold your data but makes *you* do all the thinking? And Power BI
can make charts but first demands an hour of setup like it's a boss fight before the
actual game?

I built the skip button. You drop any spreadsheet on **Verita** and it instantly builds
the dashboard a professional analyst would have built — charts, headlines, "here's
what's weird in your data." Then it goes full detective: a real machine-learning model
scores transactions for fraud, and an AI investigator literally *runs its own
investigation* and writes a report. And — this is the twist — every claim it makes
comes with receipts. It's an AI that shows its homework.

## The Enthusiastic Version (2 minutes)

OK so picture three characters living in one app.

**Character one: the Speedster.** Drop a CSV — boom, X-ray scan. It reads every column,
figures out "this is money, this is a date, this is a country," grades your data quality
like a strict teacher, and assembles a full dashboard you can drag around like Lego.
The first hour of every analyst's job, done before your coffee cools.

**Character two: the Detective.** A real fraud-scoring model — trained on 284,807
actual credit-card transactions — ranks every transaction by how suspicious it is.
There's a slider where you literally watch the trade-off happen: catch more crooks but
annoy more innocent people, or vice versa. It's the trolley problem with a UI.

**Character three: the Notary.** This is the one nobody else has. An autonomous AI
investigator that forms its own hypotheses — "is someone splitting payments to stay
under the $10,000 reporting line?" — tests each one with a real database query, and
writes a memo citing its evidence. Then it seals the whole investigation in a
cryptographic chain. Tamper with one step and the seal visibly breaks. Like a
blockchain, but for "did the AI lie to me."

Why does that matter? Because in banking, an AI that can't explain itself isn't just
useless — it's *illegal* to act on. Regulators don't accept "the algorithm said so."
Verita is built for the one industry where showing your work is the law.

## The "No Really, How Does It Work" Version (5 minutes)

Fine. Follow one file through the machine.

1. **You drop `transactions.csv`.** A Python brain (the same toolkit real data
   scientists use — pandas, the works) reads it and *profiles* it: what type each
   column is, what's missing, what's weirdly distributed. Not a spinner pretending to
   work — it reports what it actually found.

2. **A recommendation engine plays art director.** "Time column plus money column?
   That wants a line chart with a forecast. Country column? That earns a world map."
   It composes the dashboard like a chef plating — and you can still rearrange
   everything, because it's your kitchen.

3. **The statistics are real.** When it says "weekend transactions are significantly
   larger," there's an actual statistical test behind it — the kind you'd learn in a
   university stats course — and you can tap *"how was this computed?"* to see the
   exact formula. No vibes. Ever.

4. **The fraud model is honest.** It trains on real labeled data, then is graded ONLY
   on transactions it never saw during training — like studying from one textbook and
   being examined from another. Score: 0.913 out of 1. It tells you that number
   itself, because hiding it would be exactly the black-box nonsense the project
   exists to kill.

5. **The investigator runs.** It plans about six hypotheses based on the *shape* of
   your data, runs a genuine SQL query for each, keeps the query as evidence, ranks
   what it confirmed, and writes the memo. Each step is fingerprinted (SHA-256, the
   same hashing family that secures your passwords), and each fingerprint includes the
   previous one — so the steps form a chain. Edit anything afterward and the chain
   snaps in a way anyone can verify.

6. **And if you ask in plain English** — "average amount by channel, top 5" — it
   writes the SQL for you, shows it to you *before* running it, and lets you pin the
   result to your dashboard.

The whole thing runs with one double-click. I checked the "is this real?" box with 82
automated tests. And yes, you can try it — bring literally any spreadsheet you have.

---

*Why you'd share it: it's the rare AI demo where the magic trick is transparency.
Everyone's AI says "trust me." Mine says "check me."*
