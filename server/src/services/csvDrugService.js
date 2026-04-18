import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { parseCsv } from "../utils/csvParser.js"
import { inferSeverity } from "../utils/riskCalculator.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
let cachedRows = null

function normalize(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function loadRows() {
  if (cachedRows) return cachedRows

  const csvPath = path.resolve(__dirname, "../data/drug_interactions.csv")
  const raw = fs.readFileSync(csvPath, "utf8")
  cachedRows = parseCsv(raw).map((row, index) => ({
    id: `csv-${index}`,
    drug1: row["Drug 1"] || "",
    drug2: row["Drug 2"] || "",
    description: row["Interaction Description"] || "",
    drug1Key: normalize(row["Drug 1"] || ""),
    drug2Key: normalize(row["Drug 2"] || ""),
  }))

  return cachedRows
}

export function findCsvInteractions(drugs = []) {
  const keys = drugs.map(normalize).filter(Boolean)
  const rows = loadRows()
  const matches = []

  for (let left = 0; left < keys.length; left += 1) {
    for (let right = left + 1; right < keys.length; right += 1) {
      const a = keys[left]
      const b = keys[right]
      const row = rows.find(
        (item) =>
          (item.drug1Key === a && item.drug2Key === b) ||
          (item.drug1Key === b && item.drug2Key === a) ||
          (item.drug1Key.includes(a) && item.drug2Key.includes(b)) ||
          (item.drug1Key.includes(b) && item.drug2Key.includes(a))
      )

      if (row) {
        matches.push({
          id: row.id,
          drugs: [row.drug1, row.drug2],
          description: row.description,
          severity: inferSeverity(row.description),
          source: "CSV dataset",
          mechanism: row.description,
          recommendation: "Review the combination with a clinician or pharmacist before continuing therapy.",
          patientLanguage: "This pair appears in the configured interaction dataset and may need monitoring or an alternative.",
        })
      }
    }
  }

  return matches
}

export function normalizeDrugName(value = "") {
  const text = value.trim()
  if (!text) return ""
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}
