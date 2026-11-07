import type { AppData } from './types'

const DATA_KEY = 'todo-web:data'
const CORRUPT_KEY = 'todo-web:data-corrupt'

let loadIssue: 'archive-failed' | null = null

function empty(): AppData {
  return { version: 1, events: [] }
}

function isEvent(event: unknown): boolean {
  if (typeof event !== 'object' || event === null) return false
  const { id, date, overrides } = event as Record<string, unknown>
  return typeof id === 'string' && typeof date === 'string' && typeof overrides === 'object' && overrides !== null
}

export function loadData(): AppData {
  loadIssue = null
  const raw = localStorage.getItem(DATA_KEY)
  if (raw === null) return empty()
  try {
    const data = JSON.parse(raw)
    if (data?.version === 1 && Array.isArray(data.events) && data.events.every(isEvent)) return data
  } catch {
    // 아래에서 원본을 보관한다
  }
  // 읽을 수 없는 데이터는 지우지 않고 따로 보관해, 다음 저장이 덮어써도 남게 한다
  try {
    localStorage.setItem(CORRUPT_KEY, raw)
  } catch {
    // 보관하지 못해도 앱은 열려야 한다. 화면이 getLoadIssue()로 알린다
    loadIssue = 'archive-failed'
  }
  return empty()
}

/** 마지막 loadData에서 손상 데이터를 보관하지 못했으면 'archive-failed', 아니면 null */
export function getLoadIssue(): 'archive-failed' | null {
  return loadIssue
}

export function saveData(data: AppData): void {
  localStorage.setItem(DATA_KEY, JSON.stringify(data))
}
