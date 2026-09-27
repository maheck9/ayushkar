import { useEffect, useState } from 'react'
import { useApp } from './state.jsx'
import { VaultDrawer } from './components.jsx'
import ProductCheck from './pages/ProductCheck.jsx'
import AskLaw from './pages/AskLaw.jsx'
import { Biopiracy, ClaimCheck } from './pages/Screens.jsx'
import Timeline from './pages/Timeline.jsx'
import Proofs from './pages/Proofs.jsx'
import ChatPanel from './ChatPanel.jsx'

const PAGES = { check: ProductCheck, ask: AskLaw, claims: ClaimCheck, biopiracy: Biopiracy, timeline: Timeline, proofs: Proofs }
const readHash = () => { const h = location.hash.replace('#/', ''); return PAGES[h] ? h : 'check' }

export default function App() {
  const { t, lang, setLang, asOf, setAsOf, today, outbound } = useApp()
  const [page, setPage] = useState(readHash)
  const [drawer, setDrawer] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  useEffect(() => {
    const on = () => { setPage(readHash()); window.scrollTo(0, 0) }
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])
  const Page = PAGES[page]
  const past = asOf !== today

  return (
    <div className={`shell ${chatOpen ? 'chat-open' : ''}`}>
      <a className="skip" href="#main">Skip to content</a>
      <header className="top">
        <div className="brand">
          <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="var(--india)" /><path d="M16 6c-4 5-6 9-6 12a6 6 0 0 0 12 0c0-3-2-7-6-12z" fill="var(--haridra)" /><path d="M16 12v14" stroke="var(--india)" strokeWidth="2" /></svg>
          <div>
            <p className="brand-name">Ayushkar</p>
            <p className="brand-sub">{t.tagline}</p>
          </div>
        </div>
        <div className="top-tools">
          <label className={`asof ${past ? 'past' : ''}`}>
            <span>{t.asOf}</span>
            <input type="date" value={asOf} max={today} min="2003-01-01" onChange={(e) => e.target.value && setAsOf(e.target.value)} />
            {past && <button className="linklike" onClick={() => setAsOf(today)}>{t.today}</button>}
          </label>
          <button className="vault-btn" onClick={() => setDrawer(true)}>
            {t.leftDevice}<span className="count" aria-label={`${outbound.length} requests`}>{outbound.length}</span>
          </button>
          <div className="lang seg" role="radiogroup" aria-label="Language">
            <button role="radio" aria-checked={lang === 'en'} onClick={() => setLang('en')}>EN</button>
            <button role="radio" aria-checked={lang === 'hi'} onClick={() => setLang('hi')} lang="hi">हिं</button>
          </div>
        </div>
        <nav className="nav" aria-label="Sections">
          {Object.keys(PAGES).map((k) => (
            <a key={k} href={`#/${k}`} aria-current={page === k ? 'page' : undefined}>{t.nav[k]}</a>
          ))}
        </nav>
      </header>
      {past && <p className="past-banner">Showing the law as it stood on {asOf}. Provisions and statuses from later dates are hidden.</p>}
      <main id="main"><Page /></main>
      <footer className="foot">
        <p>{t.disclaimer}</p>
        <p>Ayushkar is a prototype by The Council for Smart India Hackathon 2026, problem statement SIH26045, IP-SAKTI Sahayak (Ministry of Ayush, All India Institute of Ayurveda). Prototype data: 9 AFI records and 43 provisions, each flagged for verification where needed.</p>
      </footer>
      {drawer && <VaultDrawer onClose={() => setDrawer(false)} />}
      <ChatPanel open={chatOpen} setOpen={setChatOpen} />
    </div>
  )
}
