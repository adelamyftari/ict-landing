"use client";

import { useEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import DragonBody from "./DragonBody";
import DragonHead from "./DragonHead";
import { createScaleTextures } from "./geometry";
import { fitScale, getSwimLayout } from "./dragonPath";

/**
 * DragonRoot never moves: it only scales design units to the viewport.
 * All motion comes from the head swimming along its path and the body
 * following its trail (see DragonBody).
 */
export default function Dragon() {
  const headRef = useRef<THREE.Group>(null);
  const aspect = useThree((s) => s.size.width / s.size.height);
  const portrait = aspect < 1;
  const path = useMemo(() => getSwimLayout(portrait), [portrait]);
  const scale = fitScale(aspect, path.half);

  const materials = useMemo(
    () => ({
      // Head skin: same scale texture as the body, tiled finer.
      skin: (() => {
        const { map, bumpMap } = createScaleTextures();
        map.repeat.set(4, 2);
        bumpMap.repeat.set(4, 2);
        return new THREE.MeshPhysicalMaterial({
          color: "#ffffff",
          map,
          bumpMap,
          bumpScale: 2,
          metalness: 0.88,
          roughness: 0.32,
          clearcoat: 0.6,
          clearcoatRoughness: 0.28,
        });
      })(),
      gold: new THREE.MeshPhysicalMaterial({
        color: "#d4ae67",
        metalness: 1,
        roughness: 0.26,
        clearcoat: 0.6,
        clearcoatRoughness: 0.2,
      }),
    }),
    []
  );

  useEffect(
    () => () => {
      materials.skin.dispose();
      materials.gold.dispose();
    },
    [materials]
  );

  return (
    <group scale={scale}>
      <DragonBody path={path} headRef={headRef} goldMaterial={materials.gold} />
      <group ref={headRef}>
        <DragonHead skinMaterial={materials.skin} goldMaterial={materials.gold} />
      </group>
    </group>
  );
}
