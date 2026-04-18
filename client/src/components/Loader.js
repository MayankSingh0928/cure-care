export default function Loader({ label = "Loading..." }) {
  return (
    <div className="animated-card flex items-center gap-3 rounded-lg border border-cyan-200 bg-white p-4 text-slate-700 shadow-sm">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-600 border-t-transparent" />
      {label}
    </div>
  )
}
