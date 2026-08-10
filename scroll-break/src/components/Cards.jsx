import { useState } from 'react'

function Sources({ sources }) {
  if (!sources || sources.length === 0) return null
  return (
    <div className="sources">
      {sources.map((s, i) => (
        <span key={i}>
          {s.name}
          {s.date ? ` · ${s.date}` : ''}
        </span>
      ))}
    </div>
  )
}

export function BriefCard({ card }) {
  const { title, body } = card.payload
  return (
    <article className="card card--brief">
      <span className="tag">Info</span>
      <h2>{title}</h2>
      <p className="body">{body}</p>
      <Sources sources={card.sources} />
    </article>
  )
}

export function QuestionCard({ card, answered, onAnswer }) {
  const { question, options, correctIndex, explanation } = card.payload
  const [picked, setPicked] = useState(answered?.pickedIndex ?? null)
  const revealed = picked !== null

  function choose(i) {
    if (revealed) return
    setPicked(i)
    onAnswer(card.id, i === correctIndex, i)
  }

  return (
    <article className="card card--question">
      <span className="tag">Question</span>
      <h2>{question}</h2>
      <div className="options">
        {options.map((opt, i) => {
          let cls = 'option'
          if (revealed && i === correctIndex) cls += ' option--correct'
          else if (revealed && i === picked) cls += ' option--wrong'
          else if (revealed) cls += ' option--dim'
          return (
            <button key={i} className={cls} onClick={() => choose(i)} disabled={revealed}>
              {opt}
            </button>
          )
        })}
      </div>
      {revealed && (
        <div className="explanation">
          <p>{explanation}</p>
          <Sources sources={card.sources} />
        </div>
      )}
    </article>
  )
}

export function NotionCard({ card }) {
  const { term, definition, example, pitfall } = card.payload
  return (
    <article className="card card--notion">
      <span className="tag">Notion</span>
      <h2>{term}</h2>
      <p className="body">{definition}</p>
      {example && (
        <p className="aside">
          <strong>Exemple</strong> {example}
        </p>
      )}
      {pitfall && (
        <p className="aside aside--warn">
          <strong>Erreur fréquente</strong> {pitfall}
        </p>
      )}
      <Sources sources={card.sources} />
    </article>
  )
}

export function SerialCard({ card }) {
  const { episode, title, text } = card.payload
  return (
    <article className="card card--serial">
      <span className="tag">Épisode {episode}</span>
      <h2>{title}</h2>
      <p className="body body--serial">{text}</p>
    </article>
  )
}

export function ClosingCard({ stats }) {
  const { correct, total, streak, minutes } = stats
  return (
    <article className="card card--closing">
      <h2>Terminé</h2>
      <div className="stat-row">
        <div className="stat">
          <span className="stat-value">
            {correct}/{total}
          </span>
          <span className="stat-label">bonnes réponses</span>
        </div>
        <div className="stat">
          <span className="stat-value">{streak}</span>
          <span className="stat-label">jours d'affilée</span>
        </div>
      </div>
      <p className="closing-note">
        Environ {minutes} minutes que tu n'as pas passées à faire défiler un feed.
      </p>
      <p className="closing-note closing-note--muted">Reviens demain. Il n'y a plus rien ici.</p>
    </article>
  )
}
