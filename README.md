# cure&care Medicine Guide

cure&care is a production-oriented starter for medicine information lookup, blood report analysis, and ML + RAG medical assistant support. It is split into a React client, an Express API, and a FastAPI AI bridge.

## What Works

- Medicine guide with uses, side effects, warnings, safe-use guidance, and similar-effect Ayurvedic remedies.
- FastAPI disease prediction + RAG medical assistant that loads a real symptom-to-disease `.pkl` model, accepts ChromaDB/Pinecone snippets through `ragContext`, and returns a safety-constrained response.
- Blood report workflow with upload/text input and English/Hindi output.
- Blood report extraction for pasted text, TXT, CSV, PDF text, and OCR-readable JPG/PNG images.
- AI-style medicine and blood report responses when Gemini is configured, with local fallbacks.
- Dashboard history for recent checks while the server process is running.
- No login or authentication requirement; all tools are directly usable.
- Clean API, service, route, controller, middleware, and data folders.

## Run

```bash
npm install
cd ai_service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..
npm run dev
```

Client: `http://localhost:5173`

Server: `http://localhost:5000/api/health`

FastAPI AI service: `http://localhost:8000/health`

## ML + RAG Medical Assistant

Open `http://localhost:5173/medical-assistant` or use the FastAPI endpoint directly:

```bash
POST http://localhost:8000/analyze
```

Request body:

```json
{
  "userQuery": "What disease might match these symptoms, and what should I do next?",
  "symptoms": "fever, headache, nausea",
  "ragContext": [
    {
      "title": "Migraine symptom profile",
      "source": "ChromaDB or Pinecone",
      "content": "Clinical snippet text..."
    }
  ]
}
```

Put your trained disease model at `ai_service/model/disease_model.pkl`, or set `ML_MODEL_PATH` in `.env`. Train it from a disease/symptom `dataset.csv` with `ai_service/scripts/train_disease_model.py`.

For production RAG, retrieve top snippets from ChromaDB or Pinecone and pass them through `ragContext`. Direct ChromaDB/Pinecone retrieval can also be configured in `ai_service/README.md`.

## Blood Report Upload Formats

The blood report screen accepts:

- pasted report text
- `.txt`
- `.csv`
- `.pdf` with selectable/digital text
- scanned `.pdf` through OCR fallback on rendered pages
- `.jpg`, `.jpeg`, `.png` through OCR

Raw text extraction is also available at:

```bash
POST /api/report/extract
```

Use multipart form-data with upload field:

```text
file
```

PDF extraction uses `pdf-parse` for selectable/digital PDF text. Tesseract OCR is used only for image uploads.

Very low-quality scans can still fail to extract values accurately, so users should review the detected findings before trusting the summary.

History is intentionally stored in memory only. Recent checks remain available while the server process is running and reset when the backend restarts.

## Trust And Safety

This project should be presented as educational clinical decision support, not a diagnostic or prescribing authority. Medicine details, Ayurvedic remedies, and blood report summaries may be incomplete and must be verified by a doctor or pharmacist.
