"use client";

import { useTexture } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, Suspense, useMemo } from "react";
import * as THREE from "three";

function latLngToCartesian(lat: number, lng: number, radius = 1) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lng + 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return [x, y, z] as const;
}

// ─── Sun position ────────────────────────────────────────────────────────────

function getSunDirection(date: Date): THREE.Vector3 {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getUTCFullYear(), 0, 0).getTime()) /
      86400000,
  );
  const decl =
    -23.45 *
    Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10)) *
    (Math.PI / 180);
  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;
  const ha = (utcHours / 24) * 2 * Math.PI - Math.PI;

  return new THREE.Vector3(
    Math.cos(decl) * Math.cos(ha),
    Math.sin(decl),
    Math.cos(decl) * Math.sin(ha),
  ).normalize();
}

// ─── Scene components ────────────────────────────────────────────────────────

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
  );
}

const VERT_SHADER = `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

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
`;

function Earth() {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const [dayMap, nightMap] = useTexture([
    "/textures/earth_daymap.webp",
    "/textures/earth_nightmap.webp",
  ]);

  const initialSunDir = useMemo(() => getSunDirection(new Date()), []);

  const uniforms = useMemo(
    () => ({
      uDayTexture: { value: dayMap },
      uNightTexture: { value: nightMap },
      uSunDirection: { value: initialSunDir },
    }),
    [dayMap, nightMap, initialSunDir],
  );

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
  );
}

function Clouds() {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudMap = useTexture("/textures/earth_clouds.webp");

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.01;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1.015, 32, 32]} />
      <meshBasicMaterial
        map={cloudMap}
        transparent
        opacity={0.35}
        depthWrite={false}
      />
    </mesh>
  );
}

// SF coordinates
const SF_LAT = 37.7749;
const SF_LNG = -122.4194;

function LocationPulse() {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const [x, y, z] = latLngToCartesian(SF_LAT, SF_LNG, 1.008);
  const normal = new THREE.Vector3(x, y, z).normalize();

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[x, y, z]}
      quaternion={new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        normal,
      )}
    >
      <circleGeometry args={[0.015, 32]} />
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        uniforms={{
          uTime: { value: 0 },
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          varying vec2 vUv;
          void main() {
            float dist = length(vUv - 0.5) * 2.0;
            float pulse = 0.5 + 0.5 * sin(uTime * 1.2);
            vec3 green = vec3(0.6, 0.9, 0.65);
            float alpha = smoothstep(1.0, 0.3, dist) * (0.5 + 0.5 * pulse);
            gl_FragColor = vec4(green, alpha);
          }
        `}
      />
    </mesh>
  );
}

function Globe() {
  const group = useRef<THREE.Group>(null);
  const tilt = useRef(THREE.MathUtils.degToRad(25));
  const initialSpeed = 1.5;
  const steadySpeed = 0.02;
  const spinEaseDuration = 8;

  useFrame(({ clock }, delta) => {
    const node = group.current;
    if (!node) return;

    const t = THREE.MathUtils.clamp(
      clock.getElapsedTime() / spinEaseDuration,
      0,
      1,
    );
    const easeOut = 1 - Math.pow(1 - t, 3);
    const speed =
      t < 1
        ? initialSpeed + (steadySpeed - initialSpeed) * easeOut
        : steadySpeed;

    node.rotation.y += speed * delta;
    node.rotation.x = tilt.current;
  });

  return (
    <group ref={group} scale={0.75}>
      <Earth />
      <Clouds />
      <Atmosphere />
      <LocationPulse />
    </group>
  );
}

// ─── Exported canvas ─────────────────────────────────────────────────────────

export default function GlobeCanvas() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full rounded-2xl bg-neutral-100/40 dark:bg-neutral-900/40" />
      }
    >
      <Canvas
        camera={{ position: [0, 0, 2.4], fov: 45 }}
        gl={{ antialias: true, powerPreference: "default" }}
      >
        <Globe />
      </Canvas>
    </Suspense>
  );
}
