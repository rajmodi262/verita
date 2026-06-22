# Verita — Extractable Components

## Layout

| Name | Source | Description | Extractable Props |
|------|--------|-------------|-------------------|
| AppShell | `components/AppShell.tsx` | Sidebar + header shell for inner pages | `navItems`, `title` |
| SidebarNav | `components/AppShell.tsx` (partial) | Sticky sidebar with NavLink items | `items: {to, label, icon}[]` |
| PageHeader | `components/AppShell.tsx` (partial) | 64px top bar with title + actions | `title`, `actions` |

## Basic

| Name | Source | Description | Extractable Props |
|------|--------|-------------|-------------------|
| GlassCard | `index.css .glass` | Glassmorphism card with backdrop blur | `children`, `style` |
| GradientText | `index.css .gradient-text` | Animated shimmer text | `children`, `as` |
| StampBadge | `index.css .stamp` | Rubber-stamp style badge | `label`, `variant: 'red'\|'green'` |
| LedgerLabel | `index.css .ledger-label` | Micro uppercase monospace label | `children` |
| AuroraBackground | `index.css .aurora` | Animated aurora blob background | `blobs` |
| WaxSeal | `index.css .wax-seal` | Circular wax seal emblem | `letter`, `size` |
| ExhibitFrame | `index.css .exhibit-frame` | Evidence photo frame | `children` |
| PaperTerminal | `index.css .paper-terminal` | Cream paper monospace terminal | `content` |
| HashTicker | `index.css .hash-ticker` | Green scrolling hash display | `hash` |
| ChainNode | `index.css .chain-node` | Blockchain spine node dot | `sealed: boolean` |
| RedactBar | `index.css .redact` | Black redaction bar with lift animation | `children`, `lifted: boolean` |
| Barcode | `index.css .barcode` | CSS-only barcode graphic | `width` |

## Data Visualization

| Name | Source | Description | Extractable Props |
|------|--------|-------------|-------------------|
| EChart | `components/EChart.tsx` | Apache ECharts wrapper | `option`, `style` |
| SignalField | `components/SignalField.tsx` | Ambient noise/signal field | TBD |

## Immersive / 3D

| Name | Source | Description | Extractable Props |
|------|--------|-------------|-------------------|
| Preloader | `immersive/dom/Preloader.tsx` | 3D asset loading screen | — |
| StampIntro | `immersive/dom/StampIntro.tsx` | Stamp intro animation | — |
| UVCursor | `immersive/dom/UVCursor.tsx` | UV lamp cursor effect | — |
| ElevatorHUD | `immersive/dom/ElevatorHUD.tsx` | Floor navigation HUD | — |
