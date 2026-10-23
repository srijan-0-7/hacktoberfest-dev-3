#!/usr/bin/env bash
set -e

echo "========================================================"
echo "  SLOTH - Your Local-First AI Productivity Agent"
echo "  Hacktoberfest 2026: 'Slow and Steady'"
echo "========================================================"
echo ""

# Check python3
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] python3 could not be found."
    exit 1
fi

# Check Ollama
if curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
    echo "[AI] Ollama is ONLINE on port 11434!"
else
    echo "[AI] Ollama is currently offline. SLOTH will start in deterministic rules mode."
    echo "     To enable local AI inference, run: ollama run qwen2.5:3b"
fi

echo "[1/2] Installing requirements..."
python3 -m pip install -r backend/requirements.txt --quiet

if [ ! -f "frontend/dist/index.html" ]; then
    echo "[BUILD] Building frontend distribution assets..."
    (cd frontend && npm install && npm run build)
fi

echo "[2/2] Launching SLOTH on http://127.0.0.1:8000..."
python3 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
