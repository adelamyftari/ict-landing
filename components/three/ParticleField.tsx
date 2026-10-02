"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { sceneState } from "@/lib/animations";

const PALETTE = ["#7d0c12", "#b01c22", "#c89148"];

const vertex = /* glsl */ `
  attribute float aSize;
  attribute float aSpeed;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uScroll;
  uniform float uPixelRatio;
  uniform float uHeight;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    float h = uHeight;
    // Slow rise + scroll response, wrapped vertically.
    p.y = mod(p.y + uTime * aSpeed + uScroll * (2.0 + aSpeed * 6.0) + h * 0.5, h) - h * 0.5;
    p.x += sin(uTime * 0.21 + aPhase) * 0.3 + sin(uTime * 0.07 + aPhase * 3.0) * 0.2;
    p.z += cos(uTime * 0.17 + aPhase) * 0.2;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (42.0 / -mv.z);

    float edge = 1.0 - smoothstep(h * 0.32, h * 0.5, abs(p.y));
    float flicker = 0.65 + 0.35 * sin(uTime * (0.6 + aSpeed * 4.0) + aPhase * 7.0);
    vAlpha = edge * flicker;
    vColor = aColor;
  }
`;

const fragment = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a *= a;
    gl_FragColor = vec4(vColor, a * vAlpha * uOpacity);
  }
`;

/** Deterministic pseudo-random so the layout is stable between renders. */
function seededRandom(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export default function ParticleField({ count = 260 }: { count?: number }) {
  const gl = useThree((s) => s.gl);
  const pointsRef = useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);

  const { geometry, material } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const speed = new Float32Array(count);
    const phase = new Float32Array(count);
    const c = new THREE.Color();
    const rand = seededRandom(7);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() - 0.5) * 9;
      pos[i * 3 + 1] = (rand() - 0.5) * 12;
      pos[i * 3 + 2] = (rand() - 0.5) * 6 - 0.5;
      // Mostly reds, a few warm gold embers.
      c.set(PALETTE[rand() < 0.22 ? 2 : rand() < 0.5 ? 0 : 1]);
      col.set([c.r, c.g, c.b], i * 3);
      size[i] = 0.6 + Math.pow(rand(), 3) * 3.2;
      speed[i] = 0.02 + rand() * 0.06;
      phase[i] = rand() * Math.PI * 2;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    g.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));

    const m = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uPixelRatio: { value: 1 },
        uHeight: { value: 12 },
        uOpacity: { value: 0.85 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry: g, material: m };
  }, [count]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  useFrame(({ clock }, delta) => {
    const points = pointsRef.current;
    if (!points) return;
    const u = points.material.uniforms;
    u.uTime.value = clock.elapsedTime * (sceneState.reducedMotion ? 0.25 : 1);
    u.uScroll.value = THREE.MathUtils.damp(u.uScroll.value, sceneState.progress, 2, Math.min(delta, 0.05));
    u.uPixelRatio.value = gl.getPixelRatio();
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
}
