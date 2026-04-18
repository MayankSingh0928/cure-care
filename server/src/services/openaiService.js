import { env } from "../config/env.js"
import { safeJsonFetch } from "../utils/apiHelper.js"

export async function callAiService(path, payload) {
  const response = await safeJsonFetch(`${env.aiServiceUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    return { available: false, message: "AI service is unavailable; local rule engine response was used." }
  }

  return { available: true, data: response.data }
}

function outputText(data) {
  if (typeof data?.output_text === "string") return data.output_text

  return (data?.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || content.output_text || "")
    .filter(Boolean)
    .join("\n")
}

function parseJson(text) {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "")

  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf("{")
    const end = cleaned.lastIndexOf("}")
    if (start === -1 || end === -1 || end <= start) return null
    try {
      return JSON.parse(cleaned.slice(start, end + 1))
    } catch {
      return null
    }
  }
}

function bloodReportPrompt({ reportText, findings, language }) {
  const outputLanguage = language === "hi" ? "Hindi" : "English"

  return `
You are a careful medical report summarizer for a blood report analyzer.

Use only the extracted values supplied below. Do not invent values. Do not diagnose. Do not prescribe dosage or tell the user to start medicine on their own.
For every abnormal finding, explain:
1. what the value means,
2. common possible causes,
3. what follow-up a doctor may consider.

For "simpleAdvice", give practical remedies/lifestyle steps that may help bring abnormal values toward normal, based only on the detected abnormalities.
For "whatToDo", include common medicine or supplement names/classes a doctor may consider for the detected problems, but always phrase them as clinician-supervised options. Examples: cholecalciferol/vitamin D3 for vitamin D deficiency, levothyroxine for confirmed hypothyroidism, oral iron such as ferrous sulfate/ferrous ascorbate for confirmed iron deficiency anemia, vitamin B12/folate if deficient, paracetamol for fever if appropriate, antibiotics only when infection is confirmed, and platelet monitoring rather than platelet-raising self-medication.

Write in ${outputLanguage}. If ${outputLanguage} is Hindi, use natural Devanagari Hindi, not Hinglish, except unavoidable medical terms.

Return valid JSON only in this exact shape:
{
  "intro": "",
  "importantFindings": [
    {
      "title": "",
      "test": "",
      "value": "",
      "normalRange": "",
      "status": "",
      "meaning": ["", "", ""]
    }
  ],
  "borderlineFindings": [
    {
      "title": "",
      "value": "",
      "note": ""
    }
  ],
  "normalFindings": [""],
  "overallInterpretation": [""],
  "whatToDo": [""],
  "simpleAdvice": [""],
  "finalNote": ""
}

Extracted structured findings:
${JSON.stringify(findings, null, 2)}

Raw extracted report text for context:
${reportText.slice(0, 12000)}
`.trim()
}

export async function analyzeBloodReportWithOpenAI({ reportText, findings, language }) {
  if (!env.openAiApiKey) {
    return { available: false, message: "OPENAI_API_KEY is not configured." }
  }

  const response = await safeJsonFetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openAiApiKey}`,
    },
    body: JSON.stringify({
      model: env.openAiModel,
      input: bloodReportPrompt({ reportText, findings, language }),
      temperature: 0.2,
    }),
    timeoutMs: 25000,
  })

  if (!response.ok) {
    return { available: false, message: "OpenAI analysis was unavailable; local medical rules were used." }
  }

  const parsed = parseJson(outputText(response.data))
  if (!parsed?.importantFindings || !Array.isArray(parsed.importantFindings)) {
    return { available: false, message: "OpenAI response could not be parsed; local medical rules were used." }
  }

  return { available: true, humanSummary: parsed }
}

function singleDrugPrompt({ drug, fdaInfo, language }) {
  const outputLanguage = language === "hi" ? "Hindi" : "English"

  return `
You are a careful medicine information summarizer for a patient-facing drug safety app.

Medicine: ${drug}
Write in ${outputLanguage}. If ${outputLanguage} is Hindi, use natural Devanagari Hindi.

Use the OpenFDA label text below when available. If it is missing, use general medicine knowledge but do not invent brand-specific claims. Do not prescribe a dose. Do not tell the user to start, stop, or change medicine without a clinician.

Return valid JSON only in this exact shape:
{
  "medicine": "",
  "uses": ["", "", ""],
  "sideEffects": ["", "", ""],
  "seriousWarnings": ["", ""],
  "safeUse": ["", ""],
  "disclaimer": ""
}

OpenFDA label text:
${JSON.stringify(fdaInfo, null, 2).slice(0, 12000)}
`.trim()
}

export async function summarizeSingleDrugWithOpenAI({ drug, fdaInfo, language }) {
  if (!env.openAiApiKey) {
    return { available: false, message: "OPENAI_API_KEY is not configured." }
  }

  const response = await safeJsonFetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openAiApiKey}`,
    },
    body: JSON.stringify({
      model: env.openAiModel,
      input: singleDrugPrompt({ drug, fdaInfo, language }),
      temperature: 0.2,
    }),
    timeoutMs: 25000,
  })

  if (!response.ok) {
    return { available: false, message: "OpenAI medicine summary was unavailable." }
  }

  const parsed = parseJson(outputText(response.data))
  if (!parsed?.uses || !parsed?.sideEffects) {
    return { available: false, message: "OpenAI medicine summary could not be parsed." }
  }

  return { available: true, data: parsed }
}
