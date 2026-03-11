'use client'

import { useTexture } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useEffect, Suspense, useMemo, useCallback } from 'react'
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

// ─── Flight arcs between cities ─────────────────────────────────────────────

const CITIES: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'New York', lat: 40.71, lng: -74.01 },
  { name: 'London', lat: 51.51, lng: -0.13 },
  { name: 'Tokyo', lat: 35.68, lng: 139.69 },
  { name: 'Sydney', lat: -33.87, lng: 151.21 },
  { name: 'Dubai', lat: 25.2, lng: 55.27 },
  { name: 'São Paulo', lat: -23.55, lng: -46.63 },
  { name: 'Mumbai', lat: 19.08, lng: 72.88 },
  { name: 'Shanghai', lat: 31.23, lng: 121.47 },
  { name: 'Paris', lat: 48.86, lng: 2.35 },
  { name: 'Singapore', lat: 1.35, lng: 103.82 },
  { name: 'Lagos', lat: 6.52, lng: 3.38 },
  { name: 'Cairo', lat: 30.04, lng: 31.24 },
  { name: 'Moscow', lat: 55.76, lng: 37.62 },
  { name: 'Los Angeles', lat: 34.05, lng: -118.24 },
  { name: 'Toronto', lat: 43.65, lng: -79.38 },
  { name: 'Berlin', lat: 52.52, lng: 13.41 },
  { name: 'Seoul', lat: 37.57, lng: 126.98 },
  { name: 'Mexico City', lat: 19.43, lng: -99.13 },
  { name: 'Nairobi', lat: -1.29, lng: 36.82 },
  { name: 'Buenos Aires', lat: -34.6, lng: -58.38 },
  { name: 'Hyderabad', lat: 17.39, lng: 78.49 },
  { name: 'Cape Town', lat: -33.93, lng: 18.42 },
  { name: 'Bangkok', lat: 13.76, lng: 100.5 },
  { name: 'Istanbul', lat: 41.01, lng: 28.98 },
]

const ARC_SEGMENTS = 64
const ARC_RADIAL_SEGMENTS = 3
const ARC_DURATION = 3.0
const ARC_TAIL_LENGTH = 14
const PULSE_DURATION = 1.5
const ARC_LIFETIME = 4.5
const SPAWN_INTERVAL = 3.0
const MAX_ARC_ANGLE = Math.PI * 0.45
const ARC_TUBE_RADIUS = 0.005
const VERTS_PER_RING = ARC_RADIAL_SEGMENTS + 1
const TOTAL_VERTS = (ARC_SEGMENTS + 1) * VERTS_PER_RING
const INDICES_PER_SEGMENT = ARC_RADIAL_SEGMENTS * 6

type ActiveArc = {
  startTime: number
  originIdx: number
  destIdx: number
}

function buildArcCurve(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
  radius: number
): THREE.Vector3[] {
  const p1 = new THREE.Vector3(...latLngToCartesian(lat1, lng1, radius))
  const p2 = new THREE.Vector3(...latLngToCartesian(lat2, lng2, radius))
  const angle = p1.angleTo(p2)
  const arcHeight = 0.15 + angle * 0.15

  const points: THREE.Vector3[] = []
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const t = i / ARC_SEGMENTS
    const pt = new THREE.Vector3().lerpVectors(p1, p2, t).normalize()
    const lift = 1 + arcHeight * Math.sin(t * Math.PI)
    pt.multiplyScalar(radius * lift)
    points.push(pt)
  }
  return points
}

// Static index buffer — identical for every arc, built once
function buildTubeIndices(): Uint16Array {
  const indices = new Uint16Array(ARC_SEGMENTS * ARC_RADIAL_SEGMENTS * 6)
  let idx = 0
  for (let j = 1; j <= ARC_SEGMENTS; j++) {
    for (let i = 1; i <= ARC_RADIAL_SEGMENTS; i++) {
      const a = (j - 1) * VERTS_PER_RING + (i - 1)
      const b = j * VERTS_PER_RING + (i - 1)
      const c = j * VERTS_PER_RING + i
      const d = (j - 1) * VERTS_PER_RING + i
      indices[idx++] = a; indices[idx++] = b; indices[idx++] = d
      indices[idx++] = b; indices[idx++] = c; indices[idx++] = d
    }
  }
  return indices
}

// Scratch vectors — reused every call, zero allocations
const _tangent = new THREE.Vector3()
const _up = new THREE.Vector3()
const _sideNorm = new THREE.Vector3()

