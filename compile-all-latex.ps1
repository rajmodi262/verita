# ============================================================
# Verita LaTeX -> PDF Batch Compiler
# ============================================================

$MiKTeX   = "C:\Users\Raj Modi\AppData\Local\Programs\MiKTeX\miktex\bin\x64"
$xelatex  = Join-Path $MiKTeX "xelatex.exe"
$pdflatex = Join-Path $MiKTeX "pdflatex.exe"

$engine = if (Test-Path $xelatex) { $xelatex } else { $pdflatex }
Write-Host "Using engine: $engine" -ForegroundColor Cyan

$outputRoot = "D:\RajFiles\Verita\COMPILED-PDFS"

# Collect all standalone .tex files
$texFiles = Get-ChildItem -Path "D:\RajFiles\Verita\THE-MASTERPACK" -Filter "*.tex" -Recurse |
    Where-Object {
        $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
        $content -match '\\documentclass'
    }

Write-Host ""
Write-Host "Found $($texFiles.Count) standalone .tex files to compile." -ForegroundColor Yellow
Write-Host ""

$results = @()

foreach ($tex in $texFiles) {
    $baseName  = $tex.BaseName
    $sourceDir = $tex.DirectoryName
    $outDir    = Join-Path $outputRoot $baseName

    New-Item -ItemType Directory -Path $outDir -Force | Out-Null

    Write-Host "Compiling: $($tex.Name) ..." -NoNewline

    $argList = "-interaction=nonstopmode -halt-on-error -output-directory=`"$outDir`" `"$($tex.FullName)`""

    $success = $true
    for ($pass = 1; $pass -le 2; $pass++) {
        $proc = Start-Process -FilePath $engine `
            -ArgumentList $argList `
            -WorkingDirectory $sourceDir `
            -Wait -PassThru `
            -RedirectStandardOutput "$outDir\compile.log" `
            -WindowStyle Hidden

        if ($proc.ExitCode -ne 0) {
            $success = $false
            break
        }
    }

    $pdfPath = Join-Path $outDir "$baseName.pdf"
    if ($success -and (Test-Path $pdfPath)) {
        $size = [math]::Round((Get-Item $pdfPath).Length / 1KB, 1)
        Write-Host " OK ($size KB)" -ForegroundColor Green
        $results += [PSCustomObject]@{ File = $tex.Name; Status = "SUCCESS"; Size = "$size KB" }
    } else {
        Write-Host " FAILED (see $outDir\compile.log)" -ForegroundColor Red
        $results += [PSCustomObject]@{ File = $tex.Name; Status = "FAILED"; Size = "" }
    }
}

Write-Host ""
Write-Host "========== SUMMARY ==========" -ForegroundColor Cyan
$results | Format-Table -AutoSize

$ok   = ($results | Where-Object { $_.Status -eq "SUCCESS" }).Count
$fail = ($results | Where-Object { $_.Status -eq "FAILED"  }).Count
Write-Host "Compiled: $ok / $($texFiles.Count)   Failed: $fail"
Write-Host "PDFs saved to: $outputRoot"
