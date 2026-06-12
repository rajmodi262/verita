# How To Compile — Read This First

Every document in this package **requires XeLaTeX** (custom fonts via fontspec).
The "Fatal Package fontspec Error" means you compiled with pdfLaTeX.

## Overleaf (easiest, zero install)

1. Upload the whole `THE-MASTERPACK` folder as a project (or drag the zip).
2. **Menu (top-left) → Settings → Compiler → XeLaTeX.** ← the fix for the fontspec error
3. **Menu → Main document** → pick the file you want to build
   (e.g. `04-the-gallery/g3-solar-system.tex`), then Recompile.
4. Repeat step 3 per document — each gallery piece / bundle / artifact is its own
   standalone document, by design.
5. Compile the **gallery pieces first**, download their PDFs into `04-the-gallery/`,
   before compiling the bundles (the bundles embed those PDFs; without them you'll
   see "[gallery piece not yet compiled]" placeholder pages, not an error).
6. If a previous failed run left an `output.pdf` in the project, delete it
   (Overleaf warns about this).

Fonts on Overleaf: Montserrat, Source Sans Pro and JetBrains Mono are preinstalled
on Overleaf's TeX Live image, so the typography renders fully there.

## Windows (local, one-time setup)

```powershell
winget install MiKTeX.MiKTeX        # then open a NEW terminal
.\compile-masterpack.ps1            # builds everything in dependency order
```

First run is slow: MiKTeX auto-installs missing packages (tcolorbox, pgf,
fontawesome5...). Let it. Subsequent runs are fast.

## Linux / macOS

```bash
# TeX Live with xelatex + latex extras, then:
./compile-masterpack.sh
```

## Build order (enforced by the scripts)

```
STAGE 1  04-the-gallery/*.tex        (16 standalone pieces — no dependencies)
STAGE 2  05-the-bundles/**/*.tex     (embed stage-1 PDFs)
STAGE 3  06-the-artifacts/*.tex      (poster + wrappers embed stage-1 PDFs)
```

## If fonts are missing locally

The package **never fails on fonts**: every family has a fallback chain
(Montserrat → Arial → LaTeX sans; Source Sans Pro → Segoe UI; JetBrains Mono →
Consolas). For the full intended look, install the free fonts:
Montserrat + Source Sans Pro (Google Fonts), JetBrains Mono (jetbrains.com/mono).
