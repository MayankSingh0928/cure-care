import { useEffect, useState } from "react"
import Navbar from "./components/Navbar"
import BloodReportCheck from "./pages/BloodReportCheck"
import Dashboard from "./pages/Dashboard"
import Home from "./pages/Home"
import InteractionCheck from "./pages/InteractionCheck"
import SymptomGuidance from "./pages/SymptomGuidance"

const pages = {
  home: Home,
  interactions: InteractionCheck,
  symptoms: SymptomGuidance,
  blood: BloodReportCheck,
  dashboard: Dashboard,
}

const pageRoutes = {
  home: "/",
  interactions: "/medicine-guide",
  symptoms: "/care-guidance",
  blood: "/blood-report",
  dashboard: "/dashboard",
}

const routePages = Object.fromEntries(Object.entries(pageRoutes).map(([page, route]) => [route, page]))

function currentPageFromLocation() {
  const hashPage = window.location.hash.replace("#", "")
  if (pages[hashPage]) return hashPage

  const normalizedPath = window.location.pathname.replace(/\/+$/, "") || "/"
  return routePages[normalizedPath] || "home"
}

export default function App() {
  const [currentPage, setCurrentPage] = useState(currentPageFromLocation)
  const Page = pages[currentPage] || Home

  useEffect(() => {
    const handleLocationChange = () => setCurrentPage(currentPageFromLocation())
    window.addEventListener("popstate", handleLocationChange)
    window.addEventListener("hashchange", handleLocationChange)
    return () => {
      window.removeEventListener("popstate", handleLocationChange)
      window.removeEventListener("hashchange", handleLocationChange)
    }
  }, [])

  function navigate(page) {
    const route = pageRoutes[page] || "/"
    window.history.pushState({}, "", route)
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
