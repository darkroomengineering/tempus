import Tempus from '../dist/tempus.modern.mjs'
import './style.css'

Tempus.patch() // this patches the window.requestAnimationFrame to use Tempus instead

function onFrame(time, deltaTime) {
  console.log(time, deltaTime)
  document.body.innerHTML = `time: ${time}<br/>delta time: ${deltaTime}`
}

const unsubscribe = Tempus.add(onFrame, { priority: 0, fps: 1 }) // max FPS, will executed before priority: 1
// Tempus.add(onFrame, { priority: 1 }) // max FPS, will executed after priority: 0
// Tempus.add(onFrame, { priority: 0, fps: 30 }) // 30 FPS, (e.g. playing frame sequence)

setTimeout(() => {
  unsubscribe()
}, 5000)
