import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { getLoadIssue, loadData, saveData } from './storage'
import type { AppData, TodoEvent } from './types'

const DATA_KEY = 'todo-web:data'
const CORRUPT_KEY = 'todo-web:data-corrupt'

const sampleEvent: TodoEvent = {
  id: 'e1',
  title: '회의',
  memo: '3층 회의실',
  date: '2026-11-02',
  endDate: '2026-11-03',
  time: '09:30',
  color: 'blue',
  important: true,
  repeat: { kind: 'weekly', weekdays: [1, 3], until: '2027-01-31' },
  overrides: {
    '2026-11-04': { done: true, order: 2, patch: { title: '변경된 회의' } },
    '2026-11-09': { deleted: true },
    '2026-11-11': { moveTo: '2026-11-12' },
  },
}

const sampleData: AppData = { version: 1, events: [sampleEvent] }

beforeEach(() => {
  localStorage.clear()
})

describe('규칙 4: 저장된 적 없으면 빈 데이터', () => {
  it('규칙 4: 아무것도 저장되지 않았으면 일정이 없는 빈 데이터를 돌려준다', () => {
    expect(loadData()).toEqual({ version: 1, events: [] })
  })
})

describe('규칙 2: localStorage에 전체 데이터를 JSON 하나로 저장', () => {
  it('규칙 2: saveData는 todo-web:data 키에 전체 데이터를 JSON 문자열 하나로 쓴다', () => {
    saveData(sampleData)
    const raw = localStorage.getItem(DATA_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw as string)).toEqual(sampleData)
  })

  it('규칙 2: 다시 저장하면 이전 내용을 덮어쓴다(키는 하나)', () => {
    saveData(sampleData)
    const next: AppData = { version: 1, events: [] }
    saveData(next)
    expect(JSON.parse(localStorage.getItem(DATA_KEY) as string)).toEqual(next)
  })
})

describe('규칙 5: 저장한 데이터는 다시 불러오면 같은 내용', () => {
  it('규칙 5: 모든 필드를 가진 일정이 저장 후 불러오기에서 그대로 돌아온다', () => {
    saveData(sampleData)
    expect(loadData()).toEqual(sampleData)
  })

  it('규칙 5: 빈 데이터도 저장 후 불러오면 같다', () => {
    const empty: AppData = { version: 1, events: [] }
    saveData(empty)
    expect(loadData()).toEqual(empty)
  })

  it('규칙 5: 선택 필드가 없는 일정과 여러 일정의 순서도 유지된다', () => {
    const minimal: TodoEvent = {
      id: 'e2',
      title: '메모만',
      memo: '',
      date: '2026-12-01',
      color: 'gray',
      important: false,
      overrides: {},
    }
    const data: AppData = { version: 1, events: [minimal, sampleEvent] }
    saveData(data)
    expect(loadData()).toEqual(data)
  })

  it('규칙 5: 저장-불러오기-저장-불러오기를 반복해도 내용이 변하지 않는다', () => {
    saveData(sampleData)
    const once = loadData()
    saveData(once)
    expect(loadData()).toEqual(sampleData)
  })
})

describe('규칙 3: 읽을 수 없는 데이터는 지우지 않고 보관', () => {
  it('규칙 3: JSON이 아닌 문자열이 저장돼 있으면 원문을 todo-web:data-corrupt에 보관한다', () => {
    const broken = '{"version":1,"events":[{'
    localStorage.setItem(DATA_KEY, broken)
    loadData()
    expect(localStorage.getItem(CORRUPT_KEY)).toBe(broken)
  })

  it('규칙 3: 정상 데이터를 불러올 때는 보관본을 만들지 않는다', () => {
    saveData(sampleData)
    loadData()
    expect(localStorage.getItem(CORRUPT_KEY)).toBeNull()
  })
})

