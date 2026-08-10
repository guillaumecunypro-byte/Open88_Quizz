import { useCallback, useState } from 'react'
import { loadProgress, saveProgress, today, yesterday } from '../lib/storage.js'

export function useProgress() {
  const [progress, setProgress] = useState(loadProgress)

  const recordAnswer = useCallback((cardId, correct, pickedIndex) => {
    setProgress((p) => {
      const next = {
        ...p,
        answered: { ...p.answered, [cardId]: { correct, pickedIndex, ts: Date.now() } }
      }
      saveProgress(next)
      return next
    })
  }, [])

  const completeDeck = useCallback(() => {
    setProgress((p) => {
      if (p.lastPlayed === today()) return p
      const streak = p.lastPlayed === yesterday() ? p.streak + 1 : 1
      const next = {
        ...p,
        streak,
        lastPlayed: today(),
        decksCompleted: p.decksCompleted + 1
      }
      saveProgress(next)
      return next
    })
  }, [])

  return { progress, recordAnswer, completeDeck }
}
