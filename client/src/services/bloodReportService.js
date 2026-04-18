import { request } from "./api"

export function analyzeBloodReport({ file, text, language }) {
  const formData = new FormData()

  if (file) {
    formData.append("report", file)
  }

  formData.append("text", text || "")
  formData.append("language", language)

  return request("/blood-reports/analyze", {
    method: "POST",
    body: formData,
  })
}

export function getBloodReportHistory() {
  return request("/blood-reports/history")
}

export const getBloodHistory = getBloodReportHistory
