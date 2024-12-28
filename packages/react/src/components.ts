'use client'

import Tempus from 'tempus'
import { useLayoutEffect } from 'react'

export function ReactTempus({ patch = true }: { patch?: boolean }) {
  useLayoutEffect(() => {
    if (!patch) return

    Tempus.patch()

    return () => Tempus.unpatch()
  }, [patch])
}
