import { useCallback, useEffect, useState } from 'react'
import { useTempus } from 'tempus/react'
import Tempus from 'tempus'

export default function App() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(count + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [count])

  const logCount = useCallback(
    (time: number, deltaTime: number) => {
      console.log(count, time, deltaTime)
    },
    [count]
  )

  useTempus((time, deltaTime) => {
    console.log(count, time, deltaTime)
  })

  // useTempus((time, deltaTime) => {
  //   console.log('frame')
  // })
}
