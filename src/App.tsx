import { useState } from 'react'
import { loadData } from './storage'

function App() {
  const [data] = useState(loadData)

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold">TODO</h1>
      <p className="text-ink-sub">일정 {data.events.length}개</p>
    </main>
  )
}

export default App
