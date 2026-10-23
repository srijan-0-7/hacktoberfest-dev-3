import json
import logging
import re
import httpx
from typing import Optional, Dict, Any, List, Tuple
from pathlib import Path

from backend.app.config import settings
from backend.app.models.schemas import OllamaStatus

logger = logging.getLogger("sloth.ai")

class AIService:
    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None):
        self.base_url = (base_url or settings.ollama_base_url).rstrip("/")
        self.selected_model = model or settings.default_model

    def check_status(self) -> OllamaStatus:
        """Query Ollama API to detect availability and installed models."""
        try:
            with httpx.Client(timeout=3.0) as client:
                res = client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name") for m in data.get("models", []) if m.get("name")]
                    
                    # If selected model is not in list, auto-select first available or keep default
                    active = self.selected_model
                    if models and (active not in models and f"{active}:latest" not in models):
                        active = models[0]
                        
                    return OllamaStatus(
                        reachable=True,
                        active_model=active,
                        available_models=models,
                        error=None
                    )
                else:
                    return OllamaStatus(
                        reachable=False,
                        active_model=self.selected_model,
                        available_models=[],
                        error=f"Ollama returned HTTP status {res.status_code}"
                    )
        except Exception as e:
            return OllamaStatus(
                reachable=False,
                active_model=self.selected_model,
                available_models=[],
                error=f"Cannot reach Ollama at {self.base_url}. Is Ollama running?"
            )

    def set_model(self, model_name: str) -> bool:
        self.selected_model = model_name
        return True

    def _call_ollama_json(self, prompt: str, system_prompt: str, retries: int = 2) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Call Ollama /api/generate with JSON formatting."""
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.selected_model,
            "prompt": prompt,
            "system": system_prompt,
            "format": "json",
            "stream": False,
            "options": {
                "temperature": 0.2,
                "top_p": 0.9,
            }
        }
        
        last_error = None
        for attempt in range(retries + 1):
            try:
                with httpx.Client(timeout=settings.request_timeout_seconds) as client:
                    response = client.post(url, json=payload)
                    if response.status_code != 200:
                        last_error = f"Ollama error {response.status_code}: {response.text}"
                        continue
                    
                    resp_data = response.json()
                    raw_text = resp_data.get("response", "").strip()
                    
                    # Parse JSON from model output
                    parsed = self._extract_json(raw_text)
                    if parsed is not None:
                        return parsed, None
                    else:
                        last_error = f"Model response was not valid JSON: {raw_text[:200]}"
            except Exception as e:
                last_error = f"Connection error: {str(e)}"
                
        return None, last_error

    def _extract_json(self, text: str) -> Optional[Dict[str, Any]]:
        """Extract and parse JSON object from raw model string."""
        if not text:
            return None
        text = text.strip()
        # Direct parse
        try:
            return json.loads(text)
        except Exception:
            pass
            
        # Try extracting between markdown code fences
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except Exception:
                pass
                
        # Try finding outer braces
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end+1])
            except Exception:
                pass
                
        return None

    def analyze_file_for_organization(
        self,
        original_name: str,
        extension: str,
        preview_text: str,
        size_bytes: int,
        default_categories: List[str]
    ) -> Dict[str, Any]:
        """Analyze a file and generate organization suggestions."""
        status = self.check_status()
        
        # If Ollama is reachable, query the model
        if status.reachable and status.available_models:
            prompt = f"""Analyze this file for automated desktop organization.
Original Filename: "{original_name}"
File Extension: "{extension}"
File Size: {size_bytes} bytes
Content Preview / Extracted Text:
\"\"\"
{preview_text[:2000] if preview_text else "No extractable text (binary or media file)"}
\"\"\"

Categories available: {', '.join(default_categories)}

