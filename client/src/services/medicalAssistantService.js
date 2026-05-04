const FASTAPI_BASE_URL = import.meta.env.VITE_AI_API_URL || "http://localhost:8000"

async function requestFastApiAssistant(payload) {
  let response
  try {
    response = await fetch(`${FASTAPI_BASE_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error(`FastAPI AI service is not reachable at ${FASTAPI_BASE_URL}. Start it with npm run dev or npm run ai.`)
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.detail || data.message || "FastAPI assistant request failed")
  }

  return data
}

export function analyzeMedicalAssistant(payload) {
  return requestFastApiAssistant(payload)
}

export function getMedicalAssistantHistory() {
  return Promise.resolve({ logs: [] })
}
