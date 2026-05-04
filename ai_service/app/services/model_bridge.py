from __future__ import annotations

import math
from pathlib import Path
from typing import Any

from app.config import settings
from app.schemas import DiagnosticResult


def _to_float(value: Any) -> float | None:
    if value in (None, ""):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _risk_band(probability: float | None) -> str:
    if probability is None:
        return "Not specified"
    if probability >= 65:
        return "High"
    if probability >= 40:
        return "Moderate"
    return "Lower"


def _confidence_band(confidence: float | None) -> str:
    if confidence is None:
        return "Not specified"
    if confidence >= 75:
        return "High confidence"
    if confidence >= 45:
        return "Moderate confidence"
    return "Low confidence"


def _sigmoid(value: float) -> float:
    return 1 / (1 + math.exp(-value))


def _normalize_ml_result(ml_result: Any) -> DiagnosticResult | None:
    if ml_result in (None, ""):
        return None

    if isinstance(ml_result, dict):
        probability = _to_float(
            ml_result.get("probability")
            or ml_result.get("probabilityPercent")
            or ml_result.get("diabetesProbability")
            or ml_result.get("score")
        )
        if probability is not None and probability <= 1:
            probability *= 100
        return DiagnosticResult(
            available=True,
            modelName=str(ml_result.get("modelName") or "Provided ML analysis result"),
            predictionType=str(ml_result.get("predictionType") or "disease"),
            predictedDisease=ml_result.get("predictedDisease") or ml_result.get("disease") or ml_result.get("label"),
            confidencePercent=_to_float(ml_result.get("confidencePercent") or ml_result.get("confidence")),
            topPredictions=list(ml_result.get("topPredictions") or []),
            probabilityPercent=probability,
            riskBand=str(ml_result.get("riskBand") or _risk_band(probability)),
            summary=str(ml_result.get("summary") or ""),
            raw=ml_result,
        )

    probability = _to_float(ml_result)
    if probability is not None and probability <= 1:
        probability *= 100

    return DiagnosticResult(
        available=True,
        modelName="Provided ML analysis result",
        probabilityPercent=probability,
        riskBand=_risk_band(probability),
        raw={"value": ml_result},
    )


