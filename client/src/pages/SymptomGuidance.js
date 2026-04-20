import { useState } from "react"
import { AlertTriangle, CheckSquare, ClipboardList, Languages, SearchCheck, Stethoscope } from "lucide-react"
import AlertCard from "../components/AlertCard"
import Loader from "../components/Loader"
import { analyzeSymptoms } from "../services/symptomService"

const labels = {
  en: {
    eyebrow: "Care Guidance",
    title: "Find The Right Doctor Department",
    description: "Describe the patient's problem and get guidance on which medical department or doctor to visit, plus tests a doctor may consider.",
    problem: "Describe the problem",
    problemPlaceholder: "Example: I have chest tightness and shortness of breath while walking for 3 days.",
    duration: "Duration",
    durationPlaceholder: "Example: 3 days, 2 weeks, since yesterday",
    age: "Age",
    gender: "Gender",
    genderPlaceholder: "Example: male, female, other",
    conditions: "Known conditions or medicines",
    conditionsPlaceholder: "Example: diabetes, high blood pressure, thyroid medicine",
    button: "Get care guidance",
    readyTitle: "Guidance will appear here",
    readyText: "The result will suggest a suitable department, doctor type, tests to discuss, urgency, and red flags.",
    loading: "Preparing care guidance...",
    failed: "Guidance failed",
    urgency: "Urgency",
    departments: "Recommended department",
    tests: "Tests to discuss with doctor",
    askDoctorChecklist: "What to Ask Your Doctor",
    redFlags: "Red flags",
    selfCare: "Until the visit",
    doctorQuestions: "Doctor may ask",
    note: "Note",
    source: "Source",
  },
  hi: {
    eyebrow: "केयर गाइडेंस",
    title: "सही डॉक्टर विभाग चुनें",
    description: "Patient की problem लिखें और जानें कि prescription/evaluation के लिए किस medical department या doctor को दिखाना बेहतर होगा, साथ में doctor किन tests पर विचार कर सकते हैं।",
    problem: "Problem detail में लिखें",
    problemPlaceholder: "उदाहरण: मुझे 3 दिन से चलने पर chest tightness और सांस फूल रही है।",
    duration: "कितने समय से",
    durationPlaceholder: "उदाहरण: 3 दिन, 2 हफ्ते, कल से",
    age: "उम्र",
    gender: "Gender",
    genderPlaceholder: "उदाहरण: male, female, other",
    conditions: "पहले से बीमारी या medicines",
    conditionsPlaceholder: "उदाहरण: diabetes, high blood pressure, thyroid medicine",
    button: "Care guidance देखें",
    readyTitle: "Guidance यहां दिखेगी",
    readyText: "Result में suitable department, doctor type, discuss करने वाले tests, urgency और red flags दिखेंगे।",
    loading: "Care guidance तैयार हो रही है...",
    failed: "Guidance नहीं मिल सकी",
    urgency: "Urgency",
    departments: "Recommended department",
    tests: "Doctor से discuss करने वाले tests",
    askDoctorChecklist: "Doctor से क्या पूछें",
    redFlags: "Red flags",
    selfCare: "Visit तक क्या करें",
    doctorQuestions: "Doctor पूछ सकते हैं",
    note: "नोट",
    source: "Source",
  },
}

const urgencyTone = {
  routine: "border-emerald-200 bg-emerald-50 text-emerald-900",
  soon: "border-cyan-200 bg-cyan-50 text-cyan-900",
  urgent: "border-amber-200 bg-amber-50 text-amber-950",
  emergency: "border-rose-200 bg-rose-50 text-rose-950",
}

