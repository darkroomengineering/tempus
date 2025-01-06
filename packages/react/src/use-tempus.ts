'use client'

import { useEffect, useRef } from 'react'
import Tempus from 'tempus'
import type { TempusCallback, TempusOptions } from 'tempus'

function useTempus(callback: TempusCallback, options?: TempusOptions) {
  // avoid re-rendering when callback changes
  // e.g: callback is a function that depends on a state
  // and is not a useCallback
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    return Tempus.add((...args) => {
      callbackRef.current(...args)
    }, options)
  }, [JSON.stringify(options)])
}

export { useTempus }
