export function riskColor(severity) {
  if (severity === "severe" || severity === "high") return "border-rose-200 bg-rose-50 text-rose-950"
  if (severity === "moderate" || severity === "medium") return "border-amber-200 bg-amber-50 text-amber-950"
  if (severity === "low") return "border-sky-200 bg-sky-50 text-sky-950"
  return "border-emerald-200 bg-emerald-50 text-emerald-950"
}
