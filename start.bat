@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   SLOTH - Your Local-First AI Productivity Agent
echo   Hacktoberfest 2026: "Slow and Steady"
echo ========================================================
echo.

REM Check Python
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python 3 is not found in PATH. Please install Python 3.10+.
    pause
    exit /b 1
)

REM Check Node
npm.cmd --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node/npm is not found in PATH.
    pause
    exit /b 1
)

echo [1/3] Checking Ollama local AI status...
curl.exe -s http://127.0.0.1:11434/api/tags >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo       Ollama is ONLINE on port 11434!
) else (
    echo       [NOTE] Ollama is not currently running.
    echo       SLOTH will start with deterministic rules fallback.
    echo       To enable full open-weight AI inference, run: ollama run qwen2.5:3b
)
echo.

echo [2/3] Installing Python backend requirements...
python -m pip install -r backend/requirements.txt --quiet
if %ERRORLEVEL% neq 0 (
    echo [WARN] Pip install had warnings, continuing...
)

if not exist "frontend\dist\index.html" (
    echo [BUILD] Building frontend distribution assets...
    cd frontend
    call npm.cmd install
    call npm.cmd run build
    cd ..
)

echo [3/3] Launching SLOTH Local Server...
echo.
echo Application will be available at: http://127.0.0.1:8000
echo Opening browser...
start http://127.0.0.1:8000
echo.
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
pause
