// Wrapper localStorage tolérant : Safari en navigation privée lève sur setItem.
const KEY = 'sb:progress'

const EMPTY = {
  streak: 0,
  lastPlayed: null,
  decksCompleted: 0,
  answered: {}
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY }
    return { ...EMPTY, ...JSON.parse(raw) }
  } catch {
    return { ...EMPTY }
  }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress))
    return true
  } catch {
    return false
  }
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}

export function yesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}
