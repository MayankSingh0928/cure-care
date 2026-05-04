from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.schemas import AnalyzeRequest, AnalyzeResponse
from app.services.llm_service import generate_with_gemini
from app.services.model_bridge import PklModelBridge
from app.services.rag_service import retrieve_documents
from app.services.synthesis import local_synthesis

app = FastAPI(
    title="Cure&Care 2.0 AI Medical Assistant",
    version="1.0.0",
    description="FastAPI bridge for .pkl diagnostic models, ChromaDB/Pinecone RAG snippets, and grounded medical assistant responses.",
)

allowed_origins = {
    settings.client_url,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    *settings.cors_origins,
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin for origin in allowed_origins if origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model_bridge = PklModelBridge()


@app.get("/")
async def root() -> dict:
    return {
        "service": "curecare-ai-service",
        "status": "ok",
        "endpoints": {
            "health": "GET /health",
            "analyze": "POST /analyze",
            "analyzeAlias": "POST /api/analyze",
        },
        "model": model_bridge.status(),
    }


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": "curecare-ai-service",
        "model": model_bridge.status(),
    }


async def _analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    user_query = (payload.user_query or payload.query or "").strip()
    if len(user_query) < 3:
        raise HTTPException(status_code=400, detail="Please enter a medical question for the assistant.")

    diagnostic_data = model_bridge.predict(payload.vitals, payload.ml_result, payload.symptoms)
    documents, provider, retrieval_message = await retrieve_documents(
        user_query=user_query,
        diagnostic_data=diagnostic_data,
        rag_context=payload.rag_context,
        vector_provider=payload.vector_provider,
        query_embedding=payload.query_embedding,
        top_k=payload.top_k,
    )

    assistant, ai_message = await generate_with_gemini(
        user_query=user_query,
        diagnostic_data=diagnostic_data,
        documents=documents,
    )

    ai_enhanced = assistant is not None
    if assistant is None:
        assistant = local_synthesis(diagnostic_data, documents)

    messages = [message for message in [retrieval_message, ai_message] if message]

    return AnalyzeResponse(
        assistant=assistant,
        diagnosticData=diagnostic_data,
        retrievedDocuments=documents,
        aiEnhanced=ai_enhanced,
        aiMessage=" ".join(messages),
        vectorProvider=provider,
    )


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    return await _analyze(payload)


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_alias(payload: AnalyzeRequest) -> AnalyzeResponse:
    return await _analyze(payload)