Return a strict JSON object with:
{{
  "proposed_name": "clean descriptive filename keeping the .{extension.lstrip('.')} extension without special characters or clutter",
  "category": "one of the available categories best matching the file",
  "subcategory": "short 1-3 word subcategory (e.g. Data Structures, Tax Receipts, Project Specs)",
  "reason": "concise 1-sentence explanation of why this name and category were chosen",
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": 0.85,
  "needs_review": false
}}"""

            system_prompt = "You are SLOTH, a fastidious local AI file organizer. Always return valid JSON only. Never suggest changing file extensions. Preserve important IDs or versions."
            
            parsed, err = self._call_ollama_json(prompt, system_prompt)
            if parsed and isinstance(parsed, dict) and "proposed_name" in parsed:
                # Ensure extension is retained
                proposed = parsed.get("proposed_name", original_name)
                ext = extension if extension.startswith(".") else f".{extension}"
                if not proposed.lower().endswith(ext.lower()):
                    proposed = f"{Path(proposed).stem}{ext}"
                    
                cat = parsed.get("category", "Miscellaneous")
                if cat not in default_categories:
                    cat = "Miscellaneous"
                    
                return {
                    "proposed_name": proposed,
                    "category": cat,
                    "subcategory": str(parsed.get("subcategory", "")).strip(),
                    "reason": parsed.get("reason", "Organized based on document content analysis."),
                    "tags": list(parsed.get("tags", []))[:5],
                    "confidence": float(parsed.get("confidence", 0.9)),
                    "needs_review": bool(parsed.get("needs_review", False)),
                    "is_ai_generated": True
                }

        # Deterministic Rule-Based Fallback (When Ollama is offline or uninstalled)
        return self._deterministic_organize_fallback(original_name, extension, preview_text, default_categories)

    def _deterministic_organize_fallback(
        self,
        original_name: str,
        extension: str,
        preview_text: str,
        default_categories: List[str]
    ) -> Dict[str, Any]:
        """Deterministic heuristic classifier used when local AI is offline.
        Strictly labeled as rule-based logic per Hacktoberfest rules.
        """
        stem = Path(original_name).stem
        ext = extension.lower()
        text_lower = (preview_text or "").lower()
        
        # Clean up bad formatting like '__', 'final_v2', copy (1)
        clean_stem = re.sub(r"[_\-]+", " ", stem)
        clean_stem = re.sub(r"\s+", " ", clean_stem).strip().title()
        
        category = "Miscellaneous"
        subcategory = "General"
        reason = "[Rule-Based Logic (Ollama Offline)] Organized using filename and extension heuristics."
        tags = [ext.replace(".", "")]
        
        if ext in [".pdf", ".docx", ".doc", ".txt", ".md", ".rtf"]:
            if any(k in text_lower or k in stem.lower() for k in ["syllabus", "lecture", "dsa", "algorithm", "exam", "assignment", "homework", "quiz", "notes"]):
                category = "Academics"
                subcategory = "Coursework"
                tags.extend(["study", "notes"])
            elif any(k in text_lower or k in stem.lower() for k in ["paper", "survey", "attention", "transformer", "arxiv", "journal", "thesis"]):
                category = "Research"
                subcategory = "Papers"
                tags.extend(["research", "ai"])
            elif any(k in text_lower or k in stem.lower() for k in ["brief", "roadmap", "spec", "meeting", "minutes", "sprint"]):
                category = "Work"
                subcategory = "Project Docs"
                tags.extend(["work", "planning"])
            else:
                category = "Work" if "Work" in default_categories else "Miscellaneous"
                subcategory = "General"
        elif ext in [".csv", ".xlsx", ".xls"]:
            if any(k in text_lower or k in stem.lower() for k in ["receipt", "tax", "expense", "invoice", "budget", "billing"]):
                category = "Finance"
                subcategory = "Receipts & Expenses"
                tags.extend(["finance", "tax"])
            else:
                category = "Data"
                subcategory = "Datasets"
        elif ext in [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]:
            category = "Media"
            subcategory = "Images"
            tags.extend(["image", "visual"])
        elif ext in [".py", ".ts", ".js", ".json", ".yaml", ".yml", ".html", ".css"]:
            category = "Development"
            subcategory = "Code & Config"
            tags.extend(["code", "dev"])

        proposed_name = f"{clean_stem}{ext}"
        
        return {
            "proposed_name": proposed_name,
            "category": category if category in default_categories else "Miscellaneous",
            "subcategory": subcategory,
            "reason": reason,
            "tags": tags[:4],
            "confidence": 0.65,
            "needs_review": True,
            "is_ai_generated": False
        }

    def summarize_document(
        self,
        filename: str,
        text_content: str,
        summary_length: str = "standard"
    ) -> Dict[str, Any]:
        """Summarize document content into structured digest."""
        status = self.check_status()
        
        if not text_content or not text_content.strip():
            return {
                "executive_summary": "The document contains no extractable text. If this is a scanned document or image-only PDF, an OCR step is required.",
                "key_takeaways": ["No extractable textual content discovered."],
                "important_concepts": [],
                "action_items": [],
                "deadlines": [],
                "questions": ["Does this document require OCR preprocessing?"],
                "category": "Miscellaneous",
                "is_ai_generated": False,
                "model_name": "None (No Content)"
            }

        # Length guide
        length_guide = {
            "quick": "1 short paragraph executive summary, 3 key takeaways.",
            "standard": "2 concise paragraphs executive summary, 5 key takeaways.",
            "detailed": "3 detailed paragraphs executive summary, 7-8 key takeaways with granular specifics."
        }.get(summary_length, "2 concise paragraphs executive summary, 5 key takeaways.")

        if status.reachable and status.available_models:
            prompt = f"""Read the following document text and produce a structured digest.
