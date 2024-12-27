import { useEffect } from 'react'
import Tempus from 'tempus'
import type { TempusCallback, TempusOptions } from 'tempus'

function useTempus(callback: TempusCallback, options?: TempusOptions) {
  useEffect(() => {
    return Tempus.add(callback, options)
  }, [])
}

useTempus.patch = Tempus.patch

export { useTempus }
