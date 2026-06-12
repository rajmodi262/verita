# The Deep End — Philosophical Questions

*The questions great interviewers ask when the checklist is done. The best answer to
a philosophical question sounds like you're thinking it through for the first time —
pause before each one, even though you're not.*

---

**1. "If you could only keep one feature of this project, what and why?"**

The "how was this computed?" button. Not the investigator, not the model — the tiny
button. Because it's the whole philosophy at minimum viable size: any number, anywhere,
can be made to confess its origins. Every other feature is that button scaled up. If I
keep it, the culture that rebuilt everything else survives; if I lose it, the rest is
just another dashboard.

**2. "What assumption did you make that turned out to be completely wrong?"**

That accuracy was the goal. I started believing a better score was a better model.
Class imbalance demolished that in one afternoon — a model that never catches fraud
scored 99.8%. The deeper version of the wrongness: I assumed *the number* was the
product. It isn't. The *defensibility* of the number is the product. That correction
is now the project's spine, and it came from being wrong, not from being taught.

**3. "What does 'done' mean to you?"**

Done is when someone who distrusts me could verify the claim without me in the room.
Tested, failure-handled, documented — yes — but the distrust framing is the real
test, because it's the FCC framing: regulators are professional distrusters. Software
is never done; statements about software can be. I try to only make done statements.

**4. "If a 10-year-old asked you what you built, what would you say?"**

"You know how a calculator gives you the answer but doesn't show its steps, and the
teacher says 'show your working'? I built a robot detective that catches money
thieves — and it always shows its working, every step, so even the strictest teacher
in the world can check it. And if anyone tries to secretly change its notebook
afterward, the notebook tells on them."

**5. "What's the most important thing you DON'T know about this project?"**

How it behaves against real institutional data — the mess that only exists inside
banks: legacy formats, regulatory edge cases, adversaries who adapt. I know how it
behaves against everything I could imagine; the gap between "everything I could
imagine" and "everything that happens" is precisely the experience this internship
buys. Second place: which of my heuristics quietly encodes an assumption that some
real population violates. I won't find that alone.

**6. "If this project failed completely, what would you have learned?"**

Almost everything I learned anyway — the project already paid out. Evaluation
discipline, security through being burned, the courage to rebuild a flagship feature
on principle. The artifact could fail; the loop that produced it can't be taken back.
That's also my honest hedge against this interview: even a no leaves me with the
method, the scars, and a better question for the next build.

**7. "How do you know if an AI-assisted decision was actually yours?"**

By whether I can defend it after deleting the conversation. My test is
reconstructive: can I re-derive the reasoning from the problem itself — not "the AI
suggested it" but "here's the constraint that forces it." Every architecture decision
in Verita passes that test; that was the rule. There were also decisions made
*against* the AI's draft — the strongest evidence of ownership is the rejection log,
and mine includes a security guard and a metric switch I refused.

**8. "What would make this project unethical? Have you thought about it?"**

Yes — three live wires. If its false positives carried real consequences for real
people without human review: an AML flag is an accusation, and accusations need
accountable humans — which is why every recommendation in Verita terminates at a
human verb. If its training data encoded bias — geography as a risk feature can
become discrimination laundered through statistics; that's why explainability isn't
decoration, it's how you'd *catch* that. And if its hash-chain theater convinced
people to over-trust a trace that proves integrity, not correctness — tamper-evidence
is not truth-evidence, and conflating them would be my fault, not the user's. The
honest summary: the project's ethics depend on the humility of its claims, and I
police the claims.

**9. "Is an explainable wrong answer better than an unexplainable right one?"**

In this domain — yes, and it's not close. The unexplainable right answer is a coin
that happens to be landing well; you can't act on it in front of a regulator, can't
debug it when it turns, can't learn from it ever. The explainable wrong answer
carries its own correction inside it — you can see *where* it's wrong and fix the
reasoning. Compliance is a repeated game; explanation is what makes iteration
possible. I'd take the honest 0.913 over an opaque 0.99 every working day.

**10. "What did building this teach you about yourself, not about technology?"**

That my integrity has a price point, and I found out where it isn't. The night I
chose to rebuild the investigator — losing a week, for a principle nobody would have
checked — I learned the thesis wasn't marketing; I actually believe it under cost.
Also, less flattering: I learned I over-prepare as a form of armor — this bundle is
evidence — and that the armor works best when I know it's armor. I'd rather walk in
over-prepared and honest about why than walk in hoping.
