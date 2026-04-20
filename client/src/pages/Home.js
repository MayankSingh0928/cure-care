import { ArrowRight, BrainCircuit, FileText, Pill, SearchCheck, Sparkles } from "lucide-react"

export default function Home({ onNavigate }) {
  const featureCards = [
    ["Medicine information guide", "AI-assisted uses, side effects, safety notes, and Ayurvedic options in English or Hindi.", Pill],
    ["Doctor department guidance", "Describe symptoms and get a suggested department, doctor type, urgency, and tests to discuss.", SearchCheck],
    ["Blood report assistant", "Turns pasted or uploaded values into readable risk summaries and next-step guidance.", FileText],
  ]

  const steps = [
    ["01", "Enter medicine or symptoms", "Add a drug name, patient problem, or report values depending on the workflow."],
    ["02", "Generate bilingual guidance", "The API uses OpenAI when configured, with careful local fallbacks."],
    ["03", "Review next steps", "See medicine safety, doctor department guidance, report summaries, and tests to discuss."],
  ]

  const liveSignals = [
    ["Medicine guide", "Uses, side effects, warnings, and remedy context", "Guide", "bg-rose-100 text-rose-700"],
    ["Blood report review", "CBC and vitamin values translated into plain-language findings", "Report Review", "bg-amber-100 text-amber-700"],
    ["Personalized care guidance", "Next steps prepared for patient-friendly follow-up", "Care Note", "bg-teal-100 text-teal-700"],
  ]

  return (
    <div className="grid gap-14 pb-10">
      <section className="relative grid min-h-[calc(100vh-104px)] content-center gap-8 py-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center xl:gap-12">
        <div className="animated-card relative z-10 max-w-3xl">
          <p className="eyebrow mb-4">Clinical safety platform</p>
          <h1 className="text-4xl font-black leading-[1.04] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl xl:text-7xl">
            Understand medicines before you take the next step.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            Look up medicine uses, possible side effects, important cautions, and Ayurvedic remedies with similar intended effects, then turn uploaded blood reports into plain-language risk guidance.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => onNavigate("interactions")}
              className="primary-button"
            >
              Open medicine guide <ArrowRight size={18} />
            </button>
            <button
              onClick={() => onNavigate("blood")}
              className="secondary-button"
            >
              Analyze report <FileText size={18} />
            </button>
            <button
              onClick={() => onNavigate("symptoms")}
              className="secondary-button"
            >
              Find doctor <SearchCheck size={18} />
            </button>
          </div>
          <div className="mt-8 grid max-w-xl grid-cols-1 gap-3 text-center min-[420px]:grid-cols-3">
            {["OpenAI ready", "OpenFDA fallback", "Hindi toggle"].map((item) => (
              <div key={item} className="rounded-lg border border-slate-200 bg-white/70 px-3 py-3 text-xs font-black uppercase tracking-wide text-slate-600 shadow-sm">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex min-h-[430px] items-end justify-center sm:min-h-[500px] lg:min-h-[540px] lg:justify-start lg:pl-8 xl:pl-10">
          <div className="surface-card animated-card w-full max-w-[450px] overflow-hidden p-4 sm:p-5 lg:max-w-[390px] xl:max-w-[450px]" style={{ animationDelay: "120ms" }}>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow">Live care preview</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Medicine Intelligence</h2>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-cyan-600 text-white shadow-lg shadow-cyan-700/20">
                <BrainCircuit />
              </div>
            </div>
            <div className="grid gap-3">
              {liveSignals.map(([title, copy, badge, tone], index) => (
                <div key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-4" style={{ animation: `rise-in .6s ease ${index * 120 + 220}ms both` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">{title}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{copy}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${tone}`}>{badge}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="clinical-readout mt-6 rounded-lg bg-slate-950 p-4 text-white">
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-cyan-100">
                  <span className="status-pulse" />
                  Care guidance prepared
                </div>
                <Sparkles className="h-4 w-4 text-cyan-300" />
              </div>
              <div className="ecg-strip relative z-10 mt-4" aria-hidden="true">
                <svg viewBox="0 0 320 34" role="presentation" preserveAspectRatio="none">
                  <path className="ecg-path ecg-path-muted" d="M0 20H52L60 10L70 27L82 14L94 20H148L156 20L164 7L176 29L190 16L204 20H320" />
                  <path className="ecg-path ecg-path-live" d="M0 20H52L60 10L70 27L82 14L94 20H148L156 20L164 7L176 29L190 16L204 20H320" />
                </svg>
              </div>
              <div className="signal-meter relative z-10 mt-3" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {featureCards.map(([title, copy, Icon], index) => (
          <article key={title} className="surface-card animated-card p-5" style={{ animationDelay: `${index * 90}ms` }}>
            <div className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-slate-950 text-cyan-300">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 rounded-lg border border-slate-200 bg-white/65 p-5 shadow-sm sm:p-7 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
        <div>
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">From raw inputs to clear guidance.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Built around the workflows already in this app, with faster scanning on desktop and a clean stacked flow on mobile.
          </p>
        </div>
        <div className="grid gap-3">
          {steps.map(([number, title, copy]) => (
            <article key={number} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-[auto_1fr] sm:items-start">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-50 text-sm font-black text-cyan-700">{number}</span>
              <div>
                <h3 className="font-black text-slate-950">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
