'use client'

import { useEffect, useRef } from 'react'

export function AmbientNoise() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const cellSize = 10
    const seedChance = 0.18
    const minDensity = 0.05
    const reseedDensity = 0.22
    let isDark =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : false
    let cols = 0
    let rows = 0
    let grid: Uint8Array = new Uint8Array()
    let raf = 0
    let lastStep = 0
    let pixelRatio = 1

    const resize = () => {
      pixelRatio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2))
      canvas.width = window.innerWidth * pixelRatio
      canvas.height = window.innerHeight * pixelRatio
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      cols = Math.ceil(window.innerWidth / cellSize)
      rows = Math.ceil(window.innerHeight / cellSize)
      grid = new Uint8Array(cols * rows)
      for (let i = 0; i < grid.length; i++) {
        grid[i] = Math.random() < seedChance ? 1 : 0
      }
    }

    const idx = (x: number, y: number) => ((y + rows) % rows) * cols + ((x + cols) % cols)

    const stepLife = () => {
      const next = new Uint8Array(cols * rows)
      let liveCount = 0
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = idx(x, y)
          let neighbors = 0
          neighbors += grid[idx(x - 1, y - 1)]
          neighbors += grid[idx(x, y - 1)]
          neighbors += grid[idx(x + 1, y - 1)]
          neighbors += grid[idx(x - 1, y)]
          neighbors += grid[idx(x + 1, y)]
          neighbors += grid[idx(x - 1, y + 1)]
          neighbors += grid[idx(x, y + 1)]
          neighbors += grid[idx(x + 1, y + 1)]

          if (grid[i] === 1) {
            next[i] = neighbors === 2 || neighbors === 3 ? 1 : 0
          } else {
            next[i] = neighbors === 3 ? 1 : 0
          }
          liveCount += next[i]
        }
      }

      if (liveCount < cols * rows * minDensity) {
        for (let i = 0; i < next.length; i++) {
          if (next[i] === 0 && Math.random() < reseedDensity) {
            next[i] = 1
          }
        }
      }
      grid = next
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width / pixelRatio, canvas.height / pixelRatio)
      const fill = isDark ? 'rgba(255, 255, 255, 0.26)' : 'rgba(0, 0, 0, 0.12)'
      const stroke = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'
      ctx.fillStyle = fill
      ctx.strokeStyle = stroke
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (grid[idx(x, y)]) {
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
          }
        }
      }
    }

    let lastRender = 0

    const loop = (time: number) => {
      if (time - lastStep > 1600) {
        stepLife()
        lastStep = time
      }
      if (time - lastRender > 1000 / 24) {
        render()
        lastRender = time
      }
      raf = requestAnimationFrame(loop)
    }

    const handleColorScheme = (e: MediaQueryListEvent) => {
      isDark = e.matches
    }

    resize()
    loop(0)
    window.addEventListener('resize', resize)
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', handleColorScheme)
    }
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      if (window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        mq.removeEventListener('change', handleColorScheme)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 opacity-18 dark:opacity-22 mix-blend-screen pointer-events-none"
      aria-hidden="true"
    />
  )
}
