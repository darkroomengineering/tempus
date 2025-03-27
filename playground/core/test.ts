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
  () => {
    const instances = Object.values(Tempus.framerates)
      .flatMap((framerate) =>
        framerate.callbacks.map((callback) => ({
          label: callback.label,
          durations: callback.durations,
          priority: callback.priority,
        }))
      )
      .sort((a, b) => a.priority - b.priority)

    // instances.forEach((instance) => {
    //   console.log(instance.label, instance.durations)
    // })

    document.querySelector('#app')!.innerHTML = instances
      .map((instance, index) => {
        // let duration = instance.durations.at(-1)
        let duration =
          instance.durations.reduce((acc, curr) => acc + curr, 0) /
          instance.durations.length

        if (typeof duration === 'number') {
          duration = duration.toFixed(2)
        }

        const min = Math.min(...instance.durations).toFixed(2)
        const max = Math.max(...instance.durations).toFixed(2)

        const pourcent = Math.round((duration / (1000 / Tempus.fps)) * 100)

        return `<div>${index + 1}. ${instance.label}: <span style="color: ${
          pourcent > 10 ? (pourcent > 25 ? 'red' : 'orange') : 'green'
        }">${duration}ms</span> (${min} - ${max}) (${pourcent}%)</div>`
      })
      .join('\n')

    document.querySelector('#app')!.innerHTML +=
      `<br/><div>fps: ${Math.round(Tempus.fps)} (${Math.floor(
        Tempus.usage * 100
      )}%)</div>`
  },
  {
    fps: 2,
    priority: Number.POSITIVE_INFINITY,
    label: 'debug',
  }
)
