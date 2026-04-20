import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { analyzeBloodReportWithOpenAI } from "./openaiService.js"
import { normalizeTestName, statusForValue } from "../utils/normalizeBloodValues.js"
import { extractReportText } from "../utils/reportTextExtractor.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ranges = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../data/blood_reference_ranges.json"), "utf8"))

const resultRowPatterns = {
  hemoglobin: [/Hemoglobin\s+(?:Spectrophotometry\s+SLS\s+)?([<>]?\s*\d+(?:\.\d+)?)/i],
  rbc: [/\bR\.?\s*B\.?\s*C\.?(?:\s+Count)?(?:\s+Electrical\s+Impedance)?\s+([<>]?\s*\d+(?:\.\d+)?)/i],
  hematocrit: [/\b(?:HEMATOCRIT|HCT|PCV)(?:\s*\(PCV\))?\s+([<>]?\s*\d+(?:\.\d+)?)/i],
  mcv: [/\bMCV\s+([<>]?\s*\d+(?:\.\d+)?)/i],
  mch: [/\bMCH\s+([<>]?\s*\d+(?:\.\d+)?)/i],
  mchc: [/\bMCHC\s+([<>]?\s*\d+(?:\.\d+)?)/i],
  rdw: [/RDW-CV(?:\s+Calculated)?\s+([<>]?\s*\d+(?:\.\d+)?)/i],
  wbc: [/\bW\.?\s*B\.?\s*C\.?(?:\/TLC)?(?:\s+Count)?(?:\s+Electrical\s+Impedance)?\s+([<>]?\s*\d+(?:\.\d+)?)/i],
  platelets: [/(?:Platelet|Platelate)\s+Count(?:\s+Electrical\s+Impedance)?\s+([<>]?\s*\d+(?:\.\d+)?)/i, /\bPLT\b\s+([<>]?\s*\d+(?:\.\d+)?)/i],
  glucose: [/Glucose\s*-\s*Random\s+([<>]?\s*\d+(?:\.\d+)?)/i, /\bGlucose\b\s+([<>]?\s*\d+(?:\.\d+)?)/i],
  hba1c: [/\bHbA1c\b\s+([<>]?\s*\d+(?:\.\d+)?)/i],
  creatinine: [/Creatinine\s+([<>]?\s*\d+(?:\.\d+)?)/i],
  alt: [/\bALT\b\s+([<>]?\s*\d+(?:\.\d+)?)/i, /\bSGPT\b\s+([<>]?\s*\d+(?:\.\d+)?)/i],
  ast: [/\bAST\b\s+([<>]?\s*\d+(?:\.\d+)?)/i, /\bSGOT\b\s+([<>]?\s*\d+(?:\.\d+)?)/i],
  cholesterol: [/Cholesterol\s+([<>]?\s*\d+(?:\.\d+)?)/i],
  triglycerides: [/Triglycerides\s+([<>]?\s*\d+(?:\.\d+)?)/i],
  tsh: [/\bT\.?\s*S\.?\s*H\)?\s+([<>]?\s*\d+(?:\.\d+)?)/i],
  ft4: [/\bF\.?\s*T\.?\s*4\b\s+([<>]?\s*\d+(?:\.\d+)?)/i],
  "vitamin d": [/Serum\s+vitamin\s+D\s+([<>]?\s*\d+(?:\.\d+)?)/i, /25\s*(?:OH|Hydroxy)\s*Vitamin\s*D\s+([<>]?\s*\d+(?:\.\d+)?)/i],
  "vitamin b12": [/Serum\s+Vitamin\s+B12\s+([<>]?\s*\d+(?:\.\d+)?)/i],
  esr: [/\bE\.?\s*S\.?\s*R\.?\s+(?:Westegren`s\s+Method\s+)?([<>]?\s*\d+(?:\.\d+)?)/i],
  crp: [/CRP-\s*Quantitative\s+([<>]?\s*\d+(?:\.\d+)?)/i, /C\s*Reactive\s*Protein.*?([<>]?\s*\d+(?:\.\d+)?)/i],
  calcium: [/Serum\s+Calcium\s+([<>]?\s*\d+(?:\.\d+)?)/i],
  "uric acid": [/Uric\s+acid\s+([<>]?\s*\d+(?:\.\d+)?)/i],
  "ra factor": [/R\.?\s*A\.?\s*Factor\s+(NEGATIVE|POSITIVE|[<>]?\s*\d+(?:\.\d+)?)/i],
}

function labels(language) {
  if (language === "hi") {
    return {
      summary: "रिपोर्ट में कुछ असामान्य मान मिले हैं। नीचे उनका आसान और विस्तृत सारांश दिया गया है।",
      normalSummary: "मिले हुए मान configured reference range में हैं।",
      noValues: "रिपोर्ट पढ़ी गई, लेकिन supported blood markers साफ़ नहीं मिले। अगर image low-quality है तो मुख्य values paste करें।",
      prevention: "पानी पर्याप्त पिएं, संतुलित भोजन लें, आराम करें, symptoms note करें और doctor द्वारा बताई गई repeat जांच कराएं।",
      cure: "इलाज सही diagnosis पर निर्भर करता है। इस report को qualified doctor को दिखाकर targeted treatment लें।",
      remedies: "घर पर supportive care में hydration, rest, balanced diet और injury से बचाव रखें। abnormal result पर self-medication न करें।",
      cause: "संभावित कारणों में nutrition की कमी, infection/inflammation, autoimmune tendency, metabolic problem या medicine effect शामिल हो सकते हैं।",
      medicine: "इस screen से prescription दवा शुरू न करें। Doctor diagnosis confirm करके supplement, thyroid treatment, infection workup या दूसरी medicine तय करेंगे।",
    }
  }

  return {
    summary: "Abnormal values were detected and converted into practical risk guidance.",
    normalSummary: "The values found are within the configured reference ranges.",
    noValues: "The report was read, but no supported blood markers were detected. Paste key values if the upload is a scanned or low-quality file.",
    prevention: "Maintain hydration, balanced meals, sleep, exercise, and follow repeat-testing advice from your clinician.",
    cure: "Treatment depends on the confirmed diagnosis. Share this report with a qualified clinician for targeted care.",
    remedies: "Use diet, hydration, rest, and symptom tracking as supportive care. Avoid self-medicating for abnormal results.",
    cause: "Possible causes include nutrition gaps, infection, inflammation, metabolic disease, organ stress, or medication effects.",
    medicine: "Do not start prescription medicines from this screen. A clinician may consider supplements, antibiotics, diabetes therapy, thyroid treatment, or other medicine based on diagnosis.",
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function testNamePattern(name) {
  return name
    .split("")
    .map((char) => (/[a-z0-9]/i.test(char) ? escapeRegex(char) : "[\\s.\\-_]*"))
    .join("[\\s.\\-_]*")
}

function firstNumberAfterRemovingTestName(line, names) {
  let cleaned = line
  names.forEach((name) => {
    cleaned = cleaned.replace(new RegExp(testNamePattern(name), "ig"), " ")
  })
  return cleaned.match(/([<>]?\s*\d+(?:\.\d+)?)/)
}

function valueFromSpecificPattern(test, text) {
  const patterns = resultRowPatterns[test] || []

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (!match) continue
    if (/negative/i.test(match[1])) return 0
    if (/positive/i.test(match[1])) return Number.POSITIVE_INFINITY

    const value = Number(match[1].replace(/[<>\s]/g, ""))
    if (!Number.isNaN(value)) return value
  }

  return null
}

function normalizeMeasuredValue(test, value) {
  if (test === "platelets" && value > 0 && value < 10) return value * 100000
  if (test === "platelets" && value > 10 && value < 1000) return value * 1000
  if (test === "wbc" && value > 1 && value < 100) return value * 1000
  if (test === "mchc" && value > 100) return value / 10
  return value
}

function findRangesInText(text) {
  const findings = []
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)

  Object.entries(ranges).forEach(([test, range]) => {
    const names = [test, ...(range.aliases || [])]
    const specificValue = valueFromSpecificPattern(test, text)

    if (specificValue !== null) {
      const value = normalizeMeasuredValue(test, specificValue)
      findings.push({ test, value, unit: range.unit, status: statusForValue(value, range), min: range.min, max: range.max })
      return
    }

    const matchedLine = lines.find((line) => names.some((name) => normalizeTestName(line).includes(normalizeTestName(name))))
    const searchText = matchedLine || text
    const normalizedSearchText = normalizeTestName(searchText)
    const matchedName = names.find((name) => normalizedSearchText.includes(normalizeTestName(name)))
    if (!matchedName) return

    const namePattern = testNamePattern(matchedName)
    const afterNamePattern = new RegExp(`${namePattern}.{0,80}?([<>]?\\s*\\d+(?:\\.\\d+)?)`, "i")
    const directPattern = new RegExp(`${namePattern}\\s*[:=-]?\\s*([<>]?\\s*\\d+(?:\\.\\d+)?)`, "i")
    const match = searchText.match(directPattern) || searchText.match(afterNamePattern)
    const numberFromLine = matchedLine ? firstNumberAfterRemovingTestName(matchedLine, names) : null
    const rawValue = match?.[1] || numberFromLine?.[1]
    if (!rawValue) return

    const value = normalizeMeasuredValue(test, Number(rawValue.replace(/[<>\s]/g, "")))
    findings.push({ test, value, unit: range.unit, status: statusForValue(value, range), min: range.min, max: range.max })
  })

  return findings
}

function textPreview(text) {
  return text.replace(/\s+/g, " ").trim().slice(0, 1200)
}

function formatRange(finding) {
  return `${finding.min}-${finding.max} ${finding.unit}`
}

function isVeryLow(finding) {
  if (finding.status !== "low") return false
  if (finding.test === "platelets") return finding.value < 80000
  if (finding.test === "hemoglobin") return finding.value < 8
  if (finding.test === "vitamin d") return finding.value < 12
  return finding.value < finding.min * 0.7
}

function titleForFinding(finding, language) {
  if (language === "hi") {
    const hi = {
      hemoglobin: "Hemoglobin कम",
      mch: "MCH कम",
      mchc: "MCHC कम",
      platelets: isVeryLow(finding) ? "Platelets बहुत कम (मुख्य चिंता)" : "Platelets कम",
      esr: "ESR ज्यादा (सूजन/इन्फेक्शन का संकेत)",
      crp: "CRP ज्यादा (inflammation marker)",
      "ra factor": "RA Factor ज्यादा",
      tsh: "Thyroid में गड़बड़ी की संभावना",
      ft4: "FT4 कम (thyroid hormone)",
      "vitamin d": "Vitamin D की गंभीर कमी",
      rbc: "RBC कम",
      rdw: "RDW ज्यादा",
    }
    return hi[finding.test] || `${finding.test} ${finding.status === "high" ? "ज्यादा" : "कम"}`
  }

  if (finding.test === "platelets" && isVeryLow(finding)) return "Very Low Platelets (Major Concern)"
  if (finding.test === "esr" && finding.status === "high") return "High ESR (Inflammation)"
  if (finding.test === "crp" && finding.status === "high") return "Mild Inflammation Marker High"
  if (finding.test === "vitamin d" && isVeryLow(finding)) return "Severe Vitamin D Deficiency"
  if (finding.test === "tsh" && finding.status === "high") return "Thyroid Problem (Needs Review)"
  if (finding.test === "ft4" && finding.status === "low") return "Low FT4 (Thyroid Hormone)"
  if (finding.test === "rbc" && finding.status === "low") return "Low RBC (Mild Anemia Tendency)"
  if (finding.test === "rdw" && finding.status === "high") return "High RDW"
  return `${finding.status === "high" ? "High" : "Low"} ${finding.test}`
}

function meaningForFinding(finding, findings, language) {
  if (language === "hi") {
    if (finding.test === "platelets") {
      return [
        "Platelets कम होने पर चोट लगने, नाक/मसूड़ों से खून आने, ज्यादा bruising या bleeding का risk बढ़ सकता है।",
        "संभावित कारण: viral infection, dengue/viral fever, vitamin deficiency, autoimmune problem, कुछ medicines का effect या bone marrow से जुड़ी समस्या।",
        "अगर fever, body pain, rash, bleeding, बहुत कमजोरी या चक्कर हों तो doctor को जल्दी दिखाना चाहिए।",
      ]
    }
    if (finding.test === "hemoglobin") {
      return [
        "Hemoglobin कम होने से oxygen carrying capacity कम हो सकती है, जिससे कमजोरी, थकान, चक्कर या सांस फूलना हो सकता है।",
        "संभावित कारण: iron deficiency, B12/folate deficiency, blood loss, chronic illness या nutrition gap।",
        "Doctor CBC के साथ iron profile, B12/folate या repeat test सलाह दे सकते हैं।",
      ]
    }
    if (finding.test === "mch" || finding.test === "mchc") {
      return [
        `${finding.test.toUpperCase()} कम होना RBC में hemoglobin content कम होने का संकेत दे सकता है।`,
        "संभावित कारण: iron deficiency या nutrition-related anemia pattern। अकेले इससे diagnosis confirm नहीं होता।",
        "Doctor hemoglobin, RBC indices और symptoms देखकर iron studies/B12/folate test की सलाह दे सकते हैं।",
      ]
    }
    if (finding.test === "esr" || finding.test === "crp") {
      return [
        `${finding.test.toUpperCase()} ज्यादा होना शरीर में inflammation या infection का संकेत हो सकता है।`,
        "यह marker nonspecific है; इससे exact बीमारी पता नहीं चलती। Symptoms और examination के साथ interpret करना पड़ता है।",
        "Fever, joint pain, swelling, cough, urinary symptoms या लगातार कमजोरी हो तो physician review जरूरी है।",
      ]
    }
    if (finding.test === "ra factor") {
      return [
        "RA Factor ज्यादा होने पर rheumatoid arthritis या autoimmune tendency की possibility देखी जाती है।",
        "यह test अकेले diagnosis confirm नहीं करता। Joint pain, swelling या morning stiffness हो तो यह ज्यादा important है।",
        "Doctor symptoms के अनुसार anti-CCP, ESR/CRP repeat या rheumatology review सलाह दे सकते हैं।",
      ]
    }
    if (finding.test === "tsh") {
      const ft4 = findings.find((item) => item.test === "ft4")
      if (finding.status === "high" && ft4?.status === "low") {
        return ["TSH ज्यादा और FT4 कम होना hypothyroidism pattern का संकेत हो सकता है।", "Symptoms में थकान, weight gain, hair fall, constipation, dry skin और ठंड लगना शामिल हो सकते हैं।", "Doctor thyroid profile repeat करके treatment की जरूरत तय करेंगे।"]
      }
      return ["TSH abnormal है, जो thyroid imbalance का संकेत हो सकता है।", "Doctor FT4/FT3 और symptoms के साथ इसे interpret करेंगे।"]
    }
    if (finding.test === "vitamin d") {
      return ["Vitamin D कम होने से body pain, muscle weakness, fatigue और bone health पर असर हो सकता है।", "संभावित कारण: धूप कम मिलना, dietary कमी, absorption problem या लंबे समय से deficiency।", "Doctor vitamin D supplement plan और follow-up test की सलाह दे सकते हैं।"]
    }
    return ["यह value reference range से बाहर है।", "इसे symptoms, age, medical history और बाकी reports के साथ doctor द्वारा review करना चाहिए।"]
  }

  if (finding.test === "platelets") return ["Risk of bleeding or easy bruising.", "Can be associated with viral infection, vitamin deficiency, autoimmune causes, medicine effects, or bone marrow issues.", "This needs doctor attention as soon as possible."]
  if (finding.test === "hemoglobin") {
    return [
      "Hemoglobin is low, which means the blood may carry less oxygen than expected.",
      "Common possible causes include iron deficiency, vitamin B12 or folate deficiency, blood loss, chronic inflammation, kidney-related issues, or poor nutrition.",
      "A doctor may correlate this with symptoms like fatigue, dizziness, breathlessness, paleness, heavy periods, or weakness and may advise iron profile, B12/folate, stool occult blood, or repeat CBC.",
    ]
  }
  if (finding.test === "mch") {
    return [
      "MCH is low, meaning each red blood cell may be carrying less hemoglobin than expected.",
      "This pattern is commonly associated with iron deficiency or microcytic anemia patterns, but it needs correlation with MCV, hemoglobin, ferritin, and clinical history.",
      "A doctor may evaluate iron studies, diet, blood loss history, and repeat CBC if needed.",
    ]
  }
  if (finding.test === "mchc") {
    return [
      "MCHC is low, which can suggest red blood cells are less concentrated with hemoglobin.",
      "Possible causes include iron deficiency, anemia of chronic disease, or other nutritional anemia patterns. OCR/lab variation should also be considered if the report image is unclear.",
      "A doctor may review RBC indices together and may advise ferritin, iron/TIBC, B12, folate, or peripheral smear depending on symptoms.",
    ]
  }
  if (finding.test === "esr" || finding.test === "crp") return ["This can indicate inflammation or infection in the body.", "It is nonspecific, so symptoms and examination matter."]
  if (finding.test === "ra factor") {
    return [
      "RA Factor is high, which can be seen in rheumatoid arthritis or other autoimmune/inflammatory conditions.",
      "A high RA Factor alone does not confirm rheumatoid arthritis. It matters more if there is joint pain, swelling, morning stiffness, or raised inflammation markers.",
      "A doctor may evaluate symptoms and may advise anti-CCP, ESR/CRP repeat, ANA, or rheumatology review if clinically needed.",
    ]
  }
  if (finding.test === "vitamin d") return ["This can be associated with weak bones, body pain, muscle weakness, and fatigue.", "A doctor may evaluate vitamin D replacement and follow-up testing."]
  if (finding.test === "rbc") return ["This may point toward an anemia tendency.", "A doctor may evaluate iron, B12, folate, and bleeding history if needed."]
  if (finding.test === "rdw") return ["This indicates variation in RBC size.", "It is often seen with nutritional deficiency patterns such as iron or B12 deficiency, but it is not a diagnosis by itself."]
  if (finding.test === "glucose") return ["This may indicate altered sugar control.", "A doctor may correlate this with fasting status and HbA1c."]
  return ["This value is outside the configured reference range.", "It should be reviewed with symptoms and medical history."]
}

function buildHumanSummary({ findings, abnormal, language }) {
  const normal = findings.filter((item) => item.status === "normal")
  const mildTests = new Set(["rbc", "rdw", "crp"])
  const borderline = abnormal.filter((item) => mildTests.has(item.test))
  const important = abnormal.filter((item) => !borderline.includes(item))
  const topIssues = []

  if (abnormal.some((item) => item.test === "platelets")) topIssues.push(language === "hi" ? "Platelets कम" : "Low platelets")
  if (abnormal.some((item) => item.test === "hemoglobin" || item.test === "mch" || item.test === "mchc")) topIssues.push(language === "hi" ? "Anemia/nutrition pattern" : "Anemia/nutritional pattern")
  if (abnormal.some((item) => item.test === "ra factor")) topIssues.push(language === "hi" ? "RA Factor ज्यादा" : "High RA factor")
  if (abnormal.some((item) => item.test === "esr" || item.test === "crp")) topIssues.push(language === "hi" ? "Inflammation marker ज्यादा" : "Inflammation marker elevation")
  if (abnormal.some((item) => item.test === "tsh" || item.test === "ft4")) topIssues.push(language === "hi" ? "Thyroid imbalance" : "Thyroid imbalance")
  if (abnormal.some((item) => item.test === "vitamin d")) topIssues.push(language === "hi" ? "Vitamin D deficiency" : "Vitamin D deficiency")

  return {
    intro: language === "hi" ? "यह आपकी रिपोर्ट का आसान भाषा में विस्तृत सारांश है। इसमें abnormal values, उनके संभावित कारण और आगे क्या करना चाहिए बताया गया है।" : "Here is a clear, human-friendly summary of what the detected values may mean.",
    importantFindings: important.map((finding) => ({
      title: titleForFinding(finding, language),
      test: finding.test,
      value: `${finding.value} ${finding.unit}`,
      normalRange: formatRange(finding),
      status: finding.status,
      meaning: meaningForFinding(finding, findings, language),
    })),
    borderlineFindings: borderline.map((finding) => ({
      title: titleForFinding(finding, language),
      value: `${finding.value} ${finding.unit}`,
      note: meaningForFinding(finding, findings, language)[0],
    })),
    normalFindings: normal
      .filter((item) => ["hemoglobin", "rbc", "hematocrit", "mcv", "wbc", "glucose", "calcium", "uric acid", "vitamin b12", "ra factor"].includes(item.test))
      .map((finding) => `${finding.test}: ${finding.value} ${finding.unit} (${language === "hi" ? "ठीक" : "OK"})`),
    overallInterpretation: topIssues.length
      ? language === "hi"
        ? [`इस रिपोर्ट में मुख्य रूप से ये संकेत दिख रहे हैं: ${topIssues.join(", ")}.`, "ये report-based संकेत हैं, final diagnosis नहीं। Doctor symptoms और examination के साथ confirm करेंगे।"]
        : [`This report mainly suggests: ${topIssues.join(", ")}.`, "These are report-based signals and need clinical correlation, not a final diagnosis."]
      : [language === "hi" ? "Supported values में कोई बड़ा abnormal pattern नहीं दिखा।" : "No major abnormal pattern was detected from the supported values."],
    whatToDo:
      language === "hi"
        ? ["Doctor/physician से report review कराएं, खासकर platelet, hemoglobin/MCH/MCHC, ESR और RA Factor के लिए।", "Doctor symptoms के अनुसार repeat CBC, ESR/CRP repeat, RA/anti-CCP या infection workup सलाह दे सकते हैं।", "अगर fever, joint pain, swelling, bleeding, बहुत कमजोरी या चक्कर हों तो जल्दी medical help लें।"]
        : ["Consult a physician if symptoms are present or values remain abnormal.", "A doctor may advise repeat CBC or targeted tests based on symptoms."],
    simpleAdvice:
      language === "hi"
        ? ["चोट लगने से बचें और aspirin/blood-thinning painkiller बिना doctor advice न लें।", "पानी पर्याप्त पिएं, balanced diet लें, आराम करें और symptoms note करें।", "Iron-rich foods जैसे green vegetables, pulses, jaggery/til, nuts आदि diet में doctor/dietician advice के अनुसार रखें।"]
        : ["Maintain balanced meals, hydration, rest, and follow-up testing."],
    finalNote:
      language === "hi"
        ? "यह report पूरी तरह normal नहीं है, लेकिन सही समय पर doctor review और treatment से कई issues manage हो सकते हैं। सबसे पहले platelet, anemia pattern/inflammation markers और RA Factor को doctor से discuss करें।"
        : abnormal.length
          ? "This is not a normal report, but many issues are manageable when reviewed and treated early. The most urgent abnormal value should be discussed with a doctor first."
          : "This report looks mostly reassuring for the supported values, but a doctor should review it if symptoms are present.",
  }
}

function labelsBetter(language) {
  if (language === "hi") {
    return {
      summary: "रिपोर्ट में कुछ असामान्य मान मिले हैं। नीचे उनका सरल और उपयोगी सारांश दिया गया है।",
      normalSummary: "मिले हुए मान configured reference range में हैं।",
      noValues: "रिपोर्ट पढ़ी गई, लेकिन supported blood markers साफ नहीं मिले। अगर image low-quality है तो मुख्य values paste करें।",
      prevention: "पर्याप्त पानी पिएं, संतुलित भोजन लें, आराम करें, symptoms note करें और doctor की repeat testing advice follow करें।",
      cure: "इलाज सही diagnosis पर निर्भर करता है। Report को qualified doctor को दिखाकर targeted care लें।",
      remedies: "Hydration, rest, balanced diet और injury से बचाव रखें। Abnormal result पर self-medication न करें।",
      cause: "संभावित कारणों में nutrition gap, infection/inflammation, thyroid imbalance, autoimmune tendency, metabolic problem या medicine effect शामिल हो सकते हैं।",
      medicine: "इस screen से prescription दवा शुरू न करें। Doctor diagnosis confirm करके supplement, thyroid treatment, infection workup या दूसरी medicine तय करेंगे।",
    }
  }

  return {
    summary: "Abnormal values were detected and converted into practical risk guidance.",
    normalSummary: "The values found are within the configured reference ranges.",
    noValues: "The report was read, but no supported blood markers were detected. Paste key values if the upload is a scanned or low-quality file.",
    prevention: "Maintain hydration, balanced meals, sleep, exercise, and follow repeat-testing advice from your clinician.",
    cure: "Treatment depends on the confirmed diagnosis. Share this report with a qualified clinician for targeted care.",
    remedies: "Use diet, hydration, rest, and symptom tracking as supportive care. Avoid self-medicating for abnormal results.",
    cause: "Possible causes include nutrition gaps, infection, inflammation, thyroid imbalance, metabolic disease, organ stress, or medication effects.",
    medicine: "Do not start prescription medicines from this screen. A clinician may consider supplements, infection workup, diabetes care, thyroid treatment, or other medicine based on diagnosis.",
  }
}

function titleBetter(finding, language) {
  const high = finding.status === "high"
  if (language === "hi") {
    const direction = high ? "ज्यादा" : "कम"
    const titles = {
      hemoglobin: `Hemoglobin ${direction}`,
      rbc: `RBC ${direction}`,
      hematocrit: `Hematocrit ${direction}`,
      mcv: `MCV ${direction}`,
      mch: `MCH ${direction}`,
      mchc: `MCHC ${direction}`,
      rdw: `RDW ${direction}`,
      wbc: `WBC ${direction}`,
      platelets: isVeryLow(finding) ? "Platelets बहुत कम (मुख्य चिंता)" : `Platelets ${direction}`,
      glucose: `Glucose ${direction}`,
      hba1c: `HbA1c ${direction}`,
      creatinine: `Creatinine ${direction}`,
      alt: `ALT/SGPT ${direction}`,
      ast: `AST/SGOT ${direction}`,
      cholesterol: `Cholesterol ${direction}`,
      triglycerides: `Triglycerides ${direction}`,
      tsh: "Thyroid problem (review needed)",
      ft4: `FT4 ${direction} (thyroid hormone)`,
      "vitamin d": isVeryLow(finding) ? "Vitamin D की गंभीर कमी" : `Vitamin D ${direction}`,
      "vitamin b12": `Vitamin B12 ${direction}`,
      esr: "ESR ज्यादा (inflammation/infection signal)",
      crp: "CRP ज्यादा (inflammation marker)",
      calcium: `Calcium ${direction}`,
      "uric acid": `Uric acid ${direction}`,
      "ra factor": `RA Factor ${direction}`,
    }
    return titles[finding.test] || `${finding.test} ${direction}`
  }

  const direction = high ? "High" : "Low"
  const titles = {
    platelets: isVeryLow(finding) ? "Very Low Platelets (Major Concern)" : `${direction} Platelets`,
    esr: "High ESR (Inflammation)",
    crp: "High CRP (Inflammation Marker)",
    tsh: "Thyroid Problem (Needs Review)",
    ft4: `${direction} FT4 (Thyroid Hormone)`,
    "vitamin d": isVeryLow(finding) ? "Severe Vitamin D Deficiency" : `${direction} Vitamin D`,
    "ra factor": `${direction} RA Factor`,
    "uric acid": `${direction} Uric Acid`,
  }
  return titles[finding.test] || `${direction} ${finding.test}`
}

function englishMeaning(finding, findings) {
  const tshWithLowFt4 = finding.test === "tsh" && finding.status === "high" && findings.some((item) => item.test === "ft4" && item.status === "low")
  const text = {
    hemoglobin: ["Hemoglobin is low, so the blood may carry less oxygen than expected. This can cause tiredness, dizziness, breathlessness, paleness, or weakness.", "Common possible causes include iron deficiency, vitamin B12/folate deficiency, blood loss, chronic inflammation, kidney-related illness, or nutrition gaps.", "A doctor may review symptoms and may advise iron profile, ferritin, B12/folate, stool occult blood, or repeat CBC."],
    rbc: ["RBC is outside range, which can point toward anemia, dehydration, blood loss, or a marrow/nutrition pattern depending on whether it is low or high.", "Low RBC is commonly linked with iron/B12/folate deficiency or blood loss. High RBC can occur with dehydration, smoking, lung disease, or high-altitude adaptation.", "A doctor interprets RBC together with hemoglobin, MCV, MCH, RDW, symptoms, and repeat CBC."],
    hematocrit: ["Hematocrit shows the percentage of blood volume made up by red blood cells.", "Low hematocrit may occur with anemia, blood loss, or nutritional deficiency. High hematocrit may occur with dehydration, smoking, lung disease, or excess red-cell production.", "A doctor may compare it with hemoglobin/RBC and symptoms before deciding further tests."],
    mcv: ["MCV shows average red blood cell size. Low MCV can suggest smaller cells; high MCV can suggest larger cells.", "Low MCV is often seen with iron deficiency or thalassemia trait. High MCV can occur with B12/folate deficiency, liver disease, alcohol use, thyroid disease, or some medicines.", "A doctor may advise iron studies, B12/folate, peripheral smear, or repeat CBC based on the full pattern."],
    mch: ["MCH is low, meaning each red blood cell may be carrying less hemoglobin than expected.", "This pattern is commonly associated with iron deficiency or microcytic anemia patterns, but it must be checked with MCV, hemoglobin, ferritin, and history.", "A doctor may evaluate iron studies, diet, blood loss history, and repeat CBC if needed."],
    mchc: ["MCHC is low, which can suggest red blood cells are less concentrated with hemoglobin.", "Possible causes include iron deficiency, anemia of chronic disease, or other nutritional anemia patterns.", "A doctor may review RBC indices together and may advise ferritin, iron/TIBC, B12, folate, or peripheral smear."],
    rdw: ["RDW shows variation in red blood cell size. A high value means the cells are not uniform in size.", "This is often seen with iron deficiency, B12/folate deficiency, recent blood loss, or recovery after anemia treatment.", "A doctor may compare RDW with hemoglobin, MCV, MCH, ferritin, B12, and folate."],
    wbc: ["WBC reflects immune cells. Abnormal WBC can point toward infection, inflammation, stress response, allergy, medicine effect, or bone marrow issues.", "High WBC is often seen with infection or inflammation. Low WBC can occur with viral illness, some medicines, autoimmune conditions, or marrow suppression.", "A doctor may review fever, symptoms, differential count, and may repeat CBC if needed."],
    platelets: ["Low platelets can increase the risk of easy bruising, bleeding from nose/gums, heavy bleeding, or tiny red spots on skin.", "Possible causes include viral infection such as dengue, vitamin deficiency, autoimmune platelet destruction, medicine effects, liver/spleen disease, or bone marrow problems.", "This needs doctor attention soon, especially with fever, rash, bleeding, severe weakness, dizziness, or very low platelets."],
    glucose: ["Glucose outside range can indicate altered blood sugar control, but interpretation depends on fasting/random/post-meal timing.", "High glucose may be related to diabetes, stress illness, steroids, infection, or recent food intake. Low glucose may occur with missed meals, diabetes medicines, alcohol, or hormonal problems.", "A doctor may advise fasting glucose, post-meal glucose, HbA1c, and symptom review."],
    hba1c: ["HbA1c estimates average blood sugar over about 2-3 months.", "High HbA1c can suggest diabetes or poor sugar control. Low HbA1c can sometimes occur with anemia, recent blood loss, or altered red-cell lifespan.", "A doctor may correlate HbA1c with glucose readings, symptoms, and anemia status."],
    creatinine: ["Creatinine is used to estimate kidney filtration and muscle-related waste clearance.", "High creatinine can be linked with dehydration, kidney disease, urinary obstruction, medicine effects, or muscle injury. Low creatinine is often related to low muscle mass or pregnancy.", "A doctor may check eGFR, urine routine, blood pressure, hydration status, and medicines."],
    alt: ["ALT/SGPT is a liver enzyme. A high value can suggest liver cell irritation or injury.", "Possible causes include fatty liver, viral hepatitis, alcohol, medicines, supplements, infection, muscle injury, or metabolic disease.", "A doctor may review symptoms and may advise repeat LFT, bilirubin, viral markers, ultrasound, and medicine/alcohol review."],
    ast: ["AST/SGOT can rise with liver irritation, muscle injury, alcohol-related liver stress, or some medicines.", "It is interpreted with ALT, bilirubin, alkaline phosphatase, symptoms, alcohol history, and medicines.", "A doctor may advise repeat LFT, CK if muscle injury is suspected, viral markers, or ultrasound."],
    cholesterol: ["High cholesterol can increase long-term heart and blood-vessel risk.", "Possible contributors include diet, genetics, thyroid disease, diabetes, obesity, kidney disease, or low physical activity.", "A doctor may review full lipid profile, blood pressure, diabetes risk, thyroid status, and family history."],
    triglycerides: ["High triglycerides are a blood-fat abnormality and can increase heart risk; very high levels can irritate the pancreas.", "Possible causes include high sugar/refined-carb intake, alcohol, diabetes, obesity, thyroid disease, kidney disease, genetics, or some medicines.", "A doctor may advise fasting lipid profile, sugar testing, thyroid review, and diet/lifestyle planning."],
    tsh: tshWithLowFt4 ? ["High TSH together with low FT4 can suggest a hypothyroidism pattern, meaning the thyroid may not be producing enough hormone.", "Possible causes include autoimmune thyroid disease, iodine imbalance, thyroid inflammation, previous thyroid treatment, or some medicines.", "A doctor may repeat thyroid profile, check anti-TPO if needed, and decide whether thyroid treatment is required."] : ["TSH outside range suggests the thyroid control signal is abnormal.", "High TSH can be seen in hypothyroidism or early thyroid underactivity. Low TSH can be seen in hyperthyroidism, thyroid medicine excess, or thyroid inflammation.", "A doctor should interpret it with FT4/FT3, symptoms, pregnancy status, and medicines."],
    ft4: ["FT4 is the active thyroid hormone level. Low FT4 can support thyroid underactivity, especially when TSH is high.", "Possible causes include autoimmune thyroid disease, thyroid inflammation, pituitary-related issues, iodine imbalance, or medicine effects.", "A doctor may repeat TSH/FT4 and decide treatment based on symptoms and the full thyroid pattern."],
    "vitamin d": ["Vitamin D deficiency can be associated with body pain, weak bones, muscle weakness, fatigue, and low calcium absorption.", "Common causes include low sunlight exposure, low dietary intake, darker skin with limited sun, obesity, gut absorption problems, liver/kidney disease, or certain medicines.", "A doctor may advise vitamin D replacement, calcium review, sunlight/diet guidance, and follow-up testing."],
    "vitamin b12": ["Vitamin B12 outside range can affect nerves and red blood cell formation.", "Low B12 can occur with vegetarian diet, poor absorption, gastritis, metformin/acid-suppressing medicines, or gut disease.", "A doctor may review tingling, numbness, memory issues, fatigue, and may advise B12 replacement or further tests."],
    esr: ["ESR is high, which can indicate inflammation or infection somewhere in the body.", "It is nonspecific and can rise with infections, autoimmune disease, anemia, chronic inflammation, kidney disease, or age-related factors.", "A doctor should correlate it with fever, pain, swelling, weight loss, CRP, CBC, and physical examination."],
    crp: ["CRP is an inflammation marker. A high value means the body may be reacting to inflammation or infection.", "Possible causes include bacterial/viral infection, autoimmune flare, tissue injury, dental/urinary/chest infection, or chronic inflammatory disease.", "A doctor may use symptoms, examination, CBC, ESR, urine/chest tests, or repeat CRP to find the source."],
    calcium: ["Calcium outside range can affect bones, muscles, nerves, and heart rhythm.", "Low calcium may be related to vitamin D deficiency, low albumin, kidney disease, or parathyroid problems. High calcium can occur with dehydration, parathyroid disease, excess supplements, or some cancers.", "A doctor may recheck corrected calcium, vitamin D, kidney function, phosphate, magnesium, and PTH if needed."],
    "uric acid": ["Uric acid outside range reflects purine metabolism and kidney handling of uric acid.", "High uric acid can be linked with gout, kidney stones, dehydration, kidney disease, high-purine diet, alcohol, obesity, or some medicines. Low uric acid can occur with low protein intake, some medicines, liver disease, or kidney tubular handling changes.", "A doctor may correlate it with joint pain, swelling, kidney symptoms, diet, medicines, and kidney function."],
    "ra factor": ["RA Factor is high, which can be seen in rheumatoid arthritis or other autoimmune/inflammatory conditions.", "A high RA Factor alone does not confirm rheumatoid arthritis. It matters more with joint pain, swelling, morning stiffness, or raised inflammation markers.", "A doctor may evaluate symptoms and may advise anti-CCP, ESR/CRP repeat, ANA, or rheumatology review if clinically needed."],
  }

  return text[finding.test] || [`${finding.test} is ${finding.status}, so it is outside the reference range shown in the report.`, "Possible causes depend on the exact test and can include nutrition gaps, infection, inflammation, organ stress, medicine effects, dehydration, or chronic illness.", "A doctor should review it with symptoms, age, medical history, medicines, and related tests before deciding treatment."]
}

function buildSummary({ findings, abnormal, copy }) {
  if (!findings.length) return copy.noValues
  return abnormal.length ? copy.summary : copy.normalSummary
}

function deviationRatio(finding) {
  if (finding.status === "low" && finding.min > 0) return Math.max(0, (finding.min - finding.value) / finding.min)
  if (finding.status === "high" && finding.max > 0) return Math.max(0, (finding.value - finding.max) / finding.max)
  if (finding.status === "high") return finding.value > finding.max ? 0.35 : 0
  return 0
}

function genericRiskPoints(finding) {
  const ratio = deviationRatio(finding)
  if (ratio >= 0.75) return 24
  if (ratio >= 0.45) return 18
  if (ratio >= 0.2) return 12
  return 7
}

function findingRiskPoints(finding, findings) {
  if (finding.status === "normal") return 0

  if (finding.test === "platelets") {
    if (finding.value < 50000) return 48
    if (finding.value < 80000) return 38
    if (finding.value < 100000) return 30
    if (finding.value < 150000) return 16
    return 10
  }

  if (finding.test === "hemoglobin") {
    if (finding.value < 7) return 46
    if (finding.value < 9) return 32
    if (finding.value < 11) return 16
    return 10
  }

  if (finding.test === "glucose") {
    if (finding.status === "low" && finding.value < 55) return 42
    if (finding.status === "high" && finding.value > 300) return 42
    if (finding.status === "high" && finding.value > 200) return 30
    return 16
  }

  if (finding.test === "tsh") {
    const lowFt4 = findings.some((item) => item.test === "ft4" && item.status === "low")
    return lowFt4 ? 22 : genericRiskPoints(finding)
  }

  if (finding.test === "ft4") return findings.some((item) => item.test === "tsh" && item.status !== "normal") ? 14 : genericRiskPoints(finding)

  if (finding.test === "vitamin d") {
    if (finding.value < 10) return 22
    if (finding.value < 20) return 14
    return 8
  }

  if (finding.test === "vitamin b12") {
    if (finding.status === "low" && finding.value < 150) return 20
    return 10
  }

  if (finding.test === "esr" || finding.test === "crp") {
    if (deviationRatio(finding) >= 1) return 18
    return 10
  }

  if (finding.test === "ra factor") {
    if (finding.value > finding.max * 3) return 18
    return 10
  }

  if (["mch", "mchc", "rdw", "rbc", "mcv", "hematocrit"].includes(finding.test)) return Math.min(10, genericRiskPoints(finding))
  if (finding.test === "uric acid" && finding.status === "low") return 5
  if (finding.test === "calcium") return Math.max(12, genericRiskPoints(finding))
  if (finding.test === "creatinine") return Math.max(16, genericRiskPoints(finding))
  if (finding.test === "alt" || finding.test === "ast") return Math.max(10, genericRiskPoints(finding))

  return genericRiskPoints(finding)
}

function calculateRiskPercentage(findings, abnormal) {
  if (!findings.length) return 12
  if (!abnormal.length) return 8

  let score = abnormal.reduce((total, finding) => total + findingRiskPoints(finding, findings), 0)

  const hasThyroidPattern = abnormal.some((item) => item.test === "tsh") && abnormal.some((item) => item.test === "ft4")
  const anemiaMarkers = abnormal.filter((item) => ["hemoglobin", "rbc", "mcv", "mch", "mchc", "rdw", "hematocrit"].includes(item.test)).length
  const inflammationMarkers = abnormal.filter((item) => item.test === "esr" || item.test === "crp").length

  if (hasThyroidPattern) score += 6
  if (anemiaMarkers >= 2) score += 5
  if (inflammationMarkers >= 2) score += 4
  if (abnormal.length >= 5) score += 5

  return Math.min(95, Math.max(8, Math.round(score)))
}

function hindiMeaning(finding, findings) {
  const tshWithLowFt4 = finding.test === "tsh" && finding.status === "high" && findings.some((item) => item.test === "ft4" && item.status === "low")
  const text = {
    hemoglobin: ["Hemoglobin कम है, इसलिए खून में oxygen ले जाने की क्षमता कम हो सकती है। इससे थकान, चक्कर, सांस फूलना, कमजोरी या पीलापन हो सकता है।", "आम संभावित कारणों में iron deficiency, vitamin B12/folate की कमी, blood loss, chronic inflammation, kidney-related illness या nutrition gap शामिल हो सकते हैं।", "Doctor symptoms देखकर iron profile, ferritin, B12/folate, stool occult blood या repeat CBC सलाह दे सकते हैं।"],
    rbc: ["RBC abnormal है। यह anemia tendency, dehydration, blood loss या nutrition/bone marrow pattern से जुड़ सकता है।", "RBC कम हो तो iron/B12/folate deficiency या blood loss की possibility देखी जाती है। RBC ज्यादा हो तो dehydration, smoking, lung disease या high-altitude adaptation कारण हो सकते हैं।", "Doctor इसे hemoglobin, MCV, MCH, RDW और symptoms के साथ interpret करेंगे।"],
    hematocrit: ["Hematocrit बताता है कि blood volume में red blood cells का हिस्सा कितना है।", "कम hematocrit anemia, blood loss या nutritional deficiency में दिख सकता है। ज्यादा hematocrit dehydration, smoking, lung disease या excess red-cell production में दिख सकता है।", "Doctor इसे hemoglobin/RBC और symptoms के साथ compare करके आगे की जांच तय कर सकते हैं।"],
    mcv: ["MCV red blood cell का average size बताता है। Low MCV छोटे RBC और high MCV बड़े RBC का संकेत दे सकता है।", "Low MCV iron deficiency या thalassemia trait में दिख सकता है। High MCV B12/folate deficiency, liver disease, alcohol use, thyroid problem या कुछ medicines से हो सकता है।", "Doctor iron studies, B12/folate, peripheral smear या repeat CBC सलाह दे सकते हैं।"],
    mch: ["MCH कम है, यानी हर red blood cell में hemoglobin की मात्रा अपेक्षा से कम हो सकती है।", "यह pattern अक्सर iron deficiency या microcytic anemia pattern से जुड़ा होता है, लेकिन MCV, hemoglobin, ferritin और history के साथ confirm होता है।", "Doctor iron studies, diet, blood loss history और repeat CBC evaluate कर सकते हैं।"],
    mchc: ["MCHC कम है, जिससे red blood cells में hemoglobin concentration कम होने का संकेत मिल सकता है।", "संभावित कारणों में iron deficiency, anemia of chronic disease या अन्य nutritional anemia pattern शामिल हो सकते हैं।", "Doctor RBC indices साथ में देखकर ferritin, iron/TIBC, B12, folate या peripheral smear सलाह दे सकते हैं।"],
    rdw: ["RDW ज्यादा है, यानी red blood cells के size में variation ज्यादा है।", "यह iron deficiency, B12/folate deficiency, recent blood loss या anemia treatment के बाद recovery phase में दिख सकता है।", "Doctor RDW को hemoglobin, MCV, MCH, ferritin, B12 और folate के साथ देखेंगे।"],
    wbc: ["WBC immune cells को दिखाता है। इसका abnormal होना infection, inflammation, stress response, allergy, medicine effect या bone marrow issue से जुड़ सकता है।", "WBC ज्यादा हो तो infection/inflammation common कारण है। WBC कम हो तो viral illness, कुछ medicines, autoimmune conditions या marrow suppression कारण हो सकते हैं।", "Doctor fever, symptoms, differential count और repeat CBC से आगे की जांच तय कर सकते हैं।"],
    platelets: ["Platelets कम हैं, इससे easy bruising, nose/gum bleeding, ज्यादा bleeding या skin पर छोटे red spots का risk बढ़ सकता है।", "संभावित कारणों में viral infection जैसे dengue, vitamin deficiency, autoimmune platelet destruction, medicine effects, liver/spleen disease या bone marrow problem शामिल हो सकते हैं।", "Fever, rash, bleeding, severe weakness, dizziness या बहुत low platelets हों तो doctor को जल्दी दिखाना जरूरी है।"],
    glucose: ["Glucose abnormal है, लेकिन interpretation इस बात पर निर्भर करता है कि sample fasting, random या meal के बाद था।", "High glucose diabetes, stress illness, steroids, infection या recent food intake से हो सकता है। Low glucose missed meals, diabetes medicines, alcohol या hormonal problems से हो सकता है।", "Doctor fasting glucose, post-meal glucose, HbA1c और symptoms review कर सकते हैं।"],
    hba1c: ["HbA1c पिछले लगभग 2-3 महीनों के average sugar control का संकेत देता है।", "High HbA1c diabetes या poor sugar control की ओर इशारा कर सकता है। Low HbA1c anemia, recent blood loss या red-cell lifespan बदलने से दिख सकता है।", "Doctor इसे glucose readings, symptoms और anemia status के साथ देखेंगे।"],
    creatinine: ["Creatinine kidney filtration और muscle waste clearance का संकेत देता है।", "High creatinine dehydration, kidney disease, urine blockage, medicine effect या muscle injury से हो सकता है। Low creatinine अक्सर low muscle mass या pregnancy से जुड़ा होता है।", "Doctor eGFR, urine routine, blood pressure, hydration status और medicines review कर सकते हैं।"],
    alt: ["ALT/SGPT liver enzyme है। High value liver cell irritation या injury का संकेत दे सकती है।", "संभावित कारणों में fatty liver, viral hepatitis, alcohol, medicines, supplements, infection, muscle injury या metabolic disease शामिल हो सकते हैं।", "Doctor repeat LFT, bilirubin, viral markers, ultrasound और medicine/alcohol review कर सकते हैं।"],
    ast: ["AST/SGOT liver irritation, muscle injury, alcohol-related liver stress या कुछ medicines से बढ़ सकता है।", "इसे ALT, bilirubin, alkaline phosphatase, symptoms, alcohol history और medicines के साथ interpret किया जाता है।", "Doctor repeat LFT, CK, viral markers या ultrasound सलाह दे सकते हैं।"],
    cholesterol: ["Cholesterol ज्यादा होने से long-term heart और blood-vessel risk बढ़ सकता है।", "संभावित कारणों में diet, genetics, thyroid disease, diabetes, obesity, kidney disease या low physical activity शामिल हो सकते हैं।", "Doctor full lipid profile, BP, diabetes risk, thyroid status और family history review कर सकते हैं।"],
    triglycerides: ["Triglycerides blood fat का marker है। ज्यादा होने पर heart risk बढ़ सकता है और बहुत ज्यादा होने पर pancreas irritation का risk हो सकता है।", "संभावित कारण high sugar/refined carbs, alcohol, diabetes, obesity, thyroid disease, kidney disease, genetics या कुछ medicines हो सकते हैं।", "Doctor fasting lipid profile, sugar testing, thyroid review और diet/lifestyle plan सलाह दे सकते हैं।"],
    tsh: tshWithLowFt4 ? ["TSH ज्यादा और FT4 कम होना hypothyroidism pattern का संकेत हो सकता है, यानी thyroid पर्याप्त hormone नहीं बना रहा हो सकता।", "संभावित कारणों में autoimmune thyroid disease, iodine imbalance, thyroid inflammation, previous thyroid treatment या कुछ medicines शामिल हो सकते हैं।", "Doctor thyroid profile repeat, anti-TPO test और treatment की जरूरत decide कर सकते हैं।"] : ["TSH abnormal है, जो thyroid control signal में गड़बड़ी का संकेत देता है।", "High TSH thyroid underactivity में दिख सकता है। Low TSH hyperthyroidism, thyroid medicine excess या thyroid inflammation में दिख सकता है।", "Doctor इसे FT4/FT3, symptoms, pregnancy status और medicines के साथ interpret करेंगे।"],
    ft4: ["FT4 active thyroid hormone है। FT4 कम होना thyroid underactivity को support कर सकता है, खासकर जब TSH ज्यादा हो।", "संभावित कारण autoimmune thyroid disease, thyroid inflammation, pituitary-related issue, iodine imbalance या medicine effect हो सकते हैं।", "Doctor TSH/FT4 repeat करके symptoms के आधार पर treatment decide कर सकते हैं।"],
    "vitamin d": ["Vitamin D की कमी body pain, weak bones, muscle weakness, fatigue और calcium absorption कम होने से जुड़ सकती है।", "आम कारणों में धूप कम मिलना, dietary कमी, gut absorption problem, liver/kidney disease, obesity या कुछ medicines शामिल हो सकते हैं।", "Doctor vitamin D replacement, calcium review, sunlight/diet guidance और follow-up testing सलाह दे सकते हैं।"],
    "vitamin b12": ["Vitamin B12 nerves और red blood cell formation के लिए जरूरी है। इसकी कमी fatigue और nerve symptoms दे सकती है।", "कम B12 vegetarian diet, poor absorption, gastritis, metformin/acid-suppressing medicines या gut disease से हो सकता है।", "Doctor tingling, numbness, memory issues, fatigue जैसे symptoms देखकर B12 treatment या further tests सलाह दे सकते हैं।"],
    esr: ["ESR ज्यादा है, जो body में inflammation या infection का संकेत हो सकता है।", "यह nonspecific marker है और infection, autoimmune disease, anemia, chronic inflammation, kidney disease या age-related factors में बढ़ सकता है।", "Doctor fever, pain, swelling, weight loss, CRP, CBC और examination के साथ इसका मतलब समझेंगे।"],
    crp: ["CRP inflammation marker है। High CRP बताता है कि body में inflammation या infection की प्रतिक्रिया हो सकती है।", "संभावित कारण bacterial/viral infection, autoimmune flare, tissue injury, dental/urinary/chest infection या chronic inflammatory disease हो सकते हैं।", "Doctor symptoms, examination, CBC, ESR, urine/chest tests या repeat CRP से source ढूंढ सकते हैं।"],
    calcium: ["Calcium abnormal होने से bones, muscles, nerves और heart rhythm पर असर हो सकता है।", "Low calcium vitamin D deficiency, low albumin, kidney disease या parathyroid problem से हो सकता है। High calcium dehydration, parathyroid disease, excess supplements या कुछ serious illnesses से हो सकता है।", "Doctor corrected calcium, vitamin D, kidney function, phosphate, magnesium और PTH check कर सकते हैं।"],
    "uric acid": ["Uric acid purine metabolism और kidney द्वारा uric acid handling का marker है।", "High uric acid gout, kidney stones, dehydration, kidney disease, high-purine diet, alcohol, obesity या medicines से जुड़ सकता है। Low uric acid low protein intake, कुछ medicines, liver disease या kidney tubular handling changes से हो सकता है।", "Doctor joint pain/swelling, kidney symptoms, diet, medicines और kidney function के साथ इसे interpret करेंगे।"],
    "ra factor": ["RA Factor ज्यादा है, जो rheumatoid arthritis या अन्य autoimmune/inflammatory conditions में दिख सकता है।", "सिर्फ high RA Factor से diagnosis confirm नहीं होता। Joint pain, swelling, morning stiffness या raised inflammation markers हों तो यह ज्यादा important होता है।", "Doctor symptoms के अनुसार anti-CCP, ESR/CRP repeat, ANA या rheumatology review सलाह दे सकते हैं।"],
  }

  return text[finding.test] || [`${finding.test} ${finding.status === "high" ? "ज्यादा" : "कम"} है, इसलिए यह report की reference range से बाहर है।`, "संभावित कारण test के प्रकार पर निर्भर करते हैं, जैसे nutrition gap, infection, inflammation, organ stress, medicine effect, dehydration या chronic illness।", "Doctor इसे symptoms, age, medical history, medicines और related tests के साथ review करेंगे।"]
}

function meaningBetter(finding, findings, language) {
  return language === "hi" ? hindiMeaning(finding, findings) : englishMeaning(finding, findings)
}

function uniqueItems(items) {
  return [...new Set(items.filter(Boolean))]
}

function remedyPlan(abnormal, language) {
  const has = (test, status) => abnormal.some((item) => item.test === test && (!status || item.status === status))
  const items = []

  if (language === "hi") {
    if (has("vitamin d", "low")) items.push("Vitamin D को normal करने में रोज सुरक्षित धूप, vitamin D rich foods, calcium/protein adequate diet और doctor-guided supplementation मदद कर सकते हैं।")
    if (has("hemoglobin", "low") || has("mch", "low") || has("mchc", "low") || has("rbc", "low")) items.push("Hemoglobin/RBC indices सुधारने के लिए iron-rich foods, vitamin C के साथ meals, protein, B12/folate sources और blood-loss कारण की जांच जरूरी हो सकती है।")
    if (has("platelets", "low")) items.push("Platelets कम हों तो चोट से बचें, alcohol और बिना सलाह aspirin/ibuprofen जैसे blood-thinning painkillers avoid करें, fluids लें और platelet count repeat monitoring कराएं।")
    if (has("tsh") || has("ft4")) items.push("Thyroid values normal करने के लिए medicine की जरूरत हो सकती है; साथ में regular timing, iodine balance और repeat TSH/FT4 monitoring doctor decide करेंगे।")
    if (has("esr", "high") || has("crp", "high")) items.push("ESR/CRP normal करने के लिए असली कारण ढूंढना जरूरी है, जैसे infection, joint inflammation, autoimmune issue या anemia; rest, fluids और symptom tracking रखें।")
    if (has("ra factor", "high")) items.push("RA factor high हो तो joint pain/swelling/stiffness track करें; inflammation control के लिए rheumatology review और anti-inflammatory plan doctor तय करेंगे।")
    if (has("uric acid", "high")) items.push("Uric acid high हो तो पानी, weight control, alcohol/sugary drinks कम करना और high-purine foods सीमित करना मदद कर सकता है।")
    if (has("uric acid", "low")) items.push("Uric acid low हो तो diet, protein intake, medicines और liver/kidney context doctor से review कराएं; अक्सर treatment cause पर depend करता है।")
    if (has("glucose", "high") || has("hba1c", "high")) items.push("Sugar values सुधारने के लिए refined carbs/sugary drinks कम करें, regular walking/exercise, weight control और doctor-guided diabetes plan follow करें।")
    if (has("alt", "high") || has("ast", "high")) items.push("Liver enzymes high हों तो alcohol avoid करें, unnecessary supplements/medicines review करें, weight control रखें और LFT follow-up कराएं।")
    if (has("creatinine", "high")) items.push("Creatinine high हो तो hydration, BP/sugar control, painkiller overuse avoid करना और kidney function follow-up जरूरी हो सकता है।")
    if (!items.length) items.push("Values normal करने के लिए cause identify करना जरूरी है; balanced diet, hydration, rest और repeat testing doctor advice के अनुसार रखें।")
    return uniqueItems(items)
  }

  if (has("vitamin d", "low")) items.push("To improve vitamin D, use safe sunlight exposure, vitamin D rich foods, adequate calcium/protein intake, and clinician-guided supplementation.")
  if (has("hemoglobin", "low") || has("mch", "low") || has("mchc", "low") || has("rbc", "low")) items.push("To improve hemoglobin/RBC indices, focus on iron-rich foods, vitamin C with meals, protein, B12/folate sources, and checking for blood-loss or deficiency causes.")
  if (has("platelets", "low")) items.push("For low platelets, avoid injury, alcohol, and aspirin/ibuprofen-like blood-thinning painkillers unless a doctor allows them; keep fluids up and repeat platelet monitoring.")
  if (has("tsh") || has("ft4")) items.push("To normalize thyroid values, treatment may be needed; regular medicine timing, iodine balance, and repeat TSH/FT4 monitoring should be clinician-guided.")
  if (has("esr", "high") || has("crp", "high")) items.push("To bring ESR/CRP down, the underlying cause must be found, such as infection, joint inflammation, autoimmune disease, or anemia; rest, fluids, and symptom tracking help while being evaluated.")
  if (has("ra factor", "high")) items.push("For high RA factor, track joint pain, swelling, and morning stiffness; inflammation control usually needs clinician or rheumatology review.")
  if (has("uric acid", "high")) items.push("For high uric acid, hydration, weight control, less alcohol/sugary drinks, and limiting high-purine foods may help.")
  if (has("uric acid", "low")) items.push("For low uric acid, review diet, protein intake, medicines, and liver/kidney context with a doctor; treatment depends on the cause.")
  if (has("glucose", "high") || has("hba1c", "high")) items.push("To improve sugar values, reduce refined carbs/sugary drinks, walk or exercise regularly, manage weight, and follow a clinician-guided diabetes plan.")
  if (has("alt", "high") || has("ast", "high")) items.push("For high liver enzymes, avoid alcohol, review unnecessary supplements/medicines, manage weight, and follow up with liver tests.")
  if (has("creatinine", "high")) items.push("For high creatinine, hydration, blood pressure/sugar control, avoiding painkiller overuse, and kidney follow-up may be important.")
  if (!items.length) items.push("To help values move toward normal, identify the cause first, then follow balanced diet, hydration, rest, and repeat testing advice.")
  return uniqueItems(items)
}

function medicineGuidance(abnormal, language) {
  const has = (test, status) => abnormal.some((item) => item.test === test && (!status || item.status === status))
  const items = []

  if (language === "hi") {
    items.push("इन medicines/supplements को खुद शुरू न करें; doctor diagnosis confirm करके dose और duration तय करेंगे।")
    if (has("vitamin d", "low")) items.push("Vitamin D deficiency में doctor cholecalciferol / vitamin D3, कभी-कभी calcium carbonate या calcium citrate के साथ, consider कर सकते हैं।")
    if (has("tsh", "high") || has("ft4", "low")) items.push("Confirmed hypothyroidism में commonly levothyroxine / thyroxine sodium use होता है, लेकिन dose TSH/FT4, age, weight और heart history पर depend करती है।")
    if (has("hemoglobin", "low") || has("mch", "low") || has("mchc", "low") || has("rbc", "low")) items.push("Confirmed iron deficiency anemia में oral iron जैसे ferrous sulfate, ferrous ascorbate या ferrous fumarate, और जरूरत पर folic acid/vitamin B12 doctor दे सकते हैं।")
    if (has("vitamin b12", "low")) items.push("Vitamin B12 कमी में methylcobalamin/cyanocobalamin और folic acid doctor symptoms और level के अनुसार दे सकते हैं।")
    if (has("platelets", "low")) items.push("Low platelets में usually cause treatment और monitoring होती है; dengue/viral illness में fluids/monitoring, autoimmune causes में specialist medicines doctor decide करते हैं।")
    if (has("esr", "high") || has("crp", "high")) items.push("ESR/CRP high में medicine cause पर depend करती है: confirmed bacterial infection में antibiotics, inflammatory joint disease में anti-inflammatory/DMARD options specialist decide करते हैं।")
    if (has("ra factor", "high")) items.push("Rheumatoid arthritis confirm होने पर rheumatologist methotrexate, hydroxychloroquine, sulfasalazine या NSAIDs/steroids जैसी options consider कर सकते हैं।")
    if (has("uric acid", "high")) items.push("High uric acid/gout confirm होने पर allopurinol, febuxostat, colchicine या NSAIDs doctor consider कर सकते हैं।")
    if (has("glucose", "high") || has("hba1c", "high")) items.push("Diabetes confirm होने पर metformin या अन्य diabetes medicines doctor sugar pattern, kidney function और age के अनुसार choose करते हैं।")
    if (has("alt", "high") || has("ast", "high")) items.push("Liver enzymes high में कोई universal medicine नहीं होती; cause जैसे fatty liver, hepatitis, alcohol या medicine injury के अनुसार treatment होता है।")
    if (has("creatinine", "high")) items.push("Creatinine high में kidney-safe treatment जरूरी है; nephrologist BP medicines, diabetes control या offending medicines रोकने जैसी strategy decide कर सकते हैं।")
    return uniqueItems(items)
  }

  items.push("Do not start these medicines or supplements yourself; a doctor must confirm the cause, dose, and duration.")
  if (has("vitamin d", "low")) items.push("For vitamin D deficiency, doctors commonly consider cholecalciferol / vitamin D3, sometimes with calcium carbonate or calcium citrate.")
  if (has("tsh", "high") || has("ft4", "low")) items.push("For confirmed hypothyroidism, levothyroxine / thyroxine sodium is commonly used, but dosing depends on TSH/FT4, age, weight, pregnancy status, and heart history.")
  if (has("hemoglobin", "low") || has("mch", "low") || has("mchc", "low") || has("rbc", "low")) items.push("For confirmed iron deficiency anemia, doctors may use oral iron such as ferrous sulfate, ferrous ascorbate, or ferrous fumarate, and may add folic acid or vitamin B12 if deficient.")
  if (has("vitamin b12", "low")) items.push("For vitamin B12 deficiency, methylcobalamin or cyanocobalamin, sometimes with folic acid, may be used under medical guidance.")
  if (has("platelets", "low")) items.push("For low platelets, treatment is usually cause-based with monitoring; viral/dengue patterns often need fluids and monitoring, while immune causes may need specialist medicines.")
  if (has("esr", "high") || has("crp", "high")) items.push("For high ESR/CRP, medicine depends on the cause: antibiotics only for confirmed bacterial infection; anti-inflammatory or DMARD options only when inflammatory disease is diagnosed.")
  if (has("ra factor", "high")) items.push("If rheumatoid arthritis is confirmed, rheumatologists may consider methotrexate, hydroxychloroquine, sulfasalazine, NSAIDs, or short-term steroids depending on severity.")
  if (has("uric acid", "high")) items.push("For confirmed gout/high uric acid, doctors may consider allopurinol, febuxostat, colchicine, or NSAIDs depending on kidney function and symptoms.")
  if (has("glucose", "high") || has("hba1c", "high")) items.push("If diabetes is confirmed, doctors often consider metformin or other diabetes medicines based on sugar pattern, kidney function, and age.")
  if (has("alt", "high") || has("ast", "high")) items.push("For high liver enzymes, there is no single universal medicine; treatment depends on fatty liver, hepatitis, alcohol, medicine injury, or another cause.")
  if (has("creatinine", "high")) items.push("For high creatinine, kidney-safe care is essential; a clinician may adjust BP/diabetes medicines and stop kidney-stressing medicines if needed.")
  return uniqueItems(items)
}

function buildHumanSummaryBetter({ findings, abnormal, language }) {
  const normal = findings.filter((item) => item.status === "normal")
  const borderline = []
  const important = abnormal
  const topIssues = []

  if (abnormal.some((item) => item.test === "platelets")) topIssues.push(language === "hi" ? "Platelets कम" : "low platelets")
  if (abnormal.some((item) => ["hemoglobin", "rbc", "mcv", "mch", "mchc", "rdw"].includes(item.test))) topIssues.push(language === "hi" ? "anemia/nutrition pattern" : "anemia or nutritional pattern")
  if (abnormal.some((item) => item.test === "esr" || item.test === "crp")) topIssues.push(language === "hi" ? "inflammation marker ज्यादा" : "raised inflammation marker")
  if (abnormal.some((item) => item.test === "tsh" || item.test === "ft4")) topIssues.push(language === "hi" ? "thyroid imbalance" : "thyroid imbalance")
  if (abnormal.some((item) => item.test === "vitamin d")) topIssues.push(language === "hi" ? "Vitamin D deficiency" : "vitamin D deficiency")
  if (abnormal.some((item) => item.test === "uric acid")) topIssues.push(language === "hi" ? "uric acid abnormal" : "abnormal uric acid")
  if (abnormal.some((item) => item.test === "ra factor")) topIssues.push(language === "hi" ? "RA Factor ज्यादा" : "high RA factor")

  return {
    intro: language === "hi" ? "यह आपकी रिपोर्ट का आसान भाषा में विस्तृत सारांश है। इसमें abnormal values, उनके संभावित कारण और आगे क्या करना चाहिए बताया गया है।" : "Here is a clear, human-friendly summary of what the detected values may mean.",
    importantFindings: important.map((finding) => ({
      title: titleBetter(finding, language),
      test: finding.test,
      value: `${finding.value} ${finding.unit}`,
      normalRange: formatRange(finding),
      status: finding.status,
      meaning: meaningBetter(finding, findings, language),
    })),
    borderlineFindings: borderline.map((finding) => ({
      title: titleBetter(finding, language),
      value: `${finding.value} ${finding.unit}`,
      note: meaningBetter(finding, findings, language).join(" "),
    })),
    normalFindings: normal
      .filter((item) => ["hemoglobin", "rbc", "hematocrit", "mcv", "mch", "mchc", "wbc", "platelets", "glucose", "calcium", "uric acid", "vitamin b12", "ra factor"].includes(item.test))
      .map((finding) => `${finding.test}: ${finding.value} ${finding.unit} (${language === "hi" ? "ठीक" : "OK"})`),
    overallInterpretation: topIssues.length
      ? language === "hi"
        ? [`इस रिपोर्ट में मुख्य रूप से ये संकेत दिख रहे हैं: ${topIssues.join(", ")}.`, "ये report-based संकेत हैं, final diagnosis नहीं। Doctor symptoms और examination के साथ confirm करेंगे।"]
        : [`This report mainly suggests: ${topIssues.join(", ")}.`, "These are report-based signals and need clinical correlation, not a final diagnosis."]
      : [language === "hi" ? "Supported values में कोई बड़ा abnormal pattern नहीं दिखा।" : "No major abnormal pattern was detected from the supported values."],
    whatToDo: medicineGuidance(abnormal, language),
    simpleAdvice: remedyPlan(abnormal, language),
    finalNote: language === "hi" ? "यह summary educational support के लिए है। सही diagnosis और treatment के लिए qualified doctor से report जरूर review कराएं।" : "This summary is educational support, not a diagnosis. A qualified doctor should confirm the cause and treatment plan.",
  }
}

export async function analyzeBloodReport({ text = "", file, language = "en" }) {
  const extracted = await extractReportText(file)
  const reportText = `${text}\n${extracted.text}`.trim()

  if (!reportText) {
    const error = new Error("Upload a report or paste report values. Supported uploads: TXT, CSV, PDF, JPG, JPEG, PNG.")
    error.statusCode = 400
    throw error
  }

  if (extracted.source === "unsupported") {
    const error = new Error("Unsupported report format. Upload TXT, CSV, PDF, JPG, JPEG, or PNG.")
    error.statusCode = 400
    throw error
  }

  const findings = findRangesInText(reportText)
  const abnormal = findings.filter((item) => item.status !== "normal")
  const riskPercentage = calculateRiskPercentage(findings, abnormal)
  const copy = labelsBetter(language)
  const localHumanSummary = buildHumanSummaryBetter({ findings, abnormal, language })
  const aiSummary = findings.length ? await analyzeBloodReportWithOpenAI({ reportText, findings, language }) : { available: false }
  const humanSummary = aiSummary.available ? aiSummary.humanSummary : localHumanSummary

  return {
    summary: buildSummary({ findings, abnormal, copy }),
    riskPercentage,
    findings,
    humanSummary,
    language,
    aiEnhanced: aiSummary.available,
    aiMessage: aiSummary.message || "",
    extractedTextSource: extracted.source,
    extractedCharacters: reportText.length,
    extractedTextPreview: textPreview(reportText),
    prevention: copy.prevention,
    cure: copy.cure,
    remedies: copy.remedies,
    cause: copy.cause,
    medicine: copy.medicine,
  }
}

