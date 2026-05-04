from __future__ import annotations

import re

from app.schemas import AssistantResponse, DiagnosticResult, RetrievedDocument

DISCLAIMER = "*Note: This is an AI-assisted analysis based on clinical data. It is not a formal diagnosis. Please consult a healthcare professional.*"
MISSING_CONTEXT_MESSAGE = "I cannot find specific clinical data on this in my current research database."


def ensure_disclaimer(markdown: str) -> str:
    cleaned = str(markdown or "").strip()
    if cleaned.endswith(DISCLAIMER):
        return cleaned
    return f"{cleaned}\n\n{DISCLAIMER}".strip()


def status_overview(diagnostic_data: DiagnosticResult | None) -> str:
    if not diagnostic_data:
        return "No structured ML diagnostic result was submitted with this question."

    if not diagnostic_data.available:
        return f"The ML model bridge is not currently available. {diagnostic_data.summary}"

    if diagnostic_data.predictionType == "disease":
        disease = diagnostic_data.predictedDisease or "a disease label that was not provided"
        confidence = (
            f"{round(diagnostic_data.confidencePercent)}%"
            if diagnostic_data.confidencePercent is not None
            else "confidence was not provided"
        )
        return (
            f"The disease prediction model suggests **{disease}** with {confidence} confidence. "
            f"{diagnostic_data.summary}".strip()
        )

    probability = (
        f"{round(diagnostic_data.probabilityPercent)}%"
        if diagnostic_data.probabilityPercent is not None
        else "a probability that was not provided"
    )
    return (
        f"The submitted ML analysis indicates {probability} estimated diabetes-risk probability, "
        f"which falls in the {diagnostic_data.riskBand.lower()} risk band. {diagnostic_data.summary}".strip()
    )


def next_steps_from_documents(documents: list[RetrievedDocument]) -> list[str]:
    combined = " ".join(f"{doc.title} {doc.content}" for doc in documents).lower()
    steps: list[str] = []

    for doc in documents:
        match = re.search(r"Precautions listed in the dataset:\s*(.*?)(?:\s+Symptom severity weights:|$)", doc.content, re.IGNORECASE)
        if match:
            precautions = [item.strip() for item in match.group(1).split(";") if item.strip() and item.strip().lower() != "no precautions provided."]
            steps.extend(f"Dataset-listed precaution: {precaution}." for precaution in precautions[:4])

    if steps:
        steps.append("Consult a qualified clinician to confirm the cause and choose safe treatment.")
        return steps

    if "lifestyle" in combined or "physical activity" in combined or "weight" in combined:
        steps.append("Discuss structured lifestyle changes such as regular physical activity, higher-fiber eating patterns, and weight management when appropriate.")
    if "endocrinologist" in combined:
        steps.append("Consider an endocrinologist if diabetes risk is high, glucose markers are repeatedly abnormal, or medication decisions are complex.")
    if "urgent" in combined or "vomiting" in combined or "confusion" in combined:
        steps.append("Seek urgent medical care if high glucose is accompanied by severe dehydration, vomiting, confusion, trouble breathing, fainting, or rapid worsening symptoms.")

    return steps or ["Bring the ML result and retrieved clinical context to a qualified clinician for individualized interpretation."]


def local_synthesis(diagnostic_data: DiagnosticResult | None, documents: list[RetrievedDocument]) -> AssistantResponse:
    overview = status_overview(diagnostic_data)

    if not documents:
        markdown = ensure_disclaimer(
            f"**Status Overview**\n{overview}\n\n"
            f"**Evidence-Based Guidance**\n{MISSING_CONTEXT_MESSAGE}\n\n"
            "**Next Steps**\n"
            "- Please consult a healthcare professional who can review your vitals, symptoms, and full medical history."
        )
        return AssistantResponse(
            responseMarkdown=markdown,
            statusOverview=overview,
            evidenceBasedGuidance=[MISSING_CONTEXT_MESSAGE],
            nextSteps=["Please consult a healthcare professional who can review your vitals, symptoms, and full medical history."],
            source="FastAPI local grounded synthesis",
        )

    evidence = [doc.content for doc in documents]
    next_steps = next_steps_from_documents(documents)
    markdown = ensure_disclaimer(
        f"**Status Overview**\n{overview}\n\n"
        f"**Evidence-Based Guidance**\n"
        + "\n".join(f"- [{index + 1}] {doc.content}" for index, doc in enumerate(documents))
        + "\n\n**Next Steps**\n"
        + "\n".join(f"- {step}" for step in next_steps)
    )

    return AssistantResponse(
        responseMarkdown=markdown,
        statusOverview=overview,
        evidenceBasedGuidance=evidence,
        nextSteps=next_steps,
        source="FastAPI local grounded synthesis",
    )
