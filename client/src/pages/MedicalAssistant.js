import { useState } from "react"
import { Bot, Database, FileSearch, Send, ShieldCheck, Stethoscope } from "lucide-react"
import AlertCard from "../components/AlertCard"
import Loader from "../components/Loader"
import { analyzeMedicalAssistant } from "../services/medicalAssistantService"

function MarkdownResponse({ markdown }) {
  if (!markdown) return null

  return (
    <div className="grid gap-3 text-sm leading-7 text-slate-700">
      {markdown.split("\n").map((line, index) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={`space-${index}`} className="h-1" />

        const headingMatch = trimmed.match(/^\*\*(.+)\*\*$/)
        if (headingMatch) {
          return (
            <h3 key={`${trimmed}-${index}`} className="pt-2 text-lg font-black tracking-tight text-slate-950">
              {headingMatch[1]}
            </h3>
          )
        }

        if (trimmed.startsWith("- ")) {
          return (
            <p key={`${trimmed}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3 font-semibold shadow-sm">
              {trimmed.slice(2)}
            </p>
          )
        }

        return (
          <p key={`${trimmed}-${index}`} className={trimmed.startsWith("*Note:") ? "rounded-lg border border-amber-200 bg-amber-50 p-3 font-semibold text-amber-900" : ""}>
            {trimmed}
          </p>
        )
      })}
    </div>
  )
}

function RetrievedDocuments({ documents }) {
  if (!documents?.length) return null

  return (
    <section className="surface-card animated-card p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-50 text-teal-700">
          <Database className="h-5 w-5" />
        </span>
        <div>
          <p className="eyebrow">RAG Context</p>
          <h3 className="font-black text-slate-950">Retrieved clinical snippets</h3>
        </div>
      </div>
      <div className="grid gap-3">
        {documents.map((doc, index) => (
          <article key={doc.id || `${doc.title}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-950">[{index + 1}] {doc.title}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">{doc.source}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{doc.content}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default function MedicalAssistant() {
  const [symptoms, setSymptoms] = useState("fever, headache, nausea")
  const [query, setQuery] = useState("What disease might match these symptoms, and what should I do next?")
  const [result, setResult] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    if (query.trim().length < 3) {
      setError("Please enter a medical question for the assistant.")
      setResult(null)
      return
    }

    setError("")
    setResult(null)
    setLoading(true)

    try {
      const data = await analyzeMedicalAssistant({
        userQuery: query.trim(),
        symptoms,
        vectorProvider: "local",
      })
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
      <section className="surface-card animated-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-950 text-cyan-300">
            <Bot className="h-5 w-5" />
          </span>
          <div>
            <p className="eyebrow">AI Medical Assistant</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Disease prediction + RAG co-pilot</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Submit symptoms and a question. FastAPI predicts a likely disease class, retrieves relevant snippets, and generates a grounded response with a safety disclaimer.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">User question</span>
            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              rows={4}
              className="field resize-none"
              placeholder="Example: What disease might match these symptoms, and what doctor should I visit?"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">Symptoms</span>
            <textarea
              value={symptoms}
              onChange={(event) => setSymptoms(event.target.value)}
              rows={4}
              className="field resize-none"
              placeholder="Example: fever, cough, fatigue, headache"
            />
            <span className="text-xs font-semibold text-slate-500">Use comma-separated symptoms or plain language. This feeds the disease `.pkl` model.</span>
          </label>

          <button className="primary-button">
            <Send className="h-5 w-5" />
            Predict disease with ML + RAG
          </button>
        </form>
      </section>

      <section className="grid content-start gap-4">
        {!loading && !error && !result && (
          <div className="surface-card animated-card grid min-h-[420px] place-items-center p-6 text-center">
            <div>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-slate-950 text-cyan-300" style={{ animation: "float-soft 4s ease-in-out infinite" }}>
                <Stethoscope className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">Grounded response will appear here</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                The assistant will show status overview, evidence-based guidance, next steps, retrieved snippets, and the required clinical disclaimer.
              </p>
            </div>
          </div>
        )}

        {loading && <Loader label="Running classifier, retrieval, and grounded synthesis..." />}
        {error && <AlertCard title="Assistant request failed" message={error} type="error" />}

        {result && (
          <>
            <article className="surface-card animated-card p-5 sm:p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="eyebrow">{result.assistant?.source || (result.aiEnhanced ? "AI synthesis" : "Local synthesis")}</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Clinical assistant response</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Vector provider: {result.vectorProvider || "FastAPI/Express fallback"}</p>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-900">
                  <ShieldCheck className="h-4 w-4" />
                  Safety constrained
                </span>
              </div>
              <MarkdownResponse markdown={result.assistant?.responseMarkdown} />
            </article>

            {result.diagnosticData && (
              <section className="surface-card animated-card p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-50 text-cyan-700">
                    <FileSearch className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="eyebrow">Disease Prediction Result</p>
                    <h3 className="font-black text-slate-950">
                      {result.diagnosticData.predictedDisease || result.diagnosticData.riskBand} - {result.diagnosticData.confidencePercent ?? result.diagnosticData.probabilityPercent ?? "N/A"}%
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{result.diagnosticData.modelName}</p>
                    {result.diagnosticData.topPredictions?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {result.diagnosticData.topPredictions.slice(0, 5).map((item) => (
                          <span key={`${item.disease}-${item.confidencePercent}`} className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-800">
                            {item.disease}: {item.confidencePercent ?? "N/A"}%
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            <RetrievedDocuments documents={result.retrievedDocuments} />
          </>
        )}
      </section>
    </div>
  )
}
