import { Activity, FileText, Home, LayoutDashboard, SearchCheck, Shield, Sparkles } from "lucide-react"

const items = [
  { id: "home", label: "Home", icon: Home },
  { id: "interactions", label: "Medicine Guide", icon: Shield },
  { id: "symptoms", label: "Care Guidance", icon: SearchCheck },
  { id: "blood", label: "Blood Report", icon: FileText },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
]

export default function Navbar({ currentPage, onNavigate }) {
  return (
    <nav className="sticky top-0 z-30 border-b border-white/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
        <button className="group flex items-center gap-3 text-left" onClick={() => onNavigate("home")}>
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-slate-950 text-cyan-300 shadow-lg shadow-cyan-900/10 transition group-hover:-translate-y-0.5">
            <Activity className="h-5 w-5" />
          </span>
          <div>
            <p className="text-lg font-black tracking-tight text-slate-950">cure&amp;care</p>
            <p className="text-xs font-semibold text-slate-500">Medicine guidance and report intelligence</p>
          </div>
        </button>

        <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:justify-end md:overflow-visible md:pb-0">
          {items.map((item) => {
            const Icon = item.icon
            const active = currentPage === item.id

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${
                  active ? "bg-cyan-600 text-white shadow-lg shadow-cyan-700/20" : "bg-slate-100 text-slate-700 hover:bg-white hover:text-cyan-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            )
          })}
          <span className="hidden items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-cyan-800 lg:flex">
            <Sparkles className="h-3.5 w-3.5" />
            Live beta
          </span>
        </div>
      </div>
    </nav>
  )
}
