export function normalizeTestName(name = "") {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\br b c\b/g, "rbc")
    .replace(/\br d w\b/g, "rdw")
    .replace(/\bw b c\b/g, "wbc")
    .replace(/\bt l c\b/g, "tlc")
    .replace(/\bp l t\b/g, "plt")
    .replace(/\bt s h\b/g, "tsh")
    .replace(/\bf t 4\b/g, "ft4")
    .replace(/\bf t3\b/g, "ft3")
    .replace(/\bf t 3\b/g, "ft3")
    .replace(/\bc r p\b/g, "crp")
    .replace(/\be s r\b/g, "esr")
    .replace(/\br a\b/g, "ra")
    .replace(/\s+/g, " ")
    .trim()
}

export function statusForValue(value, range) {
  if (!range || Number.isNaN(value)) return "unknown"
  if (value < range.min) return "low"
  if (value > range.max) return "high"
  return "normal"
}
