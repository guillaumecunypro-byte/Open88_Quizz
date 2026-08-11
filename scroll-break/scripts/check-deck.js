// Contrôle du corpus et de l'assemblage du deck. `npm run check`.
//
// Aucune dépendance : Node lit les JSON et rejoue buildDeck sur une année de
// dates. Le script vérifie les règles que CLAUDE.md pose comme non négociables —
// ratio, alternance des types, sources obligatoires, répétition espacée — et
// rend un code de sortie non nul dès qu'une seule est violée.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildDeck, RATIO, DECK_SIZE } from '../src/lib/deckBuilder.js'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const CONTENT = path.join(ROOT, 'content')

const failures = []
const fail = (message) => failures.push(message)

// --- Corpus ---------------------------------------------------------------

const cards = fs
  .readdirSync(CONTENT)
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => {
    const parsed = JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8'))
    if (!Array.isArray(parsed)) fail(`${f} n'est pas un tableau de cartes`)
    return Array.isArray(parsed) ? parsed.map((c) => ({ ...c, file: f })) : []
  })

const seen = new Set()
for (const card of cards) {
  const where = `${card.file} ${card.id}`
  if (seen.has(card.id)) fail(`${where} : identifiant en double dans le corpus`)
  seen.add(card.id)

  // Sources obligatoires pour brief et notion (CLAUDE.md, schéma de données).
  if ((card.type === 'brief' || card.type === 'notion') && !card.sources?.length)
    fail(`${where} : source manquante, obligatoire pour ${card.type}`)

  // Titre de brief : 60 caractères, sinon il déborde sur un petit écran.
  if (card.type === 'brief' && card.payload.title.length > 60)
    fail(`${where} : titre de ${card.payload.title.length} caractères, 60 maximum`)

  // Une question sans explication n'apprend rien quand la réponse est fausse.
  if (card.type === 'question' && !card.payload.explanation)
    fail(`${where} : explication manquante`)
}

const pools = {
  brief: cards.filter((c) => c.type === 'brief'),
  question: cards.filter((c) => c.type === 'question'),
  notion: cards.filter((c) => c.type === 'notion'),
  serial: cards.filter((c) => c.type === 'serial')
}

for (const [type, attendu] of Object.entries(RATIO))
  if (pools[type].length < attendu)
    fail(`corpus : ${pools[type].length} carte(s) ${type} pour ${attendu} attendues par deck`)

// --- Assemblage sur une année ---------------------------------------------

const dates = []
for (let mois = 1; mois <= 12; mois++)
  for (let jour = 1; jour <= 28; jour++)
    dates.push(`2026-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`)

const vide = { answered: {} }
const signatures = new Set()

for (const date of dates) {
  const deck = buildDeck({ pools, progress: vide, date, serialPosition: 0 })
  const types = deck.cards.map((c) => c.type)

  if (deck.cards.length !== DECK_SIZE - 1)
    fail(`${date} : ${deck.cards.length} cartes, ${DECK_SIZE - 1} attendues hors clôture`)

  for (const [type, attendu] of Object.entries(RATIO)) {
    const compte = types.filter((t) => t === type).length
    if (compte !== attendu) fail(`${date} : ${compte} ${type}, ${attendu} attendues`)
  }

  if (new Set(deck.cards.map((c) => c.id)).size !== deck.cards.length)
    fail(`${date} : une même carte apparaît deux fois dans le deck`)

  // Alternance forcée : deux cartes voisines ne partagent jamais leur type.
  for (let i = 1; i < types.length; i++)
    if (types[i] === types[i - 1]) fail(`${date} : deux ${types[i]} de suite en position ${i}`)

  // Le feuilleton se lit dans l'ordre.
  const episodes = deck.cards.filter((c) => c.type === 'serial').map((c) => c.id)
  if (episodes.join() !== [...episodes].sort().join())
    fail(`${date} : épisodes du feuilleton dans le désordre`)

  // Même date, même deck : un rechargement ne redistribue rien.
  const rejoue = buildDeck({ pools, progress: vide, date, serialPosition: 0 })
  if (rejoue.cards.map((c) => c.id).join() !== deck.cards.map((c) => c.id).join())
    fail(`${date} : deux assemblages successifs donnent des decks différents`)

  signatures.add(types.join(' '))
}

// Le rythme doit changer d'un jour à l'autre, sinon la session devient un rail.
if (signatures.size < dates.length / 2)
  fail(`rythme : ${signatures.size} séquences de types distinctes sur ${dates.length} dates`)

// --- Répétition espacée ----------------------------------------------------

// Une question ratée il y a plus de sept jours doit revenir dans le deck.
const ratee = pools.question[0]
const jour = 24 * 60 * 60 * 1000
const avecRate = {
  answered: { [ratee.id]: { correct: false, ts: Date.now() - 8 * jour } }
}
const deckRevision = buildDeck({ pools, progress: avecRate, date: '2026-08-10', serialPosition: 0 })
if (!deckRevision.cards.some((c) => c.id === ratee.id))
  fail(`répétition espacée : ${ratee.id}, ratée il y a huit jours, ne revient pas dans le deck`)

// --- Verdict ---------------------------------------------------------------

console.log(`corpus     ${cards.length} cartes`)
console.log(
  `pools      ${Object.entries(pools)
    .map(([t, p]) => `${t} ${p.length}`)
    .join(', ')}`
)
console.log(`decks      ${dates.length} dates rejouées`)
console.log(`rythme     ${signatures.size} séquences de types distinctes`)

if (failures.length) {
  console.error(`\n${failures.length} problème(s) :`)
  for (const f of failures.slice(0, 40)) console.error(`  ${f}`)
  if (failures.length > 40) console.error(`  … et ${failures.length - 40} autre(s)`)
  process.exit(1)
}

console.log('\nTout est conforme.')