function ResultList({ title, items }) {
  if (!items?.length) return null

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 font-black text-cyan-700">{title}</h3>
      <ul className="grid gap-2 text-sm leading-6 text-slate-600">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

function GuidanceResult({ result, labels }) {
  if (!result) return null

  const guidance = result.guidance

  return (
    <article className="surface-card animated-card p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">{labels.source}: {guidance.source || (result.aiEnhanced ? "OpenAI" : "Local guidance")}</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{guidance.summary}</h2>
        </div>
        <span className={`inline-flex w-fit items-center gap-2 rounded-lg border px-4 py-3 text-sm font-black uppercase ${urgencyTone[guidance.urgency] || urgencyTone.routine}`}>
          <AlertTriangle className="h-4 w-4" />
          {labels.urgency}: {guidance.urgency}
        </span>
      </div>

      <section className="mb-4 grid gap-3">
        <h3 className="text-xl font-black tracking-tight text-slate-950">{labels.departments}</h3>
        {(guidance.recommendedDepartments || []).map((item) => (
          <div key={`${item.department}-${item.doctorType}`} className="rounded-lg border border-cyan-200 bg-cyan-50/70 p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-cyan-600 text-white">
                <Stethoscope className="h-5 w-5" />
              </span>
              <div>
                <h4 className="font-black text-slate-950">{item.department}</h4>
                <p className="mt-1 text-sm font-bold text-cyan-800">{item.doctorType}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.reason}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-black text-cyan-700">{labels.tests}</h3>
        <div className="grid gap-3">
          {(guidance.suggestedTests || []).map((item) => (
            <div key={`${item.test}-${item.reason}`} className="rounded-lg bg-slate-50 p-3">
              <p className="font-black text-slate-950">{item.test}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{item.reason}</p>
            </div>
          ))}
        </div>
      </section>

      {guidance.askDoctorChecklist?.length > 0 && (
        <section className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white">
              <CheckSquare className="h-5 w-5" />
            </span>
            <h3 className="font-black text-emerald-900">{labels.askDoctorChecklist}</h3>
          </div>
          <ul className="grid gap-2 text-sm leading-6 text-emerald-950">
            {guidance.askDoctorChecklist.map((item) => (
              <li key={item} className="rounded-lg bg-white/75 p-3 font-semibold shadow-sm">
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <ResultList title={labels.redFlags} items={guidance.redFlags} />
        <ResultList title={labels.selfCare} items={guidance.selfCareUntilVisit} />
        <ResultList title={labels.doctorQuestions} items={guidance.questionsDoctorMayAsk} />
      </div>

      {guidance.disclaimer && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
          {labels.note}: {guidance.disclaimer}
        </p>
      )}
    </article>
  )
}

export default function SymptomGuidance() {
  const [language, setLanguage] = useState("en")
  const [problem, setProblem] = useState("")
  const [duration, setDuration] = useState("")
  const [age, setAge] = useState("")
  const [gender, setGender] = useState("")
  const [conditions, setConditions] = useState("")
  const [result, setResult] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function runGuidance(nextLanguage = language) {
    setError("")
    setResult(null)
    setLoading(true)

    try {
      const data = await analyzeSymptoms({
        problem,
        duration,
        age: age ? Number(age) : null,
        gender,
        conditions,
        language: nextLanguage,
      })
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    await runGuidance(language)
  }

  async function handleLanguageChange(nextLanguage) {
    setLanguage(nextLanguage)
    if (result) {
      await runGuidance(nextLanguage)
    }
  }

  const t = labels[language]

  return (
    <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
      <section className="surface-card animated-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-cyan-600 text-white">
              <SearchCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="eyebrow">{t.eyebrow}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{t.title}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t.description}</p>
            </div>
          </div>
          <div className="grid shrink-0 grid-cols-2 rounded-lg border border-slate-200 bg-slate-100 p-1 text-sm font-bold">
            <button
              type="button"
              onClick={() => handleLanguageChange("en")}
              className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 transition ${language === "en" ? "bg-white text-cyan-700 shadow-sm" : "text-slate-500"}`}
            >
              <Languages className="h-4 w-4" />
              English
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange("hi")}
              className={`rounded-md px-3 py-2 transition ${language === "hi" ? "bg-white text-cyan-700 shadow-sm" : "text-slate-500"}`}
            >
              हिंदी
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">{t.problem}</span>
            <textarea
              value={problem}
              onChange={(event) => setProblem(event.target.value)}
              rows={7}
              className="field resize-none"
              placeholder={t.problemPlaceholder}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">{t.duration}</span>
              <input value={duration} onChange={(event) => setDuration(event.target.value)} className="field" placeholder={t.durationPlaceholder} />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">{t.age}</span>
              <input type="number" min="0" value={age} onChange={(event) => setAge(event.target.value)} className="field" />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">{t.gender}</span>
            <input value={gender} onChange={(event) => setGender(event.target.value)} className="field" placeholder={t.genderPlaceholder} />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">{t.conditions}</span>
            <input value={conditions} onChange={(event) => setConditions(event.target.value)} className="field" placeholder={t.conditionsPlaceholder} />
          </label>

          <button className="primary-button">
            <ClipboardList className="h-5 w-5" />
            {t.button}
          </button>
        </form>
      </section>

      <section className="grid content-start gap-4">
        {!loading && !error && !result && (
          <div className="surface-card animated-card grid min-h-[360px] place-items-center p-6 text-center">
            <div>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-slate-950 text-cyan-300" style={{ animation: "float-soft 4s ease-in-out infinite" }}>
                <Stethoscope className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">{t.readyTitle}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{t.readyText}</p>
            </div>
          </div>
        )}
        {loading && <Loader label={t.loading} />}
        {error && <AlertCard title={t.failed} message={error} type="error" />}
        <GuidanceResult result={result} labels={t} />
      </section>
    </div>
  )
}
