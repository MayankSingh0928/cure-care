import { requestWithFallback } from "./api"

export function analyzeBloodReport({ file, text, language }) {
  const formData = new FormData()

  if (file) {
    formData.append("report", file)
  }

  formData.append("text", text || "")
  formData.append("language", language)

  return requestWithFallback("/features/blood-report/analyze", "/blood-reports/analyze", {
    method: "POST",
    body: formData,
  })
}

export function getBloodReportHistory() {
  return requestWithFallback("/features/blood-report/history", "/blood-reports/history")
}

export const getBloodHistory = getBloodReportHistory