class PklModelBridge:
    def __init__(self, model_path: Path | None = None) -> None:
        self.model_path = model_path or settings.ml_model_path
        self.model: Any | None = None
        self.load_error = ""
        self._load_model()

    def _load_model(self) -> None:
        if not self.model_path.exists():
            self.load_error = f"Model file not found at {self.model_path}."
            return

        try:
            import joblib
        except ImportError:
            self.load_error = "joblib is not installed. Install ai_service/requirements.txt."
            return

        try:
            self.model = joblib.load(self.model_path)
            self.load_error = ""
        except Exception as exc:
            self.model = None
            self.load_error = f"Could not load model file: {exc}"

    def status(self) -> dict[str, Any]:
        return {
            "ready": self.model is not None,
            "modelPath": str(self.model_path),
            "modelName": settings.ml_model_name,
            "modelType": settings.ml_model_type,
            "featureOrder": settings.ml_feature_order,
            "message": self.load_error or "Model loaded.",
        }

    def _symptom_text(self, symptoms: str | list[str]) -> str:
        if isinstance(symptoms, list):
            return " ".join(str(symptom).replace("_", " ").strip() for symptom in symptoms if str(symptom).strip())
        return str(symptoms or "").replace("_", " ").strip()

    def _top_class_predictions(self, matrix: Any, limit: int = 5) -> tuple[str | None, float | None, list[dict[str, Any]]]:
        if self.model is None:
            return None, None, []

        if hasattr(self.model, "predict_proba"):
            probabilities = self.model.predict_proba(matrix)[0]
            classes = list(getattr(self.model, "classes_", range(len(probabilities))))
            ranked = sorted(zip(classes, probabilities), key=lambda item: float(item[1]), reverse=True)[:limit]
            top = [
                {"disease": str(label), "confidencePercent": round(float(probability) * 100, 2)}
                for label, probability in ranked
            ]
            first = top[0] if top else {}
            return first.get("disease"), first.get("confidencePercent"), top

        prediction = self.model.predict(matrix)[0]
        return str(prediction), None, [{"disease": str(prediction), "confidencePercent": None}]

    def _predict_symptom_model(self, symptoms: str | list[str]) -> DiagnosticResult | None:
        symptom_text = self._symptom_text(symptoms)
        if len(symptom_text) < 2:
            return None

        if self.model is None:
            return DiagnosticResult(
                available=False,
                modelName=settings.ml_model_name,
                predictionType="disease",
                summary=self.load_error,
                raw={"symptoms": symptom_text},
            )

        predicted_disease, confidence, top_predictions = self._top_class_predictions([symptom_text])

        return DiagnosticResult(
            available=True,
            modelName=settings.ml_model_name,
            predictionType="disease",
            predictedDisease=predicted_disease,
            confidencePercent=confidence,
            topPredictions=top_predictions,
            probabilityPercent=confidence,
            riskBand=_confidence_band(confidence),
            summary="Prediction generated by the configured symptom-to-disease .pkl model bridge.",
            raw={"symptoms": symptom_text},
        )

    def _feature_vector(self, vitals: dict[str, Any]) -> tuple[list[float], list[str], dict[str, float]]:
        aliases = {
            "bloodPressure": ["bloodPressure", "diastolicBloodPressure", "diastolic"],
            "diabetesPedigreeFunction": ["diabetesPedigreeFunction", "dpf", "pedigree"],
        }
        vector: list[float] = []
        missing: list[str] = []
        defaults_used: dict[str, float] = {}

        for feature in settings.ml_feature_order:
            candidates = aliases.get(feature, [feature])
            value = None
            for candidate in candidates:
                value = _to_float(vitals.get(candidate))
                if value is not None:
                    break

            if value is None:
                missing.append(feature)
                value = settings.ml_feature_defaults.get(feature, 0.0)
                defaults_used[feature] = value

            vector.append(value)

        return vector, missing, defaults_used

    def predict(self, vitals: dict[str, Any], ml_result: Any = None, symptoms: str | list[str] = "") -> DiagnosticResult | None:
        provided_result = _normalize_ml_result(ml_result)
        if provided_result:
            return provided_result

        if settings.ml_model_type == "symptom_text":
            symptom_prediction = self._predict_symptom_model(symptoms)
            if symptom_prediction:
                return symptom_prediction

        if not vitals:
            return None

        if self.model is None:
            return DiagnosticResult(
                available=False,
                modelName=settings.ml_model_name,
                predictionType="tabular",
                summary=self.load_error,
                raw={"vitals": vitals},
            )

        vector, missing, defaults_used = self._feature_vector(vitals)

        try:
            import numpy as np
        except ImportError:
            return DiagnosticResult(
                available=False,
                modelName=settings.ml_model_name,
                predictionType="tabular",
                summary="numpy is not installed. Install ai_service/requirements.txt.",
                raw={"vitals": vitals},
            )

        matrix = np.array([vector], dtype=float)

        if hasattr(self.model, "predict_proba"):
            probability = float(self.model.predict_proba(matrix)[0][1]) * 100
        elif hasattr(self.model, "decision_function"):
            probability = _sigmoid(float(self.model.decision_function(matrix)[0])) * 100
        else:
            prediction = float(self.model.predict(matrix)[0])
            probability = 100.0 if prediction >= 1 else 0.0

        probability = round(max(0.0, min(100.0, probability)), 2)

        return DiagnosticResult(
            available=True,
            modelName=settings.ml_model_name,
            predictionType="tabular",
            probabilityPercent=probability,
            riskBand=_risk_band(probability),
            summary="Prediction generated by the configured .pkl model bridge.",
            raw={"vitals": vitals, "featureVector": dict(zip(settings.ml_feature_order, vector))},
            missingFeatures=missing,
            usedDefaultFeatures=defaults_used,
        )
