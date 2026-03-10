'use client'

import { OrbitControls, useTexture } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, Suspense, useEffect, useMemo } from 'react'
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
      <sphereGeometry args={[1.025, 32, 32]} />
      <shaderMaterial
        transparent
        side={THREE.BackSide}
        depthWrite={false}
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
            float fresnel = 1.0 - dot(viewDir, vNormal);
            fresnel = pow(fresnel, 5.0);
            vec3 haloColor = vec3(0.3, 0.6, 1.0);
            float alpha = fresnel * 0.5;
            gl_FragColor = vec4(haloColor, alpha);
          }
        `}
      />
    </mesh>
  )
}

// Shader version key — change this to force recompilation
const SHADER_VERSION = 'v7'

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

    vec3 color = mix(night, dayColor, dayMix);
    gl_FragColor = vec4(color, 1.0);
  }
`

function Earth() {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const frameCount = useRef(0)

  const [dayMap, nightMap] = useTexture([
    '/textures/2k_earth_daymap.jpg',
    '/textures/2k_earth_nightmap.jpg',
  ])

  // Compute sun direction ONCE in object space based on current time.
  // As the globe group rotates, this fixed object-space sun stays put,
  // so the lit hemisphere rotates with the mesh — camera sees both day & night.
  const initialSunDir = useMemo(() => {
    const dir = getSunDirection(new Date())
    console.log('[Earth] Initial sun direction (object space, computed once):', dir.x.toFixed(3), dir.y.toFixed(3), dir.z.toFixed(3))
    return dir
  }, [])

  console.log('[Earth] RENDER — shader version:', SHADER_VERSION)
  console.log('[Earth] dayMap loaded:', !!dayMap, 'image:', dayMap?.image?.width, 'x', dayMap?.image?.height)
  console.log('[Earth] nightMap loaded:', !!nightMap, 'image:', nightMap?.image?.width, 'x', nightMap?.image?.height)

  const uniforms = useMemo(() => {
    console.log('[Earth] Creating uniforms object (useMemo)')
    return {
      uDayTexture: { value: dayMap },
      uNightTexture: { value: nightMap },
      uSunDirection: { value: initialSunDir },
    }
  }, [dayMap, nightMap, initialSunDir])

  useEffect(() => {
    const mat = matRef.current
    if (mat) {
      console.log('[Earth] useEffect — mat exists')
      console.log('[Earth] mat.uniforms keys:', Object.keys(mat.uniforms))
      console.log('[Earth] mat.fragmentShader includes nightBase?', mat.fragmentShader.includes('nightBase'))
      console.log('[Earth] uses object-space normals (no modelMatrix)?', !mat.vertexShader.includes('modelMatrix'))
    } else {
      console.log('[Earth] useEffect — matRef is NULL')
    }
  })

  useFrame(() => {
    const mat = matRef.current
    if (!mat) {
      if (frameCount.current < 5) console.log('[Earth] useFrame — mat is NULL, frame:', frameCount.current)
      return
    }

    mat.uniforms.uDayTexture.value = dayMap
    mat.uniforms.uNightTexture.value = nightMap
    // Sun direction is FIXED in object space — do NOT update it per frame.
    // The globe group's rotation carries the lit hemisphere around.

    frameCount.current++
    if (frameCount.current === 1 || frameCount.current === 60 || frameCount.current === 300) {
      const sd = mat.uniforms.uSunDirection.value
      console.log(`[Earth] Frame ${frameCount.current}:`)
      console.log(`  sunDir (object space, fixed): (${sd.x.toFixed(3)}, ${sd.y.toFixed(3)}, ${sd.z.toFixed(3)})`)
      console.log(`  uDayTexture set:`, mat.uniforms.uDayTexture.value === dayMap)
      console.log(`  uNightTexture set:`, mat.uniforms.uNightTexture.value === nightMap)

      // Object-space normals — these DON'T change as the group rotates
      const dirs = [
        { name: '+Z (obj front)', n: [0, 0, 1] },
        { name: '-Z (obj back)', n: [0, 0, -1] },
        { name: '+X (obj right)', n: [1, 0, 0] },
        { name: '-X (obj left)', n: [-1, 0, 0] },
      ]
      for (const d of dirs) {
        const dot = d.n[0] * sd.x + d.n[1] * sd.y + d.n[2] * sd.z
        const dayMix = Math.min(1, Math.max(0, (dot - (-0.15)) / (0.25 - (-0.15))))
        console.log(`  ${d.name}: dot=${dot.toFixed(3)} dayMix=${dayMix.toFixed(3)}`)
      }
      console.log('  ^ These are FIXED. As group rotates, different obj-space faces point at camera.')
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 32, 32]} />
      <shaderMaterial
        key={SHADER_VERSION}
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
    <group ref={group} scale={0.9}>
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
        <ambientLight intensity={0.3} />
        <Globe />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableRotate={false}
          autoRotate={false}
        />
      </Canvas>
    </Suspense>
  )
}
