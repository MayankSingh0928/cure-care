# cure&care Architecture

## Layers

- `client`: React + Tailwind dashboard for patients, clinicians, and pharmacists.
- `server`: Express API for drug safety checks, blood report analysis, CSV lookup, OpenFDA calls, and optional OpenAI enrichment.

## Drug Workflow

1. User enters medicines and patient context.
2. Server normalizes medicine names.
3. Curated high-risk rules run first.
4. CSV dataset lookup runs for known pairs.
5. OpenFDA FAERS is queried for real-world adverse-event signals.
6. Results are deduplicated and returned with patient-friendly guidance.

## Blood Report Workflow

1. User uploads a report or pastes values.
2. Server extracts text directly from TXT/CSV, parses digital-text PDFs, runs OCR fallback for scanned PDFs, or runs OCR on JPG/PNG images.
3. Values are compared with reference ranges.
4. Risk percentage is calculated from abnormal and severe values.
5. Report is returned in English or Hindi with prevention, cure direction, remedies, possible cause, and medicine guidance.
