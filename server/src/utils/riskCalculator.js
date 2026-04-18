export function inferSeverity(description = "") {
  const text = description.toLowerCase()
  if (/fatal|life-threatening|severe|major|contraindicated|hemorrhage|rebound hypertension/.test(text)) return "high"
  if (/bleeding|increase|monitor|caution|adverse|toxicity|moderate/.test(text)) return "moderate"
  return "low"
}

export function scoreInteraction({ severity, age, renalImpairment }) {
  const base = severity === "high" ? 82 : severity === "moderate" ? 58 : 28
  const ageBoost = age >= 65 ? 8 : 0
  const renalBoost = renalImpairment ? 8 : 0
  return Math.min(96, base + ageBoost + renalBoost)
}
