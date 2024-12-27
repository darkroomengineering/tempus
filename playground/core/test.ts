import Tempus from 'tempus'

function animate(time: number, deltaTime: number) {
  console.log('frame:10', time, deltaTime)
}

Tempus.add(animate, {
  fps: 10,
})

Tempus.patch()

function raf() {
  console.log('frame')
  requestAnimationFrame(raf)
}

requestAnimationFrame(raf)
