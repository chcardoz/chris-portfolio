'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const GlobeCanvas = dynamic(() => import('./globe-canvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full rounded-2xl bg-neutral-100/40 dark:bg-neutral-900/40" />
  ),
})

const Placeholder = () => (
  <div className="w-full h-full rounded-2xl bg-neutral-100/40 dark:bg-neutral-900/40" />
)

export function VisitorsGlobe() {
  const [shouldMount, setShouldMount] = useState(false)

  useEffect(() => {
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    }
    if (typeof win.requestIdleCallback === 'function') {
      const handle = win.requestIdleCallback(() => setShouldMount(true), { timeout: 2000 })
      return () => {
        const cancel = (win as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback
        if (typeof cancel === 'function') cancel(handle)
      }
    }
    const t = setTimeout(() => setShouldMount(true), 200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="relative w-full">
      <div className="aspect-square w-full max-w-md mx-auto">
        {shouldMount ? <GlobeCanvas /> : <Placeholder />}
      </div>
    </div>
  )
}
