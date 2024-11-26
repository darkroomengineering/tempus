import Tempus from '../dist/tempus.modern.mjs'
import './style.css'

Tempus.patch() // this patches the window.requestAnimationFrame to use Tempus instead

let rAFID

function onFirstFrame(time, deltaTime) {
  console.log('first frame')
  // document.body.innerHTML = `time: ${time}<br/>delta time: ${deltaTime}`
}

function onFrame(time, deltaTime) {
  // console.log(time, deltaTime)
  document.body.innerHTML = `time: ${time}<br/>delta time: ${deltaTime}`

  rAFID = requestAnimationFrame(onFrame)
}

// const unsubscribe = Tempus.add(onFrame, { priority: 0 }) // max FPS, will executed before priority: 1
// const unsubscribe = Tempus.add(onFrame, { priority: 1 }) // max FPS, will executed after priority: 0
// Tempus.add(onFrame, { priority: 0, fps: 30 }) // 30 FPS, (e.g. playing frame sequence)

rAFID = requestAnimationFrame(onFrame)

setTimeout(() => {
  // unsubscribe()
  // console.log(rAFID)
  cancelAnimationFrame(rAFID) // be sure to cancel the rAF
}, 5000)

requestAnimationFrame(onFirstFrame) // this sould be executed only once since it's not a recursive rAF