describe('규칙 1: 저장 코드는 storage.ts 한 곳', () => {
  it('규칙 1: storage.ts의 saveData/loadData만으로 저장과 불러오기가 끝난다', () => {
    saveData(sampleData)
    expect(loadData()).toEqual(sampleData)
  })

  it('규칙 1: storage.ts와 테스트 파일을 뺀 src 소스 파일에는 localStorage/sessionStorage/indexedDB가 나오지 않는다', () => {
    const sources = import.meta.glob(
      ['./**/*.{ts,tsx,js,jsx}', '!./storage.ts', '!./**/*.test.*'],
      { query: '?raw', import: 'default', eager: true },
    ) as Record<string, string>
    const forbidden = /localStorage|sessionStorage|indexedDB/
    const offenders = Object.entries(sources)
      .filter(([, text]) => forbidden.test(text))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })
})

// 아래부터는 계획서 "저장 코드 규칙(확정)"의 1, 2, 4번 (위 describe의 규칙 번호와는 별개)
const EMPTY: AppData = { version: 1, events: [] }

const unreadableCases: Array<[string, string]> = [
  ['깨진 JSON', '{"version":1,"events":[{'],
  ['version이 1이 아닌 모양', JSON.stringify({ version: 3, events: [] })],
  ['events가 배열이 아닌 모양', JSON.stringify({ version: 1, events: {} })],
  ['빈 문자열', ''],
  ["문자열 'null'", 'null'],
]

describe('확정 규칙 1: 읽을 수 없는 데이터는 원문 보관 + 빈 데이터 반환', () => {
  it.each(unreadableCases)('확정 규칙 1: %s는 예외 없이 빈 데이터를 돌려준다', (_name, raw) => {
    localStorage.setItem(DATA_KEY, raw)
    expect(() => loadData()).not.toThrow()
    expect(loadData()).toEqual(EMPTY)
  })

  it.each(unreadableCases)('확정 규칙 1: %s는 원문 그대로 보관 키에 보관된다', (_name, raw) => {
    localStorage.setItem(DATA_KEY, raw)
    loadData()
    expect(localStorage.getItem(CORRUPT_KEY)).toBe(raw)
  })

  it.each(unreadableCases)('확정 규칙 1: %s여도 원래 키는 지우지 않고 그대로 둔다', (_name, raw) => {
    localStorage.setItem(DATA_KEY, raw)
    loadData()
    expect(localStorage.getItem(DATA_KEY)).toBe(raw)
  })

  it('확정 규칙 1: 손상 후 다음 saveData가 원래 키를 덮어쓰고 보관본은 유지된다', () => {
    const raw = '{"version":1,"events":[{'
    localStorage.setItem(DATA_KEY, raw)
    loadData()
    saveData(sampleData)
    expect(JSON.parse(localStorage.getItem(DATA_KEY) as string)).toEqual(sampleData)
    expect(localStorage.getItem(CORRUPT_KEY)).toBe(raw)
    expect(loadData()).toEqual(sampleData)
  })
})

describe('확정 규칙 2: 손상이 두 번 나오면 보관본을 새 원문으로 덮어쓴다', () => {
  it('확정 규칙 2: 두 번째 손상 데이터의 원문이 보관 키에 남는다', () => {
    const first = '{"broken":'
    const second = JSON.stringify({ version: 1, events: 'x' })
    localStorage.setItem(DATA_KEY, first)
    loadData()
    expect(localStorage.getItem(CORRUPT_KEY)).toBe(first)

    localStorage.setItem(DATA_KEY, second)
    expect(() => loadData()).not.toThrow()
    expect(localStorage.getItem(CORRUPT_KEY)).toBe(second)
  })
})

describe('확정 규칙 4: 과거/다른 버전 마이그레이션은 하지 않고 보관', () => {
  it('확정 규칙 4: version이 2인 올바른 JSON은 변환 없이 원문 보관 + 빈 데이터 반환', () => {
    const raw = JSON.stringify({ version: 2, events: [sampleEvent] })
    localStorage.setItem(DATA_KEY, raw)
    expect(loadData()).toEqual(EMPTY)
    expect(localStorage.getItem(CORRUPT_KEY)).toBe(raw)
    expect(localStorage.getItem(DATA_KEY)).toBe(raw)
  })
})

const minimalValid = {
  id: 'm1',
  title: '최소',
  memo: '',
  date: '2026-12-01',
  color: 'gray',
  important: false,
  overrides: {},
}

