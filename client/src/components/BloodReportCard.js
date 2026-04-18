const hindiLabels = {
  risk: "\u091c\u094b\u0916\u093f\u092e \u092a\u094d\u0930\u0924\u093f\u0936\u0924",
  prevention: "\u092c\u091a\u093e\u0935",
  cure: "\u0907\u0932\u093e\u091c",
  remedies: "\u0918\u0930\u0947\u0932\u0942 \u0909\u092a\u093e\u092f",
  cause: "\u0938\u0902\u092d\u093e\u0935\u093f\u0924 \u0915\u093e\u0930\u0923",
  medicine: "\u0926\u0935\u093e \u0938\u0902\u092c\u0902\u0927\u0940 \u0938\u0932\u093e\u0939",
  title: "\u092c\u094d\u0932\u0921 \u0930\u093f\u092a\u094b\u0930\u094d\u091f \u0935\u093f\u0936\u094d\u0932\u0947\u0937\u0923",
  readMode: "\u0930\u0940\u0921 \u092e\u094b\u0921",
  keyFindings: "\u092e\u0941\u0916\u094d\u092f \u0928\u093f\u0937\u094d\u0915\u0930\u094d\u0937",
  important: "\u092e\u0939\u0924\u094d\u0935\u092a\u0942\u0930\u094d\u0923 \u0928\u093f\u0937\u094d\u0915\u0930\u094d\u0937 (\u0938\u093e\u092e\u093e\u0928\u094d\u092f \u0928\u0939\u0940\u0902)",
  borderline: "\u092c\u0949\u0930\u094d\u0921\u0930\u0932\u093e\u0907\u0928 / \u0939\u0932\u094d\u0915\u0940 \u0938\u092e\u0938\u094d\u092f\u093e\u090f\u0902",
  normal: "\u0938\u093e\u092e\u093e\u0928\u094d\u092f / \u0905\u091a\u094d\u091b\u0947 \u092e\u093e\u0928",
  overall: "\u0915\u0941\u0932 \u092e\u093f\u0932\u093e\u0915\u0930 \u0935\u094d\u092f\u093e\u0916\u094d\u092f\u093e",
  whatToDo: "\u0906\u092a\u0915\u094b \u0915\u094d\u092f\u093e \u0915\u0930\u0928\u093e \u091a\u093e\u0939\u093f\u090f",
  simpleAdvice: "\u0938\u0930\u0932 \u0938\u0932\u093e\u0939",
}

const englishLabels = {
  risk: "Risk percentage",
  prevention: "Prevention",
  cure: "Cure",
  remedies: "Remedies",
  cause: "Possible cause",
  medicine: "Medicine guidance",
  title: "Blood Report Analysis",
  readMode: "Read mode",
  keyFindings: "Key findings",
  important: "Important Findings (Not Normal)",
  borderline: "Borderline / Mild Issues",
  normal: "Normal / Good Values",
  overall: "Overall Interpretation",
  whatToDo: "What You Should Do",
  simpleAdvice: "Simple Advice",
}

const hindiFallback = {
  intro: "\u0930\u093f\u092a\u094b\u0930\u094d\u091f \u092e\u0947\u0902 \u092e\u093f\u0932\u0947 \u092e\u093e\u0928\u094b\u0902 \u0915\u093e \u0938\u0930\u0932 \u0938\u093e\u0930\u093e\u0902\u0936 \u0928\u0940\u091a\u0947 \u0926\u093f\u092f\u093e \u0917\u092f\u093e \u0939\u0948\u0964",
  finalNote: "\u092f\u0939 \u0930\u093f\u092a\u094b\u0930\u094d\u091f \u0921\u0949\u0915\u094d\u091f\u0930 \u0938\u0947 \u0930\u093f\u0935\u094d\u092f\u0942 \u0915\u0930\u093e\u0928\u0947 \u0932\u093e\u092f\u0915 \u0939\u0948\u0964 \u092f\u0939 \u0905\u0902\u0924\u093f\u092e \u0921\u093e\u092f\u0917\u094d\u0928\u094b\u0938\u093f\u0938 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964",
}

