'use client'

import Tempus from 'tempus'
import { useLayoutEffect } from 'react'

export function ReactTempus({ patch = true }: { patch?: boolean }) {
  useLayoutEffect(() => {
    if (!Tempus || !patch) return

    Tempus.patch()

    return () => Tempus.unpatch()
  }, [patch])
}
