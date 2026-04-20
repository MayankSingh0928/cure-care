import { request } from "./api"

export function analyzeSymptoms(payload) {
  return request("/symptoms/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function getSymptomHistory() {
  return request("/symptoms/history")
}
