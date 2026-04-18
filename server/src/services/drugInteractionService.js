import { env } from "../config/env.js"
import { safeJsonFetch } from "../utils/apiHelper.js"
import { scoreInteraction } from "../utils/riskCalculator.js"
import { findCsvInteractions, normalizeDrugName } from "./csvDrugService.js"
import { summarizeSingleDrugWithOpenAI } from "./openaiService.js"

const curatedRules = [
  {
    drugs: ["warfarin", "ibuprofen"],
    severity: "high",
    description: "Combining warfarin with ibuprofen can significantly increase bleeding risk, including gastrointestinal bleeding.",
    mechanism: "Warfarin reduces clotting and ibuprofen can irritate the stomach lining and affect platelet function.",
    recommendation: "Avoid routine combined use unless a clinician specifically approves it. Consider acetaminophen when appropriate and monitor for bleeding.",
    patientLanguage: "This combination can make bleeding more likely. Black stools, unusual bruising, vomiting blood, or severe weakness need urgent care.",
  },
  {
    drugs: ["clonidine", "propranolol"],
    severity: "high",
    description: "Sudden clonidine withdrawal while taking propranolol can cause dangerous rebound hypertension.",
    mechanism: "Clonidine withdrawal may sharply increase sympathetic tone while propranolol blocks beta compensation, leaving alpha vasoconstriction unopposed.",
    recommendation: "Do not stop clonidine suddenly. Taper only under medical supervision and review beta-blocker timing with the prescriber.",
    patientLanguage: "Stopping clonidine suddenly while on propranolol can cause a rapid and dangerous blood pressure rise within 24 to 72 hours.",
  },
  {
    drugs: ["acetaminophen", "warfarin"],
    severity: "moderate",
    description: "Regular high-dose acetaminophen may increase INR and bleeding risk in patients taking warfarin.",
    mechanism: "Chronic acetaminophen exposure may augment vitamin K antagonism and raise anticoagulation effect.",
    recommendation: "Use the lowest effective dose, avoid prolonged high-dose use, and monitor INR when repeated dosing is needed.",
    patientLanguage: "Repeated high doses can make warfarin stronger and increase bleeding risk.",
  },
]

