import { useEffect, useState } from "react"
import { Activity, FileText, LayoutDashboard } from "lucide-react"
import { getBloodHistory } from "../services/bloodReportService"
import { getDrugHistory } from "../services/drugService"
import { formatDate } from "../utils/formatDate"

export default function Dashboard() {
  const [drugHistory, setDrugHistory] = useState([])
  const [bloodHistory, setBloodHistory] = useState([])

  useEffect(() => {
    getDrugHistory().then((data) => setDrugHistory(data.logs || [])).catch(() => setDrugHistory([]))
    getBloodHistory().then((data) => setBloodHistory(data.logs || [])).catch(() => setBloodHistory([]))
  }, [])

  return (
    <div className="grid gap-6">
      <section className="surface-card animated-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-950 text-cyan-300">
            <LayoutDashboard className="h-5 w-5" />
          </span>
          <div>
            <p className="eyebrow">Care activity</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Clinical Dashboard</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Recent interaction checks and blood report analyses from this running backend.</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-card animated-card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-50 text-cyan-700">
              <Activity className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-black tracking-tight text-slate-950">Drug interaction history</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {drugHistory.length ? (
              drugHistory.map((log) => (
                <div key={log.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm">
                  <p className="font-bold text-slate-950">{log.drugs.join(" + ")}</p>
                  <p className="text-sm text-slate-500">{log.interactionCount} interaction(s) - {formatDate(log.createdAt)}</p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No checks yet.</p>
            )}
          </div>
        </section>

        <section className="surface-card animated-card p-5 sm:p-6" style={{ animationDelay: "90ms" }}>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-50 text-teal-700">
              <FileText className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-black tracking-tight text-slate-950">Blood report history</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {bloodHistory.length ? (
              bloodHistory.map((log) => (
                <div key={log.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm">
                  <p className="font-bold text-slate-950">Risk {log.riskPercentage}%</p>
                  <p className="text-sm text-slate-500">{log.language.toUpperCase()} - {formatDate(log.createdAt)}</p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No reports yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
