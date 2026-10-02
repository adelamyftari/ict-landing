"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { sceneState } from "@/lib/animations";

const COUNT = 9;
const WRAP = 4.6; // vertical wrap half-range in world units

function crownShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.42, -0.22);
  s.lineTo(0.42, -0.22);
  s.lineTo(0.48, 0.24);
  s.lineTo(0.22, 0.02);
  s.lineTo(0, 0.34);
  s.lineTo(-0.22, 0.02);
  s.lineTo(-0.48, 0.24);
  s.closePath();
  return s;
}

function createCoinGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const body = new THREE.CylinderGeometry(1, 1, 0.09, 56, 1);
  parts.push(body);

  for (const side of [1, -1]) {
    const rim = new THREE.TorusGeometry(0.86, 0.035, 8, 56);
    rim.rotateX(Math.PI / 2);
    rim.translate(0, 0.045 * side, 0);
    parts.push(rim);

    const crown = new THREE.ExtrudeGeometry(crownShape(), {
      depth: 0.025,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.012,
      bevelSegments: 1,
    });
    crown.scale(0.75, 0.75, 1);
    crown.rotateX(-Math.PI / 2 * side);
    crown.translate(0, 0.045 * side, 0);
    parts.push(crown);
  }

  const merged = mergeGeometries(
    parts.map((g) => {
      const n = g.index ? g.toNonIndexed() : g;
      return n;
    })
  )!;
  parts.forEach((g) => g.dispose());
  return merged;
}

type CoinSeed = {
  x: number;
  y: number;
  z: number;
  size: number;
  spin: number;
  phase: number;
  tilt: number;
};

// Hand-placed so they frame the composition instead of cluttering it.
const SEEDS: CoinSeed[] = [
  { x: -1.15, y: -0.6, z: 0.6, size: 0.3, spin: 0.15, phase: 0.2, tilt: 0.9 },
  { x: 1.2, y: -1.3, z: 0.9, size: 0.28, spin: -0.12, phase: 1.3, tilt: 1.1 },
  { x: 1.05, y: 0.25, z: -0.8, size: 0.24, spin: 0.18, phase: 2.1, tilt: 0.7 },
  { x: -0.4, y: 1.9, z: -1.6, size: 0.2, spin: -0.2, phase: 0.8, tilt: 1.2 },
  { x: -1.6, y: 2.6, z: -2.2, size: 0.26, spin: 0.14, phase: 2.7, tilt: 0.6 },
  { x: 0.6, y: -2.6, z: 2.2, size: 0.22, spin: 0.22, phase: 1.7, tilt: 1.3 },
  { x: -0.9, y: -3.4, z: -1.2, size: 0.3, spin: -0.16, phase: 3.1, tilt: 0.8 },
  { x: 1.7, y: 3.3, z: -2.6, size: 0.32, spin: 0.1, phase: 0.4, tilt: 1.0 },
  { x: -0.15, y: 3.9, z: 1.6, size: 0.18, spin: -0.24, phase: 2.4, tilt: 1.15 },
];

export default function FloatingCoins() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => createCoinGeometry(), []);
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#d4ae67",
        metalness: 1,
        roughness: 0.22,
        clearcoat: 0.35,
        clearcoatRoughness: 0.2,
      }),
    []
  );
  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      e: new THREE.Euler(),
      p: new THREE.Vector3(),
      s: new THREE.Vector3(),
    }),
    []
  );
  const smoothProgress = useRef(0);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  useFrame(({ clock, viewport }, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.elapsedTime * (sceneState.reducedMotion ? 0.2 : 1);
    smoothProgress.current = THREE.MathUtils.damp(
      smoothProgress.current,
      sceneState.progress,
      2,
      Math.min(delta, 1 / 20)
    );
    // Spread coins across wider screens.
    const spread = Math.max(1, viewport.width / 2.4);

    SEEDS.forEach((c, i) => {
      // Nearer coins drift faster with scroll: depth parallax.
      const depth = 1 + c.z * 0.25;
      let y = c.y + Math.sin(t * 0.5 + c.phase) * 0.08 + smoothProgress.current * 6 * depth;
      y = ((((y + WRAP) % (WRAP * 2)) + WRAP * 2) % (WRAP * 2)) - WRAP;

      tmp.p.set(c.x * spread + Math.sin(t * 0.3 + c.phase) * 0.05, y, c.z);
      tmp.e.set(c.tilt + Math.sin(t * 0.4 + c.phase) * 0.1, t * c.spin + c.phase, Math.sin(t * 0.25 + c.phase) * 0.2);
      tmp.q.setFromEuler(tmp.e);
      tmp.s.setScalar(c.size);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      mesh.setMatrixAt(i, tmp.m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, COUNT]}
      frustumCulled={false}
    />
  );
}
