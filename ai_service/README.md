# Cure&Care 2.0 FastAPI AI Service

This service is the medical assistant bridge:

- Loads a real disease-prediction `.pkl` classifier with `joblib`.
- Predicts disease from symptom text/list by default.
- Still supports optional tabular/vitals models if `ML_MODEL_TYPE` is changed.
- Accepts snippets from ChromaDB/Pinecone through `ragContext`.
- Can retrieve from ChromaDB or Pinecone when configured.
- Generates a grounded assistant response with the required clinical disclaimer.

## Setup

```bash
cd ai_service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Health check:

```bash
GET http://localhost:8000/health
```

## Environment

The FastAPI service reads configuration from the project root `.env` file:

```text
C:\Users\Mayank Singh\OneDrive\Desktop\cure-care_2.0\.env
```

Use that file for values such as:

```env
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
ML_MODEL_PATH=ai_service/model/disease_model.pkl
ML_MODEL_TYPE=symptom_text
```

Analyze:

```bash
POST http://localhost:8000/analyze
```

## Disease Model Bridge

Put your trained symptom-to-disease classifier at:

```text
ai_service/model/disease_model.pkl
```

Or set:

```env
ML_MODEL_PATH=C:\absolute\path\to\disease_model.pkl
ML_MODEL_NAME=Symptom-to-disease classifier
ML_MODEL_TYPE=symptom_text
```

If you have a Kaggle-style disease/symptom `dataset.csv`, train the model with:

```bash
python scripts/train_disease_model.py --csv C:\path\to\dataset.csv --target Disease --out model\disease_model.pkl
```

The dataset should have a disease column and symptom columns like:

```text
Disease, Symptom_1, Symptom_2, Symptom_3, ...
```

## Symptom CSVs As RAG

Your files can also become RAG documents:

```text
dataset.csv
symptom_Description.csv
symptom_precaution.csv
Symptom-severity.csv
```

Convert them to JSON documents:

```bash
python scripts/build_symptom_rag_docs.py --dataset C:\path\to\dataset.csv --descriptions C:\path\to\symptom_Description.csv --precautions C:\path\to\symptom_precaution.csv --severity C:\path\to\Symptom-severity.csv --out data\symptom_rag_documents.json
```

## RAG Context

Preferred production flow:

1. Embed the user question in your RAG service.
2. Query ChromaDB or Pinecone.
3. Pass top snippets into `ragContext`.

Example:

```json
{
  "userQuery": "What should I do about diabetes risk?",
  "vitals": {
    "glucose": 150,
    "bmi": 32,
    "age": 52,
    "hba1c": 7.1
  },
  "ragContext": [
    {
      "title": "Diabetes Screening Thresholds",
      "source": "Clinical guideline",
      "content": "..."
    }
  ]
}
```

Direct ChromaDB retrieval is also supported:

```bash
pip install -r requirements-chroma.txt
```

On Windows, Chroma may require Microsoft C++ Build Tools because of the `chroma-hnswlib` native extension. If you do not want that dependency in local development, retrieve from Chroma in your own pipeline and pass the snippets through `ragContext`.

```env
CHROMA_PATH=C:\path\to\chroma
CHROMA_COLLECTION=clinical_guidelines
```

Or:

```env
CHROMA_HOST=localhost
CHROMA_PORT=8000
CHROMA_COLLECTION=clinical_guidelines
```

Direct Pinecone retrieval is supported when you pass `queryEmbedding`:

```env
PINECONE_API_KEY=...
PINECONE_INDEX=clinical-guidelines
PINECONE_NAMESPACE=optional
```
