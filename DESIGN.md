---
name: Verita
description: Financial Crime & Compliance intelligence — every number shows its work, sealed in a tamper-evident ledger.
colors:
  vermilion-stamp: "#c2331f"
  registrar-green: "#1c6e4a"
  gold-foil: "#a8842c"
  ledger-cream: "#f3eee2"
  ledger-cream-deep: "#ece5d3"
  iron-gall-ink: "#14120b"
  faded-ink: "#4a4434"
  archival-blue: "#2b3a8c"
  uv-security-cyan: "#7df9ff"
  uv-violet-night: "#191238"
  singularity-black: "#06070d"
  starlight-text: "#f2f5ff"
  dimmed-starlight: "#8c97b5"
  electric-blue: "#4d7cff"
  signal-violet: "#a855f7"
  signal-cyan: "#22d3ee"
  alarm-red: "#ff4d5e"
  confirm-green: "#16c784"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(2.6rem, 7vw, 6.2rem)"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(2rem, 4.6vw, 3.6rem)"
    fontWeight: 900
    lineHeight: 1.15
  title:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 3vw, 2.2rem)"
    fontWeight: 700
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.66rem"
    fontWeight: 500
    letterSpacing: "0.22em"
rounded:
  none: "0px"
  stamp: "6px"
  md: "14px"
  lg: "20px"
  xl: "28px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
  4xl: "96px"
components:
  button-primary:
    backgroundColor: "{colors.iron-gall-ink}"
    textColor: "{colors.ledger-cream}"
    rounded: "{rounded.none}"
    padding: "8px 14px"
    typography: "{typography.label}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.iron-gall-ink}"
    rounded: "{rounded.none}"
    padding: "8px 14px"
    typography: "{typography.label}"
  stamp:
    textColor: "{colors.vermilion-stamp}"
    rounded: "{rounded.stamp}"
    padding: "6px 14px"
    typography: "{typography.label}"
  ledger-label:
    textColor: "{colors.faded-ink}"
    typography: "{typography.label}"
---

# Design System: Verita

## 1. Overview

**Creative North Star: "The Forensic Ledger"**

Verita's interface is a registrar's book: paper that remembers, ink that cannot be
quietly changed, stamps that certify, a chain of seals running down the spine. The
system exists to make the product's thesis *felt* — every number shows its formula,
every agent decision shows its query, and the whole trace is hash-chained — so the
visual language is evidentiary, not decorative. Surfaces are physical objects on an
examiner's desk: exhibit frames with tape, paper terminals with hard offset shadows,
microtext security strips, a UV lamp that reveals hidden ink.

The system explicitly rejects its own legacy: the **generic dark-AI-SaaS template**
(near-black canvas, aurora/mesh gradient glows, glassmorphism cards, gradient text)
still present in the app workspace is documented here as *migrating, not canonical*.
New surfaces pull from ledger DNA. The dark "machine world" earns its keep only as a
narrative foil — the thing the ledger rips open from — never as the default answer.

Density is generous on the landing (a case file read page by page) and purposeful in
the app (an analyst's bench: mono figures, clear provenance affordances, AAA-contrast
ink). Personality in three words: **forensic, confident, alive.**

**Key Characteristics:**
- Paper, ink, and stamps as the primary material vocabulary
- Hard offset shadows — objects sit on the desk, nothing floats in glow
- Fraunces 900 serif headlines against JetBrains Mono evidentiary micro-labels
- Certainty rendered as ritual: stamps slam, seals set, chains verify, hashes tick
- WCAG AAA contrast: text is ink, never gray

## 2. Colors: The Registrar's Palette

Aged paper carries the surface; iron-gall ink carries the words; vermilion, registrar
green, and gold foil are ceremonial accents used the way a registrar uses them —
rarely, and with authority.

