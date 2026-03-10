# Shader Debugging Notes

## Day/Night Globe Shader Fix (2026-03-10)

### Problem
The day/night terminator was invisible — the globe always showed the day side. The night texture and city lights never appeared.

### Root Cause
The shader used **object-space normals** (`vNormal = normalize(normal)`) and transformed the sun direction into object space via the mesh's inverse world matrix each frame. Since the globe group rotates continuously, the inverse matrix transform counter-rotated the sun direction to match, effectively **cancelling out the rotation**. The terminator was always on the back side of the globe, never visible to the camera.

### Fix
Switch to **world-space normals** in the vertex shader and keep the sun direction in world space:

**Vertex shader:**
```glsl
// WRONG: object-space normals
vNormal = normalize(normal);

// CORRECT: world-space normals
vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
```

**JS side:**
```ts
// WRONG: transform sun to object space (cancels rotation)
mesh.updateWorldMatrix(true, false)
_inverseMatrix.copy(mesh.matrixWorld).invert()
_localSunDir.copy(sunDir).transformDirection(_inverseMatrix)
mat.uniforms.uSunDirection.value.copy(_localSunDir)

// CORRECT: keep sun in world space
mat.uniforms.uSunDirection.value.copy(getSunDirection(new Date()))
```

### Other Issues Fixed During This Work

- **WebGL Context Lost crash**: React Strict Mode double-mounts created 2 WebGL contexts. Fixed by using `next/dynamic` with `ssr: false` for the Canvas component AND setting `reactStrictMode: false` in `next.config.ts`.
- **THREE.ShaderMaterial clones uniforms**: When using `<shaderMaterial uniforms={...}>`, keep a stable ref via `useRef`/`useMemo`. Update values per-frame via `matRef.current.uniforms.foo.value = ...`, not through the ref copy.
- **Night texture too dim**: The city lights texture is mostly black with tiny bright dots. Adding `dayColor * 0.06` as ambient ground color on the night side makes it visible. Boosted night lights multiplier to 3.0.

### Key Takeaway
When a mesh rotates inside a group, transforming vectors to object space and using object-space normals will cancel out the rotation in the dot product. Use world-space normals + world-space vectors instead.
