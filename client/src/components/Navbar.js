import { useState } from "react"
import { Activity, FileText, Home, LayoutDashboard, Menu, SearchCheck, Shield, X } from "lucide-react"

const items = [
  { id: "home", label: "Home", icon: Home },
  { id: "interactions", label: "Medicine Guide", icon: Shield },
  { id: "symptoms", label: "Care Guidance", icon: SearchCheck },
  { id: "blood", label: "Blood Report", icon: FileText },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
]

export default function Navbar({ currentPage, onNavigate }) {
  const [open, setOpen] = useState(false)

  function navigate(page) {
    onNavigate(page)
    setOpen(false)
  }

  return (
    <nav className="sticky top-0 z-30 border-b border-white/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <button className="group flex min-w-0 items-center gap-3 text-left" onClick={() => navigate("home")} aria-label="Go to home">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-950 text-cyan-300 shadow-lg shadow-cyan-900/10 transition group-hover:-translate-y-0.5">
              <Activity className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-black tracking-tight text-slate-950">cure&amp;care</span>
              <span className="hidden text-xs font-semibold text-slate-500 min-[420px]:block">Medicine guidance and report intelligence</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700 md:hidden"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="hidden items-center gap-2 md:flex md:flex-wrap md:justify-end">
            {items.map((item) => {
              const Icon = item.icon
              const active = currentPage === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${
                    active ? "bg-cyan-600 text-white shadow-lg shadow-cyan-700/20" : "bg-slate-100 text-slate-700 hover:bg-white hover:text-cyan-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        {open && (
          <div className="mt-3 grid gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-xl shadow-slate-950/5 md:hidden">
            {items.map((item) => {
              const Icon = item.icon
              const active = currentPage === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-bold transition ${
                    active ? "bg-cyan-600 text-white shadow-lg shadow-cyan-700/20" : "bg-slate-50 text-slate-700 hover:bg-cyan-50 hover:text-cyan-700"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </nav>
  )
}
