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

  // A labelled callback others can order themselves against.
  useTempus(
    () => {
      // scroll
    },
    { label: 'scroll', order: -1 }
  )

  // Runs after every 'scroll' callback on the frames it ticks — ordering holds
  // across fps, so this 10fps callback never runs before scroll.
  useTempus(
    ({ time, deltaTime }) => {
      console.log(count, time, deltaTime)
    },
    {
      fps: 10,
      order: { after: 'scroll' },
    }
  )
}
