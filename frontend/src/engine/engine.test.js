import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createMatcher, perturbationBenchmark } from './match.js'
import { createVault, buildFactSheet } from './vault.js'

const load = (f) => JSON.parse(readFileSync(new URL(`../../../data/${f}`, import.meta.url)))
const ingredients = load('ingredients.json').ingredients
const formulations = load('formulations.json').formulations
const m = createMatcher(ingredients, formulations)

test('exact AFI formula written with mixed-language names is classical', () => {
  const r = m.match(m.parse('Harad 1 part, Terminalia bellirica 1 part, amla 1 part'), 'churna')
  assert.equal(r.cls, 'classical')
  assert.equal(r.record.name, 'Triphala Churna')
})

test('adding one in-universe ingredient flips to proprietary and names it', () => {
  const r = m.match(m.parse('Haritaki, Bibhitaki, Amalaki, Ashwagandha'), 'churna')
  assert.equal(r.cls, 'proprietary')
  assert.ok(r.breaking.some((b) => b.what === 'Ashwagandha'))
})

test('an isolated compound puts the product outside the index', () => {
  const r = m.match(m.parse('Haritaki, Bibhitaki, Amalaki, curcumin 95%'), 'churna')
  assert.equal(r.cls, 'outside')
})

test('different dosage form breaks the classical match', () => {
  const r = m.match(m.parse('Haritaki 1, Bibhitaki 1, Amalaki 1'), 'capsule')
  assert.equal(r.cls, 'proprietary')
  assert.ok(r.breaking.some((b) => b.what === 'dosage form'))
})

test('perturbation benchmark passes', () => {
  const b = perturbationBenchmark(ingredients, formulations)
  assert.ok(b.total > 100, `only ${b.total} cases`)
  assert.equal(b.failures.length, 0, JSON.stringify(b.failures.slice(0, 3), null, 1))
})

test('canary leak test: no formulation term reaches an outbound body', () => {
  const vault = createVault()
  const canary = 'Zzyqoriumroot'
  const items = m.parse(`Haritaki 1 part, Bibhitaki 1 part, ${canary} 2 part`)
  const result = m.match(items, 'churna')
  vault.hold([canary, ...items.map((i) => i.raw), ...items.map((i) => i.name), ...m.namesFor(items.filter((i) => i.id).map((i) => i.id))])

  // The fact sheet goes through the guard untouched.
  vault.guard('/api/dossier', buildFactSheet(result, { goal: 'patent' }, '2026-09-27'))
  // A free-text question is redacted before it is sent.
  const q = vault.redact(`Can I patent my ${canary} and harad churna with 2 parts amla?`, m.allNames())
  vault.guard('/api/ask', { question: q.text, jurisdiction: 'india' })

  const sent = vault.outbound().map((e) => e.body.toLowerCase()).join('\n')
  assert.ok(!sent.includes(canary.toLowerCase()))
  assert.ok(!sent.includes('haritaki') && !sent.includes('harad') && !sent.includes('amla'))
  // And an unredacted body is blocked.
  assert.throws(() => vault.guard('/api/ask', { question: `about ${canary}` }))
})
