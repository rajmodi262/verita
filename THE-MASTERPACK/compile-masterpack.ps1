# ══════════════════════════════════════════════════════════════════
#  COMPILE-MASTERPACK (PowerShell twin for Windows)
#  Requires: xelatex on PATH (MiKTeX: winget install MiKTeX.MiKTeX)
#  Usage:    .\compile-masterpack.ps1            (build everything)
#            .\compile-masterpack.ps1 gallery    (one stage)
# ══════════════════════════════════════════════════════════════════
param([string]$Target = "all")

Write-Host ""
Write-Host "  ╔╦╗╦ ╦╔═╗  ╔╦╗╔═╗╔═╗╔╦╗╔═╦═╗╔═╗╔═╗╦╔═" -ForegroundColor Cyan
Write-Host "   ║ ╠═╣║╣   ║║║╠═╣╚═╗ ║ ║╣ ╠╦╝╠═╝╠═╣║ ╩╗" -ForegroundColor Cyan
Write-Host "   ╩ ╩ ╩╚═╝  ╩ ╩╩ ╩╚═╝ ╩ ╚═╝╩╚═╩  ╩ ╩╩╚═╝" -ForegroundColor Cyan
Write-Host "   Building the VERITA Interview Pack..."
Write-Host "   every page shows its work" -ForegroundColor DarkGray
Write-Host ""

if (-not (Get-Command xelatex -ErrorAction SilentlyContinue)) {
    Write-Host "  ✗ xelatex not found." -ForegroundColor Red
    Write-Host "    Install MiKTeX:  winget install MiKTeX.MiKTeX"
    Write-Host "    then re-run. Nothing was built."
    exit 1
}

$Root = $PSScriptRoot
$Summary = @()
$Pass = 0; $Fail = 0

function Invoke-Compile {
    param([string]$Dir, [string]$File)
    $name = [IO.Path]::GetFileNameWithoutExtension($File)
    Write-Host ("  ⟳ {0}" -f $name) -ForegroundColor Yellow -NoNewline
    Push-Location (Join-Path $Root $Dir)
    $ok = $true
    foreach ($i in 1..2) {
        & xelatex -interaction=nonstopmode -halt-on-error $File *> $null
        if ($LASTEXITCODE -ne 0) { $ok = $false; break }
    }
    Pop-Location
    if ($ok) {
        Write-Host ("`r  ✓ {0}" -f $name) -ForegroundColor Green
        $script:Summary += [pscustomobject]@{ File = "$Dir/$name.pdf"; Status = "OK" }
        $script:Pass++
    } else {
        Write-Host ("`r  ✗ {0}  (see {1}/{2}.log)" -f $name, $Dir, $name) -ForegroundColor Red
        $script:Summary += [pscustomobject]@{ File = "$Dir/$name.pdf"; Status = "FAILED" }
        $script:Fail++
    }
}

$gallery = @("g1-universe-map","g2-origin-story-comic","g3-solar-system","g4-factory-floor",
  "g5-battle-radar","g6-anatomy-mcp","g7-before-after-world","g8-decision-comics",
  "g9-roadtrip-map","g10-receipt-of-genius","g11-newspaper-front-page",
  "g12-movie-poster","g13-periodic-table","g14-blueprint-diagram",
  "g15-iceberg-model","g16-constellation-map")

if ($Target -in @("all","gallery")) {
    Write-Host "━━ STAGE 1 · THE GALLERY (16 pieces) ━━━━━━━━━━━━━━━━" -ForegroundColor DarkYellow
    foreach ($g in $gallery) { Invoke-Compile "04-the-gallery" "$g.tex" }
}
if ($Target -in @("all","bundles")) {
    Write-Host "`n━━ STAGE 2 · THE BUNDLES ━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkYellow
    Invoke-Compile "05-the-bundles/hr-masterpack" "hr-masterpack.tex"
    Invoke-Compile "05-the-bundles/hr-masterpack" "cover-letter-insert.tex"
    Invoke-Compile "05-the-bundles/tech-masterpack" "tech-masterpack.tex"
    Invoke-Compile "05-the-bundles/tech-masterpack" "technical-appendix.tex"
    Invoke-Compile "05-the-bundles/universal-one-pager" "one-pager.tex"
}
if ($Target -in @("all","artifacts")) {
    Write-Host "`n━━ STAGE 3 · THE ARTIFACTS ━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkYellow
    foreach ($a in @("desk-poster","business-card","project-receipt","fake-newspaper",
                     "constitution","offer-letter")) {
        Invoke-Compile "06-the-artifacts" "$a.tex"
    }
}

Write-Host "`n══ BUILD SUMMARY ═══════════════════════════════════════════" -ForegroundColor Cyan
$Summary | Format-Table -AutoSize | Out-String | Write-Host
Write-Host ("  passed: {0}   failed: {1}" -f $Pass, $Fail)

if ($Fail -eq 0 -and $Pass -gt 0) {
    Write-Host "`n  See PRINT-INSTRUCTIONS.md for the print run." -ForegroundColor DarkYellow
    Write-Host "  🏆 BUILD COMPLETE. Go get that internship. You've earned it." -ForegroundColor Green
} else {
    Write-Host "`n  Fix the failures above, then re-run. The logs know everything." -ForegroundColor Yellow
}
