import { useEffect, useRef, useState } from 'react'
import { api, useApp } from './state.jsx'

const STATUS_TEXT = {
  in_force: 'In force', adopted_not_in_force: 'Adopted, not in force', superseded: 'Superseded', not_yet: 'Not yet made',
}

export function Cite({ p, span, open: openInit = false }) {
  const [open, setOpen] = useState(openInit)
  return (
    <div className={`cite j-${p.jurisdiction}`}>
      <button className="cite-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="cite-ref">{p.instrument_short} {p.section}</span>
        <span className="cite-title">{p.title}</span>
        <span className="cite-toggle" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {span && !open && <blockquote className="quote">{span}</blockquote>}
      {open && (
        <div className="cite-body">
          <blockquote className="quote">
            {span ? highlight(p.text, span) : p.text}
          </blockquote>
          <dl className="cite-meta">
            <div><dt>Text</dt><dd>{p.text_kind === 'quoted' ? 'Quoted from the provision' : 'Prototype summary; verbatim text comes from ingestion'}</dd></div>
            <div><dt>Valid</dt><dd>from {p.valid_from}{p.valid_to ? ` to ${p.valid_to}` : ''}</dd></div>
            {p.status && p.status !== 'in_force' && <div><dt>Status</dt><dd className="warn">{STATUS_TEXT[p.status] ?? p.status}{p.status_note ? `: ${p.status_note}` : ''}</dd></div>}
            <div><dt>Source</dt><dd><a href={p.url} target="_blank" rel="noreferrer">{p.instrument}</a></dd></div>
            <div><dt>Hash</dt><dd className="hash">{p.sha256.slice(0, 16)}</dd></div>
          </dl>
          {p.verify && <p className="verify-note">Open item in the claims register: check against the official text before relying on it.</p>}
        </div>
      )}
      {!open && p.status && p.status !== 'in_force' && <p className="warn small">{STATUS_TEXT[p.status] ?? p.status}</p>}
    </div>
  )
}

function highlight(text, span) {
  const i = text.indexOf(span)
  if (i < 0) return text
  return <>{text.slice(0, i)}<mark>{span}</mark>{text.slice(i + span.length)}</>
}

export function Confidence({ level }) {
  const n = { low: 1, medium: 2, high: 3 }[level] ?? 0
  return (
    <span className={`conf conf-${level}`} role="img" aria-label={`Confidence ${level}`}>
      {[1, 2, 3].map((i) => <i key={i} className={i <= n ? 'on' : ''} />)}
      <span>{level[0].toUpperCase() + level.slice(1)} confidence</span>
    </span>
  )
}

export function ErrorNote({ error, retry }) {
  if (!error) return null
  return (
    <div className="error" role="alert">
      <p>{error}</p>
      {retry && <button className="btn ghost" onClick={retry}>Try again</button>}
    </div>
  )
}

