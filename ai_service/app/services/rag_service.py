from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from app.config import AI_SERVICE_DIR, settings
from app.schemas import RetrievedDocument

STOP_WORDS = {
    "about",
    "after",
    "and",
    "are",
    "can",
    "does",
    "for",
    "from",
    "have",
    "how",
    "into",
    "not",
    "should",
    "that",
    "the",
    "this",
    "what",
    "when",
    "with",
    "your",
}


def _tokens(text: str) -> set[str]:
    return {
        token
        for token in re.sub(r"[^a-z0-9.%\s-]", " ", str(text).lower()).split()
        if len(token) > 2 and token not in STOP_WORDS
    }


def _doc_from_any(item: Any, index: int) -> RetrievedDocument | None:
    if isinstance(item, RetrievedDocument):
        return item

    if isinstance(item, dict):
        content = str(item.get("content") or item.get("page_content") or item.get("text") or "").strip()
        if not content:
            return None
        return RetrievedDocument(
            id=str(item.get("id") or f"provided-{index + 1}"),
            title=str(item.get("title") or item.get("metadata", {}).get("title") or f"Retrieved Document {index + 1}"),
            source=str(item.get("source") or item.get("metadata", {}).get("source") or "Provided RAG context"),
            content=content,
            metadata=item.get("metadata") if isinstance(item.get("metadata"), dict) else {},
        )

    content = str(item).strip()
    if not content:
        return None
    return RetrievedDocument(id=f"provided-{index + 1}", title=f"Retrieved Document {index + 1}", content=content)


def parse_provided_context(rag_context: Any) -> list[RetrievedDocument]:
    if not rag_context:
        return []

    if isinstance(rag_context, list):
        docs = [_doc_from_any(item, index) for index, item in enumerate(rag_context)]
        return [doc for doc in docs if doc is not None]

    if isinstance(rag_context, dict):
        doc = _doc_from_any(rag_context, 0)
        return [doc] if doc else []

    chunks = re.split(r"\n{2,}|---+", str(rag_context))
    docs = [_doc_from_any(chunk, index) for index, chunk in enumerate(chunks)]
    return [doc for doc in docs if doc is not None]


def _local_documents() -> list[RetrievedDocument]:
    raw_docs = []
    for filename in ["symptom_rag_documents.json"]:
        path = AI_SERVICE_DIR / "data" / filename
        if not Path(path).exists():
            continue
        with open(path, "r", encoding="utf-8") as file:
            raw_docs.extend(json.load(file))

    docs = [_doc_from_any(item, index) for index, item in enumerate(raw_docs)]
    return [doc for doc in docs if doc is not None]


def _diagnostic_terms(diagnostic_data: Any) -> str:
    if not diagnostic_data:
        return ""

    terms = []
    raw = getattr(diagnostic_data, "raw", {}) or {}
    probability = getattr(diagnostic_data, "probabilityPercent", None)

    if probability is not None:
        terms.extend(["disease", "symptoms", "diagnosis", "specialist"])
    predicted_disease = getattr(diagnostic_data, "predictedDisease", None)
    if predicted_disease:
        terms.extend(str(predicted_disease).replace("_", " ").split())
    if isinstance(raw, dict):
        raw_text = json.dumps(raw).lower()
        if "glucose" in raw_text or "hba1c" in raw_text:
            terms.extend(["diabetes", "glucose", "hba1c"])
        if "bmi" in raw_text:
            terms.extend(["bmi", "metabolic", "weight"])

    return " ".join(terms)


