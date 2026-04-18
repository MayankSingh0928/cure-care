import { useState } from "react"
import AlertCard from "../components/AlertCard"
import BloodReportCard from "../components/BloodReportCard"
import Loader from "../components/Loader"
import { analyzeBloodReport } from "../services/bloodReportService"
import { FileText, Languages, UploadCloud } from "lucide-react"

export default function BloodReportCheck() {
  const [language, setLanguage] = useState("en")
  const [text, setText] = useState("")
  const [file, setFile] = useState(null)
  const [report, setReport] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function runAnalysis(nextLanguage = language) {
    setError("")
    setReport(null)
    setLoading(true)

    try {
      const data = await analyzeBloodReport({ text, file, language: nextLanguage })
      setReport(data.report)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    await runAnalysis(language)
  }

  async function handleLanguageChange(nextLanguage) {
    setLanguage(nextLanguage)

    if (report) {
      await runAnalysis(nextLanguage)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.84fr_1.16fr]">
      <section className="surface-card animated-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-cyan-600 text-white">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <p className="eyebrow">Report Analyzer</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Blood Report AI Analysis</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Upload a report or paste values. The AI workflow returns risk percentage, causes, prevention, cure direction, remedies, and medicine guidance.
              </p>
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
            <span className="text-sm font-bold text-slate-700">Upload report</span>
            <input
              type="file"
              accept=".txt,.csv,.pdf,.jpg,.jpeg,.png"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="rounded-lg border border-dashed border-cyan-300 bg-cyan-50/60 p-3 text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:font-bold file:text-white"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">Report text</span>
            <textarea
              rows={8}
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="field resize-none"
              placeholder="Paste CBC, LFT, KFT, lipid, thyroid, or vitamin values"
            />
          </label>
          <button className="primary-button">
            <UploadCloud className="h-5 w-5" />
            Generate AI report
          </button>
        </form>
      </section>

      <section className="grid content-start gap-4">
        {!loading && !error && !report && (
          <div className="surface-card animated-card grid min-h-[360px] place-items-center p-6 text-center">
            <div>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-slate-950 text-cyan-300" style={{ animation: "float-soft 4s ease-in-out infinite" }}>
                <FileText className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">Report preview will appear here</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                Generate a readable summary with risk score, abnormal values, and plain-language recommendations.
              </p>
            </div>
          </div>
        )}
        {loading && <Loader label="Analyzing blood report..." />}
        {error && <AlertCard title="Analysis failed" message={error} type="error" />}
        <BloodReportCard report={report} language={language} />
      </section>
    </div>
  )
}