// Facilitator case brief: printable, built only from redacted material.
export function BriefButton({ build, label }) {
  const [brief, setBrief] = useState(null)
  const [error, setError] = useState(null)
  const dialog = useRef(null)
  useEffect(() => { if (brief) dialog.current?.showModal() }, [brief])
  const make = async () => {
    setError(null)
    try { setBrief(await api('/api/brief', build())) } catch (e) { setError(e.message) }
  }
  return (
    <>
      <button className="btn secondary" onClick={make}>{label}</button>
      <ErrorNote error={error} />
      {brief && (
        <dialog ref={dialog} className="brief" onClose={() => setBrief(null)}>
          <div className="brief-page">
            <header>
              <h2>Facilitator case brief</h2>
              <p>Case {brief.case_id}. Prepared {brief.prepared_on}. Law as of {brief.as_of}.</p>
            </header>
            {brief.question && <section><h3>Question (as sent, redacted)</h3><p>{brief.question}</p></section>}
            {brief.facts && Object.keys(brief.facts).length > 0 && (
              <section><h3>Facts given</h3>
                <ul>{Object.entries(brief.facts).map(([k, v]) => <li key={k}><b>{k}</b>: {v}</li>)}</ul>
              </section>
            )}
            {brief.classification && <section><h3>Classification</h3><p>{brief.classification}</p></section>}
            {brief.findings?.length > 0 && (
              <section><h3>Findings</h3><ul>{brief.findings.map((f, i) => <li key={i}><b>{f.title}</b>: {f.label}</li>)}</ul></section>
            )}
            {brief.provisions?.length > 0 && (
              <section><h3>Provisions relied on</h3><ul>{brief.provisions.map((p) => <li key={p}>{p}</li>)}</ul></section>
            )}
            {brief.open_questions?.length > 0 && (
              <section><h3>Open questions for the facilitator</h3><ul>{brief.open_questions.map((q, i) => <li key={i}>{q}</li>)}</ul></section>
            )}
            <p className="small">The formulation itself is not included. The applicant can share it directly with the facilitator.</p>
            <div className="brief-actions no-print">
              <button className="btn" onClick={() => window.print()}>Print or save as PDF</button>
              <button className="btn ghost" onClick={() => dialog.current?.close()}>Close</button>
            </div>
          </div>
        </dialog>
      )}
    </>
  )
}

export function VaultDrawer({ onClose }) {
  const { outbound, t } = useApp()
  const [tab, setTab] = useState('out')
  const [audit, setAudit] = useState(null)
  const ref = useRef(null)
  useEffect(() => { ref.current?.showModal() }, [])
  useEffect(() => {
    if (tab === 'audit') fetch('/api/audit').then((r) => r.json()).then(setAudit).catch(() => setAudit([]))
  }, [tab])
  return (
    <dialog ref={ref} className="drawer" onClose={onClose}>
      <header className="drawer-head">
        <h2>{t.leftDevice}</h2>
        <button className="btn ghost" onClick={() => ref.current?.close()}>Close</button>
      </header>
      <p className="small">Ingredient names and proportions stay in this browser tab. The formula match runs here. Every request is checked before it is sent and blocked if it contains a formulation term.</p>
      <div className="seg" role="tablist">
        <button role="tab" aria-selected={tab === 'out'} onClick={() => setTab('out')}>Sent from this device ({outbound.length})</button>
        <button role="tab" aria-selected={tab === 'audit'} onClick={() => setTab('audit')}>Server audit log</button>
      </div>
      {tab === 'out' && (
        outbound.length === 0 ? <p className="empty">Nothing has been sent yet. Run a product check or ask a question to see the exact payloads here.</p> :
        <ol className="outbound">
          {outbound.map((e, i) => (
            <li key={i} className={e.blocked ? 'blocked' : ''}>
              <div className="ob-head"><b>{e.endpoint}</b><span>{new Date(e.at).toLocaleTimeString()}</span><span>{e.bytes} bytes</span>{e.blocked && <span className="warn">Blocked by the vault guard</span>}</div>
              <pre>{e.body === 'null' ? '(no body)' : JSON.stringify(JSON.parse(e.body), null, 1)}</pre>
            </li>
          ))}
        </ol>
      )}
      {tab === 'audit' && (
        <>
          <p className="small">The server keeps a timestamp, a SHA-256 of the request and the provision IDs it cited. Never the content.</p>
          {audit === null ? <p className="empty">Loading the audit log…</p> : audit.length === 0 ? <p className="empty">No entries on this server instance yet.</p> :
            <table className="tbl"><thead><tr><th>Time (UTC)</th><th>Endpoint</th><th>Request hash</th><th>Provisions cited</th></tr></thead>
              <tbody>{audit.map((a, i) => <tr key={i}><td>{a.at.slice(11, 19)}</td><td>{a.endpoint}</td><td className="hash">{a.request_sha256.slice(0, 12)}</td><td>{a.provisions.join(', ') || 'none'}</td></tr>)}</tbody>
            </table>}
        </>
      )}
    </dialog>
  )
}