### Primary
- **Vermilion Stamp** (#c2331f): The rubber-stamp red. Certifications, alerts, the wax
  seal, anything the system declares with authority. Always paired with the double-rule
  stamp border; never used as a large fill.

### Secondary
- **Registrar Green** (#1c6e4a): Verification and confirmation — the hash ticker, the
  "verified" stamp variant. The calm counterpart to vermilion's alarm.

### Tertiary
- **Gold Foil** (#a8842c): Security ornament — guilloché bands, microtext strips,
  sealed chain nodes, text selection. Decoration that signals tamper-evidence, ≤5% of
  any surface.

### Neutral
- **Ledger Cream** (#f3eee2) / **Ledger Cream Deep** (#ece5d3): The paper itself, with
  ruled lines at `rgba(20,18,11,0.14)`. The default body surface for the ledger world.
- **Iron-Gall Ink** (#14120b): All primary text on paper (≈15:1 contrast — AAA with
  room to spare). Also the fill of primary buttons and hard borders.
- **Faded Ink** (#4a4434): Micro-labels and secondary text on paper (≈7.7:1 — passes
  AAA). The *only* permitted muted text on cream.
- **Archival Blue** (#2b3a8c): Handwritten annotations (Fraunces italic) on the backs
  of evidence photos.

### Special modes
- **UV Lamp** (#191238 ground, #7df9ff security ink): The hidden-ink easter-egg mode —
  the whole ledger re-renders as if under ultraviolet. UV cyan is exclusive to this mode.
- **Legacy machine world** (#06070d ground, #f2f5ff text, #4d7cff / #a855f7 / #22d3ee
  signals): The aurora system in the app shell and hero. Maintained, not extended.
  Note: Dimmed Starlight (#8c97b5) on Singularity Black measures ≈6.9:1 — *just under
  AAA*; lighten toward #98a3c0 when touching these surfaces.
- **Semantic**: Alarm Red (#ff4d5e) for fraud/critical, Confirm Green (#16c784) for
  success — dark-world only; on paper, use Vermilion and Registrar Green instead.

### Named Rules
**The Iron-Gall Rule.** Text on paper is ink — #14120b or #4a4434, nothing lighter.
Gray body text is forbidden; AAA (7:1) is the floor, not the target.

**The Ceremony Rule.** Vermilion, green, and gold are stamps, not paint. If an accent
covers more than a stamp's worth of area, it has lost its authority.

## 3. Typography

**Display Font:** Fraunces (with Georgia, serif)
**Body Font:** Inter (with system-ui, sans-serif)
**Label/Mono Font:** JetBrains Mono (with ui-monospace)
**App-title Font:** Space Grotesk (with system-ui, sans-serif) — workspace headings only

**Character:** A high-contrast serif with engraver's swagger set against a typewriter
mono — the registrar's letterhead annotated by the examiner's machine. Inter stays
invisible in between.

### Hierarchy
- **Display** (900, clamp(2.6rem, 7vw, 6.2rem), 1.1): Landing hero only. One per page.
- **Headline** (Fraunces 900, clamp(2rem, 4.6vw, 3.6rem), 1.15): Ledger section
  headings; also pull-quote italic variant (700 italic, clamp(1.6rem, 3.6vw, 2.7rem)).
- **Title** (Space Grotesk 700, clamp(1.5rem, 3vw, 2.2rem), -0.02em): App page
  headings (Studio, Overview, Settings).
- **Body** (Inter 400, 1rem, 1.6): Prose and UI copy; cap measure at 65–75ch.
- **Label** (JetBrains Mono 500, 0.66rem, 0.22em tracking, uppercase): The evidentiary
  micro-label — exhibit numbers, field names, hashes, KPI captions.

### Named Rules
**The Mono Witness Rule.** Every figure that testifies — hash, transaction ID, score,
timestamp, SQL — is set in JetBrains Mono. If a number matters, it's mono.

**The One Exhibit Rule.** One Display-size element per page. Headlines argue; they
don't shout over each other.

## 4. Elevation

Elevation is physical, not luminous. Objects on the examiner's desk cast **hard offset
shadows** — ink-dark, un-blurred, down-and-right — as if lit by a single desk lamp.
Blur-glow elevation (`0 0 80px` colored glows, glass blur) belongs to the legacy aurora
world and is prohibited in new work, including new app surfaces: when a workspace panel
is rebuilt, it trades its glow for a hard shadow and a 2px ink border.

### Shadow Vocabulary
- **Desk object** (`box-shadow: 6px 6px 0 rgba(20,18,11,0.22)`): Paper terminals,
  signature pads — anything interactive that sits *on* the page.
- **Desk object, small** (`box-shadow: 5px 5px 0 rgba(20,18,11,0.2)`): Compact widgets.
- **Exhibit photo** (`0 1px 2px rgba(20,18,11,0.18), 0 14px 34px -12px rgba(20,18,11,0.38)`):
  The one soft shadow in the system — reserved for photographic evidence frames.
- **Sealed node** (`0 0 0 4px rgba(168,132,44,0.18), 0 0 18px rgba(168,132,44,0.45)`):
  Gold verification glow — exclusively for chain nodes at the moment they seal.

### Named Rules
**The Hard Shadow Rule.** Shadows are offset and opaque-edged (6px 6px 0), never
ambient blur. If a shadow is blurry, it's either a photograph or a mistake.

## 5. Components

Components feel **stamped and certain**: hard 2px ink borders, square corners, mono
micro-labels, decisive state changes. Nothing hovers tentatively.

### Buttons
- **Shape:** Square (0px radius) with a hard 2px Iron-Gall Ink border
- **Primary:** Ink fill (#14120b), Ledger Cream text, mono uppercase label
  (0.66rem / 0.12em tracking), padding 8px 14px
- **Hover / Focus:** Background deepens / inverts; `:focus-visible` gets a 2px offset
  outline in Gold Foil; no scale tricks on paper
- **Ghost:** Transparent fill, ink border and text
- **Legacy (machine world):** Pill gradient + magnetic motion still live in the hero —
  maintained, not to be reproduced on new surfaces

### Stamps (chips)
- **Style:** `3px double` border in Vermilion (#c2331f) or Registrar Green, 6px radius,
  mono uppercase 0.18em tracking, rotated −4°/+3°, turbulence mask for rubber-stamp
  ink texture
- **State:** Stamps are declarations — VERIFIED, FLAGGED, SEALED. Never use one for a
  neutral tag.

### Cards / Containers
- **Paper terminal:** #fffdf6 ground, 2px ink border, desk-object shadow, mono
  0.82rem / 1.9 line-height — for live machine output rendered "on paper"
- **Exhibit frame:** #fffdf6 mat with 10px padding, hairline border, exhibit-photo
  shadow, optional tape corners and coffee-ring props
- **Corner Style:** Square; the 14–28px radii belong to legacy glass panels

### Inputs / Fields
- **Style:** Paper ground, 2px ink border, square corners, crosshair cursor on the
  signature pad
- **Focus:** Border color shifts to Gold Foil with a 2px outline; no glow halos

### Navigation
- **Landing:** Floating pill bar (legacy glass); migration candidate
- **App sidebar:** Slim icon+label rail, active item carries a gradient accent bar
  (legacy); when rebuilt: ink rail on cream with a vermilion stamp-dot active marker

### Signature Component: The Sealing Chain
Chain nodes (14px rings on the ledger spine) that flip from ruled-line gray to Gold
Foil with the sealed-node glow as each entry verifies — the hash-chain thesis as UI.
Companion pieces: the live hash ticker (Registrar Green mono) and the wax seal
(radial-gradient vermilion relief, Fraunces 900 monogram).

## 6. Do's and Don'ts

### Do:
- **Do** keep text at WCAG **AAA** (7:1) — Iron-Gall Ink or Faded Ink on paper; fix
  Dimmed Starlight (#8c97b5 → ≈#98a3c0) wherever legacy dark surfaces are touched.
- **Do** use hard offset shadows (`6px 6px 0`) and 2px ink borders for every new
  elevated surface, in both worlds.
- **Do** set every hash, ID, score, and timestamp in JetBrains Mono (the Mono Witness
  Rule).
- **Do** render certainty as ritual: stamp slams, chain seals, signature strokes —
  each with a `prefers-reduced-motion` crossfade fallback, always.
- **Do** keep ceremonial accents (Vermilion, Registrar Green, Gold Foil) at stamp
  scale (the Ceremony Rule).

### Don't:
- **Don't** extend the **generic dark-AI-SaaS template** — PRODUCT.md's named
  anti-reference: no new aurora/mesh gradient glows, no new glassmorphism panels, no
  gradient text (`.gradient-text` is legacy; never apply it to new elements).
- **Don't** use blur-glow elevation on new work; if a shadow is blurry and it isn't a
  photograph, it's wrong (the Hard Shadow Rule).
- **Don't** let the ledger become a costume: no fake leather, no parchment JPEG
  textures, no skeuomorphic chrome. The forensic feel is carried by type, rule lines,
  stamps, and shadow — all CSS.
- **Don't** put gray text on paper. #8c97b5-style muted grays are a dark-world token;
  on cream, the only secondary text color is Faded Ink (#4a4434).
- **Don't** round corners on ledger components. Square is certain; 14–28px radii are
  legacy glass.
- **Don't** animate without a reduced-motion alternative — the custom cursor, magnetic
  buttons, and stamp choreography must all degrade to instant/crossfade.
