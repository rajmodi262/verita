@echo off
setlocal EnableExtensions
title Verita - Launcher
cd /d "%~dp0"
color 0b

echo ================================================================
echo    VERITA  -  Financial Crime ^& Compliance Intelligence
echo ================================================================
echo.

:: ---------------------------------------------------------------
:: 1) Prerequisites
:: ---------------------------------------------------------------
echo [1/5] Checking prerequisites...

where python >nul 2>&1
if errorlevel 1 (
  color 0c
  echo   [ERROR] Python was not found on PATH.
  echo           Install Python 3.10+ from https://www.python.org/downloads/
  echo           and tick "Add Python to PATH" during setup.
  echo.
  pause
  exit /b 1
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo   - %%v

where node >nul 2>&1
if errorlevel 1 (
  color 0c
  echo   [ERROR] Node.js was not found on PATH.
  echo           Install Node.js 18+ from https://nodejs.org/
  echo.
  pause
  exit /b 1
)
for /f "tokens=*" %%v in ('node --version 2^>^&1') do echo   - Node.js %%v
echo.

:: ---------------------------------------------------------------
:: 2) Backend dependencies (Python virtual environment)
:: ---------------------------------------------------------------
if not exist ".venv\Scripts\python.exe" (
  echo [2/5] First run: creating Python environment and installing backend deps...
  echo       ^(this can take a couple of minutes - grab a coffee^)
  python -m venv .venv
  if errorlevel 1 ( color 0c & echo   [ERROR] Could not create virtual environment. & pause & exit /b 1 )
  ".venv\Scripts\python.exe" -m pip install --upgrade pip >nul 2>&1
  ".venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
  if errorlevel 1 ( color 0c & echo   [ERROR] Backend dependency install failed. & pause & exit /b 1 )
  echo   - Backend dependencies installed.
) else (
  echo [2/5] Backend environment found - skipping install.
)
echo.

:: ---------------------------------------------------------------
:: 3) Frontend dependencies (npm)
:: ---------------------------------------------------------------
if not exist "frontend\node_modules" (
  echo [3/5] First run: installing frontend deps with npm...
  pushd frontend
  call npm install
  if errorlevel 1 ( color 0c & echo   [ERROR] Frontend dependency install failed. & popd & pause & exit /b 1 )
  popd
  echo   - Frontend dependencies installed.
) else (
  echo [3/5] Frontend packages found - skipping install.
)
echo.

:: ---------------------------------------------------------------
:: 4) Clean slate: stop ANY previous Verita sessions so we never
::    stack duplicate servers or fight over ports 8000 / 5173.
::    Matching by the PROJECT PATH in each process's command line also
::    catches orphaned "uvicorn --reload" workers that closing the
::    window leaves behind holding the port (the bug that made a plain
::    restart silently keep serving the OLD code).
:: ---------------------------------------------------------------
echo [4/5] Stopping any previous Verita sessions...
set "ROOT=%~dp0"
:: close old launcher-spawned server windows (this launcher is NOT matched)
taskkill /FI "WINDOWTITLE eq Verita Backend*"  /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Verita Frontend*" /T /F >nul 2>&1
:: kill any python/node process whose command line points into THIS project folder
:: (catches orphaned reload workers + their spawned children), then free the ports.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$r=('%ROOT%').ToLower(); Get-CimInstance Win32_Process | Where-Object { ($_.Name -in 'python.exe','pythonw.exe','node.exe') -and $_.CommandLine -and ($_.CommandLine.ToLower().Contains($r) -or $_.CommandLine -match 'app\.main:app') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Get-NetTCPConnection -LocalPort 8000,5173 -State Listen -ErrorAction SilentlyContinue | Select-Object -Expand OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>&1
timeout /t 3 /nobreak >nul
echo   - Previous sessions cleared. Ports 8000 and 5173 are free.
echo.

:: ---------------------------------------------------------------
:: 5) Launch the TWO servers (each in its own window) + open Chrome.
::    No DATABASE_URL is set, so the audit trail uses a zero-config
::    SQLite file. For real PostgreSQL, run "docker compose up" instead.
:: ---------------------------------------------------------------
echo [5/5] Starting the two servers...
start "Verita Backend  (http://localhost:8000)"  /d "%~dp0backend"  cmd /k "..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
start "Verita Frontend (http://localhost:5173)" /d "%~dp0frontend" cmd /k "npm run dev -- --port 5173 --strictPort"

echo   - Backend  : http://localhost:8000  (API docs at /docs)
echo   - Frontend : http://localhost:5173
echo.
echo Waiting for the dev server to warm up...
timeout /t 9 /nobreak >nul

:: ---- open the site in Chrome specifically ----
set "URL=http://localhost:5173/"
set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe"        set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"   set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe"        set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if defined CHROME (
  start "" "%CHROME%" "%URL%"
) else (
  echo   [note] Chrome not found in the usual place - opening default browser.
  start "" "chrome" "%URL%" || start "" "%URL%"
)

echo.
echo ================================================================
echo  Verita is running. Chrome should open at %URL%
echo  If not, visit %URL% yourself.
echo.
echo  To STOP everything: just run this start.bat again (it clears
echo  old sessions first), or close the two Verita server windows.
echo ================================================================
echo.
pause
endlocal
