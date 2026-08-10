// Assemble un deck de 25 cartes à partir du corpus statique.
// Ratio fixe (voir CLAUDE.md R1) : 8 brief, 7 question, 5 notion, 4 serial, 1 closing.

export const RATIO = { brief: 8, question: 7, notion: 5, serial: 4 }
export const DECK_SIZE = 25

// Mélange déterministe : même date = même deck, ce qui évite qu'un rechargement
// de page redistribue les cartes en cours de session.
function seededShuffle(items, seed) {
  const arr = [...items]
  let s = 0
  for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) % 2147483647
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483647
    const j = s % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// Priorise les questions ratées il y a plus d'une semaine (répétition espacée).
function prioritise(questions, answered, now) {
  const due = []
  const fresh = []
  const rest = []
  for (const q of questions) {
    const a = answered[q.id]
    if (!a) fresh.push(q)
    else if (!a.correct && now - a.ts > WEEK_MS) due.push(q)
    else rest.push(q)
  }
  return [...due, ...fresh, ...rest]
}

// Alternance forcée. Un mélange uniforme produit des séries, et une série de
// briefs transforme la session en scroll passif quand une série de questions la
// transforme en examen (voir CLAUDE.md, composition du deck). On intercale donc
// les types au lieu de s'en remettre au hasard : à chaque rang on prend le type
// le plus fourni parmi ceux qui diffèrent du précédent. Tant qu'aucun type ne
// dépasse la moitié du paquet, aucun ne peut se répéter d'un rang à l'autre.
function interleaveByType(groups, seed) {
  const piles = Object.entries(groups)
    .filter(([, cards]) => cards.length > 0)
    .map(([type, cards]) => ({ type, cards: [...cards] }))

  // Départage des égalités : stable pour une date donnée, différent le lendemain.
  const rank = new Map(seededShuffle(piles.map((p) => p.type), seed).map((t, i) => [t, i]))

  const out = []
  let previous = null
  while (piles.some((p) => p.cards.length)) {
    const available = piles.filter((p) => p.cards.length)
    // S'il ne reste qu'un type, on accepte la répétition plutôt que de boucler.
    const eligible = available.filter((p) => p.type !== previous)
    const pool = eligible.length ? eligible : available
    pool.sort((a, b) => b.cards.length - a.cards.length || rank.get(a.type) - rank.get(b.type))
    out.push(pool[0].cards.shift())
    previous = pool[0].type
  }
  return out
}

export function buildDeck({ pools, progress, date, serialPosition = 0 }) {
  const now = Date.now()

  const briefs = seededShuffle(pools.brief || [], date + 'b').slice(0, RATIO.brief)
  const questions = prioritise(
    seededShuffle(pools.question || [], date + 'q'),
    progress.answered || {},
    now
  ).slice(0, RATIO.question)
  const notions = seededShuffle(pools.notion || [], date + 'n').slice(0, RATIO.notion)
  const serial = (pools.serial || []).slice(serialPosition, serialPosition + RATIO.serial)

  // Le feuilleton garde son ordre : on l'insère à intervalles réguliers
  // après avoir intercalé le reste. Espacé de plusieurs cartes, il ne peut pas
  // se retrouver collé à lui-même et il coupe encore les autres types.
  const mixed = interleaveByType({ brief: briefs, question: questions, notion: notions }, date + 'mix')
  const out = []
  const step = Math.floor(mixed.length / (serial.length + 1)) || 1
  let si = 0
  for (let i = 0; i < mixed.length; i++) {
    out.push(mixed[i])
    if (si < serial.length && (i + 1) % step === 0) out.push(serial[si++])
  }
  while (si < serial.length) out.push(serial[si++])

  return {
    date,
    generatedAt: new Date().toISOString(),
    cards: out.slice(0, DECK_SIZE - 1)
  }
}
