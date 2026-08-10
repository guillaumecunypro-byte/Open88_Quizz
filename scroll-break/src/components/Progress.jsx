export function Progress({ index, total }) {
  const pct = Math.min(100, ((index + 1) / total) * 100)
  return (
    <header className="progress">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-count">
        {Math.min(index + 1, total)} / {total}
      </span>
    </header>
  )
}
