export function parseCsv(text) {
  const rows = []
  let current = ""
  let row = []
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (char === '"' && quoted && next === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === "," && !quoted) {
      row.push(current)
      current = ""
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1
      row.push(current)
      rows.push(row)
      row = []
      current = ""
    } else {
      current += char
    }
  }

  if (current || row.length) {
    row.push(current)
    rows.push(row)
  }

  const [headers = [], ...data] = rows.filter((items) => items.some(Boolean))
  return data.map((items) =>
    headers.reduce((record, header, index) => {
      record[header.trim()] = (items[index] || "").trim()
      return record
    }, {})
  )
}
