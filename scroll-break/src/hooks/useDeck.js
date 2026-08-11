import { useEffect, useState } from 'react'
import { buildDeck, RATIO } from '../lib/deckBuilder.js'
import { today } from '../lib/storage.js'

const DECK_URL = import.meta.env.VITE_DECK_URL
const CACHE_KEY = 'sb:deck'
const BRIEFS_KEY = 'sb:briefs'

// n8n ne renvoie que des briefs, pas un deck complet : le corpus statique et
// l'assemblage (ratio, alternance, répétition espacée) vivent dans
// deckBuilder.js, où ils sont versionnés et couverts par npm run check.
// Le pipeline ne fait que ce que lui seul peut faire — aller chercher l'actualité.
//
// Ordre de résolution, jamais bloquant (R3) :
// 1. deck en cache, affiché immédiatement
// 2. briefs distants du jour, assemblés localement
// 3. briefs de secours du corpus local
export function useDeck(progress) {
  const [deck, setDeck] = useState(null)
  const [origin, setOrigin] = useState(null)

  useEffect(() => {
    let cancelled = false
    const date = today()

    async function loadPools() {
      const mods = await Promise.all([
        import('../../content/ia-histoire.json'),
        import('../../content/ia-fonctionnement.json'),
        import('../../content/ia-reglementaire.json'),
        import('../../content/ia-idees-recues.json'),
        import('../../content/feuilleton.json'),
        import('../../content/briefs-local.json')
      ])
      const all = mods.flatMap((m) => m.default)
      return {
        brief: all.filter((c) => c.type === 'brief'),
        question: all.filter((c) => c.type === 'question'),
        notion: all.filter((c) => c.type === 'notion'),
        serial: all.filter((c) => c.type === 'serial')
      }
    }

    // Les briefs frais passent d'abord, les locaux ne comblent que le reste :
    // un brief du jour n'est jamais évincé par un fait durable du corpus.
    function mergeBriefs(pools, remoteBriefs) {
      if (!remoteBriefs.length) return pools
      const manquants = Math.max(0, RATIO.brief - remoteBriefs.length)
      return { ...pools, brief: [...remoteBriefs, ...pools.brief.slice(0, manquants)] }
    }

    // Un brief distant doit être servable tel quel par l'app.
    function briefsValides(payload) {
      if (!Array.isArray(payload?.briefs)) return []
      return payload.briefs.filter(
        (b) =>
          b?.type === 'brief' &&
          b.id &&
          b.payload?.title &&
          b.payload?.body &&
          b.payload.title.length <= 60 &&
          Array.isArray(b.sources) &&
          b.sources.length > 0
      )
    }

    async function fetchBriefs() {
      if (!DECK_URL) return []
      try {
        const r = await fetch(`${DECK_URL}?date=${date}`)
        if (!r.ok) return []
        const payload = await r.json()
        if (payload?.date !== date) return []
        const briefs = briefsValides(payload)
        if (briefs.length) {
          try {
            localStorage.setItem(BRIEFS_KEY, JSON.stringify({ date, briefs }))
          } catch {}
        }
        return briefs
      } catch {
        return []
      }
    }

    // Hors ligne : les briefs de la dernière réponse valide restent jouables.
    function cachedBriefs() {
      try {
        const c = JSON.parse(localStorage.getItem(BRIEFS_KEY) || 'null')
        return Array.isArray(c?.briefs) ? c.briefs : []
      } catch {
        return []
      }
    }

    async function resolve() {
      // Cache d'abord : affichage immédiat, pas d'écran de chargement.
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
        if (cached && !cancelled) {
          setDeck(cached)
          setOrigin(cached.date === date ? 'cache' : 'stale')
        }
      } catch {}

      const [pools, distants] = await Promise.all([loadPools(), fetchBriefs()])
      if (cancelled) return

      const briefs = distants.length ? distants : cachedBriefs()
      const deckDuJour = buildDeck({
        pools: mergeBriefs(pools, briefs),
        progress,
        date,
        serialPosition: (progress.decksCompleted * 4) % Math.max(pools.serial.length, 1)
      })

      if (cancelled) return
      setDeck(deckDuJour)
      setOrigin(distants.length ? 'remote' : briefs.length ? 'cache' : 'local')
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(deckDuJour))
      } catch {}
    }

    resolve()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { deck, origin }
}
