'use client'

import { Line, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { feature } from 'topojson-client'
import * as THREE from 'three'
import type { Geometry, GeometryCollection, MultiPolygon, Polygon } from 'geojson'
import land110m from 'world-atlas/land-110m.json'

type Topology = {
  type: 'Topology'
  objects: Record<string, unknown>
  arcs?: number[][][]
}

type VisitorPoint = {
  id: string
  lat: number
  lng: number
  ts: number
  isPlaceholder?: boolean
}

type LandGeometry = Polygon | MultiPolygon | GeometryCollection

function extractLandLines(geometry: LandGeometry | undefined | null) {
  const lines: Array<Array<{ lat: number; lng: number }>> = []
  if (!geometry) return lines

  const addRing = (ring: number[][]) => {
    const cleaned: Array<{ lat: number; lng: number }> = []
    for (const coord of ring) {
      const [lng, lat] = coord
      cleaned.push({ lat, lng })
    }
    if (cleaned.length > 1) {
      lines.push(cleaned)
    }
  }

  const handleGeometry = (geom: Geometry | GeometryCollection) => {
    if (!geom) return
    if (geom.type === 'GeometryCollection') {
      geom.geometries.forEach(handleGeometry)
      return
    }
    if (geom.type === 'Polygon') {
      geom.coordinates.forEach(addRing)
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates.forEach(poly => poly.forEach(addRing))
    }
  }

  handleGeometry(geometry)

  return lines
}

function loadOutlines() {
  try {
    const data = (land110m as any).objects ? land110m : (land110m as any).default ?? land110m
    const objects = (data as any).objects
    const landObject = objects?.land
    if (!landObject) return []

    const landFeature = feature(data as unknown as Topology, landObject) as
      | { type: 'Feature'; geometry: LandGeometry }
      | { type: 'FeatureCollection'; features: Array<{ geometry: LandGeometry }> }

    if (landFeature.type === 'FeatureCollection') {
      const collected: Array<Array<{ lat: number; lng: number }>> = []
      landFeature.features.forEach(f => {
        collected.push(...extractLandLines(f.geometry))
      })
      return collected
    }

    return extractLandLines(landFeature.geometry)
  } catch (err) {
    console.error('Failed to load land outlines', err)
    return []
  }
}

const OUTLINES = loadOutlines()

function latLngToCartesian(lat: number, lng: number, radius = 1) {
  const phi = THREE.MathUtils.degToRad(90 - lat)
  const theta = THREE.MathUtils.degToRad(lng + 180)
  const x = -radius * Math.sin(phi) * Math.cos(theta)
  const z = radius * Math.sin(phi) * Math.sin(theta)
  const y = radius * Math.cos(phi)
  return [x, y, z] as const
}

function VisitorDot({ point }: { point: VisitorPoint }) {
  const ref = useRef<THREE.Mesh>(null)
  const seed = useMemo(() => Math.abs(point.ts % 10000) / 10000, [point.ts])

  const colors = useMemo(() => {
    if (point.isPlaceholder) {
      return {
        color: "#e9d5ff",
        emissive: "#c084fc"
      }
    }
    return {
      color: "#dbeafe",
      emissive: "#93c5fd"
    }
  }, [point.isPlaceholder])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const pulse = 0.7 + Math.sin(t * 1.4 + seed * Math.PI * 2) * 0.25
    if (ref.current) {
      ref.current.scale.setScalar(pulse)
      const material = ref.current.material as THREE.MeshStandardMaterial
      material.emissiveIntensity = 1.5 + pulse * 1.5
      material.opacity = 0.85 + pulse * 0.15
    }
  })

  return (
    <mesh ref={ref} position={latLngToCartesian(point.lat, point.lng, 1.02)}>
      <sphereGeometry args={[0.015, 12, 12]} />
      <meshStandardMaterial
        color={colors.color}
        emissive={colors.emissive}
        transparent
        roughness={0.1}
        metalness={0.1}
      />
    </mesh>
  )
}

