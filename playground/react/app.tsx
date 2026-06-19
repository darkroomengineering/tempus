import { useEffect, useState } from 'react'
import { useTempus } from 'tempus/react'

export default function App() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(count + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [count])

  useTempus(
    ({ time, deltaTime }) => {
      console.log(count, time, deltaTime)
    },
    {
      fps: 10,
    }
  )
}
