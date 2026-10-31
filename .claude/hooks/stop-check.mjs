// Stop 훅: 소스가 바뀌었으면 `npm run check`를 돌리고, 실패하면 종료를 막아 고치게 한다.
// 같은 세션에서 연속 3번 막은 뒤에는 종료를 허용한다(무한 반복 방지). 사용자에게 보고하는 단계다.
import { spawnSync, execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const MAX_BLOCKS = 3
const RESET_AFTER_MS = 10 * 60 * 1000

let input = {}
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}')
} catch {
  // 입력이 없어도 진행한다
}

// Claude Code가 넘기는 CLAUDE_PROJECT_DIR는 드라이브 문자가 소문자(c:/...)일 수 있고, 그 폴더에서 실행하면 Vitest가 실행기를 못 찾는다. 대문자로 맞춘다.
const root = (process.env.CLAUDE_PROJECT_DIR || process.cwd()).replace(/^[a-z]:/, (drive) => drive.toUpperCase())
const pkgPath = join(root, 'package.json')
if (!existsSync(pkgPath) || !JSON.parse(readFileSync(pkgPath, 'utf8')).scripts?.check) process.exit(0)

const passFile = join(root, '.claude', '.last-check')
const counterFile = join(tmpdir(), `todo-web-stop-${String(input.session_id ?? 'default').replace(/\W/g, '')}.json`)

function newestChange() {
  const files = execFileSync('git', ['ls-files', '-m', '-o', '--exclude-standard'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter((f) => f && !f.startsWith('docs/') && !f.startsWith('.claude/') && !f.endsWith('.md'))
  let newest = 0
  for (const f of files) {
    try {
      newest = Math.max(newest, statSync(join(root, f)).mtimeMs)
    } catch {
      // 지워진 파일은 건너뛴다
    }
  }
  return newest
}

let lastPass = 0
try {
  lastPass = Number(readFileSync(passFile, 'utf8'))
} catch {
  // 아직 통과한 적 없음
}
// 마지막 통과 뒤로 바뀐 소스가 없으면 다시 돌리지 않는다
if (newestChange() <= lastPass) process.exit(0)

const run = spawnSync('npm run check', { cwd: root, shell: true, encoding: 'utf8', timeout: 280_000 })
if (run.status === 0) {
  writeFileSync(passFile, String(Date.now()))
  try {
    writeFileSync(counterFile, JSON.stringify({ count: 0, time: Date.now() }))
  } catch {
    // 카운터를 못 써도 통과는 유효하다
  }
  process.exit(0)
}

let state = { count: 0, time: 0 }
try {
  state = JSON.parse(readFileSync(counterFile, 'utf8'))
} catch {
  // 처음 실패
}
if (Date.now() - state.time > RESET_AFTER_MS) state.count = 0

const tail = `${run.stdout ?? ''}${run.stderr ?? ''}`.trim().split('\n').slice(-40).join('\n')

if (state.count >= MAX_BLOCKS) {
  process.stdout.write(
    JSON.stringify({
      systemMessage: `npm run check가 ${MAX_BLOCKS}번 연속 실패해 멈춥니다. 막힌 내용을 사용자에게 보고하세요.`,
    }),
  )
  process.exit(0)
}

writeFileSync(counterFile, JSON.stringify({ count: state.count + 1, time: Date.now() }))
process.stdout.write(
  JSON.stringify({
    decision: 'block',
    reason: `npm run check 실패 (${state.count + 1}/${MAX_BLOCKS}). 원인을 고치고 다시 확인하세요. 테스트를 통과시키려고 테스트 파일을 고치지 마세요.\n\n${tail}`,
  }),
)