function GlobeLines() {
  return (
    <>
      {OUTLINES.map((outline, idx) => {
        const points = outline.map(({ lat, lng }) =>
          new THREE.Vector3(...latLngToCartesian(lat, lng, 1.005))
        )
        return (
          <Line
            key={idx}
            points={points}
            color="#cbd5e1"
            lineWidth={1.2}
            transparent
            opacity={0.9}
          />
        )
      })}
      {/* Light longitude/latitude graticule */}
      {Array.from({ length: 9 }).map((_, i) => {
        const lat = -80 + i * 20
        const points = Array.from({ length: 37 }).map((_, j) => {
          const lng = -180 + j * 10
          return new THREE.Vector3(...latLngToCartesian(lat, lng, 1.001))
        })
        return (
          <Line
            key={`lat-${i}`}
            points={points}
            color="#6b7280"
            lineWidth={0.75}
            transparent
            opacity={0.45}
          />
        )
      })}
      {Array.from({ length: 18 }).map((_, i) => {
        const lng = -180 + i * 20
        const points = Array.from({ length: 17 }).map((_, j) => {
          const lat = -80 + j * 10
          return new THREE.Vector3(...latLngToCartesian(lat, lng, 1.001))
        })
        return (
          <Line
            key={`lng-${i}`}
            points={points}
            color="#6b7280"
            lineWidth={0.75}
            transparent
            opacity={0.45}
          />
        )
      })}
    </>
  )
}

function Globe({ points }: { points: VisitorPoint[] }) {
  const group = useRef<THREE.Group>(null)
  const tilt = useRef(THREE.MathUtils.degToRad(25))
  const initialSpeed = 1.5
  const steadySpeed = 0.02
  const spinEaseDuration = 8

  useFrame(({ clock }, delta) => {
    const node = group.current
    if (!node) return

    const t = THREE.MathUtils.clamp(clock.getElapsedTime() / spinEaseDuration, 0, 1)
    const easeOut = 1 - Math.pow(1 - t, 3)
    const speed = t < 1 ? initialSpeed + (steadySpeed - initialSpeed) * easeOut : steadySpeed

    node.rotation.y += speed * delta
    node.rotation.x = tilt.current
  })

  const sorted = useMemo(
    () => {
      const result = [...points].sort((a, b) => b.ts - a.ts).slice(0, 200)
      console.log('[Globe] Rendering points:', result.length, result)
      return result
    },
    [points]
  )

  return (
    <group ref={group} scale={0.9}>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          color="#0f172a"
          roughness={0.55}
          metalness={0.35}
          emissive="#0a0f1f"
          emissiveIntensity={0.5}
        />
      </mesh>
      <GlobeLines />
      {sorted.map(point => (
        <VisitorDot key={point.id} point={point} />
      ))}
    </group>
  )
}

const PLACEHOLDER_VISITORS: VisitorPoint[] = [
  { id: 'placeholder-1', lat: 12.9, lng: 74.85, ts: Date.now(), isPlaceholder: true }, // Mangalore, India
  { id: 'placeholder-2', lat: 25.2, lng: 55.27, ts: Date.now(), isPlaceholder: true }, // Dubai, UAE
  { id: 'placeholder-3', lat: 39.77, lng: -86.15, ts: Date.now(), isPlaceholder: true }, // Indianapolis, IN
  { id: 'placeholder-4', lat: 37.77, lng: -122.42, ts: Date.now(), isPlaceholder: true }, // San Francisco, CA
]

export function VisitorsGlobe() {
  const [visitors, setVisitors] = useState<VisitorPoint[]>(PLACEHOLDER_VISITORS)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        console.log('[VisitorsGlobe] Fetching visitors...')
        const res = await fetch('/api/visitors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!res.ok) throw new Error(`status ${res.status}`)
        const data = await res.json()
        console.log('[VisitorsGlobe] Received data:', data)
        if (!cancelled && Array.isArray(data.entries)) {
          console.log('[VisitorsGlobe] Setting visitors:', data.entries.length)
          // Combine placeholder visitors with real visitors
          setVisitors([...PLACEHOLDER_VISITORS, ...data.entries])
        }
      } catch (err) {
        if (!cancelled) {
          setError('Unable to load visitors yet')
          console.error('[VisitorsGlobe] Error:', err)
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="relative w-full">
      <div className="aspect-square w-full max-w-md mx-auto">
        <Suspense fallback={<div className="w-full h-full rounded-2xl bg-neutral-100/40 dark:bg-neutral-900/40" />}>
          <Canvas camera={{ position: [0, 0, 2.4], fov: 45 }}>
            <ambientLight intensity={0.9} color="#e5e7eb" />
            <pointLight position={[4, 3, 5]} intensity={1.6} color="#93c5fd" />
            <pointLight position={[-4, -2, -5]} intensity={0.8} color="#0ea5e9" />
            <pointLight position={[0, -1.5, 2]} intensity={0.6} color="#22d3ee" />
            <Globe points={visitors} />
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              enableRotate={false}
              autoRotate={false}
            />
          </Canvas>
        </Suspense>
      </div>
      {error ? (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 text-center">
          {error}
        </p>
      ) : null}
    </div>
  )
}