function normalize(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function findCuratedRules(drugs) {
  const keys = drugs.map(normalize)
  return curatedRules
    .filter((rule) => rule.drugs.every((drug) => keys.includes(drug)))
    .map((rule, index) => ({
      id: `rule-${index}`,
      drugs: rule.drugs.map(normalizeDrugName),
      source: "Curated clinical rule",
      ...rule,
    }))
}

async function fetchOpenFdaSignal(drug) {
  const query = encodeURIComponent(`patient.drug.medicinalproduct:"${drug}"`)
  const url = `${env.openFdaEventUrl}?search=${query}&limit=1`
  const response = await safeJsonFetch(url)

  if (!response.ok || !response.data?.results?.length) {
    return null
  }

  const event = response.data.results[0]
  const reaction = event.patient?.reaction?.[0]?.reactionmeddrapt || "reported adverse event"
  return {
    id: `openfda-${normalize(drug)}`,
    drugs: [normalizeDrugName(drug)],
    severity: "low",
    description: `OpenFDA has adverse-event reports mentioning ${drug}; sample reaction: ${reaction}.`,
    mechanism: "OpenFDA FAERS data is a signal source, not proof that the medicine caused the event.",
    recommendation: "Use this as safety context only. Confirm clinically relevant interactions through the paired CSV/rule result and medical review.",
    patientLanguage: "There are real-world adverse-event reports for this medicine, but this does not prove the medicine caused the event.",
    source: "OpenFDA FAERS",
  }
}

function firstText(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(" ")
  return value || ""
}

function compactText(value, fallback) {
  const text = firstText(value).replace(/\s+/g, " ").trim()
  if (!text) return fallback
  return text.length > 900 ? `${text.slice(0, 900).trim()}...` : text
}

async function fetchOpenFdaLabel(drug) {
  const query = encodeURIComponent(`openfda.generic_name:"${drug}" OR openfda.brand_name:"${drug}" OR openfda.substance_name:"${drug}"`)
  const url = `https://api.fda.gov/drug/label.json?search=${query}&limit=1`
  const response = await safeJsonFetch(url, { timeoutMs: 7000 })

  if (!response.ok || !response.data?.results?.length) return null
  const label = response.data.results[0]

  return {
    brandNames: label.openfda?.brand_name || [],
    genericNames: label.openfda?.generic_name || [],
    substanceNames: label.openfda?.substance_name || [],
    indicationsAndUsage: firstText(label.indications_and_usage),
    purpose: firstText(label.purpose),
    adverseReactions: firstText(label.adverse_reactions),
    warnings: firstText(label.warnings || label.boxed_warning),
    doNotUse: firstText(label.do_not_use),
    askDoctor: firstText(label.ask_doctor || label.ask_doctor_or_pharmacist),
    stopUse: firstText(label.stop_use),
  }
}

function commonSingleDrugFallback(drug, language) {
  const key = normalize(drug)
  const en = {
    ibuprofen: {
      medicine: normalizeDrugName(drug),
      uses: ["Pain relief for headache, toothache, muscle pain, back pain, period pain, and minor injury pain.", "Fever reduction.", "Reduces inflammation in conditions such as sprain or arthritis symptoms."],
      sideEffects: ["Stomach pain, acidity, nausea, vomiting, or indigestion.", "Dizziness, fluid retention, or increased blood pressure in some people.", "Can increase bleeding risk or kidney stress, especially with dehydration, kidney disease, blood thinners, or older age."],
      seriousWarnings: ["Avoid or ask a doctor first if you have stomach ulcer/bleeding history, kidney disease, severe heart disease, are on blood thinners, or are pregnant unless advised.", "Seek urgent care for black stools, vomiting blood, chest pain, breathing trouble, swelling, severe rash, or reduced urination."],
      safeUse: ["Use only as directed on the label or by a clinician; avoid combining with other NSAIDs such as naproxen or diclofenac unless advised.", "Take with food or milk if stomach upset occurs, and avoid alcohol when possible."],
    },
    paracetamol: {
      medicine: normalizeDrugName(drug),
      uses: ["Pain relief for headache, body pain, toothache, muscle pain, and minor aches.", "Fever reduction.", "Often used when NSAIDs are not suitable, but liver safety still matters."],
      sideEffects: ["Usually well tolerated when used correctly.", "Nausea, rash, or allergy can occur rarely.", "Too much can cause serious liver damage."],
      seriousWarnings: ["Avoid overdose and avoid combining multiple products that contain paracetamol/acetaminophen.", "Ask a doctor first with liver disease, heavy alcohol use, or long-term use."],
      safeUse: ["Follow label or clinician directions exactly.", "Check cold/flu medicines because many already contain paracetamol/acetaminophen."],
    },
    acetaminophen: null,
  }
  en.acetaminophen = en.paracetamol

  if (language === "hi") {
    const hi = {
      ibuprofen: {
        medicine: normalizeDrugName(drug),
        uses: ["Headache, toothache, muscle pain, back pain, period pain और minor injury pain में pain relief.", "Fever कम करने में मदद.", "Sprain या arthritis symptoms जैसी inflammation में swelling/pain कम करने में मदद कर सकता है."],
        sideEffects: ["Stomach pain, acidity, nausea, vomiting या indigestion.", "कुछ लोगों में dizziness, fluid retention या blood pressure बढ़ना.", "Dehydration, kidney disease, blood thinners या older age में bleeding risk और kidney stress बढ़ सकता है."],
        seriousWarnings: ["Stomach ulcer/bleeding history, kidney disease, severe heart disease, blood thinners या pregnancy में doctor से पूछे बिना use न करें.", "Black stools, blood vomiting, chest pain, breathing trouble, swelling, severe rash या urine कम होने पर urgent care लें."],
        safeUse: ["Label या doctor के निर्देश के अनुसार ही लें; naproxen/diclofenac जैसे दूसरे NSAIDs के साथ combine न करें जब तक doctor न कहें.", "Stomach upset हो तो food/milk के साथ लेना मदद कर सकता है; alcohol avoid करें."],
      },
      paracetamol: {
        medicine: normalizeDrugName(drug),
        uses: ["Headache, body pain, toothache, muscle pain और minor aches में pain relief.", "Fever कम करने में मदद.", "NSAIDs suitable न हों तब अक्सर use होता है, लेकिन liver safety जरूरी है."],
        sideEffects: ["सही तरीके से लेने पर आमतौर पर tolerated होता है.", "Rarely nausea, rash या allergy हो सकती है.", "ज्यादा मात्रा liver damage कर सकती है."],
        seriousWarnings: ["Overdose avoid करें और paracetamol/acetaminophen वाले multiple products साथ न लें.", "Liver disease, heavy alcohol use या long-term use में doctor से पूछें."],
        safeUse: ["Label या clinician directions exactly follow करें.", "Cold/flu medicines check करें क्योंकि उनमें भी paracetamol/acetaminophen हो सकता है."],
      },
      acetaminophen: null,
    }
    hi.acetaminophen = hi.paracetamol
    return hi[key] || null
  }

  return en[key] || null
}

function fallbackSingleDrugInfo(drug, fdaInfo, language) {
  const common = commonSingleDrugFallback(drug, language)
  if (common) {
    return {
      ...common,
      source: "Curated medicine summary",
      disclaimer: language === "hi" ? "यह जानकारी educational है। Medicine शुरू/बंद/बदलने से पहले doctor/pharmacist से सलाह लें।" : "This information is educational. Ask a doctor or pharmacist before starting, stopping, or changing medicine.",
    }
  }

  if (language === "hi") {
    return {
      medicine: normalizeDrugName(drug),
      uses: [compactText(fdaInfo?.indicationsAndUsage || fdaInfo?.purpose, "OpenFDA label में uses साफ उपलब्ध नहीं हैं। इस medicine का use doctor/pharmacist से confirm करें।")],
      sideEffects: [compactText(fdaInfo?.adverseReactions, "OpenFDA label में side effects साफ उपलब्ध नहीं हैं।")],
      seriousWarnings: [compactText(fdaInfo?.warnings || fdaInfo?.doNotUse || fdaInfo?.stopUse, "Warning details clearly available नहीं हैं। Allergy, severe rash, breathing trouble या unusual symptoms में medical help लें।")],
      safeUse: [compactText(fdaInfo?.askDoctor, "Existing disease, pregnancy, kidney/liver problem या other medicines हों तो doctor/pharmacist से पूछें।")],
      source: fdaInfo ? "OpenFDA drug label" : "General safety fallback",
      disclaimer: "यह जानकारी educational है। Medicine शुरू/बंद/बदलने से पहले doctor/pharmacist से सलाह लें।",
    }
  }

  return {
    medicine: normalizeDrugName(drug),
    uses: [compactText(fdaInfo?.indicationsAndUsage || fdaInfo?.purpose, "Uses were not clearly available from OpenFDA for this medicine. Confirm the intended use with a doctor or pharmacist.")],
    sideEffects: [compactText(fdaInfo?.adverseReactions, "Side effects were not clearly available from OpenFDA.")],
    seriousWarnings: [compactText(fdaInfo?.warnings || fdaInfo?.doNotUse || fdaInfo?.stopUse, "Warning details were not clearly available. Seek medical help for allergy, severe rash, breathing trouble, or unusual symptoms.")],
    safeUse: [compactText(fdaInfo?.askDoctor, "Ask a doctor or pharmacist if you have existing disease, pregnancy, kidney/liver problems, or take other medicines.")],
    source: fdaInfo ? "OpenFDA drug label" : "General safety fallback",
    disclaimer: "This information is educational. Ask a doctor or pharmacist before starting, stopping, or changing medicine.",
  }
}

async function getSingleDrugInfo(drug, language = "en") {
  const fdaInfo = await fetchOpenFdaLabel(drug)
  const aiSummary = await summarizeSingleDrugWithOpenAI({ drug, fdaInfo, language })
  const info = aiSummary.available ? { ...aiSummary.data, source: fdaInfo ? "OpenAI summary of OpenFDA label" : "OpenAI medicine summary" } : fallbackSingleDrugInfo(drug, fdaInfo, language)

  return {
    normalizedDrugs: [normalizeDrugName(drug)],
    interactions: [],
    singleDrugInfo: info,
    sourceSummary: info.source,
    coverageNotice:
      "Single-medicine information is educational and may not include every risk, contraindication, dose limit, or patient-specific warning. Verify with a clinician or pharmacist.",
  }
}

function uniqueInteractions(interactions) {
  const seen = new Set()
  return interactions.filter((interaction) => {
    const key = `${interaction.source}:${interaction.drugs.map(normalize).sort().join("|")}:${interaction.description}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function checkInteractions(payload) {
  const drugs = [...new Set((payload.drugs || []).map(normalizeDrugName).filter(Boolean))]
  const language = payload.language || "en"

  if (drugs.length === 1) {
    return getSingleDrugInfo(drugs[0], language)
  }

  if (drugs.length < 2) {
    const error = new Error("Add at least two medicines to check interactions.")
    error.statusCode = 400
    throw error
  }

  const csvMatches = findCsvInteractions(drugs)
  const curatedMatches = findCuratedRules(drugs)
  const openFdaSignals = (await Promise.all(drugs.slice(0, 4).map(fetchOpenFdaSignal))).filter(Boolean)

  const interactions = uniqueInteractions([...curatedMatches, ...csvMatches, ...openFdaSignals]).map((interaction) => ({
    ...interaction,
    riskPercentage: scoreInteraction({
      severity: interaction.severity,
      age: payload.age,
      renalImpairment: payload.renalImpairment,
    }),
  }))

  return {
    normalizedDrugs: drugs,
    interactions,
    sourceSummary: "Curated rules + CSV dataset + OpenFDA FAERS signal lookup",
    coverageNotice:
      "OpenFDA FAERS is an adverse-event signal source, not a complete drug-drug interaction database. Treat results as decision support and verify clinically.",
  }
}
