import { useEffect, useRef, useState } from 'react'
import { api, matcher, useApp, vault } from './state.jsx'
import { BriefButton, Cite, Confidence } from './components.jsx'

const WELCOME = {
  from: 'bot', intent: 'greet',
  text: 'Namaste. Ask me about patents, licences, biodiversity rules, trade marks, advertising or export for an Ayurvedic product. Every answer quotes the law it relies on.',
  suggestions: ['Can I patent my classical churna?', 'Do I need permission to buy herbs from farmers?', 'Can my ad say it controls diabetes?'],
  citations: [], actions: [],
}

export default function ChatPanel({ open, setOpen }) {
  const { t, asOf } = useApp()
  const [msgs, setMsgs] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [jur, setJur] = useState('india')
  const [lastQ, setLastQ] = useState(null)
  const [busy, setBusy] = useState(false)
  const listRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [msgs, busy])
  useEffect(() => { if (open) inputRef.current?.focus() }, [open])
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && open) setOpen(false) }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [open, setOpen])

  const send = async (text = input) => {
    const clean = text.trim()
    if (!clean || busy) return
    const red = vault.redact(clean, matcher.allNames())
    setMsgs((m) => [...m, { from: 'user', text: clean, sentAs: red.replaced ? red.text : null }])
    setInput(''); setBusy(true)
    try {
      const r = await api('/api/chat', { message: red.text, context: { jurisdiction: jur, last_question: lastQ, as_of: asOf } })
      if (r.question) setLastQ(r.question)
      if (r.jurisdiction && r.jurisdiction !== jur) setJur(r.jurisdiction)
      setMsgs((m) => [...m, { from: 'bot', ...r }])
    } catch (e) {
      setMsgs((m) => [...m, { from: 'bot', error: true, text: `I couldn't reach the server: ${e.message}`, citations: [], suggestions: [], actions: [] }])
    } finally { setBusy(false) }
  }

  const lastBot = msgs.map((m) => m.from).lastIndexOf('bot')

  return (
    <>
      {!open && (
        <button className="chat-launch" onClick={() => setOpen(true)} aria-label={t.chat.open}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
          <span>{t.chat.open}</span>
        </button>
      )}
      <aside className={`chat ${open ? 'open' : ''}`} aria-label={t.chat.title} aria-hidden={!open} inert={open ? undefined : ''}>
        <header className="chat-head">
          <div>
            <h2>{t.chat.title}</h2>
            <p>{t.asOf} {asOf}</p>
          </div>
          <button className="chat-close" onClick={() => setOpen(false)} aria-label={t.chat.close}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
          <div className="seg chat-jur" role="radiogroup" aria-label="Jurisdiction">
            <button role="radio" aria-checked={jur === 'india'} onClick={() => setJur('india')}>India</button>
            <button role="radio" aria-checked={jur === 'international'} onClick={() => setJur('international')}>International</button>
          </div>
        </header>

        <ol className="chat-list" ref={listRef} aria-live="polite">
          {msgs.map((m, i) => (
            <li key={i} className={`msg ${m.from} ${m.jurisdiction ? 'j-' + m.jurisdiction : ''} ${m.error ? 'err' : ''}`}>
              {m.from === 'user' ? (
                <>
                  <p>{m.text}</p>
                  {m.sentAs && <small>{t.chat.sentAs}: {m.sentAs}</small>}
                </>
              ) : (
                <>
                  {m.intent === 'answer' && <span className={`msg-jur j-${m.jurisdiction}`}>{m.jurisdiction === 'india' ? 'India' : 'International'}</span>}
                  <p>{m.text}</p>
                  {m.items?.length > 0 && <ul className="msg-items">{m.items.map((x) => <li key={x}>{x}</li>)}</ul>}
                  {m.confidence && !m.abstained && <Confidence level={m.confidence} />}
                  {m.gist_is_curated && <small className="gist-note">{t.chat.gistNote}</small>}
                  {m.switch_hint && <small className="hint-inline">{m.switch_hint}</small>}
                  {m.citations?.length > 0 && (
                    <div className="msg-cites">{m.citations.map((c, j) => <Cite key={c.id} p={c} span={j === 0 ? c.span : undefined} />)}</div>
                  )}
                  {m.actions?.length > 0 && (
                    <div className="msg-actions">
                      {m.actions.map((a) => a.brief ? (
                        <BriefButton key="brief" label={a.label} build={() => ({
                          as_of: asOf, question: lastQ ?? msgs.filter((x) => x.from === 'user').at(-1)?.sentAs ?? msgs.filter((x) => x.from === 'user').at(-1)?.text,
                          jurisdiction: jur, provisions: [],
                          open_questions: ['Question raised through the assistant chat; the assistant could not answer it from the corpus with enough confidence.'],
                        })} />
                      ) : <a key={a.href} className="btn secondary" href={a.href} onClick={() => innerWidth < 760 && setOpen(false)}>{a.label}</a>)}
                    </div>
                  )}
                  {i === lastBot && m.suggestions?.length > 0 && (
                    <div className="msg-sugg">{m.suggestions.map((s) => <button key={s} className="chip" onClick={() => send(s)}>{s}</button>)}</div>
                  )}
                </>
              )}
            </li>
          ))}
          {busy && <li className="msg bot typing" aria-label="Searching the corpus"><span /><span /><span /></li>}
        </ol>

        <form className="chat-form" onSubmit={(e) => { e.preventDefault(); send() }}>
          <label className="sr-only" htmlFor="chat-in">{t.chat.placeholder}</label>
          <input id="chat-in" ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.chat.placeholder} maxLength={600} autoComplete="off" />
          <button className="btn" disabled={!input.trim() || busy}>{t.chat.send}</button>
        </form>
        <p className="chat-foot">{t.chat.foot}</p>
      </aside>
    </>
  )
}
