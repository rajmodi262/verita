# Verita — Theme & Design Tokens

## Stack
- React 18 + TypeScript + Vite (no Tailwind — pure CSS custom properties)
- Fonts loaded via Google Fonts: Space Grotesk, Inter, JetBrains Mono, Fraunces

---

## CSS Variables — `frontend/src/index.css`

```css
:root {
  /* Dark "Singularity" (default) */
  --bg: #06070d;
  --bg-2: #0b0e1a;
  --surface: rgba(255, 255, 255, 0.045);
  --surface-2: rgba(255, 255, 255, 0.07);
  --border: rgba(255, 255, 255, 0.1);
  --text: #f2f5ff;
  --text-muted: #8c97b5;

  /* Aurora palette */
  --blue: #4d7cff;
  --violet: #a855f7;
  --cyan: #22d3ee;
  --indigo: #6366f1;
  --danger: #ff4d5e;
  --success: #16c784;

  --signature: linear-gradient(120deg, #4d7cff, #a855f7 55%, #22d3ee);

  --font-display: "Space Grotesk", system-ui, sans-serif;
  --font-body: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 28px;
}

/* Light "Porcelain" — workspace theme */
html.light {
  --bg: #f6f7fb;
  --bg-2: #ffffff;
  --surface: #ffffff;
  --surface-2: #eef1f8;
  --border: #e7e9f2;
  --text: #0b1020;
  --text-muted: #5b6680;
}

/* Forensic Ledger — landing identity */
:root {
  --paper: #f3eee2;       /* aged ledger cream */
  --paper-2: #ece5d3;
  --ink: #14120b;         /* iron-gall ink */
  --ink-soft: #4a4434;
  --ledger-line: rgba(20, 18, 11, 0.14);
  --stamp-red: #c2331f;   /* vermilion rubber stamp */
  --seal-green: #1c6e4a;  /* registrar green */
  --foil-gold: #a8842c;   /* gold foil */
  --font-serif: "Fraunces", Georgia, serif;
}
```

## Utility Classes

- `.glass` — glassmorphism card: `background: var(--surface); backdrop-filter: blur(20px); border: 1px solid var(--border); border-radius: var(--radius-lg)`
- `.gradient-text` — animated shimmer text using `--signature` gradient
- `.aurora` / `.aurora__blob--1/2/3` — fixed animated background blobs (blue, violet, cyan)
- `.grain` — film grain overlay, fixed, z-index 1

## Forensic Ledger Classes

- `.ledger` — paper texture bg with repeating ruled lines, cream colors
- `.guilloche` — engraved gold border band
- `.stamp` — rubber stamp with red border + rotation, monospace font
- `.stamp--green` — green variant
- `.redact` / `.redact.lifted` — black redaction bar that slides away
- `.ledger-label` — micro uppercase monospace label
- `.torn-edge` — clip-path torn paper edge
- `.microtext` — banknote security strip
- `.chain-node` / `.chain-node.sealed` — blockchain spine node
- `.wax-seal` — circular wax seal
- `.uv-ink` — hidden text revealed in UV mode
- `.ledger.uv` — UV lamp mode (purple/cyan palette)
- `.paper-terminal` — monospace terminal on cream paper
- `.exhibit-frame` — photo evidence frame
- `.loupe` — magnifier circle with gold border
- `.hash-ticker` — green monospace hash display
- `.flip-wrap` / `.flip-inner` — 3D flip card
- `.handwriting` — Fraunces italic in archival blue
- `.sig-pad` / `.sig-btn` — examiner signature pad
- `.tape` / `.coffee-ring` / `.barcode` — case-file props
