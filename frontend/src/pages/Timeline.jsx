import { useEffect, useState } from 'react'
import { api, useApp } from '../state.jsx'
import { ErrorNote } from '../components.jsx'

const STATUS = {
  in_force: 'In force', adopted_not_in_force: 'Adopted, not in force', superseded: 'Superseded', not_yet: 'Not yet made',
}
const START = 2002, END = 2027

export default function Timeline() {
  const { asOf, setAsOf, today } = useApp()
  const [items, setItems] = useState(null)
  const [radar, setRadar] = useState([])
  const [error, setError] = useState(null)
  useEffect(() => {
    api(`/api/timeline?as_of=${asOf}`).then(setItems).catch((e) => setError(e.message))
  }, [asOf])
  useEffect(() => { api('/api/radar').then(setRadar).catch((e) => setError(e.message)) }, [])
  const decide = async (id, decision) => {
    try { setRadar(await api(`/api/radar/${id}`, { decision })) } catch (e) { setError(e.message) }
  }

  const versioned = (items ?? []).flatMap((i) => i.versions).reduce((acc, v) => { (acc[v.family] ??= []).push(v); return acc }, {})
  const year = Number(asOf.slice(0, 4)) + (Number(asOf.slice(5, 7)) - 1) / 12
  const x = (d) => ((Number(d.slice(0, 4)) + (Number(d.slice(5, 7)) - 1) / 12 - START) / (END - START)) * 100

  return (
    <div className="page timeline">
      <h1 className="page-title">Law over time</h1>
      <p className="lede">Every provision carries the dates it was in force, and every instrument carries a status. Pick a date and every answer in the app switches to the law as it stood then. Useful for a licence or filing made before a rule changed.</p>

      <div className="asof-quick">
        <span>Jump to:</span>
        {[['2023-06-01', 'Mid-2023, before the BD Act amendment'], ['2025-01-01', 'Jan 2025, before the ABS Regulation'], [today, 'Today']].map(([d, l]) => (
          <button key={d} className={`chip ${asOf === d ? 'on' : ''}`} onClick={() => setAsOf(d)}>{l}</button>
        ))}
      </div>
      <ErrorNote error={error} />

      <section className="versions" aria-label="Provision versions">
        <h2>Modelled transitions</h2>
        <div className="tl-axis" aria-hidden="true">{[2004, 2010, 2016, 2022, 2026].map((y) => <span key={y} style={{ left: `${((y - START) / (END - START)) * 100}%` }}>{y}</span>)}</div>
        {Object.entries(versioned).map(([fam, vs]) => (
          <div key={fam} className="tl-row">
            <p className="tl-label">{vs[0].instrument_short} {vs[0].section}<span>{vs[0].title.replace(/ \(.*\)$/, '')}</span></p>
            <div className="tl-track">
              {vs.map((v) => (
                <div key={v.id} className={`tl-bar ${v.valid_on_date ? 'live' : ''}`} title={`${v.title}: ${v.valid_from} to ${v.valid_to ?? 'now'}`}
                  style={{ left: `${Math.max(0, x(v.valid_from))}%`, width: `${Math.max(1.5, (v.valid_to ? x(v.valid_to) : 100) - Math.max(0, x(v.valid_from)))}%` }}>
                  <span>{v.valid_from.slice(0, 4)}</span>
                </div>
              ))}
              <div className="tl-now" style={{ left: `${((year - START) / (END - START)) * 100}%` }} aria-label={`Selected date ${asOf}`} />
            </div>
            <p className="tl-text">{vs.find((v) => v.valid_on_date)?.text ?? 'No version in force on this date.'}</p>
          </div>
        ))}
      </section>

      <section className="instruments">
        <h2>Instruments on {asOf}</h2>
        {['india', 'international'].map((j) => (
          <div key={j} className={`inst-col j-${j}`}>
            <h3>{j === 'india' ? 'India' : 'International'}</h3>
            <ul>
              {(items ?? []).filter((i) => i.jurisdiction === j).map((i) => (
                <li key={i.id}>
                  <a href={i.url} target="_blank" rel="noreferrer">{i.title}</a>
                  <span className={`st st-${i.status}`}>{STATUS[i.status] ?? i.status}</span>
                  {i.note && <small>{i.note}</small>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="radar">
        <h2>Change radar review queue</h2>
        <p className="small">Official pages are fetched on a schedule and compared by hash. A change goes into this queue and nothing reaches the corpus until a reviewer approves it. In this prototype the fetches are simulated from stored snapshots.</p>
        {radar.map((r) => (
          <article key={r.id} className={`radar-item rs-${r.status}`}>
            <header>
              <b>{r.instrument_title}</b>
              <span>Detected {r.detected_on}</span>
              <span className={`st st-${r.status}`}>{r.status === 'pending' ? 'Awaiting review' : r.status === 'approved' ? 'Approved' : 'Rejected'}</span>
            </header>
            <div className="diff">
              <p className="del"><span className="hash">{r.hash_before}</span>{r.before}</p>
              <p className="ins"><span className="hash">{r.hash_after}</span>{r.after}</p>
            </div>
            <p className="small">Effect if approved: {r.effect}</p>
            <div className="actions">
              {r.status !== 'approved' && <button className="btn secondary" onClick={() => decide(r.id, 'approved')}>Approve change</button>}
              {r.status !== 'rejected' && <button className="btn ghost" onClick={() => decide(r.id, 'rejected')}>Reject change</button>}
              <a href={r.source} target="_blank" rel="noreferrer">Official source</a>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
