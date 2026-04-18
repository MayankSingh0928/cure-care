import { useState } from "react"
import AlertCard from "../components/AlertCard"
import DrugResultCard from "../components/DrugResultCard"
import Loader from "../components/Loader"
import { checkDrugInteractions } from "../services/drugService"
import { Activity, Languages, ShieldCheck, Sparkles } from "lucide-react"

function splitValues(value) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const labels = {
  en: {
    eyebrow: "Analysis Tool",
    title: "Drug Interaction Checker",
    description: "Enter one medicine for uses and side effects, or two or more medicines to check interaction risks. The backend checks the CSV dataset and OpenFDA signals when available.",
    medicines: "Medicines",
    conditions: "Patient conditions",
    age: "Age",
    renal: "Renal impairment",
    button: "Run safety check",
    readyTitle: "Ready to scan",
    readyText: "Results will appear here with medicine information, source coverage, severity, and practical guidance.",
    resultEyebrow: "Results",
    interactionTitle: "Interaction Summary",
    singleTitle: "Medicine Information",
    riskSignals: "risk signal(s) found",
    noMajorTitle: "No major interactions found",
    noMajorMessage: "No matching risk signal was found in the configured CSV/OpenFDA workflow. This is not a complete clinical clearance.",
    uses: "Uses",
    sideEffects: "Side effects",
    seriousWarnings: "Important warnings",
    safeUse: "Safe use guidance",
    disclaimer: "Note",
  },
  hi: {
    eyebrow: "Analysis Tool",
    title: "Drug Interaction Checker",
    description: "एक medicine डालें तो uses और side effects दिखेंगे। दो या ज्यादा medicines डालें तो interaction risk check होगा।",
    medicines: "Medicines",
    conditions: "Patient conditions",
    age: "Age",
    renal: "Kidney problem",
    button: "Safety check चलाएं",
    readyTitle: "Scan के लिए तैयार",
    readyText: "Result में medicine information, source coverage, severity और practical guidance दिखेगी।",
    resultEyebrow: "Results",
    interactionTitle: "Interaction Summary",
    singleTitle: "Medicine Information",
    riskSignals: "risk signal मिले",
    noMajorTitle: "कोई major interaction नहीं मिला",
    noMajorMessage: "Configured CSV/OpenFDA workflow में matching risk signal नहीं मिला। यह complete clinical clearance नहीं है।",
    uses: "उपयोग",
    sideEffects: "Side effects",
    seriousWarnings: "Important warnings",
    safeUse: "Safe use guidance",
    disclaimer: "Note",
  },
}

function SingleDrugInfoCard({ info, labels }) {
  if (!info) return null

  const sections = [
    ["uses", info.uses],
    ["sideEffects", info.sideEffects],
    ["seriousWarnings", info.seriousWarnings],
    ["safeUse", info.safeUse],
  ]

  return (
    <article className="animated-card rounded-lg border border-cyan-200 bg-cyan-50/60 p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-black tracking-tight text-slate-950">{info.medicine}</h3>
          <p className="mt-1 text-sm font-bold text-cyan-800">{info.source}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map(([key, items]) => (
          <section key={key} className="rounded-lg bg-white p-4 shadow-sm">
            <h4 className="mb-2 font-black text-cyan-700">{labels[key]}</h4>
            <ul className="grid gap-2 text-sm leading-6 text-slate-600">
              {(items || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {info.disclaimer && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
          {labels.disclaimer}: {info.disclaimer}
        </p>
      )}
    </article>
  )
}

export default function InteractionCheck() {
  const [language, setLanguage] = useState("en")
  const [drugs, setDrugs] = useState("Warfarin\nIbuprofen")
  const [conditions, setConditions] = useState("")
  const [age, setAge] = useState("")
  const [renalImpairment, setRenalImpairment] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function runCheck(nextLanguage = language) {
    setError("")
    setResult(null)
    setLoading(true)

    try {
      const data = await checkDrugInteractions({
        drugs: splitValues(drugs),
        conditions: splitValues(conditions),
        age: age ? Number(age) : null,
        renalImpairment,
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
    await runCheck(language)
  }

  async function handleLanguageChange(nextLanguage) {
    setLanguage(nextLanguage)
    if (result) {
      await runCheck(nextLanguage)
    }
  }

  const t = labels[language]

  return (
    <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
      <section className="surface-card animated-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-cyan-600 text-white">
              <ShieldCheck className="h-5 w-5" />
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
              Hindi
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">{t.medicines}</span>
            <textarea
              value={drugs}
              onChange={(event) => setDrugs(event.target.value)}
              rows={6}
              className="field resize-none"
              placeholder="Warfarin, Ibuprofen"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">{t.conditions}</span>
            <input
              value={conditions}
              onChange={(event) => setConditions(event.target.value)}
              className="field"
              placeholder="Kidney disease, diabetes"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">{t.age}</span>
              <input
                type="number"
                min="0"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                className="field"
              />
            </label>
            <label className="flex min-h-[74px] items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <input className="h-5 w-5 accent-cyan-600" type="checkbox" checked={renalImpairment} onChange={(event) => setRenalImpairment(event.target.checked)} />
              <span className="text-sm font-bold text-slate-700">{t.renal}</span>
            </label>
          </div>

          <button className="primary-button">{t.button}</button>
        </form>
      </section>

      <section className="grid content-start gap-4">
        {!loading && !error && !result && (
          <div className="surface-card animated-card grid min-h-[360px] place-items-center p-6 text-center">
            <div>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-slate-950 text-cyan-300" style={{ animation: "float-soft 4s ease-in-out infinite" }}>
                <Activity className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">{t.readyTitle}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{t.readyText}</p>
            </div>
          </div>
        )}
        {loading && <Loader label="Checking clinical signals..." />}
        {error && <AlertCard title="Checker failed" message={error} type="error" />}
        {result?.coverageNotice && <AlertCard title="Data Coverage Notice" message={result.coverageNotice} />}
        {result && (
          <div className="surface-card animated-card p-5 sm:p-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow">{t.resultEyebrow}</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{result.singleDrugInfo ? t.singleTitle : t.interactionTitle}</h2>
                {!result.singleDrugInfo && <p className="text-sm text-slate-500">{result.interactions.length} {t.riskSignals}</p>}
              </div>
              <p className="inline-flex items-center gap-2 rounded-lg bg-cyan-50 px-3 py-2 text-sm font-bold text-cyan-800">
                <Sparkles className="h-4 w-4" />
                {result.sourceSummary}
              </p>
            </div>
            <div className="mb-5 flex flex-wrap gap-2">
              {result.normalizedDrugs.map((drug) => (
                <span key={drug} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                  {drug}
                </span>
              ))}
            </div>
            <div className="grid gap-4">
              {result.singleDrugInfo ? (
                <SingleDrugInfoCard info={result.singleDrugInfo} labels={t} />
              ) : result.interactions.length > 0 ? (
                result.interactions.map((interaction) => <DrugResultCard key={interaction.id} result={interaction} />)
              ) : (
                <AlertCard title={t.noMajorTitle} message={t.noMajorMessage} type="success" />
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
