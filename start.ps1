# SLOTH PowerShell Launcher
Write-Host "========================================================" -ForegroundColor DarkGreen
Write-Host "  SLOTH - Your Local-First AI Productivity Agent" -ForegroundColor Green
Write-Host "  Hacktoberfest 2026: 'Slow and Steady'" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor DarkGreen
Write-Host ""

# Check Python
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Error "Python 3 is required but not found in PATH."
    exit 1
}

# Check Ollama
$ollamaCheck = Test-NetConnection -ComputerName 127.0.0.1 -Port 11434 -WarningAction SilentlyContinue
if ($ollamaCheck.TcpTestSucceeded) {
    Write-Host "[AI] Ollama is ONLINE on port 11434!" -ForegroundColor Green
} else {
    Write-Host "[AI] Ollama is currently offline. SLOTH will start with deterministic rules fallback." -ForegroundColor Yellow
    Write-Host "     To connect local AI, open another terminal and run: ollama run qwen2.5:3b" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "[1/2] Verifying Python dependencies..." -ForegroundColor White
python -m pip install -r backend/requirements.txt --quiet

if (-not (Test-Path "frontend/dist/index.html")) {
    Write-Host "[BUILD] Building frontend distribution assets..." -ForegroundColor Yellow
    Push-Location "frontend"
    npm.cmd install
    npm.cmd run build
    Pop-Location
}

Write-Host "[2/2] Starting SLOTH application server on http://127.0.0.1:8000..." -ForegroundColor White
Start-Process "http://127.0.0.1:8000"

python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
