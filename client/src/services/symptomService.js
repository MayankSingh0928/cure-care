import { requestWithFallback } from "./api"

export function analyzeSymptoms(payload) {
  return requestWithFallback("/features/care-guidance/analyze", "/symptoms/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function getSymptomHistory() {
  return requestWithFallback("/features/care-guidance/history", "/symptoms/history")
}
