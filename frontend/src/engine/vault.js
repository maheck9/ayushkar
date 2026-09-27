// Formulation Vault.
// 1. Everything that names the user's ingredients is held only in this browser tab.
// 2. Free text sent to the server is redacted first.
// 3. A guard inspects every outbound request body and blocks it if any vault term appears.
// 4. Every request that leaves the device is recorded for the "What left your device" panel.

export class VaultLeakError extends Error {}

export function createVault() {
  const terms = new Set()
  const outbound = []
  const listeners = new Set()
  const emit = () => listeners.forEach((fn) => fn([...outbound]))

  return {
    hold(names) {
      for (const n of names) {
        const t = String(n).toLowerCase().trim()
        if (t.length >= 3) terms.add(t)
      }
    },
    clear() { terms.clear() },
    size: () => terms.size,

    // Replace ingredient names (dictionary names passed in, plus held terms) and quantities.
    redact(text, dictionaryNames = []) {
      let out = text
      const names = [...new Set([...terms, ...dictionaryNames.map((n) => n.toLowerCase())])].sort((a, b) => b.length - a.length)
      const seen = new Map()
      for (const name of names) {
        const re = new RegExp(`(?<![\\p{L}\\p{N}])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'giu')
        out = out.replace(re, () => {
          if (!seen.has(name)) seen.set(name, `[INGREDIENT ${seen.size + 1}]`)
          return seen.get(name)
        })
      }
      out = out.replace(/\b\d+(?:\.\d+)?\s*(?:parts?|g|gm|mg|kg|%)(?![\p{L}])/giu, '[QTY]')
      return { text: out, replaced: seen.size }
    },

    // Throws if the body contains a held term. Returns the serialised body otherwise.
    guard(endpoint, body) {
      const json = JSON.stringify(body)
      const low = json.toLowerCase()
      const leaked = [...terms].filter((t) => low.includes(t))
      const entry = { at: new Date().toISOString(), endpoint, body: json, bytes: new TextEncoder().encode(json).length, blocked: leaked.length > 0 }
      outbound.unshift(entry)
      if (outbound.length > 100) outbound.pop()
      emit()
      if (leaked.length) throw new VaultLeakError(`Blocked: request to ${endpoint} contained a formulation term`)
      return json
    },

    outbound: () => [...outbound],
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
  }
}

// The only product information the server receives.
export function buildFactSheet(matchResult, facts, asOf, skipped = []) {
  return { match: matchResult.cls, facts: { ...facts }, skipped: [...skipped], as_of: asOf }
}
