import { useTempus } from 'tempus/react'

export default function App() {
  useTempus((time, deltaTime) => {
    console.log('frame', time, deltaTime)
  })

  useTempus(
    (time, deltaTime) => {
      console.log('frame:10', time, deltaTime)
    },
    {
      fps: 10,
    }
  )
  return <div></div>
}
