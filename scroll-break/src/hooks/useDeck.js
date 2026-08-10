import { useEffect, useState } from 'react'
import { buildDeck } from '../lib/deckBuilder.js'
import { today } from '../lib/storage.js'

const DECK_URL = import.meta.env.VITE_DECK_URL
const CACHE_KEY = 'sb:deck'

// Ordre de résolution, jamais bloquant (R3) :
// 1. deck distant du jour  2. deck en cache  3. deck construit localement
export function useDeck(progress) {
  const [deck, setDeck] = useState(null)
  const [origin, setOrigin] = useState(null)

  useEffect(() => {
    let cancelled = false
    const date = today()

    async function localDeck() {
      const mods = await Promise.all([
        import('../../content/ia-histoire.json'),
        import('../../content/ia-fonctionnement.json'),
        import('../../content/ia-reglementaire.json'),
        import('../../content/ia-idees-recues.json'),
        import('../../content/feuilleton.json'),
        // Briefs de secours : servis uniquement tant que VITE_DECK_URL n'est pas
        // branché. Dès que n8n répond, le deck distant remplace tout (voir plus bas).
        import('../../content/briefs-local.json')
      ])
      const all = mods.flatMap((m) => m.default)
      const pools = {
        brief: all.filter((c) => c.type === 'brief'),
        question: all.filter((c) => c.type === 'question'),
        notion: all.filter((c) => c.type === 'notion'),
        serial: all.filter((c) => c.type === 'serial')
      }
      return buildDeck({
        pools,
        progress,
        date,
        serialPosition: (progress.decksCompleted * 4) % Math.max(pools.serial.length, 1)
      })
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

      if (DECK_URL) {
        try {
          const r = await fetch(`${DECK_URL}?date=${date}`)
          if (r.ok) {
            const remote = await r.json()
            if (!cancelled && remote?.cards?.length >= 20) {
              setDeck(remote)
              setOrigin('remote')
              try {
                localStorage.setItem(CACHE_KEY, JSON.stringify(remote))
              } catch {}
              return
            }
          }
        } catch {}
      }

      const local = await localDeck()
      if (!cancelled) {
        setDeck((d) => (d && d.date === date ? d : local))
        setOrigin((o) => o || 'local')
      }
    }

    resolve()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { deck, origin }
}
