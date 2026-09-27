import { useEffect, useRef, useState } from 'react'
import { DOSAGE_FORMS } from '../engine/match.js'
import { buildFactSheet } from '../engine/vault.js'
import { api, matcher, useApp, vault, FORMULATIONS, PLANNED_RECORDS } from '../state.jsx'
import { BriefButton, Cite, ErrorNote } from '../components.jsx'

const EXAMPLES = [
  { label: 'Triphala churna', text: 'Haritaki 1 part\nBibhitaki 1 part\nAmalaki 1 part', form: 'churna' },
  { label: 'Triphala with Ashwagandha', text: 'Harad 1 part, Baheda 1 part, Amla 1 part, Ashwagandha 1 part', form: 'churna' },
  { label: 'Triphala with curcumin 95%', text: 'Haritaki, Bibhitaki, Amalaki, Curcumin 95%', form: 'capsule' },
  { label: 'Sitopaladi as a tablet', text: 'Mishri 16, Banslochan 8, Pippali 4, Elaichi 2, Dalchini 1', form: 'vati' },
]
const FACT_ORDER = ['goal', 'use', 'route', 'form', 'entity', 'sourcing', 'practitioner', 'market']
const FACT_OPTIONS = {
  goal: ['patent', 'licence', 'export', 'brand'], use: ['medicine', 'food', 'cosmetic'], route: ['oral', 'external', 'parenteral'],
  form: ['traditional', 'extract'], entity: ['indian', 'foreign'], sourcing: ['cultivated', 'wild'], practitioner: ['no', 'yes'], market: ['us', 'eu'],
}
const ADVICE = {
  tk_bar: 'patent unlikely under s.3(p)', admixture_risk: 's.3(e) objection likely', potential: 'patent possible with evidence',
  process_potential: 'process or fraction may be patentable', classical: 'classical drug', proprietary: 'proprietary medicine',
  new_drug: 'new / non-classical drug', phyto: 'phytopharmaceutical', aahar: 'Ayurveda Aahara (food)', cosmetic: 'cosmetic', drug: 'drug rules',
  nba_approval: 'NBA approval needed', exempt_practitioner: 'ABS exempt as practitioner', exempt_cultivated: 'ABS exempt with certificate of origin',
  prior_intimation: 'prior intimation to the SBB', us: 'US route', eu: 'EU route', patent: '', licence: '', export: '', brand: '',
}
const MATCH_TEXT = { classical: 'the composition exactly matched a listed formula', proprietary: 'every ingredient were in the books but the formula were not listed', outside: 'one ingredient were outside the First Schedule formulae' }

