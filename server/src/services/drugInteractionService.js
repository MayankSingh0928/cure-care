import { safeJsonFetch } from "../utils/apiHelper.js"
import { summarizeSingleDrugWithOpenAI } from "./openaiService.js"

function normalize(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function normalizeDrugName(value = "") {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function firstText(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(" ")
  return value || ""
}

function compactText(value, fallback) {
  const text = firstText(value).replace(/\s+/g, " ").trim()
  if (!text) return fallback
  return text.length > 700 ? `${text.slice(0, 700).trim()}...` : text
}

async function fetchOpenFdaLabel(drug) {
  const query = encodeURIComponent(`openfda.generic_name:"${drug}" OR openfda.brand_name:"${drug}" OR openfda.substance_name:"${drug}"`)
  const url = `https://api.fda.gov/drug/label.json?search=${query}&limit=1`
  const response = await safeJsonFetch(url, { timeoutMs: 3000 })

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

const commonMedicineInfo = {
  en: {
    ibuprofen: {
      category: "NSAID pain reliever",
      uses: ["Pain relief for headache, toothache, muscle pain, back pain, period pain, and minor injury pain.", "Fever reduction.", "Helps reduce inflammation in sprains, strains, and arthritis symptoms."],
      sideEffects: ["Stomach pain, acidity, nausea, vomiting, or indigestion.", "Dizziness, fluid retention, or increased blood pressure in some people.", "Kidney stress or bleeding risk, especially with dehydration, kidney disease, blood thinners, ulcers, or older age."],
      seriousWarnings: ["Avoid or ask a doctor first if you have stomach ulcer or bleeding history, kidney disease, severe heart disease, take blood thinners, or are pregnant unless advised.", "Seek urgent care for black stools, vomiting blood, chest pain, breathing trouble, swelling, severe rash, or reduced urination."],
      safeUse: ["Use only as directed on the label or by a clinician.", "Avoid combining with other NSAIDs such as naproxen or diclofenac unless a clinician advises it."],
      ayurvedicRemedies: [
        {
          name: "Turmeric (Haridra)",
          similarEffect: "May support mild inflammation relief.",
          evidenceNote: "Curcumin has some clinical evidence for inflammatory pain, but it is not a direct replacement for ibuprofen.",
          caution: "May increase bleeding tendency in some people and can interact with blood thinners. Avoid high doses before surgery unless approved.",
        },
        {
          name: "Ginger (Adrak)",
          similarEffect: "May help mild pain, nausea, and inflammatory discomfort.",
          evidenceNote: "Evidence is strongest for nausea and modest for pain/inflammation.",
          caution: "Use caution with blood thinners, bleeding disorders, gallstones, or stomach irritation.",
        },
      ],
    },
    paracetamol: {
      category: "Pain and fever medicine",
      uses: ["Pain relief for headache, body pain, toothache, muscle pain, and minor aches.", "Fever reduction.", "Often used when NSAIDs are not suitable, though liver safety still matters."],
      sideEffects: ["Usually well tolerated when used correctly.", "Nausea, rash, or allergy can occur rarely.", "Too much can cause serious liver damage."],
      seriousWarnings: ["Avoid overdose and avoid combining multiple products that contain paracetamol or acetaminophen.", "Ask a doctor first with liver disease, heavy alcohol use, or long-term use."],
      safeUse: ["Follow label or clinician directions exactly.", "Check cold and flu medicines because many already contain paracetamol or acetaminophen."],
      ayurvedicRemedies: [
        {
          name: "Guduchi (Giloy)",
          similarEffect: "Traditionally used for fever support and general wellness.",
          evidenceNote: "Traditional use is common, but evidence is not equivalent to fever medicines.",
          caution: "Avoid self-use in autoimmune disease, pregnancy, liver problems, or while taking immune-suppressing medicines unless a clinician approves.",
        },
        {
          name: "Tulsi",
          similarEffect: "May support comfort during mild cold, cough, and fever-like illness.",
          evidenceNote: "Mostly supportive and traditional evidence; it does not replace fever evaluation when symptoms are significant.",
          caution: "Use caution with blood thinners, diabetes medicines, pregnancy, or planned surgery.",
        },
      ],
    },
    cetirizine: {
      category: "Antihistamine",
      uses: ["Relief from allergy symptoms such as sneezing, runny nose, itchy eyes, and itching.", "Can help hives or allergic skin itching.", "May be used for seasonal or dust-related allergies."],
      sideEffects: ["Sleepiness or tiredness.", "Dry mouth, headache, dizziness, or stomach discomfort.", "Rarely, restlessness or difficulty urinating."],
      seriousWarnings: ["Ask a doctor first with kidney disease, severe liver disease, urinary retention, pregnancy, or breastfeeding.", "Avoid driving or alcohol if it makes you sleepy."],
      safeUse: ["Use as directed and avoid taking extra doses for faster relief.", "Check with a pharmacist before combining with other allergy or sleep medicines."],
      ayurvedicRemedies: [
        {
          name: "Tulsi",
          similarEffect: "Traditionally used for respiratory comfort and allergy-like congestion.",
          evidenceNote: "May support symptoms, but it is not a direct antihistamine substitute.",
          caution: "Use caution with blood thinners, diabetes medicines, pregnancy, or planned surgery.",
        },
        {
          name: "Steam inhalation with plain water",
          similarEffect: "May ease nasal congestion and throat irritation.",
          evidenceNote: "Supportive comfort measure; it does not treat severe allergy or asthma.",
          caution: "Avoid burns. Do not use hot steam for small children without medical guidance.",
        },
      ],
    },
  },
  hi: {
    ibuprofen: {
      category: "NSAID दर्द निवारक",
      uses: ["सिरदर्द, दांत दर्द, मांसपेशियों के दर्द, पीठ दर्द, माहवारी के दर्द और हल्की चोट के दर्द में राहत।", "बुखार कम करने में मदद।", "मोच, खिंचाव और गठिया जैसे लक्षणों में सूजन और दर्द कम करने में मदद कर सकता है।"],
      sideEffects: ["पेट दर्द, एसिडिटी, मतली, उल्टी या अपच।", "कुछ लोगों में चक्कर, शरीर में पानी रुकना या ब्लड प्रेशर बढ़ना।", "डिहाइड्रेशन, किडनी रोग, ब्लड थिनर, अल्सर या ज्यादा उम्र में किडनी पर तनाव और खून बहने का जोखिम बढ़ सकता है।"],
      seriousWarnings: ["पेट के अल्सर या ब्लीडिंग, किडनी रोग, गंभीर हृदय रोग, ब्लड थिनर लेने या गर्भावस्था में डॉक्टर से पूछे बिना न लें।", "काला मल, खून की उल्टी, छाती में दर्द, सांस में दिक्कत, सूजन, तेज रैश या पेशाब कम होने पर तुरंत चिकित्सा सहायता लें।"],
      safeUse: ["लेबल या डॉक्टर के निर्देश के अनुसार ही लें।", "Naproxen या diclofenac जैसे दूसरे NSAIDs के साथ डॉक्टर की सलाह के बिना न मिलाएं।"],
      ayurvedicRemedies: [
        {
          name: "हल्दी (हरिद्रा)",
          similarEffect: "हल्की सूजन और दर्द में सहायक हो सकती है।",
          evidenceNote: "Curcumin पर सूजन वाले दर्द में कुछ क्लिनिकल evidence है, लेकिन यह ibuprofen का सीधा विकल्प नहीं है।",
          caution: "कुछ लोगों में खून बहने की प्रवृत्ति बढ़ा सकती है और blood thinners से interaction हो सकता है। surgery से पहले high dose न लें।",
        },
        {
          name: "अदरक",
          similarEffect: "हल्के दर्द, मतली और inflammatory discomfort में मदद कर सकता है।",
          evidenceNote: "Evidence nausea के लिए बेहतर और pain/inflammation के लिए सीमित है।",
          caution: "Blood thinners, bleeding disorder, gallstones या पेट में जलन हो तो सावधानी रखें।",
        },
      ],
    },
    paracetamol: {
      category: "दर्द और बुखार की दवा",
      uses: ["सिरदर्द, शरीर दर्द, दांत दर्द, मांसपेशियों के दर्द और हल्के दर्द में राहत।", "बुखार कम करने में मदद।", "NSAIDs suitable न हों तो अक्सर इस्तेमाल होती है, लेकिन liver safety जरूरी है।"],
      sideEffects: ["सही मात्रा में लेने पर आमतौर पर ठीक सहन होती है।", "कभी-कभी मतली, रैश या allergy हो सकती है।", "ज्यादा मात्रा liver को गंभीर नुकसान पहुंचा सकती है।"],
      seriousWarnings: ["Overdose से बचें और paracetamol/acetaminophen वाले कई products साथ में न लें।", "Liver disease, heavy alcohol use या लंबे समय तक इस्तेमाल में डॉक्टर से पूछें।"],
      safeUse: ["लेबल या clinician directions exactly follow करें।", "Cold/flu medicines check करें क्योंकि उनमें भी paracetamol/acetaminophen हो सकता है।"],
      ayurvedicRemedies: [
        {
          name: "गुडूची (गिलोय)",
          similarEffect: "परंपरागत रूप से fever support और general wellness के लिए इस्तेमाल।",
          evidenceNote: "Traditional use common है, पर इसका evidence fever medicines के बराबर नहीं है।",
          caution: "Autoimmune disease, pregnancy, liver problems या immune-suppressing medicines में doctor की सलाह के बिना न लें।",
        },
        {
          name: "तुलसी",
          similarEffect: "हल्की सर्दी, खांसी और fever-like illness में comfort support दे सकती है।",
          evidenceNote: "Evidence mainly supportive/traditional है; गंभीर symptoms में fever evaluation का विकल्प नहीं है।",
          caution: "Blood thinners, diabetes medicines, pregnancy या planned surgery में सावधानी रखें।",
        },
      ],
    },
    cetirizine: {
      category: "Antihistamine",
      uses: ["छींक, नाक बहना, आंखों में खुजली और itching जैसे allergy symptoms में राहत।", "Hives या allergic skin itching में मदद कर सकती है।", "Seasonal या dust allergy में इस्तेमाल हो सकती है।"],
      sideEffects: ["नींद या थकान।", "मुंह सूखना, सिरदर्द, चक्कर या पेट की परेशानी।", "कभी-कभी restlessness या पेशाब में कठिनाई।"],
      seriousWarnings: ["Kidney disease, severe liver disease, urinary retention, pregnancy या breastfeeding में पहले doctor से पूछें।", "यदि नींद आती है तो driving और alcohol से बचें।"],
      safeUse: ["निर्देश के अनुसार लें और जल्दी असर के लिए extra dose न लें।", "दूसरी allergy या sleep medicines के साथ लेने से पहले pharmacist से पूछें।"],
      ayurvedicRemedies: [
        {
          name: "तुलसी",
          similarEffect: "Respiratory comfort और allergy-like congestion में परंपरागत रूप से इस्तेमाल।",
          evidenceNote: "Symptoms support कर सकती है, लेकिन direct antihistamine substitute नहीं है।",
          caution: "Blood thinners, diabetes medicines, pregnancy या planned surgery में सावधानी रखें।",
        },
        {
          name: "सादे पानी की भाप",
          similarEffect: "नाक बंद और गले की irritation में आराम दे सकती है।",
          evidenceNote: "यह supportive comfort measure है; severe allergy या asthma का treatment नहीं है।",
          caution: "जलने से बचें। छोटे बच्चों में medical guidance के बिना hot steam न दें।",
        },
      ],
    },
  },
}

commonMedicineInfo.en.acetaminophen = commonMedicineInfo.en.paracetamol
commonMedicineInfo.hi.acetaminophen = commonMedicineInfo.hi.paracetamol

function commonFallback(drug, language) {
  const key = normalize(drug)
  const info = commonMedicineInfo[language]?.[key]
  if (!info) return null

  return {
    medicine: normalizeDrugName(drug),
    source: "Curated medicine summary",
    disclaimer:
      language === "hi"
        ? "यह जानकारी केवल शिक्षा के लिए है। दवा शुरू, बंद या बदलने से पहले doctor/pharmacist से सलाह लें। आयुर्वेदिक उपाय prescription medicine का direct replacement नहीं हैं।"
        : "This information is educational. Ask a doctor or pharmacist before starting, stopping, or changing medicine. Ayurvedic remedies are not direct replacements for prescribed medicine.",
    ...info,
  }
}

function labelFallback(drug, fdaInfo, language) {
  const isHindi = language === "hi"

  return {
    medicine: normalizeDrugName(drug),
    category: isHindi ? "दवा" : "Medicine",
    uses: [
      compactText(
        fdaInfo?.indicationsAndUsage || fdaInfo?.purpose,
        isHindi ? "OpenFDA label में uses साफ उपलब्ध नहीं हैं। intended use doctor/pharmacist से confirm करें।" : "Uses were not clearly available from OpenFDA. Confirm the intended use with a doctor or pharmacist.",
      ),
    ],
    sideEffects: [
      compactText(
        fdaInfo?.adverseReactions,
        isHindi ? "OpenFDA label में side effects साफ उपलब्ध नहीं हैं।" : "Side effects were not clearly available from OpenFDA.",
      ),
    ],
    seriousWarnings: [
      compactText(
        fdaInfo?.warnings || fdaInfo?.doNotUse || fdaInfo?.stopUse,
        isHindi ? "Warning details साफ उपलब्ध नहीं हैं। Allergy, severe rash, breathing trouble या unusual symptoms में medical help लें।" : "Warning details were not clearly available. Seek medical help for allergy, severe rash, breathing trouble, or unusual symptoms.",
      ),
    ],
    safeUse: [
      compactText(
        fdaInfo?.askDoctor,
        isHindi ? "Existing disease, pregnancy, kidney/liver problem या other medicines हों तो doctor/pharmacist से पूछें।" : "Ask a doctor or pharmacist if you have existing disease, pregnancy, kidney/liver problems, or take other medicines.",
      ),
    ],
    ayurvedicRemedies: [
      {
        name: isHindi ? "व्यक्तिगत आयुर्वेदिक सलाह" : "Individual Ayurvedic advice",
        similarEffect: isHindi ? "इस medicine जैसा effect condition पर depend करता है।" : "A similar effect depends on the condition this medicine is being used for.",
        evidenceNote: isHindi ? "AI या clinician review के बिना इस drug के लिए specific Ayurvedic alternative तय नहीं किया गया।" : "A specific Ayurvedic option was not selected for this drug without AI or clinician review.",
        caution: isHindi ? "Prescription medicine को ayurvedic remedy से replace न करें। Qualified clinician से सलाह लें।" : "Do not replace prescribed medicine with a remedy. Ask a qualified clinician.",
      },
    ],
    source: fdaInfo ? "OpenFDA drug label" : "General safety fallback",
    disclaimer: isHindi
      ? "यह जानकारी केवल शिक्षा के लिए है। दवा शुरू, बंद या बदलने से पहले doctor/pharmacist से सलाह लें।"
      : "This information is educational. Ask a doctor or pharmacist before starting, stopping, or changing medicine.",
  }
}

function normalizeMedicineInfo(info, drug, fdaInfo, language) {
  const fallback = commonFallback(drug, language) || labelFallback(drug, fdaInfo, language)

  return {
    ...fallback,
    ...info,
    medicine: info?.medicine || fallback.medicine,
    category: info?.category || fallback.category,
    uses: Array.isArray(info?.uses) && info.uses.length ? info.uses : fallback.uses,
    sideEffects: Array.isArray(info?.sideEffects) && info.sideEffects.length ? info.sideEffects : fallback.sideEffects,
    seriousWarnings: Array.isArray(info?.seriousWarnings) && info.seriousWarnings.length ? info.seriousWarnings : fallback.seriousWarnings,
    safeUse: Array.isArray(info?.safeUse) && info.safeUse.length ? info.safeUse : fallback.safeUse,
    ayurvedicRemedies: Array.isArray(info?.ayurvedicRemedies) && info.ayurvedicRemedies.length ? info.ayurvedicRemedies : fallback.ayurvedicRemedies,
    disclaimer: info?.disclaimer || fallback.disclaimer,
  }
}

export async function checkInteractions(payload = {}) {
  const medicine = normalizeDrugName(payload.medicine || payload.drugs?.[0] || "")
  const language = payload.language === "hi" ? "hi" : "en"

  if (!medicine) {
    const error = new Error(language === "hi" ? "दवा का नाम जरूरी है।" : "Medicine name is required.")
    error.statusCode = 400
    throw error
  }

  const fdaInfo = await fetchOpenFdaLabel(medicine)
  const aiSummary = await summarizeSingleDrugWithOpenAI({
    drug: medicine,
    fdaInfo,
    language,
    patientContext: {
      age: payload.age || null,
      conditions: payload.conditions || [],
    },
  })

  const source = aiSummary.available
    ? fdaInfo
      ? "OpenAI summary of OpenFDA label and Ayurvedic knowledge"
      : "OpenAI medicine and Ayurvedic summary"
    : commonFallback(medicine, language)
      ? "Curated medicine summary"
      : fdaInfo
        ? "OpenFDA drug label"
        : "General safety fallback"

  const medicineInfo = normalizeMedicineInfo(aiSummary.available ? aiSummary.data : null, medicine, fdaInfo, language)
  medicineInfo.source = source

  return {
    normalizedDrugs: [medicine],
    medicineInfo,
    singleDrugInfo: medicineInfo,
    interactions: [],
    sourceSummary: source,
    coverageNotice:
      language === "hi"
        ? "यह educational information है। Side effects, contraindications, dose limits और patient-specific risks complete नहीं हो सकते। दवा या आयुर्वेदिक remedy शुरू/बंद/बदलने से पहले clinician/pharmacist से सलाह लें।"
        : "This is educational information. Side effects, contraindications, dose limits, and patient-specific risks may be incomplete. Ask a clinician or pharmacist before starting, stopping, or changing a medicine or Ayurvedic remedy.",
  }
}
