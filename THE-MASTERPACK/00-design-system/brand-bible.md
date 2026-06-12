# The Masterpack Brand Bible

*The design rules of this package, in plain English. Read once before editing anything.*

---

## The one-line philosophy

**Every element earns its place.** If a box, a word, an icon, or a flourish doesn't
teach, provoke, delight, or impress — it gets cut. This package has no filler because
*the project it documents has no filler*: Verita's whole thesis is "every number shows
its work," and a bloated deck would contradict the product on page one.

## The visual voice

Dieter Rams designed the structure. A graffiti artist tagged it respectfully (the
stamps, the receipt, the newspaper). A calligrapher added one perfect line (the gold
quote bars). That's the register:

- **Clean but not cold** — generous whitespace, but warm gold and human stories inside it.
- **Bold but not loud** — one Monument-size statement per document, max. Scale is a scalpel.
- **Clever but not try-hard** — the periodic table is funny *because* it's technically accurate.
- **Human but not sloppy** — comic panels sit on a strict grid; jokes are typeset like law.

## The three beats (every element must serve one)

| Beat | Window | What it feels like | Served by |
|---|---|---|---|
| **INTRIGUE** | first 3 seconds | "What… IS this?" | movie poster, newspaper, universe map, the bundle itself on the table |
| **RESPECT** | first 3 minutes | "This person actually thought about this." | blueprint, periodic table, AI-transparency page, honest dim stars |
| **DESIRE** | end of interview | "We need this person here." | the close pages, the constitution, the one-pager they keep |

If you add an element and can't name its beat — delete it.

## Color law

- All colors come from `palette.tex`. **Zero hardcoded hex anywhere else.**
- `ElectricBlue` is the protagonist. `GoldLeaf` is the warmth. `VioletDream` appears
  ONLY when AI is the subject. `CoralEmber` only for genuine warnings/dangers.
- Dark pages (`AbyssBlack` / `MidnightNavy`) are reserved for *moments*: covers,
  closes, the poster, the night skies. Body pages are `PaperWhite`.
- The Verita family (`LedgerCream`, `IronGallInk`, `VermilionStamp`…) appears only in
  artifacts that deliberately quote the product (constitution, receipt, stamps).
  When it appears, it must look like *evidence from the product*, not a third theme.

## Typography law

- **The scale is sacred:** 8 · 10 · 12 · 16 · 24 · 36 · 60 · 96 pt. No size outside it.
- Montserrat ExtraBold (`\DisplayFont`) is for headlines ONLY. If it's more than two
  lines, it's not a headline and doesn't get the display font.
- Tracked uppercase (`\Label`) is for category labels and footers — never sentences.
- JetBrains Mono is the voice of the machine: numbers, code, hashes, terminals.
  If a number testifies, it's mono. (Stolen from Verita's own Mono Witness Rule.)

## Component law

- Use the `\master*` components. Don't hand-roll a new callout when `\masterinsight`
  exists. Consistency is what makes the jokes land — the receipt is funny because it's
  typeset exactly as seriously as the blueprint.
- Footers on bundle pages: always `\bundlefooter`, always quiet, never decorated.

## Humor law (the most important one)

The humor in this package is **deadpan precision**. The constitution is hilarious
because the legal language is *correct*. The receipt is funny because the line items
are *true*. Never wink. Never add "lol" energy. The joke is that it's all real.

## What this package is not

- Not a CV. The CV is somewhere else and worse.
- Not a slide deck. Nothing here animates; it's designed for paper, hands, and tables.
- Not generic. Every page names Verita, Wolters Kluwer, FCC, or a real number from
  the repo. A page that could describe someone else's project is a defective page.
