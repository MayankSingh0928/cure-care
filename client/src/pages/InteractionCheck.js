import { useState } from "react"
import AlertCard from "../components/AlertCard"
import Loader from "../components/Loader"
import { checkDrugInteractions } from "../services/drugService"
import { Activity, Languages, Leaf, Pill, ShieldCheck, Sparkles } from "lucide-react"

const labels = {
  en: {
    eyebrow: "Medicine Guide",
    title: "Medicine Uses & Side Effects",
    description: "Enter a drug or medicine name to see its common uses, possible side effects, important warnings, and Ayurvedic remedies with similar intended effects.",
    medicine: "Drug or medicine name",
    medicinePlaceholder: "Example: Ibuprofen, Paracetamol, Cetirizine",
    conditions: "Patient context (optional)",
    conditionsPlaceholder: "Example: diabetes, kidney disease, pregnancy",
    age: "Age (optional)",
    button: "Find medicine info",
    readyTitle: "Ready to explain",
    readyText: "Search for one medicine. Results will show patient-friendly uses, side effects, warnings, safe-use notes, and Ayurvedic options.",
    resultEyebrow: "Medicine result",
    uses: "Uses",
    sideEffects: "Side effects",
    seriousWarnings: "Important warnings",
    safeUse: "Safe use guidance",
    ayurvedicTitle: "Ayurvedic remedies with similar effect",
    similarEffect: "Similar intended effect",
    caution: "Caution",
    evidenceNote: "Evidence note",
    noItems: "No clear information available.",
    disclaimer: "Note",
    sourceLabel: "Source",
  },
  hi: {
    eyebrow: "दवा गाइड",
    title: "दवा के उपयोग और दुष्प्रभाव",
    description: "किसी दवा या मेडिसिन का नाम डालें। आपको उसके सामान्य उपयोग, संभावित दुष्प्रभाव, जरूरी सावधानियां और मिलते-जुलते प्रभाव वाले आयुर्वेदिक विकल्प मिलेंगे।",
    medicine: "दवा या मेडिसिन का नाम",
    medicinePlaceholder: "उदाहरण: Ibuprofen, Paracetamol, Cetirizine",
    conditions: "रोगी की जानकारी (वैकल्पिक)",
    conditionsPlaceholder: "उदाहरण: diabetes, kidney disease, pregnancy",
    age: "उम्र (वैकल्पिक)",
    button: "दवा की जानकारी देखें",
    readyTitle: "जानकारी के लिए तैयार",
    readyText: "एक दवा खोजें। परिणाम में उपयोग, दुष्प्रभाव, सावधानियां, सुरक्षित उपयोग और आयुर्वेदिक विकल्प दिखेंगे।",
    resultEyebrow: "दवा परिणाम",
    uses: "उपयोग",
    sideEffects: "दुष्प्रभाव",
    seriousWarnings: "जरूरी सावधानियां",
    safeUse: "सुरक्षित उपयोग",
    ayurvedicTitle: "मिलते-जुलते प्रभाव वाले आयुर्वेदिक उपाय",
    similarEffect: "मिलता-जुलता प्रभाव",
    caution: "सावधानी",
    evidenceNote: "प्रमाण संबंधी टिप्पणी",
    noItems: "स्पष्ट जानकारी उपलब्ध नहीं है।",
    disclaimer: "नोट",
    sourceLabel: "स्रोत",
  },
}

