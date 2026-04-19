# cure&care Drug Safety Checker

cure&care is a production-oriented starter for drug interaction screening and blood report analysis. It is split into a React client and an Express API.

## What Works

- Drug interaction checker using curated safety rules, the supplied `drug_interactions.csv`, and OpenFDA FAERS signal lookup.
- Blood report workflow with upload/text input and English/Hindi output.
- Blood report extraction for pasted text, TXT, CSV, PDF text, and OCR-readable JPG/PNG images.
- AI-style blood report response with prevention, cure direction, remedies, possible cause, medicine guidance, and risk percentage.
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

Optional OpenAI enrichment works only when an API key is configured.

## Trust And Safety

This project should be presented as clinical decision support, not a diagnostic or prescribing authority. OpenFDA FAERS is used for adverse-event signals, not definitive drug-drug interaction proof. The CSV and curated rules improve coverage for known examples, but final decisions must be verified by a doctor or pharmacist.
