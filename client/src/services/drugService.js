import { requestWithFallback } from "./api"

export function checkDrugInteractions(payload) {
  return requestWithFallback("/features/medicine/check", "/drugs/check", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function getInteractionHistory() {
  return requestWithFallback("/features/medicine/history", "/drugs/history")
}

export const getDrugHistory = getInteractionHistory