Document: "{filename}"
Summary Length Target: {summary_length} ({length_guide})

Document Text (excerpt):
\"\"\"
{text_content[:12000]}
\"\"\"

Return a strict JSON object with this exact structure:
{{
  "executive_summary": "concise executive overview of the document",
  "key_takeaways": [
    "first critical takeaway",
    "second critical takeaway",
    "third critical takeaway"
  ],
  "important_concepts": [
    "Key Term or Entity 1",
    "Key Term or Entity 2"
  ],
  "action_items": [
    "Specific task or action item explicitly stated or implied"
  ],
  "deadlines": [
    "Explicitly stated date or deadline only (e.g. 'Oct 31, 2026: Project milestone'). Do NOT fabricate dates."
  ],
  "questions": [
    "Insightful question the reader or team should investigate next"
  ],
  "category": "Suggested category (e.g. Academics, Research, Finance, Work, Personal)"
}}"""

            system_prompt = "You are SLOTH Document Digest AI. Analyze the document truthfully. Distinguish extracted facts from interpretation. Never fabricate citations or dates."
            
            parsed, err = self._call_ollama_json(prompt, system_prompt)
            if parsed and isinstance(parsed, dict) and "executive_summary" in parsed:
                return {
                    "executive_summary": str(parsed.get("executive_summary", "")),
                    "key_takeaways": list(parsed.get("key_takeaways", [])),
                    "important_concepts": list(parsed.get("important_concepts", [])),
                    "action_items": list(parsed.get("action_items", [])),
                    "deadlines": list(parsed.get("deadlines", [])),
                    "questions": list(parsed.get("questions", [])),
                    "category": str(parsed.get("category", "General")),
                    "is_ai_generated": True,
                    "model_name": self.selected_model
                }

        # Deterministic Extractive Fallback (Ollama Offline)
        return self._extractive_summary_fallback(filename, text_content, summary_length)

    def _extractive_summary_fallback(
        self,
        filename: str,
        text_content: str,
        summary_length: str
    ) -> Dict[str, Any]:
        """Rule-based extractive summary when Ollama is offline."""
        paragraphs = [p.strip() for p in text_content.split("\n\n") if len(p.strip()) > 30]
        sentences = re.split(r"(?<=[.!?])\s+", text_content.replace("\n", " "))
        clean_sentences = [s.strip() for s in sentences if len(s.strip()) > 20 and not s.startswith("---")]

        # Executive summary
        exec_count = 2 if summary_length == "quick" else (4 if summary_length == "standard" else 6)
        summary_text = " ".join(clean_sentences[:exec_count])
        if not summary_text:
            summary_text = text_content[:500]

        # Key takeaways
        takeaways = clean_sentences[exec_count:exec_count + 5]
        if not takeaways:
            takeaways = ["Extracted initial content section from document."]

        # Look for dates
        date_pattern = r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?|\b\d{4}-\d{2}-\d{2}\b|\bQ[1-4]\s+\d{4}\b"
        found_dates = list(set(re.findall(date_pattern, text_content, re.IGNORECASE)))

        # Look for action verbs / tasks
        action_keywords = ["must", "deliver", "submit", "complete", "prepare", "review", "schedule", "deadline", "implement"]
        action_items = []
        for s in clean_sentences:
            if any(k in s.lower() for k in action_keywords):
                action_items.append(s)
                if len(action_items) >= 4:
                    break

        return {
            "executive_summary": f"[Extractive Preview (Ollama Offline)] {summary_text}",
            "key_takeaways": takeaways,
            "important_concepts": [Path(filename).stem, f"File format: {Path(filename).suffix.upper()}"],
            "action_items": action_items or ["Review full document manually or connect local Ollama for AI task extraction."],
            "deadlines": [f"Found date reference: {d}" for d in found_dates[:4]],
            "questions": ["What are the key dependencies?", "What is the expected timeline for completion?"],
            "category": "Extracted Document",
            "is_ai_generated": False,
            "model_name": "Extractive Heuristic (Ollama Offline)"
        }

ai_service = AIService()
