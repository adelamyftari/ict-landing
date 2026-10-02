"use client";

import { Suspense, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import Dragon from "./Dragon";
import FloatingCoins from "./FloatingCoins";
import ParticleField from "./ParticleField";
import RedEnergyRibbons from "./RedEnergyRibbons";
import SceneLights from "./SceneLights";
import { sceneState } from "@/lib/animations";

const { damp } = THREE.MathUtils;

/** Tiny scroll dolly + pointer parallax. Never enough to cause discomfort. */
function CameraRig() {
  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const still = sceneState.reducedMotion ? 0 : 1;
    const px = sceneState.pointer.x * 0.12 * still;
    const py = -sceneState.pointer.y * 0.08 * still;
    camera.position.x = damp(camera.position.x, px, 2, dt);
    camera.position.y = damp(camera.position.y, sceneState.camera.y + py, 2, dt);
    camera.position.z = damp(camera.position.z, sceneState.camera.z, 2, dt);
    camera.lookAt(0, sceneState.camera.y * 0.5, 0);
  });
  return null;
}

export default function DragonScene() {
  // Fewer particles on small / low-power screens.
  // (This module is client-only via next/dynamic, so window is available.)
  const [particles] = useState(() => (window.innerWidth < 768 ? 180 : 260));

  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <PerspectiveCamera makeDefault fov={35} position={[0, 0, 7]} near={0.1} far={40} />
      <CameraRig />
      <Suspense fallback={null}>
        <SceneLights />
        <RedEnergyRibbons />
        <Dragon />
        <FloatingCoins />
        <ParticleField count={particles} />
      </Suspense>
    </Canvas>
  );
}
