"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sceneState } from "@/lib/animations";

const noise = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = p * 2.02 + 17.0; a *= 0.5; }
    return v;
  }
`;

const ribbonVertex = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  uniform float uPhase;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    float x = position.x;
    float w = position.y;
    float t = uTime + uPhase * 10.0;
    float yOff = sin(x * 0.35 + t * 0.15 + uPhase) * uAmp
               + sin(x * 0.9 + t * 0.23 + uPhase * 1.7) * uAmp * 0.3;
    float zOff = cos(x * 0.3 + t * 0.12 + uPhase) * uAmp * 0.8;
    float twist = sin(x * 0.22 + t * 0.1 + uPhase) * 1.3;
    vec3 p = vec3(x, yOff + w * cos(twist), zOff + w * sin(twist));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const ribbonFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec2 vUv;
  ${noise}

  void main() {
    float edge = smoothstep(0.0, 0.4, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
    float ends = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x);
    float n = fbm(vec2(vUv.x * 3.5 - uTime * 0.025, vUv.y * 2.5 + uTime * 0.015));
    // Fine silk fibres running along the ribbon.
    float fibres = 0.55 + 0.45 * sin(vUv.y * 46.0 + n * 9.0);
    float a = edge * ends * smoothstep(0.3, 0.8, n) * fibres * uOpacity;
    vec3 col = mix(uColorA, uColorB, smoothstep(0.4, 0.9, n));
    gl_FragColor = vec4(col, a);
  }
`;

const smokeVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const smokeFragment = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform float uOpacity;
  varying vec2 vUv;
  ${noise}

  void main() {
    vec2 p = vUv * vec2(3.0, 4.5);
    p.y -= uScroll * 2.5;
    // Domain warping gives soft, curling smoke.
    vec2 q = vec2(fbm(p + uTime * 0.02), fbm(p + vec2(5.2, 1.3) - uTime * 0.015));
    float n = fbm(p + 2.2 * q + uTime * 0.01);
    float smoke = smoothstep(0.42, 0.95, n);
    vec3 deep = vec3(0.227, 0.027, 0.031);   // #3A0708
    vec3 crimson = vec3(0.494, 0.063, 0.082); // #7E1015
    vec3 col = mix(deep, crimson, smoothstep(0.55, 1.0, n));
    float vign = smoothstep(0.85, 0.2, length(vUv - 0.5));
    gl_FragColor = vec4(col, smoke * vign * uOpacity);
  }
`;

type RibbonSpec = {
  position: [number, number, number];
  rotation: [number, number, number];
  length: number;
  width: number;
  amp: number;
  phase: number;
  opacity: number;
};

const RIBBONS: RibbonSpec[] = [
  { position: [0, -0.4, -1.4], rotation: [0, 0, 0.42], length: 14, width: 1.5, amp: 0.7, phase: 0, opacity: 0.32 },
  { position: [0.4, -2.2, -2.2], rotation: [0.2, 0, -0.3], length: 15, width: 1.9, amp: 0.9, phase: 1.7, opacity: 0.24 },
  { position: [-0.5, 1.7, -2.8], rotation: [-0.1, 0, -0.18], length: 14, width: 1.2, amp: 0.6, phase: 3.1, opacity: 0.18 },
  { position: [0.2, -4.2, -1.6], rotation: [0, 0.2, 0.25], length: 13, width: 1.4, amp: 0.8, phase: 4.4, opacity: 0.22 },
];

export default function RedEnergyRibbons() {
  const groupRef = useRef<THREE.Group>(null);
  const ribbons = useMemo(
    () =>
      RIBBONS.map((spec) => {
        const geometry = new THREE.PlaneGeometry(spec.length, spec.width, 160, 10);
        const material = new THREE.ShaderMaterial({
          vertexShader: ribbonVertex,
          fragmentShader: ribbonFragment,
          uniforms: {
            uTime: { value: 0 },
            uAmp: { value: spec.amp },
            uPhase: { value: spec.phase },
            uOpacity: { value: spec.opacity },
            uColorA: { value: new THREE.Color("#3a0708") },
            uColorB: { value: new THREE.Color("#a6171d") },
          },
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
        });
        return { spec, geometry, material };
      }),
    []
  );

  const smoke = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: smokeVertex,
        fragmentShader: smokeFragment,
        uniforms: {
          uTime: { value: 0 },
          uScroll: { value: 0 },
          uOpacity: { value: 0.55 },
        },
        transparent: true,
        depthWrite: false,
      }),
    []
  );

  useEffect(
    () => () => {
      ribbons.forEach((r) => {
        r.geometry.dispose();
        r.material.dispose();
      });
      smoke.dispose();
    },
    [ribbons, smoke]
  );

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const t = clock.elapsedTime * (sceneState.reducedMotion ? 0.2 : 1);
    const dt = Math.min(delta, 0.05);
    group.children.forEach((child) => {
      const u = ((child as THREE.Mesh).material as THREE.ShaderMaterial).uniforms;
      u.uTime.value = t;
      if (u.uScroll) {
        u.uScroll.value = THREE.MathUtils.damp(u.uScroll.value, sceneState.progress, 2, dt);
      }
    });
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, -6]} material={smoke} renderOrder={-2}>
        <planeGeometry args={[22, 18]} />
      </mesh>
      {ribbons.map(({ spec, geometry, material }, i) => (
        <mesh
          key={i}
          geometry={geometry}
          material={material}
          position={spec.position}
          rotation={spec.rotation}
          renderOrder={-1}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}
