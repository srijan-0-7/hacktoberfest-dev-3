# 🦥 SLOTH — Your Local-First AI Productivity Agent

> **“Your boring tasks. Handled while you rest.”**  
> *Hacktoberfest 2026 | “Slow and Steady” Track | 100% Local Open-Source AI*

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-2d6a4f.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-40916c.svg)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.3-52b788.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.3-74c69d.svg)](https://vitejs.dev)
[![Local Inference](https://img.shields.io/badge/Inference-Ollama%20(Local)-081c15.svg)](https://ollama.com)
[![Tests Passing](https://img.shields.io/badge/Tests-22%20Passed-brightgreen.svg)](#testing)

---

## 📖 Overview

**SLOTH** is a privacy-first, desktop-friendly web application designed to help developers, students, researchers, and busy knowledge workers overcome digital procrastination. 

Instead of postponing routine chores—like cleaning a cluttered `Downloads` folder, figuring out what messy filenames contain, or reading through 30-page documents to find action items—SLOTH lets you sit back while a **locally running open-weight AI** does the heavy lifting.

### 🌟 Core Promise
> **Drop the digital clutter. Let your local AI do the boring work. Review once. Relax.**

- **100% Local Inference:** Powered by open-weight models via [Ollama](https://ollama.com) (`qwen2.5:3b`, `llama3.2:3b`, `mistral:latest`).
- **Zero Cloud API Fees:** No OpenAI, Anthropic, or Gemini API keys required for core functionality.
- **Strict Privacy:** Your files, filenames, and documents never leave your laptop.
- **Two-Phase Safety:** The AI only *proposes* a plan. Files are modified **only after explicit user review**, with complete atomic journaling and 1-click **Undo**.

---

## ✨ Features End-to-End

### 📂 Feature A: Smart Folder Organizer
- **Scan Accessible Directories:** Safely discover files across PDF, DOCX, TXT, Markdown, CSV, JSON, and media formats.
- **Content-Aware AI Proposals:** The local model reads excerpts and suggests:
  - Clean, human-readable filenames (removing clutter like `_v2_final_FINAL`).
  - Structured categories (*Academics, Research, Finance, Work, Personal, Media, Development, Miscellaneous*).
  - Subcategories and target folder structures.
  - Justification reason, confidence score, and relevant tags.
- **Interactive Review Table:** Inline-edit proposed names, change target categories, or toggle individual files before approval.
- **Collision & Symlink Protection:** Automatically detects existing files on disk, resolves duplicate destinations with incremented naming, and safeguards against path traversal outside the folder root.

### 📄 Feature B: Document Digest
- **Instant Structured Summarization:** Upload or paste documents (PDF, DOCX, TXT, MD, CSV, JSON).
- **Targeted Output:**
  - Concise Executive Summary.
  - Bulleted Key Takeaways.
  - Action Items with interactive checkboxes.
  - **Explicitly stated Deadlines & Dates** (no fabricated dates).
  - Questions for Investigation.
- **Dual-Pane Viewer:** Inspect the extracted text alongside the AI digest.
- **Export Capabilities:** One-click copy to clipboard or export as structured Markdown (`.md`).

### ⚡ Feature C: One-Click Batch Actions & SQLite Journal
- **Durable Audit Trail:** Every filesystem change is recorded in local SQLite database (`sloth.db`) with timestamps, original paths, and destination paths.
- **Conflict-Safe Reversible Undo:** Revert any single file move or an entire batch with one click. The undo engine checks destination vacancy first to avoid overwriting newer files.

### ☕ Feature D: Relax Mode (The Signature Feature)
- **Calm, Background Execution:** Kick off a batch and watch Sloth work at an energy-friendly pace.
- **Live Queue Monitoring:** Real-time metrics tracking *Files Discovered, Files Analyzed, Suggestions Ready, Needs Review, and Executed Operations*.
- **Cool-Laptop Profile:** Configurable concurrency limit (default: 2 workers) prevents CPU spikes and thermal throttling on standard laptops.
- **Estimated Time Saved:** Calculates estimated hours and minutes saved based on completed tasks.

### 🧪 Feature E: Built-in Demonstration Sandbox
- **One-Click Realistic Demo:** Initializes a safe `demo_sandbox` with 8 diverse test files:
  1. `DSA_lecture4_graphs_and_trees_v2_final_FINAL.txt` (Data structures notes)
  2. `arxiv_2310_transformer_attention_mechanisms_survey.txt` (Research excerpt)
  3. `october_2026_office_supplies_receipts_tax.csv` (Expense report)
  4. `product_launch_brief_q4_confidential.docx` (Rich DOCX brief)
  5. `CS301_OS_lecture_notes_deadlocks_v3.pdf` (Operating systems PDF)
  6. `sloth_agent_runtime_config_v1_debug.json` (Configuration JSON)
  7. `random_download_838291_messy_name.txt` (Personal fitness log)
  8. `screenshot_20261020_raw_unnamed.png` (Media file)

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Local AI Engine** | [Ollama](https://ollama.com/) (Default: `qwen2.5:3b`, auto-detects installed models) |
| **Backend Framework** | Python 3.12, [FastAPI](https://fastapi.tiangolo.com/), Uvicorn |
| **Document Processing** | PyMuPDF / `pypdf`, `python-docx`, `reportlab`, standard CSV/JSON |
| **Validation & Schema** | Pydantic v2 |
| **Persistence** | SQLite 3 (durable local journal in `backend/sloth.db`) |
| **Frontend Framework** | React 19, TypeScript, [Vite](https://vitejs.dev/) |
| **Styling & UI** | [Tailwind CSS v4](https://tailwindcss.com/), Lucide React |
| **Testing Suite** | `pytest` (22 comprehensive unit & integration tests) |

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Python 3.10+** (Tested on Python 3.12)
- **Node.js 18+** and **npm**
- **Ollama** (Recommended for local open-weight AI inference; download from [ollama.com](https://ollama.com))

### 2. Optional: Start Local Model with Ollama
In a separate terminal, pull and start a lightweight model:
```bash
ollama run qwen2.5:3b
```
*(If Ollama is not installed or offline, SLOTH will automatically start with its transparent, deterministic rule-based heuristic mode).*

### 3. One-Command Launch

#### On Windows:
Double-click `start.bat` or run in PowerShell:
```powershell
.\start.ps1
```

#### On Linux / macOS:
```bash
chmod +x start.sh
./start.sh
```

The application will launch and open in your browser at:
**[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

## 🧪 5-Minute Evaluation Walkthrough

Follow this sequence to evaluate all features in 5 minutes:

1. **Launch the Application:** Open [http://127.0.0.1:8000](http://127.0.0.1:8000).
2. **Inspect AI Status:** Notice the status indicator in the top navbar. If Ollama is running, it will display `● Ollama: qwen2.5:3b`. If offline, it indicates `○ Ollama Offline (Rules Mode)`.
3. **Open Organizer:** Click the **Organizer** tab or click **🧪 Load Demo Sandbox**.
4. **Scan & Analyze:** Click **Scan Folder** to discover the 8 sample files, then click **Analyze with AI** (or **Generate Organization Plan**).
5. **Inspect the Two-Phase Plan:** Observe how `DSA_lecture4_graphs_v2_final_FINAL.txt` is categorized into `Academics/Coursework` and proposed with a clean filename.
6. **Inline Edit:** Change a proposed filename or switch a category dropdown directly in the table.
7. **Approve & Execute:** Click **Approve & Execute Batch**. Inspect the successful moves and the estimated time saved counter.
8. **Test Safe Undo:** Click **Undo Batch Operations**. Verify that all 8 sample files are restored to their exact original names and locations.
9. **Test Document Digest:** Navigate to the **Document Digest** tab, paste sample notes or upload a file, and click **Generate Digest** to see extracted takeaways, action items, and stated deadlines.
10. **Check History:** Go to **History** to review the durable SQLite audit trail and drill into individual operation details.

---

## 🔒 Security & Filesystem Safety

Security is built into SLOTH's foundation:
1. **Localhost Binding Only:** Binds strictly to `127.0.0.1` by default.
2. **Path Traversal Protection:** Rejects paths outside authorized folders, preventing `../` traversal or scanning root drives (`C:\`, `/`) and system directories (`Windows\System32`).
3. **Symlink Safeguards:** Resolves symlink targets before discovery; broken or escaping symlinks are rejected.
4. **Conflict-Aware Overwrite Protection:** Checks whether destination files already exist on disk before moving; auto-disambiguates names to avoid overwriting user files.
5. **Reversible Undo Engine:** Verifies that the original path is vacant before moving files back.
6. **Zero Telemetry:** No user documents, text excerpts, or prompts are sent over the network.

---

## 🧪 Testing

SLOTH includes 22 automated unit and integration tests covering:
- Health and dynamic AI status discovery.
- Offline deterministic heuristic fallback.
- Multi-format text extraction (PDF, DOCX, TXT, CSV, JSON, empty files).
- Path traversal rejection, root drive protection, and hidden directory exclusions.
- Filename sanitization and collision disambiguation.
- Two-phase execution, SQLite journaling, and safe Undo with collision prevention.
- End-to-end API workflows.

To run the automated test suite:
```bash
python -m pytest backend/tests
```

**Actual Test Results:**
```
============================= test session starts =============================
platform win32 -- Python 3.12.1, pytest-8.2.2, pluggy-1.6.0
collected 22 items

backend/tests/test_api_endpoints.py .                                    [  4%]
backend/tests/test_digest_and_history.py ..                              [ 13%]
backend/tests/test_executor_and_undo.py ..                               [ 22%]
backend/tests/test_extractor.py .....                                    [ 45%]
backend/tests/test_health_and_ai.py .....                                [ 68%]
backend/tests/test_organizer_plan.py ...                                 [ 81%]
backend/tests/test_scanner_and_security.py ....                          [100%]

======================= 22 passed in 46.70s =======================
```

---

## 🦥 The Hacktoberfest 2026 Story: "Slow and Steady"

In an era of rushed AI chatbots that send personal files to cloud APIs, **SLOTH** embodies the spirit of open innovation:

- **Slow and Steady:** Take a measured, thoughtful approach to AI productivity. Run batches quietly in the background without burning CPU cycles or battery.
- **Privacy & Sovereignty:** Users own their models, their data, and their hardware.
- **Explainability:** Suggestions are structured and transparent. The user retains complete authority over filesystem modifications.
- **Open-Weight Ecosystem:** Swap between Qwen, Llama, Mistral, or Phi models dynamically without changing product code.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
Built with ❤️ for Hacktoberfest 2026.