// Fill tube positions in-place using globe surface normals
function fillTubePositions(positions: Float32Array, points: THREE.Vector3[]) {
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    // Tangent via finite difference
    if (i < ARC_SEGMENTS) {
      _tangent.subVectors(points[i + 1], points[i]).normalize()
    }
    // else: reuse last tangent

    // Globe surface normal = radial direction
    _up.copy(points[i]).normalize()

    // Project up onto plane perpendicular to tangent
    _sideNorm.copy(_up).addScaledVector(_tangent, -_up.dot(_tangent)).normalize()

    // Binormal = tangent × sideNorm (inline cross product)
    const bx = _tangent.y * _sideNorm.z - _tangent.z * _sideNorm.y
    const by = _tangent.z * _sideNorm.x - _tangent.x * _sideNorm.z
    const bz = _tangent.x * _sideNorm.y - _tangent.y * _sideNorm.x

    for (let j = 0; j < VERTS_PER_RING; j++) {
      const angle = (j / ARC_RADIAL_SEGMENTS) * Math.PI * 2
      const sin = Math.sin(angle)
      const cos = -Math.cos(angle)

      const nx = cos * _sideNorm.x + sin * bx
      const ny = cos * _sideNorm.y + sin * by
      const nz = cos * _sideNorm.z + sin * bz

      const idx = (i * VERTS_PER_RING + j) * 3
      positions[idx] = points[i].x + ARC_TUBE_RADIUS * nx
      positions[idx + 1] = points[i].y + ARC_TUBE_RADIUS * ny
      positions[idx + 2] = points[i].z + ARC_TUBE_RADIUS * nz
    }
  }
}

const _quatHelper = new THREE.Quaternion()
const _defaultUp = new THREE.Vector3(0, 0, 1)

function positionPulseOnGlobe(pulse: THREE.Mesh, lat: number, lng: number, radius: number) {
  const pos = new THREE.Vector3(...latLngToCartesian(lat, lng, radius * 1.005))
  pulse.position.copy(pos)
  // Orient ring to face outward from globe center using quaternion (local space)
  const normal = pos.clone().normalize()
  _quatHelper.setFromUnitVectors(_defaultUp, normal)
  pulse.quaternion.copy(_quatHelper)
}

