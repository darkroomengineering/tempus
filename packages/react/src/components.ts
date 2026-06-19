'use client'

import { useEffect } from 'react'
import Tempus from 'tempus'

export function ReactTempus({ patch = true }: { patch?: boolean }) {
  useEffect(() => {
    if (!Tempus || !patch) return

    Tempus.patch()

    return () => Tempus.unpatch()
  }, [patch])

  return null
}
