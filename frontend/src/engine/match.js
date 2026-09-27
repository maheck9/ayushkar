// Statutory formula match (D&C Act s.3(a) / s.3(h)(i)).
// Runs entirely in the browser: the ingredient list never leaves this device.
// Pure functions so the same code runs in the UI and in `npm test`.

const PROPORTION_TOLERANCE = 0.1 // relative, on normalised shares

export function normalise(s) {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a, b) {
  const m = a.length, n = b.length
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 1; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[m][n]
}

const FORM_ALIASES = {
  churna: 'churna', powder: 'churna', 'kwatha churna': 'kwatha churna', kwath: 'kwatha churna', decoction: 'kwatha churna',
  'guggulu (vati)': 'guggulu (vati)', guggulu: 'guggulu (vati)', vati: 'vati', tablet: 'vati', gutika: 'vati',
  capsule: 'capsule', syrup: 'syrup', avaleha: 'avaleha', taila: 'taila', oil: 'taila', ghrita: 'ghrita', cream: 'cream',
}
const canonForm = (x) => {
  const n = normalise(x || '')
  const hit = Object.entries(FORM_ALIASES).find(([k]) => normalise(k) === n)
  return hit ? normalise(hit[1]) : n
}
export const DOSAGE_FORMS = ['churna', 'kwatha churna', 'guggulu (vati)', 'vati', 'capsule', 'syrup', 'avaleha', 'taila', 'ghrita', 'cream']

export function createMatcher(ingredients, formulations) {
  const byId = Object.fromEntries(ingredients.map((i) => [i.id, i]))
  const alias = new Map()
  for (const ing of ingredients) {
    const names = [...ing.aliases, ing.sanskrit, ing.hindi, ing.english, ing.latin, ing.id.replace(/_/g, ' ')]
    for (const n of names) if (n) alias.set(normalise(n), ing.id)
  }
  const aliasKeys = [...alias.keys()].filter((k) => k.length >= 4)

  function resolve(raw) {
    const n = normalise(raw)
    if (!n) return null
    if (alias.has(n)) return { id: alias.get(n), how: 'exact' }
    // drop trailing words such as "powder", "fruit", "root"
    const words = n.split(' ')
    for (let k = words.length - 1; k >= 1; k--) {
      const head = words.slice(0, k).join(' ')
      if (alias.has(head)) return { id: alias.get(head), how: 'exact' }
    }
    // tolerate small spelling differences
    let best = null
    for (const key of aliasKeys) {
      const limit = key.length >= 8 ? 2 : 1
      if (Math.abs(key.length - n.length) > limit) continue
      const dist = levenshtein(n, key)
      if (dist <= limit && (!best || dist < best.dist)) best = { id: alias.get(key), dist, key }
    }
    return best ? { id: best.id, how: 'fuzzy' } : null
  }

  function parse(text) {
    const parts = text
      .split(/[\n,;+]|\band\b|\s&\s/i)
      .map((s) => s.trim())
      .filter(Boolean)
    return parts.map((raw) => {
      const q = raw.match(/(\d+(?:\.\d+)?)(?:\s*\/\s*(\d+))?\s*(parts?|part|g|gm|mg|kg|%)?/i)
      let qty = null
      if (q) qty = q[2] ? Number(q[1]) / Number(q[2]) : Number(q[1])
      const name = raw
        .replace(/(\d+(?:\.\d+)?)(\s*\/\s*\d+)?\s*(parts?|part|g|gm|mg|kg|%)?/gi, ' ')
        .replace(/[:=()-]/g, ' ')
        .trim()
      const r = resolve(name)
      return { raw, name, qty, id: r?.id ?? null, how: r?.how ?? null, ingredient: r ? byId[r.id] : null }
    })
  }

  function shares(list) {
    const total = list.reduce((a, x) => a + x.q, 0)
    return Object.fromEntries(list.map((x) => [x.id, x.q / total]))
  }

  function match(items, dosageForm) {
    const form = canonForm(dosageForm)
    const unresolved = items.filter((i) => !i.id)
    const outside = items.filter((i) => i.id && !byId[i.id].in_universe)
    const ids = [...new Set(items.filter((i) => i.id).map((i) => i.id))]
    const set = new Set(ids)
    const coverage = { indexed: formulations.length }

    if (!items.length) return { cls: null }

    if (unresolved.length || outside.length) {
      return {
        cls: 'outside', items, coverage,
        breaking: [...unresolved.map((i) => ({ what: i.raw, why: 'not found in the ingredient universe' })),
                   ...outside.map((i) => ({ what: byId[i.id].english, why: 'not an ingredient of any indexed First Schedule formula' }))],
        nearest: nearest(set),
      }
    }

    const sameSet = formulations.filter((f) => f.ingredients.length === set.size && f.ingredients.every((x) => set.has(x.id)))
    for (const f of sameSet) {
      const breaking = []
      if (form && canonForm(f.dosage_form) !== form) breaking.push({ what: 'dosage form', why: `book gives ${f.dosage_form}, product is ${form}` })
      const withQty = items.filter((i) => i.qty != null)
      let proportionChecked = false
      if (withQty.length === items.length) {
        proportionChecked = true
        const mine = shares(items.map((i) => ({ id: i.id, q: i.qty })))
        const book = shares(f.ingredients.map((x) => ({ id: x.id, q: x.parts })))
        for (const id of Object.keys(book)) {
          const rel = Math.abs(mine[id] - book[id]) / book[id]
          if (rel > PROPORTION_TOLERANCE)
            breaking.push({ what: byId[id].sanskrit, why: `proportion ${(mine[id] * 100).toFixed(1)}% vs ${(book[id] * 100).toFixed(1)}% in the book` })
        }
      }
      if (!breaking.length)
        return { cls: 'classical', record: f, items, coverage, proportionChecked,
                 notes: proportionChecked ? [] : ['Proportions were not given, so only the ingredient set and form were checked.'] }
      return { cls: 'proprietary', items, coverage, breaking, nearest: { record: f, extra: [], missing: [] } }
    }

    const near = nearest(set)
    return {
      cls: 'proprietary', items, coverage, nearest: near,
      breaking: [
        ...near.extra.map((id) => ({ what: byId[id].sanskrit, why: `not in ${near.record.name}` })),
        ...near.missing.map((id) => ({ what: byId[id].sanskrit, why: `${near.record.name} also needs it` })),
      ],
    }
  }

  function nearest(set) {
    let best = null
    for (const f of formulations) {
      const fs = new Set(f.ingredients.map((x) => x.id))
      const inter = [...set].filter((x) => fs.has(x)).length
      const score = inter / (set.size + fs.size - inter)
      if (!best || score > best.score) best = { record: f, score, extra: [...set].filter((x) => !fs.has(x)), missing: [...fs].filter((x) => !set.has(x)) }
    }
    return best
  }

  // Everything a user could type that names one of these ingredients (for redaction and the vault guard).
  function namesFor(ids) {
    const out = new Set()
    for (const [k, v] of alias) if (ids.includes(v) && k.length >= 3) out.add(k)
    return [...out]
  }

  return { parse, match, resolve, byId, namesFor, allNames: () => [...alias.keys()].filter((k) => k.length >= 4) }
}

