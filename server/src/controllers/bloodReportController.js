import { analyzeBloodReport } from "../services/bloodReportService.js"

const logs = []

export async function analyzeReport(req, res, next) {
  try {
    const report = await analyzeBloodReport({
      text: req.body.text,
      language: req.body.language,
      file: req.file,
    })

    logs.unshift({
      id: crypto.randomUUID(),
      riskPercentage: report.riskPercentage,
      language: req.body.language || "en",
      createdAt: new Date().toISOString(),
    })

    res.json({ report })
  } catch (error) {
    next(error)
  }
}

export function getBloodReportHistory(req, res) {
  res.json({ logs: logs.slice(0, 25) })
}
