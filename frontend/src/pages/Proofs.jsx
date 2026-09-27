import { useState } from 'react'
import { perturbationBenchmark, createMatcher } from '../engine/match.js'
import { buildFactSheet, createVault } from '../engine/vault.js'
import { api, INGREDIENTS, FORMULATIONS } from '../state.jsx'
import { ErrorNote } from '../components.jsx'

function canaryTest() {
  const m = createMatcher(INGREDIENTS, FORMULATIONS)
  const v = createVault()
  const canary = 'Zzyqoriumroot'
  const items = m.parse(`Haritaki 1 part, Bibhitaki 1 part, ${canary} 2 part`)
  v.hold([canary, ...items.map((i) => i.raw), ...items.map((i) => i.name), ...m.namesFor(items.filter((i) => i.id).map((i) => i.id))])
  v.guard('/api/dossier', buildFactSheet(m.match(items, 'churna'), { goal: 'patent' }, '2026-01-01'))
  v.guard('/api/ask', { question: v.redact(`Can I patent ${canary} with harad 2 parts?`, m.allNames()).text, jurisdiction: 'india' })
  let blocked = false
  try { v.guard('/api/ask', { question: canary }) } catch { blocked = true }
  const sent = v.outbound().filter((e) => !e.blocked).map((e) => e.body.toLowerCase())
  const leaks = sent.filter((b) => b.includes(canary.toLowerCase()) || b.includes('haritaki') || b.includes('harad')).length
  return { payloads: sent.length, leaks, blocked }
}