// Proof 1: perturbation benchmark. Each case is written as free text with rotating
// alias spellings, so parsing, name resolution and matching are tested together.
// Expected labels follow from how each case is built.
export function perturbationBenchmark(ingredients, formulations) {
  const m = createMatcher(ingredients, formulations)
  const universe = ingredients.filter((i) => i.in_universe).map((i) => i.id)
  const outsiders = ingredients.filter((i) => !i.in_universe).map((i) => i.id)
  const byId = m.byId
  let aliasTurn = 0
  const spell = (id) => {
    const ing = byId[id]
    const opts = [ing.sanskrit, ing.latin, ...ing.aliases.filter((a) => /^[a-z .-]+$/i.test(a))].filter(Boolean)
    return opts[aliasTurn++ % opts.length]
  }
  const expectedFor = (ids, form) => {
    if (ids.some((id) => !byId[id].in_universe)) return 'outside'
    const s = new Set(ids)
    const hit = formulations.find((f) => f.dosage_form === form && f.ingredients.length === s.size && f.ingredients.every((x) => s.has(x.id)))
    return hit ? 'classical' : 'proprietary'
  }
  const cases = []
  const add = (kind, f, list, form) => {
    const text = list.map((x) => `${spell(x.id)}${x.parts != null ? ' ' + x.parts + ' part' : ''}`).join(', ')
    const ids = list.map((x) => x.id)
    let expected = expectedFor(ids, form)
    // exact set with changed proportions must not be classical
    if (kind === 'proportion') expected = 'proprietary'
    cases.push({ kind, base: f.name, text, form, expected })
  }
  formulations.forEach((f, fi) => {
    const base = f.ingredients.map((x) => ({ id: x.id, parts: x.parts }))
    add('exact', f, base, f.dosage_form)
    add('exact, no proportions', f, base.map((x) => ({ id: x.id })), f.dosage_form)
    base.forEach((_, i) => add('remove one', f, base.filter((__, j) => j !== i), f.dosage_form))
    const extras = universe.filter((id) => !base.some((x) => x.id === id))
    for (let k = 0; k < 3; k++) add('add one (in universe)', f, [...base, { id: extras[(fi * 7 + k * 5) % extras.length], parts: 1 }], f.dosage_form)
    for (let k = 0; k < 2; k++) {
      const i = (fi + k) % base.length
      add('swap one', f, base.map((x, j) => (j === i ? { id: extras[(fi * 3 + k * 11) % extras.length], parts: x.parts } : x)), f.dosage_form)
    }
    add('add outside ingredient', f, [...base, { id: outsiders[fi % outsiders.length], parts: 1 }], f.dosage_form)
    add('change dosage form', f, base, f.dosage_form === 'capsule' ? 'vati' : 'capsule')
    if (base.length > 1) add('proportion', f, base.map((x, j) => (j === 0 ? { id: x.id, parts: x.parts * 2 } : x)), f.dosage_form)
  })
  const results = cases.map((c) => {
    const got = m.match(m.parse(c.text), c.form).cls
    return { ...c, got, pass: got === c.expected }
  })
  const byKind = {}
  for (const r of results) {
    byKind[r.kind] ??= { total: 0, pass: 0 }
    byKind[r.kind].total++
    byKind[r.kind].pass += r.pass ? 1 : 0
  }
  return { total: results.length, passed: results.filter((r) => r.pass).length, byKind, failures: results.filter((r) => !r.pass) }
}