function translateStatus(value, language) {
  if (language !== "hi") return value
  const map = {
    low: "\u0915\u092e",
    high: "\u091c\u094d\u092f\u093e\u0926\u093e",
    normal: "\u0938\u093e\u092e\u093e\u0928\u094d\u092f",
    critical_low: "\u092c\u0939\u0941\u0924 \u0915\u092e",
    critical_high: "\u092c\u0939\u0941\u0924 \u091c\u094d\u092f\u093e\u0926\u093e",
    unclear: "\u0905\u0938\u094d\u092a\u0937\u094d\u091f",
  }
  return map[value] || value
}

function translateReportText(value, language) {
  if (language !== "hi" || !value) return value

  return value
    .replaceAll("Here is a clear, human-friendly summary of what the detected values may mean.", hindiFallback.intro)
    .replaceAll("This is not a normal report, but many issues are manageable when reviewed and treated early. The most urgent abnormal value should be discussed with a doctor first.", hindiFallback.finalNote)
    .replaceAll("This report mainly suggests:", "\u092f\u0939 \u0930\u093f\u092a\u094b\u0930\u094d\u091f \u092e\u0941\u0916\u094d\u092f \u0930\u0942\u092a \u0938\u0947 \u0938\u0902\u0915\u0947\u0924 \u0926\u0947\u0924\u0940 \u0939\u0948:")
    .replaceAll("These are report-based signals and need clinical correlation, not a final diagnosis.", "\u092f\u0947 \u0930\u093f\u092a\u094b\u0930\u094d\u091f-\u0906\u0927\u093e\u0930\u093f\u0924 \u0938\u0902\u0915\u0947\u0924 \u0939\u0948\u0902, \u0905\u0902\u0924\u093f\u092e \u0921\u093e\u092f\u0917\u094d\u0928\u094b\u0938\u093f\u0938 \u0928\u0939\u0940\u0902\u0964")
    .replaceAll("Consult a physician promptly, especially for platelet abnormalities.", "\u0916\u093e\u0938\u0915\u0930 platelet abnormality \u0915\u0947 \u0932\u093f\u090f \u091c\u0932\u094d\u0926 \u0921\u0949\u0915\u094d\u091f\u0930 \u0938\u0947 \u092e\u093f\u0932\u0947\u0902\u0964")
    .replaceAll("A doctor may advise repeat CBC or targeted tests based on symptoms.", "\u0932\u0915\u094d\u0937\u0923\u094b\u0902 \u0915\u0947 \u0906\u0927\u093e\u0930 \u092a\u0930 \u0921\u0949\u0915\u094d\u091f\u0930 repeat CBC \u092f\u093e targeted tests \u0938\u0941\u091d\u093e \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964")
    .replaceAll("Maintain balanced meals, hydration, rest, and follow-up testing.", "\u0938\u0902\u0924\u0941\u0932\u093f\u0924 \u092d\u094b\u091c\u0928, \u092a\u093e\u0928\u0940, \u0906\u0930\u093e\u092e \u0914\u0930 follow-up testing \u0930\u0916\u0947\u0902\u0964")
}

function summaryList(items = [], language) {
  return items.filter(Boolean).map((item) => translateReportText(item, language))
}

function reportGuidanceCards(report, language) {
  const summary = report.humanSummary || {}
  const remedies = summaryList(summary.simpleAdvice, language)
  const medicine = summaryList(summary.whatToDo, language)

  if (summary.finalNote) medicine.push(translateReportText(summary.finalNote, language))

  return [
    {
      key: "remedies",
      items: remedies.length ? remedies : [report.remedies],
    },
    {
      key: "medicine",
      items: medicine.length ? medicine : [report.medicine],
    },
  ]
}

