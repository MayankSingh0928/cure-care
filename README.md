# cure&care Medicine Guide

cure&care is a production-oriented starter for medicine information lookup and blood report analysis. It is split into a React client and an Express API.

## What Works

- Medicine guide with uses, side effects, warnings, safe-use guidance, and similar-effect Ayurvedic remedies.
- Blood report workflow with upload/text input and English/Hindi output.
- Blood report extraction for pasted text, TXT, CSV, PDF text, and OCR-readable JPG/PNG images.
- AI-style medicine and blood report responses when Gemini is configured, with local fallbacks.
- Dashboard history for recent checks while the server process is running.
- No login or authentication requirement; all tools are directly usable.
- Clean API, service, route, controller, middleware, and data folders.

## Run

```bash
npm install
npm run dev
```

Client: `http://localhost:5173`

Server: `http://localhost:5000/api/health`

## Blood Report Upload Formats

The blood report screen accepts:

- pasted report text
- `.txt`
- `.csv`
- `.pdf` with selectable/digital text
- scanned `.pdf` through OCR fallback on rendered pages
- `.jpg`, `.jpeg`, `.png` through OCR

Very low-quality scans can still fail to extract values accurately, so users should review the detected findings before trusting the summary.

History is intentionally stored in memory only. Recent checks remain available while the server process is running and reset when the backend restarts.

## Trust And Safety

This project should be presented as educational clinical decision support, not a diagnostic or prescribing authority. Medicine details, Ayurvedic remedies, and blood report summaries may be incomplete and must be verified by a doctor or pharmacist.
