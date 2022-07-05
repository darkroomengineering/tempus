import { raf } from './dist/tempus.module.js'
import './style.css'

function onFrame(time, deltaTime) {
  document.body.innerHTML = `time: ${time}<br/>delta time: ${deltaTime}`
}

raf.add(onFrame, 0)