export default function BloodReportCard({ report, language }) {
  if (!report) return null

  const displayLanguage = language || report.language || "en"
  const labels = displayLanguage === "hi" ? hindiLabels : englishLabels
  const guidanceCards = reportGuidanceCards(report, displayLanguage)

  return (
    <section className="surface-card animated-card p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="eyebrow">{labels.readMode}</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{labels.title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{report.summary}</p>
          {report.extractedTextSource && report.extractedTextSource !== "none" && (
            <p className="mt-2 text-xs font-black uppercase tracking-wide text-cyan-700">
              {labels.readMode}: {report.extractedTextSource}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-slate-950 px-5 py-3 text-center text-white shadow-lg shadow-cyan-900/10">
          <p className="text-xs font-semibold uppercase">{labels.risk}</p>
          <p className="text-3xl font-black text-cyan-300">{report.riskPercentage}%</p>
        </div>
      </div>

      {report.humanSummary && (
        <section className="mb-5 rounded-lg border border-cyan-200 bg-cyan-50/50 p-5">
          <p className="mb-4 text-sm leading-6 text-slate-700">{translateReportText(report.humanSummary.intro, displayLanguage)}</p>

          {report.humanSummary.importantFindings?.length > 0 && (
            <div className="mb-5">
              <h3 className="mb-3 text-lg font-black text-amber-700">{labels.important}</h3>
              <div className="grid gap-3">
                {report.humanSummary.importantFindings.map((finding, index) => (
                  <article key={`${finding.test}-${finding.value}`} className="rounded-lg border border-amber-200 bg-white p-4 shadow-sm">
                    <h4 className="font-bold text-slate-950">
                      {index + 1}. {finding.title}
                    </h4>
                    <p className="mt-2 text-sm text-slate-600">
                      {finding.test}: {finding.value} (Normal: {finding.normalRange}) - {translateStatus(finding.status, displayLanguage)}
                    </p>
                    <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-600">
                      {finding.meaning.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>
          )}

          {report.humanSummary.borderlineFindings?.length > 0 && (
            <div className="mb-5">
              <h3 className="mb-3 text-lg font-black text-cyan-700">{labels.borderline}</h3>
              <div className="grid gap-2">
                {report.humanSummary.borderlineFindings.map((finding) => (
                  <div key={`${finding.title}-${finding.value}`} className="rounded-md bg-white p-3 text-sm leading-6 text-slate-600 shadow-sm">
                    <span className="font-bold text-slate-950">{finding.title}:</span> {finding.value}. {finding.note}
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.humanSummary.normalFindings?.length > 0 && (
            <div className="mb-5">
              <h3 className="mb-3 text-lg font-black text-emerald-700">{labels.normal}</h3>
              <div className="grid gap-2 text-sm leading-6 text-slate-600">
                {report.humanSummary.normalFindings.map((item) => (
                  <p key={item} className="rounded-md bg-white p-3 shadow-sm">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-lg font-black text-cyan-700">{labels.overall}</h3>
              <div className="grid gap-2 text-sm leading-6 text-slate-600">
                {report.humanSummary.overallInterpretation.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-lg font-black text-cyan-700">{labels.whatToDo}</h3>
              <ul className="grid gap-2 text-sm leading-6 text-slate-600">
                {report.humanSummary.whatToDo.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          {report.humanSummary.simpleAdvice?.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 text-lg font-black text-cyan-700">{labels.simpleAdvice}</h3>
              <ul className="grid gap-2 text-sm leading-6 text-slate-600">
                {report.humanSummary.simpleAdvice.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
            {report.humanSummary.finalNote}
          </p>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {guidanceCards.map((card) => (
          <article key={card.key} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 font-black text-cyan-700">{labels[card.key]}</h3>
            <ul className="grid gap-2 text-sm leading-6 text-slate-600">
              {card.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
