*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 3: Slow and Steady](https://dev.to/challenges/hacktoberfest-week3-2026-10-19)*

---

# 🦥 SLOTH — Your Local-First AI Productivity Agent
> *“Your boring tasks. Handled while you rest.”*

---

## What I Built

**SLOTH** is a privacy-first, desktop-friendly web application designed to help developers, students, researchers, and busy knowledge workers conquer digital procrastination. 

Instead of postponing tedious digital chores—like cleaning an overflowing `Downloads` folder, figuring out what files named `lecture_notes_v2_final_FINAL.pdf` actually contain, or sifting through a 25-page PDF just to find deadlines—SLOTH lets you sit back while a **locally running open-weight AI** takes care of the boring work.

### Who gets to be a little lazier because of it?
- **Developers & Students:** Who let hundreds of PDFs, receipts, datasets, and code snippets pile up in unorganized directories.
- **Researchers & Knowledge Workers:** Who need instant executive takeaways, action items, and explicitly stated deadlines without reading entire documents end-to-end.
- **Anyone who wants safe automation:** SLOTH enforces a strict **two-phase workflow**—the AI only *proposes* a plan. Files are only modified after explicit user review and approval, backed by atomic SQLite journaling and 1-click **conflict-safe Undo**.

---

## Demo

{% youtube YOUR_YOUTUBE_VIDEO_ID_HERE %}
*(Replace `YOUR_YOUTUBE_VIDEO_ID_HERE` with your YouTube video ID after uploading)*

### 🎮 Live Walkthrough Highlights
1. **Smart Folder Organizer:** Loads a built-in sandbox with 8 messy files (PDF, DOCX, TXT, CSV, JSON, PNG), scans them, and uses local AI to propose human-readable names and subfolders (e.g., `Academics/Coursework`, `Finance/Receipts`).
2. **Interactive Plan Table:** Inline-edit proposed filenames and switch categories via dropdowns before approving changes.
3. **Reversible Safe Undo:** 1-click restoration reverts all file operations to their original filenames and paths without data loss.
4. **Document Digest:** Extracts executive summaries, bulleted key takeaways, checklist action items, and explicitly stated dates/deadlines.
5. **Relax Mode:** The signature feature featuring a background task queue with laptop-cool concurrency controls and a dynamic **Estimated Time Saved** counter.

---

## Code

{% github https://github.com/srijan-0-7/hacktoberfest-dev-3.git %}

The complete project is open-source under the **MIT License**.

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons.
- **Backend:** Python 3.12, FastAPI, Uvicorn, Pydantic v2.
- **Document Processing:** PyMuPDF, `python-docx`, `reportlab`.
- **Database:** SQLite 3 (local durable journal).
- **Automated Testing:** 22 passing automated tests in `pytest`.

---

## How I Built It

SLOTH is built from the ground up around **local inference with open-weight models** using **Ollama**:

### 1. Dedicated Local AI Adapter (`backend/app/services/ai_service.py`)
- **Direct Local Inference:** Communicates over HTTP with `http://127.0.0.1:11434`.
- **Dynamic Model Auto-Discovery:** Queries `/api/tags` to discover which models are already pulled on the machine (e.g., `qwen2.5:3b`, `llama3.2:3b`, `mistral:latest`), defaulting gracefully to the active model without hardcoding requirements.
- **Strict JSON Output:** Prompts enforce strict Pydantic-validated JSON structures (`format="json"`, temperature 0.2).
- **Truth in AI & Deterministic Fallback:** If Ollama is offline, SLOTH never fakes AI outputs. Instead, it seamlessly switches to rule-based heuristics and explicitly flags suggestions as `[Rule-Based Heuristic (Ollama Offline)]` so the user is always informed.

### 2. Multi-Format Text Extractor (`backend/app/services/extractor.py`)
- Safely extracts text and metadata across PDFs, DOCX, TXT, Markdown, CSV, and JSON.
- Detects scanned/image-only PDFs and explicitly flags them for OCR rather than hallucinating content.

### 3. Two-Phase Organization & Security Safeguards
- **Phase 1 (Preview):** The AI proposes clean filenames, categories, subcategories, tags, and reasons. The backend sanitizes illegal characters (`<>:"/\|?*`) and automatically resolves duplicate target collisions (e.g., `Notes (1).pdf`).
- **Phase 2 (Explicit Execution):** The user approves the batch. The backend re-validates source existence, ensures paths stay strictly inside the target root (rejecting root drives like `C:\` and system directories like `System32`), moves files atomically, and journals the operation to SQLite.

### 4. Conflict-Safe Undo Engine (`backend/app/services/undo_service.py`)
- Every executed operation is logged in the `operations` table in SQLite.
- To reverse an action, the engine verifies that the destination file exists and that the original path is currently vacant, preventing accidental overwrites.

### 5. Relax Mode Engine (`frontend/src/components/RelaxMode.tsx`)
- Configurable concurrency limiter (default: 2 workers) keeps CPU and RAM lightweight, ensuring laptops stay cool and quiet while processing batches in the background.

---

## Why Does Open Innovation Matter?

This project directly proves why **open innovation and open-weight models** are superior for everyday personal computing:

1. **Absolute Privacy:** Your messy personal files, bank receipts, meeting notes, and course syllabi never leave your machine. Closed APIs (like OpenAI or Anthropic) require sending private files over the network to proprietary servers.
2. **Zero Recurring Costs:** There are no token charges, credit limits, or unexpected cloud bills. Your hardware does the work offline.
3. **Model Sovereignty & Replaceability:** You are not locked into one vendor. If you want to switch from Qwen to Llama 3.2 or Mistral, you simply change a dropdown in the settings without modifying a single line of application code.
4. **Transparency & Safety:** Proprietary AI agents often execute black-box operations. SLOTH’s open architecture decouples AI suggestions from deterministic execution—giving the user total review power before a single byte moves on disk.

---

## The Lazy Payoff

SLOTH is the ultimate tool for "lazy productivity":

- **Folder Cleanup:** Organizing a cluttered folder of 30 messy downloads manually takes roughly 45 to 60 minutes of opening, reading, renaming, and creating subfolders. With SLOTH, you click **Scan**, **Analyze with AI**, review the proposed table in 30 seconds, and hit **Approve**. 
- **Document Reading:** Instead of reading through a 20-page meeting brief or syllabus, Document Digest isolates the exact action items and stated deadlines in 4 seconds.
- **Estimated Time Saved:** Based on a conservative 2.5-minute manual sorting estimate per file, organizing just 20 files saves **50 minutes** of tedious manual labor—giving you back your time to rest, relax, and code on what actually matters.

---

## Prize Categories

- **Main Track:** Hacktoberfest 2026 Open-Source AI Challenge Week 3: *Slow and Steady*
