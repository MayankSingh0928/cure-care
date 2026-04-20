import { checkInteractions } from "../services/drugInteractionService.js"

const logs = []

export async function checkDrugInteractions(req, res, next) {
  try {
    const result = await checkInteractions(req.body)
    logs.unshift({
      id: crypto.randomUUID(),
      drugs: result.normalizedDrugs,
      medicine: result.medicineInfo?.medicine || result.normalizedDrugs[0],
      language: req.body?.language || "en",
      createdAt: new Date().toISOString(),
    })
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export function getDrugHistory(req, res) {
  res.json({ logs: logs.slice(0, 25) })
}
