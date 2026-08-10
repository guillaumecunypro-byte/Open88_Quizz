import { useCallback, useMemo, useState } from 'react'
import { Deck } from './components/Deck.jsx'
import { Progress } from './components/Progress.jsx'
import { useDeck } from './hooks/useDeck.js'
import { useProgress } from './hooks/useProgress.js'

export default function App() {
  const { progress, recordAnswer, completeDeck } = useProgress()
  const { deck } = useDeck(progress)
  const [index, setIndex] = useState(0)
  const [session, setSession] = useState({ correct: 0, total: 0 })

  const onAnswer = useCallback(
    (cardId, correct, pickedIndex) => {
      recordAnswer(cardId, correct, pickedIndex)
      setSession((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }))
    },
    [recordAnswer]
  )

  const stats = useMemo(
    () => ({
      correct: session.correct,
      total: session.total,
      streak: progress.streak,
      minutes: Math.round(((deck?.cards.length ?? 25) * 20) / 60)
    }),
    [session, progress.streak, deck]
  )

  // R3 : jamais d'écran de chargement. Si rien n'est prêt, un fond neutre.
  if (!deck) return <main className="shell" />

  return (
    <main className="shell">
      <Progress index={index} total={deck.cards.length + 1} />
      <Deck
        cards={deck.cards}
        stats={stats}
        progress={progress}
        onAnswer={onAnswer}
        onIndexChange={setIndex}
        onComplete={completeDeck}
      />
    </main>
  )
}
