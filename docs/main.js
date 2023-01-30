import { raf } from '../dist/tempus.modern.mjs'
import './style.css'

function onFrame(time, deltaTime) {
  console.log(time, deltaTime)
  document.body.innerHTML = `time: ${time}<br/>delta time: ${deltaTime}`
}

raf.add(onFrame, 0)
