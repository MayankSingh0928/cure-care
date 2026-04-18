import { AlertTriangle } from "lucide-react"

export default function AlertCard({ title, message, children, tone = "info", type }) {
  const activeTone = type === "error" ? "danger" : type === "success" ? "success" : tone
  const styles = {
    danger: "border-rose-200 bg-rose-50 text-rose-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    info: "border-cyan-200 bg-cyan-50 text-cyan-900",
  }[activeTone] || "border-cyan-200 bg-cyan-50 text-cyan-900"

  return (
    <div className={`animated-card rounded-lg border p-4 shadow-sm ${styles}`}>
      <div className="mb-2 flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4" />
        {title}
      </div>
      <div className="text-sm leading-6 opacity-90">{children || message}</div>
    </div>
  )
}
