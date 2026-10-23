# Contributing to SLOTH

Thank you for your interest in contributing to **SLOTH — Your Local-First AI Productivity Agent**! This project was built for the **Hacktoberfest 2026** "Slow and Steady" challenge to demonstrate how local-first, open-weight AI can tackle real everyday computing chores without relying on proprietary cloud APIs.

---

## Code of Conduct

Please be respectful, kind, and collaborative. All contributors and maintainers are expected to uphold an inclusive, welcoming environment.

---

## Development Setup

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.12)
- Node.js 18+ and npm
- [Ollama](https://ollama.com/) (recommended for local AI inference)

### 2. Backend Setup
```bash
# Clone the repository
git clone https://github.com/srijan-0-7/hacktoberfest-dev-3.git
cd hacktoberfest-dev-3

# Install Python requirements
python -m pip install -r backend/requirements.txt

# Run backend unit tests
python -m pytest backend/tests
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run build
```

### 4. Running the Application
```bash
# Start backend on 127.0.0.1:8000 (serves API and built frontend)
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

# For frontend hot-reloading (development):
cd frontend
npm run dev
```

---

## Pull Request Guidelines

1. **Local-First Core:** All new features must work 100% locally with open-weight models through Ollama or standard deterministic algorithms. Never make proprietary hosted APIs a mandatory dependency.
2. **Deterministic Fallbacks:** When Ollama is offline, ensure the code fails gracefully or falls back to transparent rule-based heuristics clearly labeled as non-AI.
3. **Safety & Journaling:** Any feature modifying files must implement path traversal checks, pre-execution validation, and durable SQLite journaling for reversible Undo.
4. **Automated Tests:** Add pytest test cases in `backend/tests/` for all new endpoints or services. All existing tests must pass cleanly.