export default function ProductCheck() {
  const { t, asOf, today } = useApp()
  const [text, setText] = useState('')
  const [form, setForm] = useState('churna')
  const [name, setName] = useState('')
  const [result, setResult] = useState(null)
  const [facts, setFacts] = useState({})
  const [skipped, setSkipped] = useState([])
  const [step, setStep] = useState(null)
  const [dossier, setDossier] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [showRest, setShowRest] = useState(false)
  const dossierRef = useRef(null)

  const run = () => {
    const items = matcher.parse(text)
    if (!items.length) return
    const r = matcher.match(items, form)
    vault.clear()
    vault.hold([name, ...items.map((i) => i.raw), ...items.map((i) => i.name), ...matcher.namesFor(items.filter((i) => i.id).map((i) => i.id))].filter(Boolean))
    setResult(r); setFacts({}); setSkipped([]); setDossier(null); setStep(null); setShowRest(false)
    ask(r, {}, [])
  }

  const ask = async (r, f, sk) => {
    setBusy(true); setError(null)
    try {
      const out = await api('/api/triage', buildFactSheet(r, f, asOf, sk))
      setStep(out)
      if (!out.next) await loadDossier(r, f, sk, true)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const loadDossier = async (r, f, sk, scroll) => {
    const d = await api('/api/dossier', buildFactSheet(r, f, asOf, sk))
    setDossier(d)
    if (scroll) requestAnimationFrame(() => dossierRef.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }))
  }

  const answer = (fact, value) => {
    const f = { ...facts, [fact]: value }
    setFacts(f); ask(result, f, skipped)
  }
  const skip = (fact) => {
    const sk = [...skipped, fact]
    setSkipped(sk); ask(result, facts, sk)
  }
  const setRest = async (fact, value) => {
    const f = { ...facts, [fact]: value }
    setFacts(f)
    try { await loadDossier(result, f, skipped, false) } catch (e) { setError(e.message) }
  }

  useEffect(() => {
    if (dossier && result) loadDossier(result, facts, skipped, false).catch((e) => setError(e.message))
    // re-run only when the as-of date changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asOf])

  const reset = () => { setResult(null); setDossier(null); setStep(null); setFacts({}); setSkipped([]); vault.clear() }

  return (
    <div className="page check">
      <section className="intake" aria-labelledby="intake-h">
        <h1 id="intake-h" className="page-title">{t.describe}</h1>
        <p className="lede">The assistant first works out what your product is in law, using the test written in the Drugs and Cosmetics Act, then asks only the questions that can change the advice.</p>
        <label className="field">
          <span>{t.ingredients}</span>
          <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Haritaki 1 part\nBibhitaki 1 part\nAmalaki 1 part'} />
          <small>{t.ingredientsHint}</small>
        </label>
        <div className="row2">
          <label className="field">
            <span>{t.dosageForm}</span>
            <select value={form} onChange={(e) => setForm(e.target.value)}>
              {DOSAGE_FORMS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <label className="field">
            <span>{t.productName}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Digesto-Plus" />
          </label>
        </div>
        <div className="actions">
          <button className="btn" onClick={run} disabled={!text.trim() || busy}>{t.check}</button>
          {result && <button className="btn ghost" onClick={reset}>{t.reset}</button>}
        </div>
        <div className="examples">
          <span>{t.tryExample}:</span>
          {EXAMPLES.map((ex) => (
            <button key={ex.label} className="chip" onClick={() => { setText(ex.text); setForm(ex.form) }}>{ex.label}</button>
          ))}
        </div>
      </section>

      {result?.cls && <Verdict r={result} t={t} />}

      {result?.cls && step && (
        <section className="triage" aria-live="polite">
          <h2>{t.questionsTitle}</h2>
          <p className="meta-line">{t.askedOf(Object.keys(facts).length, step.baseline_fixed_flow)} {t.outcomesLeft(step.advice_outcomes_left)}.</p>
          {Object.keys(facts).length > 0 && (
            <ol className="answered">
              {FACT_ORDER.filter((f) => facts[f]).map((f) => (
                <li key={f}><span>{t.q[f]}</span><b>{t.opt[facts[f]]}</b></li>
              ))}
            </ol>
          )}
          {step.next && (
            <div className="question">
              <p className="q-text">{t.q[step.next]}</p>
              <div className="options">
                {step.options.map((o) => <button key={o} className="opt" disabled={busy} onClick={() => answer(step.next, o)}>{t.opt[o]}</button>)}
                <button className="opt dim" disabled={busy} onClick={() => skip(step.next)}>{t.dontKnow}</button>
              </div>
            </div>
          )}
          <ErrorNote error={error} retry={() => ask(result, facts, skipped)} />
        </section>
      )}

      {dossier && (
        <section className="dossier" ref={dossierRef} aria-labelledby="dossier-h">
          <header className="dossier-head">
            <h2 id="dossier-h">{t.dossier}</h2>
            <p className="meta-line">Law as of {fmt(dossier.as_of)}{dossier.as_of !== today ? ' (past date selected)' : ''}. Same facts give the same dossier every time: it comes from a rule table, not a language model.</p>
          </header>

          <Rows rows={dossier.rows.filter((r) => r.relevant)} result={result} heading={t.forGoal} onPending={() => setShowRest(true)} />
          {dossier.what_would_change.length > 0 && (
            <div className="wwc">
              <h3>{t.whatWouldChange}</h3>
              <ul>
                {dossier.what_would_change.map((c, i) => (
                  <li key={i}>
                    If {c.fact === 'match' ? MATCH_TEXT[c.to] : <>{t.factName[c.fact]} were <b>{t.opt[c.to]}</b></>}
                    {c.new_advice ? <>: {c.new_advice.map((a) => ADVICE[a] ?? a).filter(Boolean).join(', ')}</> : ': the advice would split further'}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Rows rows={dossier.rows.filter((r) => !r.relevant)} result={result} heading={t.otherRegimes} collapsed onPending={() => setShowRest(true)} />

          <div className="dossier-foot">
            {(showRest || dossier.rows.some((r) => r.status === 'pending')) && (
              <details className="rest" open={showRest} onToggle={(e) => setShowRest(e.currentTarget.open)}>
                <summary>{t.fillRest}</summary>
                <div className="rest-grid">
                  {FACT_ORDER.filter((f) => !facts[f]).map((f) => (
                    <label key={f} className="field">
                      <span>{t.q[f]}</span>
                      <select value="" onChange={(e) => setRest(f, e.target.value)}>
                        <option value="" disabled>Choose</option>
                        {FACT_OPTIONS[f].map((o) => <option key={o} value={o}>{t.opt[o]}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              </details>
            )}
            <div className="actions">
              <BriefButton label={t.brief} build={() => ({
                as_of: dossier.as_of, facts,
                classification: `${t.cls[result.cls]} (matched record and ingredients kept on the applicant's device)`,
                findings: dossier.rows.filter((r) => r.status === 'resolved').map((r) => ({ title: r.title, label: r.label })),
                provisions: [...new Set(dossier.rows.flatMap((r) => r.provisions.map((p) => `${p.instrument_short} ${p.section}`)))],
                open_questions: [
                  ...dossier.rows.filter((r) => r.status === 'pending').map((r) => `${r.title}: depends on ${r.depends_on.map((d) => t.factName[d]).join(', ')}`),
                  ...skipped.map((s) => `Applicant did not know: ${t.factName[s]}`),
                  result.cls === 'classical' ? 'Confirm the method of manufacture follows the book (the screen checks ingredients, proportions and form only).' : null,
                  result.cls === 'outside' ? 'Confirm whether the unindexed ingredient appears in another First Schedule book.' : null,
                ].filter(Boolean),
              })} />
            </div>
            <VaultNote facts={facts} match={result.cls} asOf={dossier.as_of} skipped={skipped} t={t} />
          </div>
          <p className="disclaimer-inline">{dossier.disclaimer}</p>
        </section>
      )}

      {!result && <IndexNote />}
    </div>
  )
}

function Verdict({ r, t }) {
  const book = r.record
  return (
    <section className={`verdict v-${r.cls}`} aria-live="polite">
      <div className="verdict-band">
        <h2 className="verdict-title">{t.cls[r.cls]}</h2>
        <p className="verdict-why">
          {r.cls === 'classical' && <>Matches <b>{book.name}</b>, {book.book}. Section 3(a): a drug made exclusively per a First Schedule formula.</>}
          {r.cls === 'proprietary' && <>Every ingredient appears in First Schedule formulae, but this exact formula is not listed. Section 3(h)(i). Nearest record: <b>{r.nearest?.record.name}</b>.</>}
          {r.cls === 'outside' && <>At least one ingredient is not found in the indexed First Schedule formulae, so neither s.3(a) nor s.3(h)(i) can be shown from the index.</>}
        </p>
      </div>
      <ul className="strip" aria-label="How each ingredient was read">
        {r.items.map((it, i) => {
          const ing = it.ingredient
          const state = !ing ? 'unknown' : !ing.in_universe ? 'outside' : book ? 'in' : r.nearest?.record.ingredients.some((x) => x.id === it.id) ? 'in' : 'extra'
          return (
            <li key={i} className={`ing s-${state}`}>
              <span className="ing-typed">{it.raw}</span>
              {ing ? <span className="ing-canon">{ing.sanskrit ?? ing.english}{ing.latin ? <i> {ing.latin}</i> : null}{it.how === 'fuzzy' ? ' (read as)' : ''}</span> : <span className="ing-canon">Not recognised</span>}
            </li>
          )
        })}
      </ul>
      {r.breaking?.length > 0 && (
        <div className="breaking">
          <h3>What breaks the match</h3>
          <ul>{r.breaking.map((b, i) => <li key={i}><b>{b.what}</b>: {b.why}</li>)}</ul>
        </div>
      )}
      {r.notes?.map((n) => <p key={n} className="small">{n}</p>)}
      <p className="small coverage">Screening by ingredients, proportions and dosage form; the Act also covers method of manufacture. Index coverage: {r.coverage.indexed} of {PLANNED_RECORDS} planned AFI records. "Not covered" means not found in indexed sources, never "not classical".</p>
    </section>
  )
}

function Rows({ rows, result, heading, collapsed, onPending }) {
  if (!rows.length) return null
  const content = rows.map((r) => <Row key={r.key} r={r} result={result} onPending={onPending} />)
  if (collapsed) return <details className="rows-other"><summary>{heading} ({rows.length})</summary><div className="rows">{content}</div></details>
  return <div className="rows"><h3 className="rows-h">{heading}</h3>{content}</div>
}

function Row({ r, result, onPending }) {
  const { t } = useApp()
  return (
    <article className={`dos-row tone-${r.tone} ${r.jurisdiction === 'international' ? 'intl' : ''}`}>
      <div className="dos-main">
        <h4>{r.title}{r.jurisdiction === 'international' && <span className="jur-tag">International</span>}</h4>
        <p className="dos-label">{r.label}</p>
        <p>{r.summary}</p>
        {r.status === 'pending' && (
          <p className="pending-note">Depends on: {r.depends_on.map((d) => t.factName[d]).join(', ')}. <button className="linklike" onClick={onPending}>Answer now</button></p>
        )}
        {r.evidence && <div className="evidence"><b>Evidence to prepare</b><p>{r.evidence}</p></div>}
        {r.key === 'prior_art' && <SearchTerms result={result} />}
        {r.steps?.length > 0 && (
          <ul className="steps">
            {r.steps.map((s, i) => <li key={i}><b>{s.label}</b><span>{s.authority}</span>{s.url && <a href={s.url} target="_blank" rel="noreferrer">Open portal</a>}</li>)}
          </ul>
        )}
      </div>
      {r.provisions.length > 0 && <div className="dos-cites">{r.provisions.map((p) => <Cite key={p.id} p={p} />)}</div>}
    </article>
  )
}

function SearchTerms({ result }) {
  const ings = result.items.map((i) => i.ingredient).filter(Boolean)
  if (!ings.length) return null
  return (
    <div className="terms">
      <b>Search terms for each ingredient (built on this device)</b>
      <table className="tbl small-tbl">
        <thead><tr><th>Sanskrit</th><th>Hindi</th><th>English</th><th>Botanical</th></tr></thead>
        <tbody>{ings.map((g) => <tr key={g.id}><td>{g.sanskrit ?? '–'}</td><td>{g.hindi ?? '–'}</td><td>{g.english}</td><td><i>{g.latin ?? '–'}</i></td></tr>)}</tbody>
      </table>
    </div>
  )
}

function VaultNote({ facts, match, asOf, skipped, t }) {
  return (
    <details className="vault-note">
      <summary>{t.serverSaw}</summary>
      <pre>{JSON.stringify({ match, facts, skipped, as_of: asOf }, null, 1)}</pre>
      <p className="small">No ingredient, proportion or product name. The match was computed in this browser.</p>
    </details>
  )
}

function IndexNote() {
  return (
    <section className="index-note">
      <h2>What the index holds today</h2>
      <p>{FORMULATIONS.length} Ayurvedic Formulary of India records are indexed for this prototype, out of {PLANNED_RECORDS} planned for the MVP. Each is marked for verification against its PCIM&amp;H formulary specification.</p>
      <ul className="index-list">{FORMULATIONS.map((f) => <li key={f.id}><b>{f.name}</b> <span>{f.ingredients.length} ingredients, {f.dosage_form}</span></li>)}</ul>
    </section>
  )
}

const fmt = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
