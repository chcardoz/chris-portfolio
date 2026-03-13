'use client'

import { useTexture } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, Suspense, useMemo } from 'react'
import { feature } from 'topojson-client'
import * as THREE from 'three'
import type { Geometry, GeometryCollection, MultiPolygon, Polygon } from 'geojson'
import land110m from 'world-atlas/land-110m.json'

// ─── Types ───────────────────────────────────────────────────────────────────

type Topology = {
  type: 'Topology'
  objects: Record<string, unknown>
  arcs?: number[][][]
}

type LandGeometry = Polygon | MultiPolygon | GeometryCollection

// ─── Land outline helpers ────────────────────────────────────────────────────

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

// ─── Sun position ────────────────────────────────────────────────────────────

function getSunDirection(date: Date): THREE.Vector3 {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getUTCFullYear(), 0, 0).getTime()) / 86400000
  )
  const decl = -23.45 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10)) * (Math.PI / 180)
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600
  const ha = ((utcHours / 24) * 2 * Math.PI) - Math.PI

  return new THREE.Vector3(
    Math.cos(decl) * Math.cos(ha),
    Math.sin(decl),
    Math.cos(decl) * Math.sin(ha)
  ).normalize()
}

// ─── Outline geometry (1 draw call) ──────────────────────────────────────────

function buildOutlineGeometry() {
  const positions: number[] = []
  for (const outline of OUTLINES) {
    for (let i = 0; i < outline.length - 1; i++) {
      const a = latLngToCartesian(outline[i].lat, outline[i].lng, 1.005)
      const b = latLngToCartesian(outline[i + 1].lat, outline[i + 1].lng, 1.005)
      positions.push(a[0], a[1], a[2], b[0], b[1], b[2])
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return geo
}

// ─── Scene components ────────────────────────────────────────────────────────

function GlobeLines() {
  const geo = useRef(buildOutlineGeometry())
  return (
    <lineSegments geometry={geo.current}>
      <lineBasicMaterial color="#cbd5e1" transparent opacity={0.35} />
    </lineSegments>
  )
}

function Atmosphere() {
  return (
    <mesh>
      <sphereGeometry args={[1.04, 64, 64]} />
      <shaderMaterial
        transparent
        side={THREE.BackSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={`
          varying vec3 vNormal;
          varying vec3 vPosition;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec3 vNormal;
          varying vec3 vPosition;
          void main() {
            vec3 viewDir = normalize(-vPosition);
            float fresnel = dot(viewDir, vNormal);
            // Glow strongest at rim (fresnel ~ 0), fades toward center
            float glow = pow(clamp(0.65 - fresnel, 0.0, 1.0), 3.0);
            vec3 glowColor = vec3(0.3, 0.6, 1.0);
            // Additive blending: rgb IS the glow, no alpha needed
            gl_FragColor = vec4(glowColor * glow * 0.5, 1.0);
          }
        `}
      />
    </mesh>
  )
}

const VERT_SHADER = `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG_SHADER = `
  uniform sampler2D uDayTexture;
  uniform sampler2D uNightTexture;
  uniform vec3 uSunDirection;
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vec3 dayColor = texture2D(uDayTexture, vUv).rgb;
    vec3 nightColor = texture2D(uNightTexture, vUv).rgb;
    float cosAngle = dot(normalize(vNormal), normalize(uSunDirection));
    float dayMix = smoothstep(-0.15, 0.25, cosAngle);

    // Night side: dark blue-gray base + dimmed day texture + bright city lights
    vec3 nightBase = vec3(0.02, 0.03, 0.08) + dayColor * 0.07;
    vec3 night = nightBase + nightColor * 4.0;

    // Increase contrast: brighten day side, darken night side
    vec3 darkerNight = night * 0.35;
    vec3 brighterDay = dayColor * 1.3;
    vec3 color = mix(darkerNight, brighterDay, dayMix);

    // Partial desaturation (~60% toward grayscale)
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(color, vec3(gray), 0.6);
    // Flatten contrast
    color = (color - 0.5) * 0.7 + 0.5;

    gl_FragColor = vec4(color, 1.0);
  }
`

function Earth() {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)

  const [dayMap, nightMap] = useTexture([
    '/textures/2k_earth_daymap.jpg',
    '/textures/2k_earth_nightmap.jpg',
  ])

  const initialSunDir = useMemo(() => getSunDirection(new Date()), [])

  const uniforms = useMemo(() => ({
    uDayTexture: { value: dayMap },
    uNightTexture: { value: nightMap },
    uSunDirection: { value: initialSunDir },
  }), [dayMap, nightMap, initialSunDir])

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 32, 32]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={VERT_SHADER}
        fragmentShader={FRAG_SHADER}
      />
    </mesh>
  )
}

function Globe() {
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

  return (
    <group ref={group} scale={0.75}>
      <Earth />
      <Atmosphere />
      <GlobeLines />
    </group>
  )
}

// ─── Exported canvas ─────────────────────────────────────────────────────────

export default function GlobeCanvas() {
  return (
    <Suspense fallback={<div className="w-full h-full rounded-2xl bg-neutral-100/40 dark:bg-neutral-900/40" />}>
      <Canvas
        camera={{ position: [0, 0, 2.4], fov: 45 }}
        gl={{ antialias: true, powerPreference: 'default' }}
      >
        <Globe />
      </Canvas>
    </Suspense>
  )
}
