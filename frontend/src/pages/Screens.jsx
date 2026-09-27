import { useEffect, useState } from 'react'
import { api, useApp } from '../state.jsx'
import { Cite, ErrorNote } from '../components.jsx'

const SAMPLE_AD = 'Our 100% natural Madhumeha Churna controls blood sugar and helps weight loss. Clinically proven, with no side effects. Trusted by vaidyas for generations.'

export function ClaimCheck() {
  const { asOf } = useApp()
  const [text, setText] = useState(SAMPLE_AD)
  const [group, setGroup] = useState('drug')
  const [res, setRes] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true); setError(null)
    try { setRes({ ...(await api('/api/claims', { text, group, as_of: asOf })), text }) } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return (
    <div className="page claims">
      <h1 className="page-title">Claim and label check</h1>
      <p className="lede">Paste advertising copy or label text before it is printed. Each phrase is screened against the conditions in the Drugs and Magic Remedies Act Schedule and against misleading-claim patterns.</p>
      <label className="field"><span>Advertising or label text</span><textarea rows={4} value={text} onChange={(e) => { setText(e.target.value); setRes(null) }} maxLength={4000} /></label>
      <div className="row-inline">
        <label className="field"><span>Product sold as</span>
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="drug">Medicine</option><option value="aahar">Food or supplement</option><option value="cosmetic">Cosmetic</option>
          </select>
        </label>
        <button className="btn" onClick={run} disabled={busy || !text.trim()}>Check these claims</button>
      </div>
      <ErrorNote error={error} retry={run} />
      {res && (
        <div className="claims-out">
          <p className={`claims-verdict ${res.verdict}`}>{res.verdict === 'clear' ? 'No listed conditions or misleading patterns found.' : `${res.flags.length + res.notes.length} phrase(s) to revise before publishing.`}</p>
          <p className="marked">{mark(res.text, res.flags)}</p>
          {res.flags.length > 0 && <ul className="flag-list">{res.flags.map((f, i) => <li key={i} className={`flag ${f.kind}`}><b>“{f.text}”</b> {f.why}</li>)}</ul>}
          {res.notes.map((n, i) => <p key={i} className="hint">{n.text}</p>)}
          <div className="cites">{res.provisions.map((p) => <Cite key={p.id} p={p} />)}</div>
          <p className="small">A lexicon screen, not a legal opinion. Phrases the lexicon does not know can still be objectionable.</p>
        </div>
      )}
    </div>
  )
}

function mark(text, flags) {
  const out = []
  let at = 0
  flags.forEach((f, i) => {
    out.push(text.slice(at, f.start))
    out.push(<mark key={i} className={f.kind}>{text.slice(f.start, f.end)}</mark>)
    at = f.end
  })
  out.push(text.slice(at))
  return out
}

const LEVEL = { strong: 'Strong overlap', partial: 'Partial overlap', use: 'Documented traditional use' }

export function Biopiracy() {
  const [cases, setCases] = useState([])
  const [active, setActive] = useState(null)
  const [text, setText] = useState('')
  const [res, setRes] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => { api('/api/biopiracy/cases').then(setCases).catch((e) => setError(e.message)) }, [])
  const load = (c) => { setActive(c); setText(c.claim_text); setRes(null) }
  const run = async () => {
    setError(null)
    try { setRes(await api('/api/biopiracy', { text })) } catch (e) { setError(e.message) }
  }
  return (
    <div className="page bio">
      <h1 className="page-title">Outbound biopiracy screen</h1>
      <p className="lede">The other half of the problem: codified Ayurvedic knowledge being patented abroad. Paste the claims or abstract of a foreign filing (for example from IPC class A61K 36/00). The screen compares the ingredients and uses named in it with the formulation index and flags overlaps for a human reviewer. It screens; it does not monitor every filing.</p>
      <div className="case-picks">
        {cases.map((c) => (
          <button key={c.id} className={`case ${active?.id === c.id ? 'on' : ''}`} onClick={() => load(c)}>
            <b>{c.title}</b><span>{c.record}</span>
          </button>
        ))}
      </div>
      <label className="field"><span>Claim or abstract text</span><textarea rows={4} value={text} onChange={(e) => { setText(e.target.value); setRes(null); setActive(null) }} maxLength={4000} placeholder="Paste claim 1 or the abstract here" /></label>
      <button className="btn" onClick={run} disabled={!text.trim()}>Screen this filing</button>
      <ErrorNote error={error} retry={run} />
      {res && (
        <div className="bio-out">
          <h2>Names found in the filing</h2>
          {res.ingredients.length === 0 ? <p className="empty">No ingredient from the dictionary was recognised. Try the botanical names used in the claim.</p> :
            <ul className="found">{res.ingredients.map((i) => <li key={i.id} className={i.in_universe ? '' : 'outside'}>“{i.as_written}” <span>read as {i.name}{i.latin ? `, ${i.latin}` : ''}</span></li>)}</ul>}
          <h2>Findings</h2>
          {res.findings.length === 0 ? <p className="empty">{res.action}</p> : (
            <>
              <ul className="findings">{res.findings.map((f, i) => <li key={i} className={`lvl-${f.level}`}><b>{LEVEL[f.level]}</b><span>{f.why}{f.book ? ` (${f.book})` : ''}</span></li>)}</ul>
              <p><b>Next step:</b> {res.action}</p>
            </>
          )}
          {active?.real && <div className="history"><b>What actually happened</b><p>{active.outcome}</p><a href={active.source} target="_blank" rel="noreferrer">Read about the case</a></div>}
          <div className="cites">{res.provisions.map((p) => <Cite key={p.id} p={p} />)}</div>
        </div>
      )}
    </div>
  )
}
