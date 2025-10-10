'use client'

import Tempus from 'tempus'
import { useEffect } from 'react'

export function ReactTempus({ patch = true }: { patch?: boolean }) {
  useEffect(() => {
    if (!Tempus || !patch) return

    Tempus.patch()

    return () => Tempus.unpatch()
  }, [patch])

  return null
}