function splitValues(value) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function TextSection({ title, items, emptyText }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="mb-3 font-black text-cyan-700">{title}</h4>
      <ul className="grid gap-2 text-sm leading-6 text-slate-600">
        {(items?.length ? items : [emptyText]).map((item) => (
          <li key={item} className="pl-3 before:mr-2 before:text-cyan-600 before:content-['•']">
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}

function RemedyCard({ remedy, labels }) {
  return (
    <article className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
      <div className="mb-3 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white">
          <Leaf className="h-4 w-4" />
        </span>
        <div>
          <h4 className="font-black text-slate-950">{remedy.name}</h4>
          <p className="mt-1 text-sm leading-6 text-emerald-900">
            <span className="font-bold">{labels.similarEffect}: </span>
            {remedy.similarEffect}
          </p>
        </div>
      </div>
      {remedy.evidenceNote && (
        <p className="rounded-lg bg-white/70 p-3 text-sm leading-6 text-slate-700">
          <span className="font-bold">{labels.evidenceNote}: </span>
          {remedy.evidenceNote}
        </p>
      )}
      {remedy.caution && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
          {labels.caution}: {remedy.caution}
        </p>
      )}
    </article>
  )
}

function MedicineInfoCard({ info, labels }) {
  if (!info) return null

  return (
    <article className="grid gap-5">
      <div className="rounded-lg border border-cyan-200 bg-cyan-50/70 p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-2xl font-black tracking-tight text-slate-950">{info.medicine}</h3>
            <p className="mt-1 text-sm font-bold text-cyan-800">
              {labels.sourceLabel}: {info.source}
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-black text-cyan-800 shadow-sm">
            <Pill className="h-4 w-4" />
            {info.category || "Medicine"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextSection title={labels.uses} items={info.uses} emptyText={labels.noItems} />
        <TextSection title={labels.sideEffects} items={info.sideEffects} emptyText={labels.noItems} />
        <TextSection title={labels.seriousWarnings} items={info.seriousWarnings} emptyText={labels.noItems} />
        <TextSection title={labels.safeUse} items={info.safeUse} emptyText={labels.noItems} />
      </div>

      <section className="grid gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-600 text-white">
            <Leaf className="h-5 w-5" />
          </span>
          <h3 className="text-xl font-black tracking-tight text-slate-950">{labels.ayurvedicTitle}</h3>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {(info.ayurvedicRemedies?.length ? info.ayurvedicRemedies : []).map((remedy) => (
            <RemedyCard key={`${remedy.name}-${remedy.similarEffect}`} remedy={remedy} labels={labels} />
          ))}
        </div>
      </section>

    </article>
  )
}

export default function InteractionCheck() {
  const [language, setLanguage] = useState("en")
  const [medicine, setMedicine] = useState("Ibuprofen")
  const [conditions, setConditions] = useState("")
  const [age, setAge] = useState("")
  const [result, setResult] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function runCheck(nextLanguage = language) {
    const trimmedMedicine = medicine.trim()
    if (!trimmedMedicine) {
      setError(nextLanguage === "hi" ? "कृपया दवा का नाम डालें।" : "Please enter a medicine name.")
      setResult(null)
      return
    }

    setError("")
    setResult(null)
    setLoading(true)

    try {
      const data = await checkDrugInteractions({
        medicine: trimmedMedicine,
        drugs: [trimmedMedicine],
        conditions: splitValues(conditions),
        age: age ? Number(age) : null,
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
              हिंदी
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">{t.medicine}</span>
            <input
              value={medicine}
              onChange={(event) => setMedicine(event.target.value)}
              className="field"
              placeholder={t.medicinePlaceholder}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">{t.conditions}</span>
            <input
              value={conditions}
              onChange={(event) => setConditions(event.target.value)}
              className="field"
              placeholder={t.conditionsPlaceholder}
            />
          </label>

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
        {loading && <Loader label={language === "hi" ? "दवा की जानकारी तैयार हो रही है..." : "Preparing medicine information..."} />}
        {error && <AlertCard title={language === "hi" ? "जानकारी नहीं मिल सकी" : "Lookup failed"} message={error} type="error" />}
        {result && (
          <div className="surface-card animated-card p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow">{t.resultEyebrow}</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{result.medicineInfo?.medicine || medicine}</h2>
              </div>
              <p className="inline-flex items-center gap-2 rounded-lg bg-cyan-50 px-3 py-2 text-sm font-bold text-cyan-800">
                <Sparkles className="h-4 w-4" />
                {result.sourceSummary}
              </p>
            </div>
            <MedicineInfoCard info={result.medicineInfo} labels={t} />
          </div>
        )}
      </section>
    </div>
  )
}
