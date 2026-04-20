import { env } from "../config/env.js"
import { safeJsonFetch } from "../utils/apiHelper.js"

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

function singleDrugPrompt({ drug, fdaInfo, language, patientContext }) {
  const outputLanguage = language === "hi" ? "Hindi" : "English"

  return `
You are a careful medicine information summarizer for a patient-facing drug safety app.

Medicine: ${drug}
Patient context, if supplied:
${JSON.stringify(patientContext || {}, null, 2)}

Write in ${outputLanguage}. If ${outputLanguage} is Hindi, use natural Devanagari Hindi.

Use the OpenFDA label text below when available. If it is missing, use general medicine knowledge but do not invent brand-specific claims.
Include Ayurvedic remedies that may have a similar intended effect to the medicine's common use, but be conservative:
- Do not claim they are equivalent replacements.
- Include a caution for each remedy.
- Mention limited evidence where relevant.
- Do not prescribe dose, duration, or tell the user to start, stop, or change medicine without a clinician.

Return valid JSON only in this exact shape:
{
  "medicine": "",
  "category": "",
  "uses": ["", "", ""],
  "sideEffects": ["", "", ""],
  "seriousWarnings": ["", ""],
  "safeUse": ["", ""],
  "ayurvedicRemedies": [
    {
      "name": "",
      "similarEffect": "",
      "evidenceNote": "",
      "caution": ""
    }
  ],
  "disclaimer": ""
}

OpenFDA label text:
${JSON.stringify(fdaInfo, null, 2).slice(0, 12000)}
`.trim()
}

export async function summarizeSingleDrugWithOpenAI({ drug, fdaInfo, language, patientContext }) {
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
      input: singleDrugPrompt({ drug, fdaInfo, language, patientContext }),
      temperature: 0.2,
    }),
    timeoutMs: 25000,
  })

  if (!response.ok) {
    return { available: false, message: "OpenAI medicine summary was unavailable." }
  }

  const parsed = parseJson(outputText(response.data))
  if (!parsed?.uses || !parsed?.sideEffects || !parsed?.ayurvedicRemedies) {
    return { available: false, message: "OpenAI medicine summary could not be parsed." }
  }

  return { available: true, data: parsed }
}

function symptomGuidancePrompt({ problem, age, gender, duration, conditions, language }) {
  const outputLanguage = language === "hi" ? "Hindi" : "English"

  return `
You are a careful patient navigation assistant for a health app.

The user will describe symptoms or a medical problem. Your job is to suggest:
1. the most suitable medical department/specialist to visit for evaluation and prescription,
2. tests a doctor may commonly consider,
3. urgency level and red flags.
4. a patient-facing "What to ask your doctor" checklist.

Do not diagnose. Do not prescribe medicines or doses. Do not claim tests are definitely required; phrase them as doctor-discussed or commonly considered tests. If symptoms sound urgent, clearly recommend emergency care.

Write in ${outputLanguage}. If ${outputLanguage} is Hindi, use natural Devanagari Hindi.

Return valid JSON only in this exact shape:
{
  "urgency": "routine | soon | urgent | emergency",
  "summary": "",
  "recommendedDepartments": [
    {
      "department": "",
      "doctorType": "",
      "reason": ""
    }
  ],
  "suggestedTests": [
    {
      "test": "",
      "reason": ""
    }
  ],
  "redFlags": ["", "", ""],
  "selfCareUntilVisit": ["", "", ""],
  "askDoctorChecklist": ["", "", "", ""],
  "questionsDoctorMayAsk": ["", "", ""],
  "disclaimer": ""
}

Patient details:
${JSON.stringify({ problem, age, gender, duration, conditions }, null, 2)}
`.trim()
}

export async function analyzeSymptomsWithOpenAI({ problem, age, gender, duration, conditions, language }) {
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
      input: symptomGuidancePrompt({ problem, age, gender, duration, conditions, language }),
      temperature: 0.2,
    }),
    timeoutMs: 25000,
  })

  if (!response.ok) {
    return { available: false, message: "OpenAI symptom guidance was unavailable." }
  }

  const parsed = parseJson(outputText(response.data))
  if (!parsed?.recommendedDepartments || !Array.isArray(parsed.recommendedDepartments) || !parsed?.suggestedTests) {
    return { available: false, message: "OpenAI symptom guidance could not be parsed." }
  }

  return { available: true, data: parsed }
}