async def _query_chroma(user_query: str, top_k: int) -> list[RetrievedDocument]:
    try:
        import chromadb
    except ImportError as exc:
        raise RuntimeError("chromadb is not installed. Install ai_service/requirements.txt.") from exc

    if settings.chroma_host:
        client = chromadb.HttpClient(host=settings.chroma_host, port=settings.chroma_port)
    elif settings.chroma_path:
        client = chromadb.PersistentClient(path=settings.chroma_path)
    else:
        raise RuntimeError("Set CHROMA_PATH or CHROMA_HOST to use ChromaDB retrieval.")

    collection = client.get_collection(settings.chroma_collection)
    result = collection.query(query_texts=[user_query], n_results=top_k)

    docs = result.get("documents", [[]])[0]
    metadatas = result.get("metadatas", [[]])[0] or [{} for _ in docs]
    ids = result.get("ids", [[]])[0] or [f"chroma-{index + 1}" for index in range(len(docs))]

    return [
        RetrievedDocument(
            id=str(ids[index]),
            title=str((metadatas[index] or {}).get("title") or f"Chroma document {index + 1}"),
            source=str((metadatas[index] or {}).get("source") or "ChromaDB"),
            content=str(content),
            metadata=metadatas[index] or {},
        )
        for index, content in enumerate(docs)
        if str(content).strip()
    ]


async def _query_pinecone(query_embedding: list[float] | None, top_k: int) -> list[RetrievedDocument]:
    if not query_embedding:
        raise RuntimeError("Pinecone retrieval requires queryEmbedding unless you pass snippets through ragContext.")
    if not settings.pinecone_api_key or not settings.pinecone_index:
        raise RuntimeError("Set PINECONE_API_KEY and PINECONE_INDEX to use Pinecone retrieval.")

    try:
        from pinecone import Pinecone
    except ImportError as exc:
        raise RuntimeError("pinecone-client is not installed. Install ai_service/requirements.txt.") from exc

    pc = Pinecone(api_key=settings.pinecone_api_key)
    index = pc.Index(settings.pinecone_index)
    result = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True,
        namespace=settings.pinecone_namespace or None,
    )

    docs: list[RetrievedDocument] = []
    for item in result.get("matches", []):
        metadata = item.get("metadata") or {}
        content = str(metadata.get("content") or metadata.get("text") or metadata.get("page_content") or "").strip()
        if not content:
            continue
        docs.append(
            RetrievedDocument(
                id=str(item.get("id") or f"pinecone-{len(docs) + 1}"),
                title=str(metadata.get("title") or f"Pinecone document {len(docs) + 1}"),
                source=str(metadata.get("source") or "Pinecone"),
                content=content,
                metadata=metadata,
            )
        )
    return docs


def _query_local(user_query: str, diagnostic_data: Any, top_k: int) -> list[RetrievedDocument]:
    query_tokens = _tokens(f"{user_query} {_diagnostic_terms(diagnostic_data)}")
    predicted_disease = str(getattr(diagnostic_data, "predictedDisease", "") or "").strip().lower()
    scored = []
    predicted_matches = []

    for doc in _local_documents():
        doc_tokens = _tokens(f"{doc.title} {doc.source} {doc.content} {json.dumps(doc.metadata)}")
        score = len(query_tokens.intersection(doc_tokens))
        doc_disease = str(doc.metadata.get("disease", "")).strip().lower()
        if predicted_disease and (doc_disease == predicted_disease or predicted_disease in doc.title.lower()):
            predicted_matches.append(doc)
            score += 100
        if score > 0:
            scored.append((score, doc))

    if predicted_matches:
        return predicted_matches[:top_k]

    scored.sort(key=lambda item: item[0], reverse=True)
    return [doc for _, doc in scored[:top_k]]


async def retrieve_documents(
    *,
    user_query: str,
    diagnostic_data: Any,
    rag_context: Any,
    vector_provider: str,
    query_embedding: list[float] | None,
    top_k: int,
) -> tuple[list[RetrievedDocument], str, str]:
    provided = parse_provided_context(rag_context)
    if provided:
        return provided[:top_k], "provided", ""

    provider = vector_provider if vector_provider != "auto" else "chroma"

    if provider == "provided":
        return [], "provided", ""

    if provider == "chroma":
        try:
            return await _query_chroma(user_query, top_k), "chroma", ""
        except Exception as exc:
            if vector_provider != "auto":
                return [], "chroma", str(exc)

    if provider == "pinecone":
        try:
            return await _query_pinecone(query_embedding, top_k), "pinecone", ""
        except Exception as exc:
            if vector_provider != "auto":
                return [], "pinecone", str(exc)

    local_docs = _query_local(user_query, diagnostic_data, top_k)
    return local_docs, "local", ""
