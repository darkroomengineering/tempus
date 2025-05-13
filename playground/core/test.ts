import Tempus from 'tempus'

function isPrime(num) {
  if (num < 2) return false
  for (let i = 2; i * i <= num; i++) {
    if (num % i === 0) return false
  }
  return true
}

function sumPrimes(limit) {
  let sum = 0
  for (let i = 2; i <= limit; i++) {
    if (isPrime(i)) {
      sum += i
    }
  }
  return sum
}

function animate(time: number, deltaTime: number) {
  // console.log('frame:10', time, deltaTime)
  const result = sumPrimes(50000)
}

Tempus.add(
  () => {
    console.log('50%')
  },
  {
    fps: '50%',
    label: '50%',
  }
)

Tempus.add(
  () => {
    sumPrimes(50030)
  },
  {
    fps: 10,
    label: 'gsap',
  }
)

Tempus.add(
  () => {
    sumPrimes(25030)
    console.log('webgl:render')
  },
  {
    priority: 1,
    label: 'webgl:render',
  }
)

Tempus.add(
  () => {
    sumPrimes(100030)
  },
  {
    label: 'physics',
  }
)

Tempus.add(animate, {
  priority: -1,
  label: 'lenis',
})

Tempus.patch()

function slider() {
  sumPrimes(10030)
  requestAnimationFrame(slider)
}

requestAnimationFrame(slider)

Tempus.add(
  (elapsed, deltaTime) => {
    // console.log({ elapsed, deltaTime })

    const instances = Object.values(Tempus.framerates)
      .flatMap((framerate) =>
        framerate.callbacks.map((callback) => ({
          label: callback.label,
          samples: callback.samples,
          priority: callback.priority,
        }))
      )
      .sort((a, b) => a.priority - b.priority)

    // instances.forEach((instance) => {
    //   console.log(instance.label, instance.samples)
    // })

    document.querySelector('#stats')!.innerHTML = instances
      .map((instance, index) => {
        // let duration = instance.samples.at(-1)
        const duration =
          instance.samples.reduce((acc, curr) => acc + curr, 0) /
          instance.samples.length

        // if (typeof duration === 'number') {
        //   duration = duration.toFixed(2)
        // }

        const min = Math.min(...instance.samples).toFixed(2)
        const max = Math.max(...instance.samples).toFixed(2)

        const pourcent = Math.round(
          (duration / (1000 / (Tempus?.fps ?? 0))) * 100
        )

        return `<div>${index + 1}. ${instance.label}: <span style="color: ${
          pourcent > 10 ? (pourcent > 25 ? 'red' : 'orange') : 'green'
        }">${duration.toFixed(2)}ms</span> (${min} - ${max}) (${pourcent}%)</div>`
      })
      .join('\n')

    document.querySelector('#stats')!.innerHTML +=
      `<br/><div>fps: ${Math.round(Tempus?.fps ?? 0)} (${Math.floor(
        Tempus.usage * 100
      )}%)</div>`
  },
  {
    fps: 2,
    priority: Number.POSITIVE_INFINITY,
    label: 'debug',
  }
)

let frameCount = 0

Tempus.add(() => {
  // if (frameCount === 0) {
  //   console.log('ping')
  // } else {
  //   console.log('pong')
  // }

  frameCount++
  frameCount %= 2
})

const playpauseBtn = document.createElement('button')
playpauseBtn.textContent = 'Play/Pause'
playpauseBtn.style.marginRight = '10px'
playpauseBtn.onclick = () => {
  console.log('was playing?', Tempus.isPlaying)
  if (Tempus.isPlaying) {
    Tempus.pause()
    playpauseBtn.textContent = 'Play'
  } else {
    Tempus.play();
    playpauseBtn.textContent = 'Pause';
  }
};

const restartBtn = document.createElement('button')
restartBtn.textContent = 'Restart'
restartBtn.onclick = () => {
  console.log('restarting')
  Tempus.restart()
}

document.querySelector('#app')!.appendChild(playpauseBtn)
document.querySelector('#app')!.appendChild(restartBtn)
