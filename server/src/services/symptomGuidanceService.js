import { analyzeSymptomsWithOpenAI } from "./openaiService.js"

function normalize(value = "") {
  return value.toLowerCase()
}

function splitValues(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  return String(value || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const departmentRules = [
  {
    keywords: ["chest pain", "heart", "palpitation", "breathless", "shortness of breath", "bp", "blood pressure", "high blood pressure"],
    urgency: "urgent",
    department: "Cardiology",
    doctorType: "Cardiologist",
    reason: "Heart, blood pressure, chest discomfort, or breathing symptoms may need cardiovascular evaluation.",
    tests: ["ECG", "Blood pressure monitoring", "Troponin if chest pain is acute", "Lipid profile", "Echocardiography if advised"],
  },
  {
    keywords: ["fever", "cough", "cold", "infection", "throat", "body pain", "viral"],
    urgency: "soon",
    department: "General Medicine",
    doctorType: "General Physician",
    reason: "Fever, cough, infection-like illness, and general symptoms are usually first evaluated by a physician.",
    tests: ["CBC", "CRP or ESR", "COVID/flu test if relevant", "Chest X-ray if cough or breathing symptoms persist"],
  },
  {
    keywords: ["stomach", "abdomen", "vomit", "loose motion", "diarrhea", "constipation", "acidity", "gas", "liver"],
    urgency: "soon",
    department: "Gastroenterology",
    doctorType: "Gastroenterologist",
    reason: "Digestive, stomach, bowel, acidity, or liver-related symptoms may need gastrointestinal review.",
    tests: ["CBC", "Liver function test", "Stool test if diarrhea persists", "Ultrasound abdomen if advised"],
  },
  {
    keywords: ["skin", "rash", "itch", "acne", "allergy", "hair fall", "fungal"],
    urgency: "routine",
    department: "Dermatology",
    doctorType: "Dermatologist",
    reason: "Skin, hair, nail, rash, allergy, or fungal symptoms are best reviewed by a skin specialist.",
    tests: ["Skin examination", "KOH test for fungal infection if needed", "Allergy evaluation if recurrent", "CBC if widespread rash is present"],
  },
  {
    keywords: ["headache", "migraine", "seizure", "numbness", "weakness", "dizziness", "stroke", "memory"],
    urgency: "urgent",
    department: "Neurology",
    doctorType: "Neurologist",
    reason: "Headache with neurological symptoms, seizures, weakness, numbness, or dizziness may need nervous-system evaluation.",
    tests: ["Neurological examination", "MRI/CT brain if advised", "Blood sugar", "Vitamin B12", "Thyroid profile"],
  },
  {
    keywords: ["joint", "bone", "knee", "back pain", "fracture", "sprain", "neck pain", "shoulder"],
    urgency: "routine",
    department: "Orthopedics",
    doctorType: "Orthopedic Doctor",
    reason: "Bone, joint, muscle, spine, injury, or movement-related pain is commonly evaluated by orthopedics.",
    tests: ["X-ray if injury or persistent pain", "Vitamin D", "Calcium", "ESR/CRP if inflammatory pain is suspected"],
  },
  {
    keywords: ["urine", "kidney", "burning urination", "uti", "stone", "prostate"],
    urgency: "soon",
    department: "Urology",
    doctorType: "Urologist",
    reason: "Urinary symptoms, kidney stones, prostate symptoms, or recurrent UTI may need urology review.",
    tests: ["Urine routine and microscopy", "Urine culture", "Kidney function test", "Ultrasound KUB if advised"],
  },
  {
    keywords: ["period", "pregnancy", "vaginal", "pcos", "white discharge", "breast", "menstrual"],
    urgency: "soon",
    department: "Gynecology",
    doctorType: "Gynecologist",
    reason: "Menstrual, pregnancy, pelvic, vaginal discharge, PCOS, or breast concerns should be reviewed by gynecology.",
    tests: ["Pregnancy test if relevant", "CBC", "TSH", "Pelvic ultrasound if advised", "Urine test if urinary symptoms exist"],
  },
  {
    keywords: ["child", "baby", "infant", "newborn", "pediatric", "kid"],
    urgency: "soon",
    department: "Pediatrics",
    doctorType: "Pediatrician",
    reason: "Children and infants need age-specific medical assessment and dosing decisions.",
    tests: ["Pediatric clinical examination", "CBC if fever or weakness", "Urine test if fever without clear source"],
  },
  {
    keywords: ["anxiety", "depression", "panic", "sleep", "stress", "suicidal", "mental"],
    urgency: "soon",
    department: "Psychiatry",
    doctorType: "Psychiatrist",
    reason: "Mood, anxiety, panic, sleep, or severe stress symptoms may need mental-health evaluation.",
    tests: ["Clinical mental-health assessment", "TSH", "Vitamin B12", "Vitamin D", "CBC if fatigue is prominent"],
  },
  {
    keywords: ["eye", "vision", "red eye", "blurred vision"],
    urgency: "soon",
    department: "Ophthalmology",
    doctorType: "Eye Specialist",
    reason: "Eye pain, redness, vision changes, or injury should be evaluated by an eye specialist.",
    tests: ["Vision test", "Eye pressure test if advised", "Slit-lamp eye examination"],
  },
  {
    keywords: ["ear", "nose", "sinus", "tonsil", "hearing", "voice"],
    urgency: "routine",
    department: "ENT",
    doctorType: "ENT Specialist",
    reason: "Ear, nose, throat, sinus, tonsil, voice, or hearing problems are reviewed by ENT.",
    tests: ["ENT examination", "Throat swab if infection is suspected", "Audiometry for hearing issues", "Sinus imaging if advised"],
  },
]

const hindiDepartmentNames = {
  Cardiology: ["कार्डियोलॉजी", "हृदय रोग विशेषज्ञ"],
  "General Medicine": ["जनरल मेडिसिन", "फिजिशियन"],
  Gastroenterology: ["गैस्ट्रोएंटरोलॉजी", "पेट और पाचन विशेषज्ञ"],
  Dermatology: ["डर्मेटोलॉजी", "त्वचा रोग विशेषज्ञ"],
  Neurology: ["न्यूरोलॉजी", "न्यूरोलॉजिस्ट"],
  Orthopedics: ["ऑर्थोपेडिक्स", "हड्डी और जोड़ विशेषज्ञ"],
  Urology: ["यूरोलॉजी", "यूरोलॉजिस्ट"],
  Gynecology: ["गायनेकोलॉजी", "स्त्री रोग विशेषज्ञ"],
  Pediatrics: ["पीडियाट्रिक्स", "बाल रोग विशेषज्ञ"],
  Psychiatry: ["साइकियाट्री", "मनोचिकित्सक"],
  Ophthalmology: ["ऑफ्थैल्मोलॉजी", "नेत्र रोग विशेषज्ञ"],
  ENT: ["ENT", "कान-नाक-गला विशेषज्ञ"],
}

function localGuidance({ problem, age, gender, duration, conditions, language }) {
  const text = normalize(`${problem} ${conditions.join(" ")} ${duration} ${gender}`)
  const matched = departmentRules.find((rule) => rule.keywords.some((keyword) => text.includes(keyword)))
  const rule = matched || {
    urgency: "routine",
    department: "General Medicine",
    doctorType: "General Physician",
    reason: "A general physician can evaluate broad symptoms first and refer to the right specialist if needed.",
    tests: ["CBC", "Blood sugar", "Urine routine", "TSH if fatigue or weight change is present"],
  }
  const isHindi = language === "hi"
  const [department, doctorType] = isHindi ? hindiDepartmentNames[rule.department] || [rule.department, rule.doctorType] : [rule.department, rule.doctorType]

  return {
    urgency: rule.urgency,
    summary: isHindi
      ? "आपके बताए symptoms के आधार पर यह शुरुआती guidance है कि किस department में दिखाना बेहतर हो सकता है।"
      : "Based on the symptoms described, this is initial guidance on which department may be suitable.",
    recommendedDepartments: [
      {
        department,
        doctorType,
        reason: isHindi ? "इन symptoms की सही जांच और prescription के लिए यह specialist/department उपयुक्त हो सकता है।" : rule.reason,
      },
    ],
    suggestedTests: rule.tests.map((test) => ({
      test,
      reason: isHindi ? "Doctor symptoms और examination के बाद यह test consider कर सकते हैं।" : "A doctor may consider this after symptoms and examination.",
    })),
    redFlags: isHindi
      ? ["सीने में तेज दर्द, सांस लेने में दिक्कत, बेहोशी, confusion, severe weakness या uncontrolled bleeding हो तो emergency care लें।", "लक्षण तेजी से बढ़ रहे हों या कई दिनों से बने हों तो जल्दी doctor से मिलें।"]
      : ["Seek emergency care for severe chest pain, breathing difficulty, fainting, confusion, severe weakness, or uncontrolled bleeding.", "See a doctor soon if symptoms are worsening quickly or lasting for several days."],
    selfCareUntilVisit: isHindi
      ? ["आराम करें और पर्याप्त पानी लें यदि doctor ने fluid restriction नहीं बताया है।", "बिना doctor advice prescription medicine या antibiotics शुरू न करें।", "Symptoms, temperature, BP/sugar readings और current medicines note करके रखें।"]
      : ["Rest and stay hydrated unless a doctor has restricted fluids.", "Do not start prescription medicines or antibiotics without medical advice.", "Note symptoms, temperature, BP/sugar readings, and current medicines before the visit."],
    askDoctorChecklist: isHindi
      ? [
          "मेरे symptoms के सबसे common possible causes क्या हो सकते हैं?",
          `क्या मुझे ${rule.tests.slice(0, 3).join(", ")} जैसे tests की जरूरत हो सकती है?`,
          "कौन से warning signs होने पर मुझे emergency care लेनी चाहिए?",
          "क्या मेरी existing conditions या current medicines इस problem को affect कर सकती हैं?",
          "Follow-up कब करना चाहिए और result abnormal आए तो अगला step क्या होगा?",
        ]
      : [
          "What are the most common possible causes of my symptoms?",
          `Should I consider tests such as ${rule.tests.slice(0, 3).join(", ")}?`,
          "Which warning signs mean I should seek emergency care?",
          "Could my existing conditions or current medicines be contributing?",
          "When should I follow up, and what is the next step if results are abnormal?",
        ],
    questionsDoctorMayAsk: isHindi
      ? ["Symptoms कब शुरू हुए और क्या वे बढ़ रहे हैं?", "कोई fever, pain, vomiting, bleeding, weight change या breathlessness है?", "आप कौन सी medicines लेते हैं और पहले से कौन सी बीमारी है?"]
      : ["When did symptoms start and are they worsening?", "Is there fever, pain, vomiting, bleeding, weight change, or breathlessness?", "What medicines do you take and what conditions do you already have?"],
    disclaimer: isHindi
      ? "यह diagnosis या prescription नहीं है। सही treatment के लिए qualified doctor से मिलें।"
      : "This is not a diagnosis or prescription. Visit a qualified doctor for treatment decisions.",
    source: "Local guidance fallback",
  }
}

function fallbackAskDoctorChecklist(guidance, language) {
  const tests = (guidance.suggestedTests || [])
    .slice(0, 3)
    .map((item) => item.test)
    .filter(Boolean)
    .join(", ")

  if (language === "hi") {
    return [
      "मेरे symptoms के सबसे common possible causes क्या हो सकते हैं?",
      tests ? `क्या मुझे ${tests} जैसे tests की जरूरत हो सकती है?` : "कौन से tests मेरे symptoms के लिए useful हो सकते हैं?",
      "कौन से warning signs होने पर मुझे emergency care लेनी चाहिए?",
      "क्या मेरी existing conditions या current medicines इस problem को affect कर सकती हैं?",
      "Follow-up कब करना चाहिए और result abnormal आए तो अगला step क्या होगा?",
    ]
  }

  return [
    "What are the most common possible causes of my symptoms?",
    tests ? `Should I consider tests such as ${tests}?` : "Which tests may be useful for my symptoms?",
    "Which warning signs mean I should seek emergency care?",
    "Could my existing conditions or current medicines be contributing?",
    "When should I follow up, and what is the next step if results are abnormal?",
  ]
}

function normalizeGuidance(guidance, language) {
  return {
    ...guidance,
    askDoctorChecklist:
      Array.isArray(guidance.askDoctorChecklist) && guidance.askDoctorChecklist.length
        ? guidance.askDoctorChecklist
        : fallbackAskDoctorChecklist(guidance, language),
  }
}

export async function getSymptomGuidance(payload = {}) {
  const problem = String(payload.problem || "").trim()
  const language = payload.language === "hi" ? "hi" : "en"
  const conditions = splitValues(payload.conditions)

  if (problem.length < 10) {
    const error = new Error(language === "hi" ? "कृपया अपनी problem थोड़ी detail में लिखें।" : "Please describe the problem in a little more detail.")
    error.statusCode = 400
    throw error
  }

  const input = {
    problem,
    age: payload.age || null,
    gender: payload.gender || "",
    duration: payload.duration || "",
    conditions,
    language,
  }

  const aiResult = await analyzeSymptomsWithOpenAI(input)
  const guidance = normalizeGuidance(aiResult.available ? { ...aiResult.data, source: "OpenAI symptom guidance" } : localGuidance(input), language)

  return {
    guidance,
    aiEnhanced: aiResult.available,
    aiMessage: aiResult.message || "",
  }
}
