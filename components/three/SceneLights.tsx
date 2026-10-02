"use client";

import { Environment, Lightformer } from "@react-three/drei";

/**
 * Cinematic three-point setup: warm champagne key from upper-right,
 * crimson fill from below, gold rim from behind. The environment is built
 * from procedural light cards so metal has something to reflect without
 * loading an HDR file.
 */
export default function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.2} color="#f3ede3" />

      {/* Key: champagne, upper right */}
      <directionalLight position={[4, 5, 4]} intensity={2.2} color="#f0d6a4" />

      {/* Deep red from beneath the dragon */}
      <pointLight position={[0.2, -2.2, 1.6]} intensity={28} distance={9} decay={2} color="#a6171d" />
      <pointLight position={[-2.4, 0.4, 0.8]} intensity={14} distance={7} decay={2} color="#7e1015" />

      {/* Gold rim behind head / body */}
      <spotLight
        position={[1.5, 3, -4]}
        angle={0.7}
        penumbra={1}
        intensity={60}
        distance={14}
        decay={2}
        color="#e4c27c"
      />

      {/* Broad, soft cards: metal should pick up warm bronze, not hard streaks. */}
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={0.55} color="#8a5a2b" position={[0, 0, 9]} scale={[16, 10, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.6} color="#e4c27c" position={[5, 5, 3]} scale={[8, 5, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.7} color="#d4ae67" position={[-5, 4, 2]} scale={[6, 4, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.9} color="#7e1015" position={[0, -6, 2]} scale={[14, 6, 1]} target={[0, 0, 0]} />
        <Lightformer form="ring" intensity={1.2} color="#d4ae67" position={[0, 2, -7]} scale={6} target={[0, 0, 0]} />
      </Environment>
    </>
  );
}
