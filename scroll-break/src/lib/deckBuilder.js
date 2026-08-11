// Assemble un deck de 25 cartes à partir du corpus statique.
// Ratio fixe (voir CLAUDE.md R1) : 8 brief, 7 question, 5 notion, 4 serial, 1 closing.

export const RATIO = { brief: 8, question: 7, notion: 5, serial: 4 }
export const DECK_SIZE = 25

// Suite pseudo-aléatoire déterministe : même graine, même suite. C'est ce qui
// garantit que la même date redonne le même deck, et donc qu'un rechargement de
// page ne redistribue pas les cartes en cours de session.
function seededSource(seed) {
  let s = 0
  for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) % 2147483647
  return () => (s = (s * 1103515245 + 12345) % 2147483647)
}

function seededShuffle(items, seed) {
  const next = seededSource(seed)
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = next() % (i + 1)
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

// Reste-t-il au moins un ordre sans répétition à partir de cet état ?
// Prendre systématiquement le tas le plus fourni est optimal pour ce problème :
// si cette stratégie échoue, aucun ordre ne convient. La réponse est donc exacte,
// pas une approximation.
function completable(counts, previous) {
  const rest = { ...counts }
  let remaining = Object.values(rest).reduce((a, b) => a + b, 0)
  let last = previous
  while (remaining > 0) {
    let best = null
    for (const type of Object.keys(rest))
      if (rest[type] > 0 && type !== last && (best === null || rest[type] > rest[best])) best = type
    if (best === null) return false
    rest[best]--
    remaining--
    last = best
  }
  return true
}

// Alternance forcée. Un mélange uniforme produit des séries, et une série de
// briefs transforme la session en scroll passif quand une série de questions la
// transforme en examen (voir CLAUDE.md, composition du deck).
//
// On intercale donc les types au lieu de s'en remettre au hasard. Prendre à
// chaque rang le tas le plus fourni suffirait à éviter les répétitions, mais
// avec des effectifs aussi contraints que 8/7/5 le résultat est quasi imposé :
// le rythme des types serait le même tous les jours. On tire donc au sort parmi
// tous les types qui laissent une fin de deck jouable — le lookahead ci-dessus
// écarte les impasses, le hasard fait le reste.
function interleaveByType(groups, seed) {
  const piles = Object.entries(groups)
    .filter(([, cards]) => cards.length > 0)
    .map(([type, cards]) => ({ type, cards: [...cards] }))
  const next = seededSource(seed)

  const out = []
  let previous = null
  while (piles.some((p) => p.cards.length)) {
    const available = piles.filter((p) => p.cards.length)
    const eligible = available.filter((p) => p.type !== previous)
    const viable = eligible.filter((candidate) => {
      const counts = Object.fromEntries(
        piles.map((p) => [p.type, p.cards.length - (p === candidate ? 1 : 0)])
      )
      return completable(counts, candidate.type)
    })
    // Si plus rien n'est jouable — un type en surnombre écrasant — on accepte la
    // répétition plutôt que de boucler indéfiniment.
    const pool = viable.length ? viable : eligible.length ? eligible : available
    const pick = pool[next() % pool.length]
    out.push(pick.cards.shift())
    previous = pick.type
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

  const mixed = interleaveByType({ brief: briefs, question: questions, notion: notions }, date + 'mix')

  // Le feuilleton garde son ordre et reste réparti régulièrement, mais son point
  // d'accroche se décale avec la date : sans ce décalage les épisodes tombent aux
  // mêmes rangs tous les jours. L'écart entre deux emplacements reste d'au moins
  // une carte, donc deux épisodes ne peuvent pas se suivre.
  const step = Math.floor(mixed.length / (serial.length + 1)) || 1
  const nextOffset = seededSource(date + 'serial')
  const offset = serial.length ? nextOffset() % step : 0
  const slots = new Set(serial.map((_, k) => (k + 1) * step + offset))

  const out = []
  let si = 0
  for (let i = 0; i < mixed.length; i++) {
    if (slots.has(i) && si < serial.length) out.push(serial[si++])
    out.push(mixed[i])
  }
  while (si < serial.length) out.push(serial[si++])

  return {
    date,
    generatedAt: new Date().toISOString(),
    cards: out.slice(0, DECK_SIZE - 1)
  }
}