function FlightArcs() {
  const groupRef = useRef<THREE.Group>(null)
  const activeArcRef = useRef<ActiveArc | null>(null)
  const lastSpawnRef = useRef(-1)
  const nextSpawnDelayRef = useRef(0)

  // Pooled resources — allocated once on mount
  const tubeGeoRef = useRef<THREE.BufferGeometry | null>(null)
  const tubeMeshRef = useRef<THREE.Mesh | null>(null)
  const tubeMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null)
  const positionsRef = useRef<Float32Array | null>(null)
  const originPulseRef = useRef<THREE.Mesh | null>(null)
  const destPulseRef = useRef<THREE.Mesh | null>(null)
  const originPulseMatRef = useRef<THREE.MeshBasicMaterial | null>(null)
  const destPulseMatRef = useRef<THREE.MeshBasicMaterial | null>(null)

  useEffect(() => {
    const group = groupRef.current
    if (!group) return

    // Tube geometry — pre-allocated, reused every spawn
    const positions = new Float32Array(TOTAL_VERTS * 3)
    const geo = new THREE.BufferGeometry()
    const posAttr = new THREE.BufferAttribute(positions, 3)
    posAttr.setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute('position', posAttr)
    geo.setIndex(new THREE.BufferAttribute(buildTubeIndices(), 1))
    geo.setDrawRange(0, 0)

    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0xd0d0d0, transparent: true, opacity: 0.7, depthWrite: false,
    })
    const tubeMesh = new THREE.Mesh(geo, tubeMat)
    tubeMesh.visible = false
    group.add(tubeMesh)

    // Pulse meshes — share one RingGeometry, separate materials for independent opacity
    const pulseGeo = new THREE.RingGeometry(0, 0.03, 32)
    const originMat = new THREE.MeshBasicMaterial({
      color: 0xc0c0c0, transparent: true, opacity: 0.8,
      side: THREE.DoubleSide, depthWrite: false,
    })
    const destMat = new THREE.MeshBasicMaterial({
      color: 0xc0c0c0, transparent: true, opacity: 0.8,
      side: THREE.DoubleSide, depthWrite: false,
    })
    const originPulse = new THREE.Mesh(pulseGeo, originMat)
    const destPulse = new THREE.Mesh(pulseGeo, destMat)
    originPulse.visible = false
    destPulse.visible = false
    group.add(originPulse)
    group.add(destPulse)

    // Store refs
    positionsRef.current = positions
    tubeGeoRef.current = geo
    tubeMeshRef.current = tubeMesh
    tubeMaterialRef.current = tubeMat
    originPulseRef.current = originPulse
    destPulseRef.current = destPulse
    originPulseMatRef.current = originMat
    destPulseMatRef.current = destMat

    return () => {
      geo.dispose()
      tubeMat.dispose()
      pulseGeo.dispose()
      originMat.dispose()
      destMat.dispose()
    }
  }, [])

  const spawnArc = useCallback((time: number) => {
    if (activeArcRef.current) return
    if (!tubeGeoRef.current || !positionsRef.current) return

    // Pick two random cities within max angular distance
    let a: number, b: number, attempts = 0
    do {
      a = Math.floor(Math.random() * CITIES.length)
      b = Math.floor(Math.random() * CITIES.length)
      attempts++
      if (attempts > 100) return
    } while (
      a === b ||
      (() => {
        const p1 = new THREE.Vector3(...latLngToCartesian(CITIES[a].lat, CITIES[a].lng))
        const p2 = new THREE.Vector3(...latLngToCartesian(CITIES[b].lat, CITIES[b].lng))
        return p1.angleTo(p2) > MAX_ARC_ANGLE
      })()
    )

    const origin = CITIES[a]
    const dest = CITIES[b]
    const points = buildArcCurve(origin.lat, origin.lng, dest.lat, dest.lng, 1)

    // Fill positions in-place — no allocations
    fillTubePositions(positionsRef.current, points)
    tubeGeoRef.current.attributes.position.needsUpdate = true
    tubeGeoRef.current.computeBoundingSphere()
    tubeGeoRef.current.setDrawRange(0, 0)

    tubeMeshRef.current!.visible = true
    tubeMaterialRef.current!.opacity = 0.7

    // Position pulses
    positionPulseOnGlobe(originPulseRef.current!, origin.lat, origin.lng, 1)
    positionPulseOnGlobe(destPulseRef.current!, dest.lat, dest.lng, 1)
    originPulseRef.current!.visible = true
    originPulseRef.current!.scale.set(0.5, 0.5, 1)
    originPulseMatRef.current!.opacity = 0.8
    destPulseRef.current!.visible = false
    destPulseRef.current!.scale.set(0.5, 0.5, 1)
    destPulseMatRef.current!.opacity = 0.8

    activeArcRef.current = { startTime: time, originIdx: a, destIdx: b }
  }, [])

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()

    // Spawn with random jitter
    const spawnThreshold = SPAWN_INTERVAL + nextSpawnDelayRef.current
    if (lastSpawnRef.current < 0 || time - lastSpawnRef.current >= spawnThreshold) {
      spawnArc(time)
      lastSpawnRef.current = time
      nextSpawnDelayRef.current = Math.random()
    }

    const arc = activeArcRef.current
    if (!arc) return

    const elapsed = time - arc.startTime

    // Lifetime expired — hide, don't dispose
    if (elapsed > ARC_LIFETIME) {
      tubeMeshRef.current!.visible = false
      originPulseRef.current!.visible = false
      destPulseRef.current!.visible = false
      activeArcRef.current = null
      return
    }

    // Trailing comet draw range
    const arcProgress = Math.min(elapsed / ARC_DURATION, 1)
    const headSeg = Math.floor(arcProgress * ARC_SEGMENTS)
    const tailSeg = Math.max(0, headSeg - ARC_TAIL_LENGTH)

    let finalTail = tailSeg
    if (arcProgress >= 1) {
      const tailCatchup = Math.min((elapsed - ARC_DURATION) / (ARC_DURATION * 0.4), 1)
      finalTail = Math.floor(THREE.MathUtils.lerp(headSeg - ARC_TAIL_LENGTH, ARC_SEGMENTS, tailCatchup))
    }
    finalTail = Math.max(0, finalTail)

    const drawStart = finalTail * INDICES_PER_SEGMENT
    const drawCount = Math.max(0, (headSeg - finalTail) * INDICES_PER_SEGMENT)
    tubeGeoRef.current!.setDrawRange(drawStart, drawCount)

    // Fade out near end of life
    const fadeStart = ARC_LIFETIME - 0.8
    const arcOpacity = elapsed > fadeStart
      ? 0.7 * (1 - (elapsed - fadeStart) / 0.8)
      : 0.7
    tubeMaterialRef.current!.opacity = Math.max(0, arcOpacity)

    // Origin pulse
    const originT = Math.min(elapsed / PULSE_DURATION, 1)
    const originScale = 0.5 + originT * 2
    originPulseRef.current!.scale.set(originScale, originScale, 1)
    originPulseMatRef.current!.opacity = 0.8 * (1 - originT)

    // Dest pulse — starts when arc arrives
    if (arcProgress >= 1) {
      destPulseRef.current!.visible = true
      const destElapsed = elapsed - ARC_DURATION
      const destT = Math.min(destElapsed / PULSE_DURATION, 1)
      const destScale = 0.5 + destT * 2
      destPulseRef.current!.scale.set(destScale, destScale, 1)
      destPulseMatRef.current!.opacity = 0.8 * (1 - destT)
    }
  })

  return <group ref={groupRef} />
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
      <FlightArcs />
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
