import { useState } from 'react'
import { api, matcher, useApp, vault } from '../state.jsx'
import { BriefButton, Cite, Confidence, ErrorNote } from '../components.jsx'

const SUGGESTED = {
  india: ['Can I patent my classical churna?', 'Is a new combination of known herbs patentable?', 'Do I need to tell the State Biodiversity Board before buying herbs from farmers?', 'Can my advertisement say it cures diabetes?', 'What is a phytopharmaceutical drug?'],
  international: ['Must a patent applicant disclose the origin of genetic resources?', 'How can I sell my herbal product in the EU?', 'Can I sell it as a dietary supplement in the USA?', 'Is the GRATK treaty in force?'],
}
const PANEL = { india: 'India', international: 'International' }

export default function AskLaw() {
  const { asOf } = useApp()
  const [q, setQ] = useState('')
  const [mode, setMode] = useState('india')
  const [answers, setAnswers] = useState({})
  const [sent, setSent] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (question = q) => {
    if (!question.trim()) return
    setQ(question); setBusy(true); setError(null)
    const red = vault.redact(question, matcher.allNames())
    setSent(red.replaced ? red.text : null)
    const panels = mode === 'both' ? ['india', 'international'] : [mode]
    try {
      const res = await Promise.all(panels.map((j) => api('/api/ask', { question: red.text, jurisdiction: j, as_of: asOf })))
      setAnswers(Object.fromEntries(panels.map((j, i) => [j, res[i]])))
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const shown = mode === 'both' ? ['india', 'international'] : [mode]
  return (
    <div className="page ask">
      <h1 className="page-title">Ask the law</h1>
      <p className="lede">Answers are quoted from provisions in a version-dated corpus. India and international law come from two separate indexes and are never mixed in one answer. When the evidence is thin the assistant says so and prepares a brief for a human facilitator.</p>

      <form className="ask-form" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <div className="seg" role="radiogroup" aria-label="Jurisdiction">
          {['india', 'international', 'both'].map((m) => (
            <button type="button" key={m} role="radio" aria-checked={mode === m} onClick={() => { setMode(m); setAnswers({}) }}>
              {m === 'both' ? 'Both, side by side' : PANEL[m]}
            </button>
          ))}
        </div>
        <label className="field grow">
          <span className="sr-only">Your question</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about patents, licences, ABS, trade marks, advertising or export" maxLength={600} />
        </label>
        <button className="btn" disabled={busy || !q.trim()}>{busy ? 'Searching the corpus…' : 'Get cited answer'}</button>
      </form>
      <div className="examples">
        {(mode === 'international' ? SUGGESTED.international : SUGGESTED.india).map((s) => <button key={s} className="chip" onClick={() => submit(s)}>{s}</button>)}
      </div>
      {sent && <p className="redacted-line">Sent as: <code>{sent}</code> (ingredient names and quantities removed on this device)</p>}
      <ErrorNote error={error} retry={() => submit()} />

      {Object.keys(answers).length > 0 && (
        <div className={`panels n-${shown.length}`}>
          {shown.map((j) => answers[j] && <Panel key={j} j={j} a={answers[j]} onSwitch={() => { setMode(j === 'india' ? 'international' : 'india'); setAnswers({}) }} />)}
        </div>
      )}
    </div>
  )
}

function Panel({ j, a, onSwitch }) {
  return (
    <section className={`panel j-${j}`} aria-label={`${PANEL[j]} answer`}>
      <header className="panel-head">
        <h2>{PANEL[j]}</h2>
        <span className="small">Law as of {a.as_of}</span>
      </header>
      {a.switch_hint && <p className="hint">{a.switch_hint} <button className="linklike" onClick={onSwitch}>Switch panel</button></p>}
      {a.abstained ? (
        <div className="abstain">
          <Confidence level="low" />
          <p className="abstain-title">No answer given</p>
          <p>{a.reason} Rather than guess, the case can go to an IP facilitator.</p>
          {a.near_misses?.length > 0 && <p className="small">Closest provisions found, not relied on: {a.near_misses.join('; ')}.</p>}
          <BriefButton label="Prepare facilitator brief" build={() => ({
            as_of: a.as_of, question: a.question, jurisdiction: j,
            open_questions: [a.reason, 'Identify the governing provision and add it to the corpus if it is in scope.'],
            provisions: [],
          })} />
        </div>
      ) : (
        <>
          <div className="answer-meta"><Confidence level={a.confidence} /><span className="small">{a.reason}</span></div>
          <p className="answer-lead">The provisions below answer this. Each quote is taken from the provision text.</p>
          <div className="cites">{a.citations.map((c, i) => <Cite key={c.id} p={c} span={c.span} open={i === 0} />)}</div>
        </>
      )}
    </section>
  )
}
