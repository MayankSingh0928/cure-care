from __future__ import annotations

import json
from typing import Any

import httpx

from app.config import settings
from app.schemas import AssistantResponse, DiagnosticResult, RetrievedDocument
from app.services.synthesis import DISCLAIMER, MISSING_CONTEXT_MESSAGE, ensure_disclaimer, status_overview


def _extract_text(data: dict[str, Any]) -> str:
    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    return "\n".join(str(part.get("text", "")) for part in parts if part.get("text"))


def _parse_json(text: str) -> dict[str, Any] | None:
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:].strip()
    if cleaned.startswith("```"):
        cleaned = cleaned[3:].strip()
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3].strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return None
        try:
            return json.loads(cleaned[start : end + 1])
        except json.JSONDecodeError:
            return None


def _prompt(user_query: str, diagnostic_data: DiagnosticResult | None, documents: list[RetrievedDocument]) -> str:
    return f"""
You are the "Cure&Care 2.0" AI Medical Assistant. You are a highly accurate, empathetic, and evidence-based clinical co-pilot integrated into a MERN + FastAPI ecosystem.

Use ONLY the retrieved clinical documents for the Evidence-Based Guidance section.
If the answer is not in the retrieved documents, state exactly: "{MISSING_CONTEXT_MESSAGE}"
Do not hallucinate symptoms.
Do not suggest specific dosages unless cited directly from the retrieved documents.
Every final responseMarkdown must end with exactly:
{DISCLAIMER}

Return valid JSON only:
{{
  "responseMarkdown": "",
  "statusOverview": "",
  "evidenceBasedGuidance": [""],
  "nextSteps": [""],
  "safetyFlags": [""]
}}

Required Markdown sections:
**Status Overview**
**Evidence-Based Guidance**
**Next Steps**

User Query:
{user_query}

ML / Disease Prediction Result:
{diagnostic_data.model_dump_json(indent=2) if diagnostic_data else "None"}

Retrieved Clinical Context:
{chr(10).join(f"[{index + 1}] {doc.title}: {doc.content}" for index, doc in enumerate(documents)) or "None"}
""".strip()


async def generate_with_gemini(
    *,
    user_query: str,
    diagnostic_data: DiagnosticResult | None,
    documents: list[RetrievedDocument],
) -> tuple[AssistantResponse | None, str]:
    if not settings.gemini_api_key:
        return None, "GEMINI_API_KEY is not configured."

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent"
    body = {
        "contents": [{"role": "user", "parts": [{"text": _prompt(user_query, diagnostic_data, documents)}]}],
        "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"},
    }

    try:
        async with httpx.AsyncClient(timeout=25) as client:
            response = await client.post(url, headers={"x-goog-api-key": settings.gemini_api_key}, json=body)
    except httpx.HTTPError as exc:
        return None, f"Gemini request failed: {exc}"

    if response.status_code >= 400:
        return None, f"Gemini request failed with HTTP {response.status_code}: {response.text[:300]}"

    parsed = _parse_json(_extract_text(response.json()))
    if not parsed:
        return None, "Gemini response could not be parsed as JSON."

    try:
        assistant = AssistantResponse(
            responseMarkdown=ensure_disclaimer(str(parsed.get("responseMarkdown", ""))),
            statusOverview=str(parsed.get("statusOverview") or status_overview(diagnostic_data)),
            evidenceBasedGuidance=list(parsed.get("evidenceBasedGuidance") or []),
            nextSteps=list(parsed.get("nextSteps") or []),
            safetyFlags=list(parsed.get("safetyFlags") or []),
            source="Gemini grounded synthesis via FastAPI",
            model=settings.gemini_model,
        )
    except Exception as exc:
        return None, f"Gemini response shape was invalid: {exc}"

    return assistant, ""
