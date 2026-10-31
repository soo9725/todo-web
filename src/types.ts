export type EventColor = 'blue' | 'red' | 'yellow' | 'gray'

export type RepeatKind = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface Repeat {
  kind: RepeatKind
  /** 매주일 때 요일 (0=일 ... 6=토) */
  weekdays?: number[]
  /** 종료 날짜 YYYY-MM-DD, 없으면 계속 */
  until?: string
}

/** 반복 일정의 특정 날짜에만 적용되는 값 (순서·완료·개별 수정·이동) */
export interface Override {
  done?: boolean
  order?: number
  deleted?: boolean
  /** 이 날짜의 일정을 옮긴 곳 YYYY-MM-DD */
  moveTo?: string
  patch?: Partial<Pick<TodoEvent, 'title' | 'memo' | 'time' | 'color' | 'important'>>
}

export interface TodoEvent {
  id: string
  title: string
  memo: string
  /** 시작 날짜 YYYY-MM-DD */
  date: string
  /** 기간 일정의 종료 날짜 YYYY-MM-DD */
  endDate?: string
  /** 시간 HH:MM, 없으면 시간 없는 일정 */
  time?: string
  color: EventColor
  important: boolean
  repeat?: Repeat
  /** 날짜(YYYY-MM-DD)별 예외. 반복이 아닌 일정은 시작 날짜 하나만 쓴다. */
  overrides: Record<string, Override>
}

export interface AppData {
  version: 1
  events: TodoEvent[]
}
