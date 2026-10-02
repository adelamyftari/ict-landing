"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { taperedTube } from "./geometry";
import { sceneState } from "@/lib/animations";

type Props = {
  skinMaterial: THREE.Material;
  goldMaterial: THREE.Material;
};

// Local space: +X is forward (snout), +Y is up, ±Z are the cheeks.
const MANE_COUNT = 26;

export default function DragonHead({ skinMaterial, goldMaterial }: Props) {
  const pivotRef = useRef<THREE.Group>(null);
  const jawRef = useRef<THREE.Group>(null);
  const whiskersRef = useRef<THREE.Group>(null);
  const maneRef = useRef<THREE.InstancedMesh>(null);
  const whiskerSides = useRef<(THREE.Group | null)[]>([]);
  const spring = useRef({
    ready: false,
    prevQ: new THREE.Quaternion(),
    dq: new THREE.Quaternion(),
    inv: new THREE.Quaternion(),
    axis: new THREE.Vector3(),
    y: 0,
    z: 0,
    vy: 0,
    vz: 0,
  });

  const materials = useMemo(
    () => ({
      eye: new THREE.MeshStandardMaterial({
        color: "#3a0505",
        emissive: "#ff2b14",
        emissiveIntensity: 2.4,
        roughness: 0.2,
      }),
      mouth: new THREE.MeshStandardMaterial({
        color: "#1a0203",
        emissive: "#7e1015",
        emissiveIntensity: 1.1,
        roughness: 0.6,
      }),
      tooth: new THREE.MeshPhysicalMaterial({
        color: "#efe0bf",
        metalness: 0.4,
        roughness: 0.3,
        clearcoat: 1,
      }),
    }),
    []
  );

  const geo = useMemo(() => {
    const sphere = new THREE.SphereGeometry(1, 28, 20);
    const capsule = new THREE.CapsuleGeometry(1, 1, 6, 16);
    capsule.rotateZ(Math.PI / 2); // along X
    const tooth = new THREE.ConeGeometry(0.022, 0.09, 5);
    const fang = new THREE.ConeGeometry(0.032, 0.16, 6);
    const mane = new THREE.ConeGeometry(0.075, 1, 4);
    mane.translate(0, 0.5, 0);

    const horn = (side: 1 | -1) =>
      taperedTube(
        [
          [-0.02, 0.2, 0.12 * side],
          [-0.42, 0.5, 0.24 * side],
          [-0.88, 0.64, 0.22 * side],
          [-1.25, 0.6, 0.12 * side],
          [-1.45, 0.5, 0.05 * side],
        ],
        0.095,
        0.01,
        28,
        8
      );
    // Antler tine branching up from each horn.
    const tine = (side: 1 | -1) =>
      taperedTube(
        [
          [-0.5, 0.54, 0.24 * side],
          [-0.58, 0.74, 0.3 * side],
          [-0.72, 0.9, 0.3 * side],
          [-0.86, 0.98, 0.26 * side],
        ],
        0.045,
        0.006,
        14,
        6
      );
    // Forehead ridge along the skull midline.
    const ridge = taperedTube(
      [
        [0.66, 0.17, 0],
        [0.4, 0.27, 0],
        [0.08, 0.37, 0],
        [-0.25, 0.42, 0],
        [-0.5, 0.38, 0],
      ],
      0.045,
      0.012,
      24,
      8
    );
    // Gold lip line tracing the upper jaw.
    const lip = (side: 1 | -1) =>
      taperedTube(
        [
          [0.9, 0.0, 0.1 * side],
          [0.66, -0.06, 0.17 * side],
          [0.38, -0.07, 0.2 * side],
          [0.12, -0.03, 0.24 * side],
        ],
        0.022,
        0.01,
        16,
        6
      );
    const whisker = (side: 1 | -1) =>
      taperedTube(
        [
          [0.8, -0.01, 0.11 * side],
          [1.05, -0.06, 0.3 * side],
          [1.18, -0.3, 0.66 * side],
          [0.95, -0.62, 1.02 * side],
          [0.5, -0.8, 1.28 * side],
          [0.1, -0.78, 1.42 * side],
        ],
        0.02,
        0.003,
        40,
        5
      );
    const brow = (side: 1 | -1) =>
      taperedTube(
        [
          [0.44, 0.2, 0.17 * side],
          [0.25, 0.27, 0.22 * side],
          [0.02, 0.33, 0.24 * side],
          [-0.2, 0.42, 0.22 * side],
        ],
        0.045,
        0.006,
        16,
        6
      );

    return {
      sphere,
      capsule,
      tooth,
      fang,
      mane,
      horns: [horn(1), horn(-1)],
      tines: [tine(1), tine(-1)],
      lips: [lip(1), lip(-1)],
      ridge,
      whiskers: [whisker(1), whisker(-1)],
      brows: [brow(1), brow(-1)],
    };
  }, []);

  // Mane: swept fins radiating backwards from the skull.
  useLayoutEffect(() => {
    const mesh = maneRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < MANE_COUNT; i++) {
      const f = i / (MANE_COUNT - 1);
      const a = THREE.MathUtils.lerp(-2.3, 2.3, f) + Math.sin(i * 12.9) * 0.12;
      const layer = i % 3;
      p.set(-0.18 - layer * 0.12, Math.cos(a) * 0.24 + 0.04, Math.sin(a) * 0.28);
      // Swept back along the neck rather than radiating outwards.
      dir
        .set(-1, Math.cos(a) * 0.42 + 0.12, Math.sin(a) * 0.5)
        .normalize();
      q.setFromUnitVectors(up, dir);
      const len = 0.3 + (1 - Math.abs(f - 0.5) * 2) * 0.26 + layer * 0.05;
      s.set(1 + layer * 0.2, len, 0.5);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame(({ clock }, delta) => {
    const still = sceneState.reducedMotion;
    const t = clock.elapsedTime * (still ? 0.15 : 1);
    const dt = Math.min(delta, 1 / 20);
    const pivot = pivotRef.current;
    if (pivot) {
      // Controlled, confident micro-motion (local Z = pitch, X = roll, Y = yaw).
      pivot.rotation.z = Math.sin(t * 0.9) * 0.03;
      pivot.rotation.x = Math.sin(t * 0.7) * 0.02;
      pivot.rotation.y = Math.sin(t * 0.5 + 1.3) * 0.025;
    }
    if (jawRef.current) {
      // Slow breathing jaw.
      jawRef.current.rotation.z = -0.24 - (Math.sin(t * 0.6) * 0.5 + 0.5) * 0.14;
    }

    // Whiskers: damped spring that trails the head's turning.
    const head = pivot?.parent;
    const whiskers = whiskersRef.current;
    if (head && whiskers && dt > 0) {
      const s = spring.current;
      if (!s.ready) {
        s.prevQ.copy(head.quaternion);
        s.ready = true;
      }
      // Angular velocity of the head in its own frame.
      s.dq.copy(head.quaternion).multiply(s.prevQ.invert());
      s.prevQ.copy(head.quaternion);
      const angle = 2 * Math.acos(THREE.MathUtils.clamp(s.dq.w, -1, 1));
      s.axis.set(s.dq.x, s.dq.y, s.dq.z);
      if (s.axis.lengthSq() > 1e-10 && angle > 1e-5) {
        s.axis.normalize().multiplyScalar(angle / dt);
        s.axis.applyQuaternion(s.inv.copy(head.quaternion).invert());
      } else {
        s.axis.set(0, 0, 0);
      }
      const k = 0.18;
      const lim = 0.35;
      const ty = THREE.MathUtils.clamp(-s.axis.y * k, -lim, lim);
      const tz = THREE.MathUtils.clamp(-s.axis.z * k, -lim, lim);
      // Spring: velocity chases target, position integrates (lightly damped).
      s.vy += (ty - s.y) * 40 * dt - s.vy * 9 * dt;
      s.vz += (tz - s.z) * 40 * dt - s.vz * 9 * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      whiskers.rotation.y = s.y + Math.sin(t * 0.45 + 1) * 0.04;
      whiskers.rotation.z = s.z;
      whiskers.rotation.x = Math.sin(t * 0.7) * 0.04;
    }
  });

  const upperTeeth = [0.34, 0.44, 0.54, 0.66, 0.74];

  return (
    <group ref={pivotRef} scale={1.4}>
      {/* Skull */}
      <mesh geometry={geo.sphere} material={skinMaterial} position={[0.02, 0.06, 0]} scale={[0.44, 0.3, 0.32]} />
      {/* Cheeks */}
      {[1, -1].map((side) => (
        <mesh key={side} geometry={geo.sphere} material={skinMaterial} position={[0.14, -0.04, 0.17 * side]} scale={[0.26, 0.17, 0.12]} />
      ))}
      {/* Upper snout + nose */}
      <mesh geometry={geo.capsule} material={skinMaterial} position={[0.46, 0.02, 0]} scale={[0.2, 0.13, 0.165]} />
      <mesh geometry={geo.sphere} material={skinMaterial} position={[0.8, 0.07, 0]} scale={[0.14, 0.11, 0.17]} />
      {[1, -1].map((side) => (
        <mesh key={side} geometry={geo.sphere} material={goldMaterial} position={[0.86, 0.1, 0.09 * side]} scale={0.035} />
      ))}

      {/* Mouth glow */}
      <mesh geometry={geo.sphere} material={materials.mouth} position={[0.4, -0.1, 0]} scale={[0.3, 0.055, 0.1]} />

      {/* Upper teeth */}
      {upperTeeth.map((x, i) =>
        [1, -1].map((side) => (
          <mesh
            key={`${i}-${side}`}
            geometry={i === 1 ? geo.fang : geo.tooth}
            material={materials.tooth}
            position={[x + 0.06, i === 1 ? -0.12 : -0.09, 0.12 * side * (1 - i * 0.06)]}
            rotation={[0, 0, Math.PI]}
          />
        ))
      )}

      {/* Lower jaw (hinged near the cheeks) */}
      <group ref={jawRef} position={[0.08, -0.1, 0]}>
        <mesh geometry={geo.capsule} material={skinMaterial} position={[0.33, -0.04, 0]} scale={[0.17, 0.075, 0.13]} />
        {[0.28, 0.4, 0.52, 0.6].map((x, i) =>
          [1, -1].map((side) => (
            <mesh
              key={`${i}-${side}`}
              geometry={i === 2 ? geo.fang : geo.tooth}
              material={materials.tooth}
              position={[x, 0.03, 0.09 * side]}
            />
          ))
        )}
        {/* Beard: flowing tufts under the chin */}
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            geometry={geo.mane}
            material={goldMaterial}
            position={[0.3 - i * 0.07, -0.08, (i - 2) * 0.045]}
            rotation={[(i - 2) * 0.18, 0, Math.PI * 0.8 + i * 0.05]}
            scale={[0.9, 0.46 - Math.abs(i - 2) * 0.06, 0.55]}
          />
        ))}
      </group>

      {/* Eyes: small, subtle */}
      {[1, -1].map((side) => (
        <mesh key={side} geometry={geo.sphere} material={materials.eye} position={[0.34, 0.15, 0.2 * side]} scale={[0.045, 0.032, 0.03]} />
      ))}

      {/* Brows, horns, whiskers */}
      {geo.brows.map((g, i) => (
        <mesh key={`b${i}`} geometry={g} material={goldMaterial} />
      ))}
      {geo.horns.map((g, i) => (
        <mesh key={`h${i}`} geometry={g} material={goldMaterial} />
      ))}
      {geo.tines.map((g, i) => (
        <mesh key={`t${i}`} geometry={g} material={goldMaterial} />
      ))}
      {geo.lips.map((g, i) => (
        <mesh key={`l${i}`} geometry={g} material={goldMaterial} />
      ))}
      <mesh geometry={geo.ridge} material={goldMaterial} />
      {/* Nose bridge */}
      <mesh geometry={geo.capsule} material={skinMaterial} position={[0.56, 0.11, 0]} scale={[0.16, 0.055, 0.075]} />
      {/* Cheek frills: fanned fins sweeping back from the jaw hinge */}
      {[1, -1].map((side) =>
        [0, 1, 2, 3].map((i) => (
          <mesh
            key={`f${side}${i}`}
            geometry={geo.mane}
            material={goldMaterial}
            position={[0.02 - i * 0.03, -0.02 + (i - 1.5) * 0.06, 0.26 * side]}
            rotation={[0, side * (0.55 + i * 0.08), Math.PI * 0.5 + (i - 1.5) * 0.28]}
            scale={[0.75, i === 1 || i === 2 ? 0.38 : 0.3, 0.45]}
          />
        ))
      )}
      <group ref={whiskersRef} position={[0.8, 0, 0]}>
        {geo.whiskers.map((g, i) => (
          <group
            key={`w${i}`}
            ref={(el) => {
              whiskerSides.current[i] = el;
            }}
          >
            <mesh geometry={g} material={goldMaterial} position={[-0.8, 0, 0]} />
          </group>
        ))}
      </group>

      <instancedMesh ref={maneRef} args={[geo.mane, goldMaterial, MANE_COUNT]} />
    </group>
  );
}
