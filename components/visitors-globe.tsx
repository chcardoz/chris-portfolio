'use client'

import dynamic from 'next/dynamic'

const GlobeCanvas = dynamic(() => import('./globe-canvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full rounded-2xl bg-neutral-100/40 dark:bg-neutral-900/40" />
  ),
})

export function VisitorsGlobe() {
  return (
    <div className="relative w-full">
      <div className="aspect-square w-full max-w-md mx-auto">
        <GlobeCanvas />
      </div>
    </div>
  )
}
