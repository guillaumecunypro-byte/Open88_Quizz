import { useEffect, useRef } from 'react'
import { BriefCard, QuestionCard, NotionCard, SerialCard, ClosingCard } from './Cards.jsx'

// Le défilement utilise scroll-snap natif : pas de bibliothèque de gestes.
// C'est plus fluide sur mobile et reproduit exactement l'inertie d'un feed.
export function Deck({ cards, stats, progress, onAnswer, onIndexChange, onComplete }) {
  const ref = useRef(null)
  const completed = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    function onScroll() {
      const i = Math.round(el.scrollTop / el.clientHeight)
      onIndexChange(i)
      if (i >= cards.length && !completed.current) {
        completed.current = true
        onComplete()
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [cards.length, onIndexChange, onComplete])

  return (
    <div className="deck" ref={ref}>
      {cards.map((card) => (
        <section className="slide" key={card.id}>
          {card.type === 'brief' && <BriefCard card={card} />}
          {card.type === 'question' && (
            <QuestionCard
              card={card}
              answered={progress.answered[card.id]}
              onAnswer={onAnswer}
            />
          )}
          {card.type === 'notion' && <NotionCard card={card} />}
          {card.type === 'serial' && <SerialCard card={card} />}
        </section>
      ))}
      <section className="slide" key="closing">
        <ClosingCard stats={stats} />
      </section>
    </div>
  )
}
