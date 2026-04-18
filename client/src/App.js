import { useEffect, useState } from "react"
import Navbar from "./components/Navbar"
import BloodReportCheck from "./pages/BloodReportCheck"
import Dashboard from "./pages/Dashboard"
import Home from "./pages/Home"
import InteractionCheck from "./pages/InteractionCheck"

const pages = {
  home: Home,
  interactions: InteractionCheck,
  blood: BloodReportCheck,
  dashboard: Dashboard,
}

export default function App() {
  const [currentPage, setCurrentPage] = useState(window.location.hash.replace("#", "") || "home")
  const Page = pages[currentPage] || Home

  useEffect(() => {
    const handleHashChange = () => setCurrentPage(window.location.hash.replace("#", "") || "home")
    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  function navigate(page) {
    window.location.hash = page
    setCurrentPage(page)
  }

  return (
    <div className="app-shell min-h-screen overflow-hidden text-slate-950">
      <div className="page-dna-bg" aria-hidden="true">
        <img src="/medical-assets/dna-helix.png" alt="" className="page-dna-image" />
        <div className="page-scan-beam" />
        <div className="particle-field" />
      </div>
      <Navbar currentPage={currentPage} onNavigate={navigate} />
      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Page onNavigate={navigate} />
      </main>
    </div>
  )
}
