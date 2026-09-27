import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import ingredientsData from '../../data/ingredients.json'
import formulationsData from '../../data/formulations.json'
import { createMatcher } from './engine/match.js'
import { createVault } from './engine/vault.js'
import { STRINGS } from './i18n.js'

export const matcher = createMatcher(ingredientsData.ingredients, formulationsData.formulations)
export const vault = createVault()
export const INGREDIENTS = ingredientsData.ingredients
export const FORMULATIONS = formulationsData.formulations
export const PLANNED_RECORDS = formulationsData.planned_records

const todayISO = () => new Date().toISOString().slice(0, 10)

// Every call to the server goes through the vault guard.
export async function api(path, body) {
  const init = body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: vault.guard(path, body) }
  if (body === undefined) vault.guard(path, null)
  const res = await fetch(path, init)
  if (!res.ok) {
    let detail = ''
    try { detail = (await res.json()).detail } catch { /* not json */ }
    throw new Error(typeof detail === 'string' && detail ? detail : `The server could not complete this (${res.status}).`)
  }
  return res.json()
}

const Ctx = createContext(null)

export function AppProvider({ children }) {
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('ips-lang') || 'en' } catch { return 'en' } })
  const [asOf, setAsOf] = useState(todayISO())
  const [outbound, setOutbound] = useState([])
  useEffect(() => vault.subscribe(setOutbound), [])
  useEffect(() => { try { localStorage.setItem('ips-lang', lang) } catch { /* private mode */ } document.documentElement.lang = lang }, [lang])
  const value = useMemo(() => ({ lang, setLang, t: STRINGS[lang], asOf, setAsOf, today: todayISO(), outbound }), [lang, asOf, outbound])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useApp = () => useContext(Ctx)
