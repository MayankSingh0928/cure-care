from fastapi import FastAPI
from pydantic import BaseModel

from model.blood_report_analyzer import analyze_blood_report
from model.drug_risk_analyzer import analyze_drug_risk

app = FastAPI(title="cure&care AI Service", version="1.0.0")


class TextPayload(BaseModel):
    text: str = ""
    language: str = "en"


class DrugPayload(BaseModel):
    drugs: list[str] = []
    conditions: list[str] = []
    age: int | None = None


@app.get("/health")
def health():
    return {"status": "ok", "service": "curecare-ai"}


@app.post("/analyze-blood-report")
def blood_report(payload: TextPayload):
    return analyze_blood_report(payload.text, payload.language)


@app.post("/analyze-drug-risk")
def drug_risk(payload: DrugPayload):
    return analyze_drug_risk(payload.drugs, payload.conditions, payload.age)
