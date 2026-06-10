# Verita — Design System (v2 — bold, luminous, 2025-modern)

**Product:** Verita — Financial Crime & Compliance (FCC) Intelligence platform.
**Reference tier:** Linear, Vercel, Cursor, Framer, Arc, Stripe — the current top of the web.
**The brief:** NOT corporate. NOT a generic blue SaaS template. Verita should look like a
just-launched, venture-backed AI product that makes people screenshot the hero. Striking,
luminous, confident, expensive. Dark and futuristic on the marketing surface; clean and premium
on the workspace. Mixed light/dark is mandatory — both first-class.

---

## 1. Aesthetic pillars (what makes it NOT boring)
- **Luminous aurora depth.** Deep near-black canvas with vivid, soft aurora/mesh-gradient glows
  bleeding through (electric blue → violet → cyan). Light feels emitted, not painted.
- **Oversized expressive typography.** Hero type is huge (clamp up to ~7rem), tight tracking,
  with a single gradient or subtly outlined keyword. Type IS the hero.
- **Neon glassmorphism.** Frosted panels with a 1px **gradient** hairline border that catches
  light on the top-left edge; faint inner glow. Real depth, not flat cards.
- **Film grain + noise.** A subtle animated grain/noise overlay on dark sections for texture.
- **Motion as a feature.** Scroll-driven reveals, magnetic buttons, a glowing custom cursor,
  marquee logo strip, numbers that count up, charts that draw in. Premium, springy, never janky.
- **Asymmetry + bento.** Confident asymmetric layouts and bento grids over centered safe rows.

---

## 2. Color

### Dark ("Singularity") — default for marketing
- `--bg`: #06070D (near-black, faint blue undertone)
- `--bg-2`: #0B0E1A
- `--surface`: rgba(255,255,255,0.045) glass over bg
- `--border`: rgba(255,255,255,0.10); premium variant = gradient border (see §4)
- `--text`: #F2F5FF
- `--text-muted`: #8C97B5
- **Aurora glow stops** (used in background mesh, gradient text, glows):
  electric-blue #4D7CFF · violet #A855F7 · cyan #22D3EE · indigo #6366F1
- Signature gradient: `linear-gradient(120deg, #4D7CFF, #A855F7 55%, #22D3EE)`

### Light ("Porcelain") — default for the app workspace
- `--bg`: #F6F7FB · `--bg-2`: #FFFFFF
- `--surface`: #FFFFFF, frosted with soft layered shadow
- `--border`: #E7E9F2
- `--text`: #0B1020 · `--text-muted`: #5B6680
- Accents stay vivid (same blue/violet/cyan) but glows are softer; shadows replace neon.

### Semantic
- `--success` #16C784 · `--warning` #F5A524 · `--danger` #FF4D5E (fraud/critical)
- Risk ramp: Low #16C784 → Medium #F5A524 → High #FF7A8A → Critical #FF2D55
- AI/GenAI moments: violet #A855F7 (NLP query, smart suggestions).

---

## 3. Typography
- **Display:** "Clash Display" or "Space Grotesk" — big, expressive, weight 600–700, tight tracking.
- **UI/body:** "Inter" (400/500/600).
- **Data / labels / metrics:** "JetBrains Mono" — uppercase micro-labels + KPI numerals.
- Scale (clamp): hero `clamp(3rem, 7vw, 7rem)`; h2 `clamp(2rem,4vw,3.5rem)`; body 1rem; micro 0.75rem.
- Hero headline: one keyword filled with the signature gradient; rest in `--text`. Optional faint
  outlined/stroke variant for a second word.

---

## 4. Surfaces, depth, shape
- **Neon glass panel:** `background: var(--surface); backdrop-filter: blur(20px);`
  border = gradient hairline (`border: 1px solid transparent; background-image: linear-gradient(var(--surface),var(--surface)), var(--signature-gradient); background-origin: border-box; background-clip: padding-box, border-box;`),
  plus a faint top-edge highlight and, in dark, a soft outer glow on hover.
- **Radius:** sm 10 · md 14 · lg 20 · xl 28 · pill 999. Cards lg/xl.
- **Light shadows:** `0 2px 4px rgba(11,16,32,.05), 0 12px 32px rgba(11,16,32,.10)`.
- **Dark depth:** elevation + colored glows (e.g. `box-shadow: 0 0 80px -20px #4D7CFF40`).
- Spacing grid: 4/8/12/16/24/32/48/64/96/128. Be generous; let sections breathe.

---

## 5. Motion (framer-motion)
- **Entrance:** blur-in + fade-up (filter blur(8px)→0, y:24→0, opacity, spring) staggered per child.
- **Scroll:** parallax on hero layers; reveal-on-scroll; a sticky section that morphs.
- **Hover:** magnetic buttons (translate toward cursor); cards lift + gradient-border glow brightens.
- **Custom cursor:** a glowing ring (mix-blend-mode), trails the pointer with spring lag, expands +
  brightens over interactive targets. Hidden on touch / reduced-motion.
- **Numbers:** count-up on view. **Charts:** draw-in.
- **Marquee:** slow infinite logo/keyword strip.
- Respect `prefers-reduced-motion`. Workspace motion is subtle; marketing motion is the show.

---

## 6. Signature 3D hero (Three.js / react-three-fiber)
A real WebGL centerpiece: an abstract **"financial signal field"** — a fluid, slowly morphing
particle/node network (a living transaction graph) OR a shader-driven aurora ribbon, with
depth-of-field bloom and cursor-reactive parallax. Electric-blue + violet + cyan points/lines over
near-black. Must feel alive and premium. Lazy-loaded, FPS-capped, with a static gradient-mesh
fallback so it never blocks first paint.

---

## 7. Core components
- **Marketing nav:** floating glass pill bar, wordmark "Verita" + glowing mark, links, theme toggle,
  gradient CTA button.
- **App sidebar:** slim icon+label rail; active item = gradient accent bar + soft glow.
- **KPI tile:** mono uppercase micro-label, big count-up number, delta chip, mini sparkline, neon glass.
- **Chart panel:** title + micro-subtitle, dimension/measure switcher, ECharts canvas, draw-in.
- **Upload dropzone:** large dashed neon-glass zone; on drag-over it glows and the border gradient animates.
- **Risk/alert row:** risk-tier glow dot, mono tx id, amount, inline score bar, status chip.
- **Buttons:** primary = gradient fill + glow + magnetic; ghost = gradient hairline; AI = violet glow.
- **Theme toggle:** animated sun/moon with a smooth crossfade of the whole palette.

---

## 8. Layout
- Marketing: full-bleed aurora hero, asymmetric + bento sections, big type, marquee, generous space.
- App: glass sidebar + fluid content; dashboards = draggable/resizable grid (react-grid-layout).
- Design every screen for BOTH themes; maintain WCAG AA contrast on text.

---

## 9. Do / Don't
- DO: luminous depth, oversized type, gradient accents, neon glass, one jaw-dropping 3D moment,
  springy purposeful motion, screenshot-worthy hero.
- DON'T: flat generic corporate blue, plain white cards with gray borders, centered-everything,
  static lifeless hero, rainbow chaos, neon so loud the data becomes unreadable, paint-blocking bundles.