const badEventCases: Array<[string, unknown]> = [
  ['events에 null이 섞임', null],
  ['id가 없음', { ...minimalValid, id: undefined }],
  ['id가 숫자', { ...minimalValid, id: 1 }],
  ['date가 없음', { ...minimalValid, date: undefined }],
  ['date가 숫자', { ...minimalValid, date: 20261201 }],
  ['overrides가 없음', { ...minimalValid, overrides: undefined }],
  ['overrides가 null', { ...minimalValid, overrides: null }],
]

describe('확정 규칙 6: 일정 필드 검증(불러올 때)', () => {
  it.each(badEventCases)('확정 규칙 6: %s이면 손상으로 보고 원문 보관 + 빈 데이터 반환, 원래 키 유지', (_name, bad) => {
    const raw = JSON.stringify({ version: 1, events: [bad] })
    localStorage.setItem(DATA_KEY, raw)
    expect(() => loadData()).not.toThrow()
    expect(loadData()).toEqual(EMPTY)
    expect(localStorage.getItem(CORRUPT_KEY)).toBe(raw)
    expect(localStorage.getItem(DATA_KEY)).toBe(raw)
  })

  it('확정 규칙 6: 일정 여러 개 중 하나만 틀려도 전체가 손상이다', () => {
    const raw = JSON.stringify({ version: 1, events: [sampleEvent, { ...minimalValid, id: 7 }, minimalValid] })
    localStorage.setItem(DATA_KEY, raw)
    expect(loadData()).toEqual(EMPTY)
    expect(localStorage.getItem(CORRUPT_KEY)).toBe(raw)
  })

  it('확정 규칙 6: 최소 필드만 가진 올바른 일정은 손상이 아니고 그대로 통과한다', () => {
    const raw = JSON.stringify({ version: 1, events: [minimalValid] })
    localStorage.setItem(DATA_KEY, raw)
    expect(loadData()).toEqual({ version: 1, events: [minimalValid] })
    expect(localStorage.getItem(CORRUPT_KEY)).toBeNull()
  })

  it('확정 규칙 6: 선택 필드가 있는 올바른 일정도 보존된 채 통과한다', () => {
    localStorage.setItem(DATA_KEY, JSON.stringify(sampleData))
    expect(loadData()).toEqual(sampleData)
    expect(localStorage.getItem(CORRUPT_KEY)).toBeNull()
  })
})

describe('확정 규칙 7: 보관 쓰기 실패 알림(getLoadIssue)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const failWrites = () =>
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })

  it('확정 규칙 7: 보관 쓰기가 실패해도 loadData는 예외 없이 빈 데이터를 돌려주고 getLoadIssue는 archive-failed', () => {
    localStorage.setItem(DATA_KEY, '{"broken":')
    failWrites()
    expect(() => loadData()).not.toThrow()
    expect(loadData()).toEqual(EMPTY)
    expect(getLoadIssue()).toBe('archive-failed')
  })

  it('확정 규칙 7: 아무것도 저장된 적 없으면 getLoadIssue는 null', () => {
    loadData()
    expect(getLoadIssue()).toBeNull()
  })

  it('확정 규칙 7: 정상 데이터를 불러오면 getLoadIssue는 null', () => {
    saveData(sampleData)
    loadData()
    expect(getLoadIssue()).toBeNull()
  })

  it('확정 규칙 7: 손상 데이터 보관에 성공하면 getLoadIssue는 null', () => {
    localStorage.setItem(DATA_KEY, '{"broken":')
    loadData()
    expect(getLoadIssue()).toBeNull()
  })

  it('확정 규칙 7: 실패 뒤 정상 데이터를 다시 불러오면 이전 값이 지워져 null', () => {
    localStorage.setItem(DATA_KEY, '{"broken":')
    const spy = failWrites()
    loadData()
    expect(getLoadIssue()).toBe('archive-failed')
    spy.mockRestore()
    localStorage.setItem(DATA_KEY, JSON.stringify(sampleData))
    loadData()
    expect(getLoadIssue()).toBeNull()
  })
})
