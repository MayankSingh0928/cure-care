import { riskColor } from "../utils/riskColor"

function getSourceLabel(source = "") {
  const normalized = source.toLowerCase()

  if (normalized.includes("csv")) return "CSV dataset result"
  if (normalized.includes("openfda") || normalized.includes("faers")) return "OpenFDA / internet signal"
  if (normalized.includes("curated")) return "Curated clinical rule"

  return source || "Source not specified"
}

export default function DrugResultCard({ result }) {
  return (
    <article className={`animated-card rounded-lg border p-5 shadow-sm ${riskColor(result.severity)}`}>
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h3 className="text-lg font-black tracking-tight">{result.drugs.join(" + ")}</h3>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <span className="w-fit rounded-full bg-white/70 px-3 py-1 text-xs font-black uppercase shadow-sm">{result.severity}</span>
          <span className="w-fit rounded-full bg-slate-950/90 px-3 py-1 text-xs font-black uppercase text-white shadow-sm">
            {getSourceLabel(result.source)}
          </span>
        </div>
      </div>
      <p className="mb-4 text-sm leading-6 opacity-85">{result.description}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg bg-white/60 p-3">
          <p className="text-xs font-black uppercase tracking-wide opacity-70">Why it matters</p>
          <p className="mt-1 text-sm leading-6">{result.patientLanguage || result.mechanism}</p>
        </div>
        <div className="rounded-lg bg-white/60 p-3">
          <p className="text-xs font-black uppercase tracking-wide opacity-70">What to do</p>
          <p className="mt-1 text-sm leading-6">{result.recommendation}</p>
        </div>
      </div>
    </article>
  )
}
