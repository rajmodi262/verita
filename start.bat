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
echo [1/4] Checking prerequisites...

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
  echo [2/4] First run: creating Python environment and installing backend deps...
  echo       ^(this can take a couple of minutes - grab a coffee^)
  python -m venv .venv
  if errorlevel 1 ( color 0c & echo   [ERROR] Could not create virtual environment. & pause & exit /b 1 )
  ".venv\Scripts\python.exe" -m pip install --upgrade pip >nul 2>&1
  ".venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
  if errorlevel 1 ( color 0c & echo   [ERROR] Backend dependency install failed. & pause & exit /b 1 )
  echo   - Backend dependencies installed.
) else (
  echo [2/4] Backend environment found - skipping install.
)
echo.

:: ---------------------------------------------------------------
:: 3) Frontend dependencies (npm)
:: ---------------------------------------------------------------
if not exist "frontend\node_modules" (
  echo [3/4] First run: installing frontend deps with npm...
  pushd frontend
  call npm install
  if errorlevel 1 ( color 0c & echo   [ERROR] Frontend dependency install failed. & popd & pause & exit /b 1 )
  popd
  echo   - Frontend dependencies installed.
) else (
  echo [3/4] Frontend packages found - skipping install.
)
echo.

:: ---------------------------------------------------------------
:: 4) Launch both servers (each in its own window) + open browser
::    No DATABASE_URL is set, so the audit trail uses a zero-config
::    SQLite file. For real PostgreSQL, run "docker compose up" instead.
:: ---------------------------------------------------------------
echo [4/4] Starting servers...
start "Verita Backend  (http://localhost:8000)"  /d "%~dp0backend"  cmd /k "..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
start "Verita Frontend (http://localhost:5173)" /d "%~dp0frontend" cmd /k "npm run dev -- --port 5173 --strictPort"

echo   - Backend  : http://localhost:8000  (API docs at /docs)
echo   - Frontend : http://localhost:5173
echo.
echo Waiting for the dev server to warm up...
timeout /t 9 /nobreak >nul
start "" "http://localhost:5173/"

echo.
echo ================================================================
echo  Verita is running. Your browser should open automatically.
echo  If not, visit http://localhost:5173/
echo.
echo  To STOP: close the two "Verita Backend" / "Verita Frontend"
echo  windows that opened.
echo ================================================================
echo.
pause
endlocal
