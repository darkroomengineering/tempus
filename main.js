import { raf } from './src'
import './style.css'

function onFrame(time, deltaTime) {
  console.log(time)
  document.body.innerHTML = `time: ${time}<br/>delta time: ${deltaTime}`
}

raf.add(onFrame, 0)
