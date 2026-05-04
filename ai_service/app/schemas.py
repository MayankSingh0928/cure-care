from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class RetrievedDocument(BaseModel):
    id: str | None = None
    title: str = "Retrieved Document"
    source: str = "Provided RAG context"
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class DiagnosticResult(BaseModel):
    available: bool
    modelName: str
    predictionType: str = "disease"
    predictedDisease: str | None = None
    confidencePercent: float | None = None
    topPredictions: list[dict[str, Any]] = Field(default_factory=list)
    probabilityPercent: float | None = None
    riskBand: str = "Not specified"
    summary: str = ""
    raw: dict[str, Any] | Any = Field(default_factory=dict)
    missingFeatures: list[str] = Field(default_factory=list)
    usedDefaultFeatures: dict[str, float] = Field(default_factory=dict)


class AssistantResponse(BaseModel):
    responseMarkdown: str
    statusOverview: str
    evidenceBasedGuidance: list[str]
    nextSteps: list[str]
    safetyFlags: list[str] = Field(default_factory=list)
    source: str = "FastAPI grounded synthesis"
    model: str | None = None


class AnalyzeRequest(BaseModel):
    user_query: str = Field(default="", alias="userQuery")
    query: str = ""
    symptoms: str | list[str] = Field(default_factory=list)
    vitals: dict[str, Any] = Field(default_factory=dict)
    ml_result: Any = Field(default=None, alias="mlResult")
    rag_context: Any = Field(default=None, alias="ragContext")
    vector_provider: Literal["auto", "provided", "chroma", "pinecone", "local"] = Field(default="auto", alias="vectorProvider")
    query_embedding: list[float] | None = Field(default=None, alias="queryEmbedding")
    top_k: int = Field(default=3, alias="topK", ge=1, le=10)

    model_config = {
        "populate_by_name": True,
        "extra": "allow",
    }


class AnalyzeResponse(BaseModel):
    assistant: AssistantResponse
    diagnosticData: DiagnosticResult | None = None
    retrievedDocuments: list[RetrievedDocument]
    aiEnhanced: bool
    aiMessage: str = ""
    vectorProvider: str
