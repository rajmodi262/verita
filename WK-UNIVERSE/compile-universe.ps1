# =====================================================================
#  compile-universe.ps1  —  build every WK-UNIVERSE A3 poster to a
#  print-ready PDF in COMPILED-PDFS\POSTERS-PRINT-THESE.
#  Usage:  pwsh -File compile-universe.ps1   (or run from VS Code / PS)
#  Requires: MiKTeX (xelatex/pdflatex). Auto-detects the binary.
# =====================================================================
$ErrorActionPreference = 'Continue'

# --- locate MiKTeX ---
$bin = "C:\Users\Raj Modi\AppData\Local\Programs\MiKTeX\miktex\bin\x64"
if (-not (Test-Path "$bin\pdflatex.exe")) {
    $cmd = Get-Command pdflatex -ErrorAction SilentlyContinue
    if ($cmd) { $bin = Split-Path $cmd.Source }
    else { Write-Host "MiKTeX not found. Install: winget install MiKTeX.MiKTeX" -ForegroundColor Red; exit 1 }
}
$env:PATH = "$bin;$env:PATH"

# --- paths ---
$root = $PSScriptRoot
$env:TEXINPUTS = "$root\00-DESIGN-DNA;"
$out = "$root\COMPILED-PDFS\POSTERS-PRINT-THESE"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$posters = @(
    "SET-C--HR\C5-posters\hr-a3-story-poster.tex",
    "SET-B--TECHNICAL\B5-posters\tech-a3-user-journey-pipeline.tex",
    "SET-B--TECHNICAL\B5-posters\tech-a3-data-universe.tex",
    "SET-C--HR\C5-posters\hr-a3-project-universe.tex",
    "SET-C--HR\C5-posters\hr-a3-value-map.tex",
    "SET-B--TECHNICAL\B5-posters\tech-a3-system-overview.tex"
)

Write-Host "`n=== WK-UNIVERSE :: compiling $($posters.Count) A3 posters ===`n" -ForegroundColor Cyan
foreach ($p in $posters) {
    $full = Join-Path $root $p
    $name = [IO.Path]::GetFileNameWithoutExtension($p)
    Write-Host ("[COMPILE] {0,-40}" -f $name) -NoNewline
    1..2 | ForEach-Object {
        & "$bin\pdflatex.exe" -interaction=nonstopmode -halt-on-error -output-directory="$out" "$full" *> $null
    }
    if (Test-Path "$out\$name.pdf") { Write-Host " OK" -ForegroundColor Green }
    else { Write-Host " FAILED (is the PDF open in a viewer? close it & retry)" -ForegroundColor Red }
}

# --- A4 print bundles ---
Write-Host "`n=== compiling A4 print bundles ===`n" -ForegroundColor Cyan
$bundles = @(
    @{ tex = "SET-B--TECHNICAL\B4-print-bundle\tech-masterpack.tex"; dir = "COMPILED-PDFS\TECH-BUNDLE" },
    @{ tex = "SET-C--HR\C4-print-bundle\hr-masterpack.tex";          dir = "COMPILED-PDFS\HR-BUNDLE" }
)
foreach ($b in $bundles) {
    $full = Join-Path $root $b.tex
    $bout = Join-Path $root $b.dir
    $name = [IO.Path]::GetFileNameWithoutExtension($b.tex)
    New-Item -ItemType Directory -Force -Path $bout | Out-Null
    Write-Host ("[COMPILE] {0,-40}" -f $name) -NoNewline
    1..2 | ForEach-Object { & "$bin\pdflatex.exe" -interaction=nonstopmode -halt-on-error -output-directory="$bout" "$full" *> $null }
    if (Test-Path "$bout\$name.pdf") { Write-Host " OK" -ForegroundColor Green } else { Write-Host " FAILED" -ForegroundColor Red }
    Get-ChildItem $bout -Include *.aux, *.log, *.out -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
}

# --- clean auxiliary files ---
Get-ChildItem $out -Include *.aux, *.log, *.out -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host "`n=== PDF MANIFEST ===" -ForegroundColor Cyan
Write-Host "POSTERS-PRINT-THESE (A3):"
Get-ChildItem "$out\*.pdf" | ForEach-Object { Write-Host ("  {0,-40} {1,8:N0} bytes" -f $_.Name, $_.Length) }
Write-Host "TECH-BUNDLE / HR-BUNDLE (A4):"
Get-ChildItem "$root\COMPILED-PDFS\TECH-BUNDLE\*.pdf","$root\COMPILED-PDFS\HR-BUNDLE\*.pdf" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host ("  {0,-40} {1,8:N0} bytes" -f $_.Name, $_.Length) }
Write-Host "`nPosters: A3 full-bleed. Bundles: A4, 6pp each.`n" -ForegroundColor Green
