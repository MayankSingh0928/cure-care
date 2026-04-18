import { callAiService } from "../services/openaiService.js"

export async function analyzeDrugRisk(req, res) {
  const result = await callAiService("/analyze-drug-risk", req.body)
  res.json(result)
}

export async function analyzeBloodRisk(req, res) {
  const result = await callAiService("/analyze-blood-report", req.body)
  res.json(result)
}
