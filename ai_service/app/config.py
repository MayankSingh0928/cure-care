from __future__ import annotations

import json
import os
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[2]
AI_SERVICE_DIR = ROOT_DIR / "ai_service"

load_dotenv(ROOT_DIR / ".env")
load_dotenv(AI_SERVICE_DIR / ".env")


def _csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def _json_dict(value: str, default: dict[str, float]) -> dict[str, float]:
    if not value:
        return default
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return default
    if not isinstance(parsed, dict):
        return default
    return {str(key): float(val) for key, val in parsed.items() if isinstance(val, (int, float))}


class Settings:
    host = os.getenv("AI_SERVICE_HOST", "0.0.0.0")
    port = int(os.getenv("AI_SERVICE_PORT", "8000"))
    client_url = os.getenv("CLIENT_URL", "http://localhost:5173")
    cors_origins = _csv(os.getenv("CORS_ORIGINS", ""))

    gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    ml_model_path = Path(os.getenv("ML_MODEL_PATH", str(AI_SERVICE_DIR / "model" / "disease_model.pkl")))
    ml_model_name = os.getenv("ML_MODEL_NAME", "Disease prediction .pkl classifier")
    ml_model_type = os.getenv("ML_MODEL_TYPE", "symptom_text").strip().lower()
    ml_feature_order = _csv(
        os.getenv(
            "ML_FEATURE_ORDER",
            "pregnancies,glucose,bloodPressure,skinThickness,insulin,bmi,diabetesPedigreeFunction,age",
        )
    )
    ml_feature_defaults = _json_dict(
        os.getenv("ML_FEATURE_DEFAULTS_JSON", ""),
        {
            "pregnancies": 0.0,
            "glucose": 100.0,
            "bloodPressure": 75.0,
            "skinThickness": 20.0,
            "insulin": 80.0,
            "bmi": 25.0,
            "diabetesPedigreeFunction": 0.35,
            "age": 35.0,
            "hba1c": 5.4,
        },
    )

    chroma_path = os.getenv("CHROMA_PATH", "").strip()
    chroma_host = os.getenv("CHROMA_HOST", "").strip()
    chroma_port = int(os.getenv("CHROMA_PORT", "8000"))
    chroma_collection = os.getenv("CHROMA_COLLECTION", "clinical_guidelines")

    pinecone_api_key = os.getenv("PINECONE_API_KEY", "").strip()
    pinecone_index = os.getenv("PINECONE_INDEX", "").strip()
    pinecone_namespace = os.getenv("PINECONE_NAMESPACE", "").strip()


settings = Settings()
