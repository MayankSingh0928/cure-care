import { getSymptomGuidance } from "../services/symptomGuidanceService.js"

const logs = []

export async function analyzeSymptoms(req, res, next) {
  try {
    const result = await getSymptomGuidance(req.body)
    logs.unshift({
      id: crypto.randomUUID(),
      urgency: result.guidance.urgency,
      department: result.guidance.recommendedDepartments?.[0]?.department || "",
      language: req.body?.language || "en",
      createdAt: new Date().toISOString(),
    })
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export function getSymptomHistory(req, res) {
  res.json({ logs: logs.slice(0, 25) })
}
