import { useEffect, useState } from 'react'
import { useTempus } from 'tempus/react'

export default function App() {
  const [count, setCount] = useState(0)
  const [frame, setFrame] = useState({ time: 0, deltaTime: 0 })

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((c) => c + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  useTempus(
    ({ time, deltaTime }) => {
      setFrame({ time, deltaTime })
    },
    {
      fps: 10,
    }
  )

  return (
    <main>
      <h1>tempus + React</h1>
      <p>count: {count}</p>
      <p>time: {frame.time.toFixed(0)}ms</p>
      <p>deltaTime: {frame.deltaTime.toFixed(1)}ms</p>
    </main>
  )
}