export default function Proofs() {
  const [res, setRes] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const run = async () => {
    setBusy(true); setError(null)
    try {
      const local = { bench: perturbationBenchmark(INGREDIENTS, FORMULATIONS), canary: canaryTest() }
      const server = await api('/api/eval')
      setRes({ ...local, server })
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="page proofs">
      <h1 className="page-title">Proofs</h1>
      <p className="lede">The checks from our evaluation plan, run live against this build. Numbers come from the current index and corpus, which are prototype-sized: they show the harness works, not production accuracy.</p>
      <button className="btn" onClick={run} disabled={busy}>{busy ? 'Running the checks…' : 'Run all checks now'}</button>
      <ErrorNote error={error} retry={run} />
      {res && <Results r={res} />}
    </div>
  )
}

function Results({ r }) {
  const s = r.server
  const rows = [
    ['Proof 1', 'Three-way classification under perturbation', `${r.bench.total} cases from ${FORMULATIONS.length} AFI records: exact, remove, add, swap, outside ingredient, dosage form, proportion`, `${r.bench.passed} / ${r.bench.total} correct`, r.bench.passed === r.bench.total],
    ['Proof 2', 'Fewest-questions triage', `Every possible user: ${s.triage.cases} fact combinations`, `median ${s.triage.median}, max ${s.triage.max} questions (fixed flow: ${s.triage.baseline_fixed_flow})`, s.triage.max <= s.triage.baseline_fixed_flow],
    ['', 'Early stopping never changes advice', 'Advice with the questions asked vs advice with every fact known', `${s.triage.advice_changed_by_stopping_early} cases differ`, s.triage.advice_changed_by_stopping_early === 0],
    ['Proof 3', 'As-of-date version selection', `${s.as_of.tests} modelled transitions and dates`, `${s.as_of.passed} / ${s.as_of.tests} correct`, s.as_of.passed === s.as_of.tests],
    ['PS metric', 'Answer accuracy (right provision cited first)', `${s.retrieval.questions} statute-lookup questions`, `${s.retrieval.top1_correct} / ${s.retrieval.questions} top-1, ${s.retrieval.top3_correct} / ${s.retrieval.questions} in top 3`, s.retrieval.top3_correct === s.retrieval.questions],
    ['PS metric', 'Citation correctness', 'Every quoted span checked against its source text', `${s.citation.spans_found_verbatim_in_source} / ${s.citation.spans_checked} found verbatim`, s.citation.spans_found_verbatim_in_source === s.citation.spans_checked],
    ['PS metric', 'Safe abstention', `${s.abstention.out_of_scope} out-of-scope, ${s.abstention.in_scope} in-scope questions`, `${s.abstention.abstained_correctly} / ${s.abstention.out_of_scope} abstained; ${s.abstention.abstained_wrongly} wrongly refused`, s.abstention.abstained_correctly === s.abstention.out_of_scope && s.abstention.abstained_wrongly === 0],
    ['Invariant', 'Jurisdiction firewall', `${s.firewall.queries_run} queries across both panels`, `${s.firewall.cross_jurisdiction_citations} cross-jurisdiction citations`, s.firewall.cross_jurisdiction_citations === 0],
    ['Invariant', 'Formulation Vault canary leak test', `Canary ingredient through a product check and a free-text question`, `${r.canary.leaks} leaks in ${r.canary.payloads} payloads; raw canary ${r.canary.blocked ? 'blocked' : 'NOT blocked'}`, r.canary.leaks === 0 && r.canary.blocked],
  ]
  return (
    <>
      <div className="tbl-wrap">
        <table className="tbl proofs-tbl">
          <thead><tr><th>Check</th><th>What was run</th><th>Result</th><th><span className="sr-only">Pass</span></th></tr></thead>
          <tbody>
            {rows.map(([tag, name, what, result, ok], i) => (
              <tr key={i}>
                <td><span className="tag">{tag}</span><b>{name}</b></td>
                <td>{what}</td>
                <td className="num">{result}</td>
                <td className={ok ? 'pass' : 'fail'}>{ok ? 'Pass' : 'Fail'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small">Multilingual quality (the fourth PS metric) needs Bhashini output and a native-speaker check; it is not measured in this prototype.</p>
      <Histogram h={s.triage.histogram} baseline={s.triage.baseline_fixed_flow} total={s.triage.cases} />
      <details className="detail-list">
        <summary>Statute-lookup questions and what was cited</summary>
        <table className="tbl"><thead><tr><th>Panel</th><th>Question</th><th>Expected</th><th>Cited (in order)</th></tr></thead>
          <tbody>{s.retrieval.rows.map((x, i) => <tr key={i} className={x.top1 ? '' : 'miss'}><td>{x.jurisdiction}</td><td>{x.question}</td><td>{x.expected.join(', ')}</td><td>{x.cited.join(', ')}</td></tr>)}</tbody>
        </table>
      </details>
    </>
  )
}

function Histogram({ h, baseline, total }) {
  const keys = Array.from({ length: baseline }, (_, i) => i + 1)
  const max = Math.max(...Object.values(h))
  const W = 560, H = 180, pad = 28, bw = (W - pad * 2) / keys.length
  const [hover, setHover] = useState(null)
  return (
    <figure className="hist">
      <figcaption><b>Questions needed per user</b> ({total} simulated users). A fixed form asks all {baseline}.</figcaption>
      <div className="hist-box">
        <svg viewBox={`0 0 ${W} ${H + 30}`} role="img" aria-label="Histogram of questions asked per user">
          <line x1={pad} x2={W - pad} y1={H} y2={H} className="axis" />
          {keys.map((k, i) => {
            const n = h[k] ?? 0
            const bh = (n / max) * (H - 24)
            const xx = pad + i * bw + 1
            return (
              <g key={k} onMouseEnter={() => setHover(k)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(k)} onBlur={() => setHover(null)} tabIndex={0}>
                <rect x={pad + i * bw} y={0} width={bw} height={H} fill="transparent" />
                {n > 0 && <path className="bar" d={`M${xx},${H} v${-(bh - 4)} q0,-4 4,-4 h${bw - 10} q4,0 4,4 v${bh - 4} z`} />}
                {k === baseline && <text x={xx + (bw - 2) / 2} y={H - 6} className="lbl base" textAnchor="middle">fixed form</text>}
                <text x={xx + (bw - 2) / 2} y={H + 18} className="lbl" textAnchor="middle">{k}</text>
              </g>
            )
          })}
        </svg>
        {hover && <div className="tip" style={{ left: `${((keys.indexOf(hover) + 0.5) * bw + pad) / W * 100}%` }}>{h[hover] ?? 0} users needed {hover} question{hover > 1 ? 's' : ''}</div>}
      </div>
      <details><summary>Table view</summary>
        <table className="tbl small-tbl"><thead><tr><th>Questions</th><th>Users</th></tr></thead><tbody>{keys.map((k) => <tr key={k}><td>{k}</td><td>{h[k] ?? 0}</td></tr>)}</tbody></table>
      </details>
    </figure>
  )
}
