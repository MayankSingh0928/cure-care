# API Specs

Base URL: `http://localhost:5000/api`

## Health

`GET /health`

Returns API service status.

## Drug Safety

`POST /drugs/check`

```json
{
  "drugs": ["Warfarin", "Ibuprofen"],
  "conditions": ["kidney disease"],
  "age": 67,
  "renalImpairment": true
}
```

Returns normalized drugs, interaction cards, risk percentages, source summary, and a data coverage notice.

`GET /drugs/history`

Returns recent in-memory interaction checks.

## Blood Reports

`POST /blood-reports/analyze`

Form data:

- `report`: optional uploaded report file
- `text`: pasted report values
- `language`: `en` or `hi`

Supported report uploads are TXT, CSV, digital-text PDF, scanned PDF through OCR fallback, JPG, JPEG, and PNG. Image uploads are read through OCR.

Returns:

- `riskPercentage`
- `findings`
- `extractedTextSource`
- `extractedCharacters`
- `prevention`
- `cure`
- `remedies`
- `cause`
- `medicine`

`GET /blood-reports/history`

Returns recent in-memory blood report analyses.
