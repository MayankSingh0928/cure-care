import { request } from "./api"

export function checkDrugInteractions(payload) {
  return request("/drugs/check", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function getInteractionHistory() {
  return request("/drugs/history")
}

export const getDrugHistory = getInteractionHistory
