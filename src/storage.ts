import type { AppData } from './types'

const DATA_KEY = 'todo-web:data'
const CORRUPT_KEY = 'todo-web:data-corrupt'

function empty(): AppData {
  return { version: 1, events: [] }
}

export function loadData(): AppData {
  const raw = localStorage.getItem(DATA_KEY)
  if (raw === null) return empty()
  try {
    const data = JSON.parse(raw)
    if (data?.version === 1 && Array.isArray(data.events)) return data
  } catch {
    // 아래에서 원본을 보관한다
  }
  // 읽을 수 없는 데이터는 지우지 않고 따로 보관해, 다음 저장이 덮어써도 남게 한다
  localStorage.setItem(CORRUPT_KEY, raw)
  return empty()
}

export function saveData(data: AppData): void {
  localStorage.setItem(DATA_KEY, JSON.stringify(data))
}
