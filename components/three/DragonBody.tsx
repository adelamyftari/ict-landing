"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createLegGeometry, createScaleTextures } from "./geometry";
import type { SwimPath } from "./dragonPath";
import { sceneState } from "@/lib/animations";

const { damp, smoothstep, lerp } = THREE.MathUtils;

/** Articulated spine joints (head → tail). */
const JOINTS = 30;
/** Skin resolution along / around the spine. */
const RINGS = 150;
const RADIAL = 14;
const SPIKES = 64;
const TAIL_FINS = 7;
const LEGS = [
  { u: 0.13, side: 1, phase: 0 },
  { u: 0.13, side: -1, phase: Math.PI },
  { u: 0.5, side: 1, phase: Math.PI * 0.5 },
  { u: 0.5, side: -1, phase: Math.PI * 1.5 },
] as const;

const UP = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

/**
 * Full-bodied thickness profile (fraction of R): muscular neck and chest,
 * gently slimming through the body, tapering only near the tail.
 */
const RADIUS_PROFILE: [number, number][] = [
  [0, 1.0],
  [0.2, 0.9],
  [0.45, 0.72],
  [0.7, 0.55],
  [1, 0.22],
];

function radiusAt(u: number, R: number) {
  for (let i = 1; i < RADIUS_PROFILE.length; i++) {
    const [u1, r1] = RADIUS_PROFILE[i];
    if (u <= u1) {
      const [u0, r0] = RADIUS_PROFILE[i - 1];
      // smoothstep between keys: no sudden shrinking
      return R * lerp(r0, r1, smoothstep(u, u0, u1));
    }
  }
  return R * RADIUS_PROFILE[RADIUS_PROFILE.length - 1][1];
}

/**
 * Cross-section shaping (c = cos around the body, 1 = dorsal):
 * fuller flanks, slightly flatter belly, a raised dorsal ridge.
 */
function sectionScale(c: number, s: number) {
  const flank = 1 + 0.1 * s * s;
  const belly = c < 0 ? 1 - 0.1 * c * c : 1;
  const ridge = 1 + 0.07 * Math.pow(Math.max(c, 0), 8);
  return flank * belly * ridge;
}

/** Component of `v` perpendicular to unit `t`, normalised (with fallback). */
function perpendicular(v: THREE.Vector3, t: THREE.Vector3, out: THREE.Vector3) {
  out.copy(v).addScaledVector(t, -t.dot(v));
  if (out.lengthSq() < 1e-6) out.copy(Z_AXIS).addScaledVector(t, -t.z);
  return out.normalize();
}

function createSim(path: SwimPath) {
  const offsets: number[] = [];
  const lambdas: number[] = [];
  const joints: THREE.Vector3[] = [];
  const render: THREE.Vector3[] = [];
  for (let i = 0; i < JOINTS; i++) {
    const f = i / (JOINTS - 1);
    // Neck joints sit closer together, so turns bend the neck first.
    offsets.push(path.bodyLength * Math.pow(f, 1.12));
    // Neck reacts fast, the tail catches up last.
    lambdas.push(lerp(7, 1.6, Math.pow(f, 0.8)));
    joints.push(new THREE.Vector3());
    render.push(new THREE.Vector3());
  }

  const spine = new THREE.CatmullRomCurve3(render, false, "centripetal");
  spine.arcLengthDivisions = 180;

  const vertCount = (RINGS + 1) * (RADIAL + 1);
  const uv = new Float32Array(vertCount * 2);
  const index: number[] = [];
  for (let i = 0; i <= RINGS; i++) {
    for (let j = 0; j <= RADIAL; j++) {
      const k = i * (RADIAL + 1) + j;
      uv[k * 2] = (i / RINGS) * (path.bodyLength / 0.22);
      uv[k * 2 + 1] = (j / RADIAL) * 3;
    }
  }
  for (let i = 0; i < RINGS; i++) {
    for (let j = 0; j < RADIAL; j++) {
      const a = i * (RADIAL + 1) + j;
      const b = a + RADIAL + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(vertCount * 3), 3).setUsage(THREE.DynamicDrawUsage)
  );
  geometry.setAttribute(
    "normal",
    new THREE.BufferAttribute(new Float32Array(vertCount * 3), 3).setUsage(THREE.DynamicDrawUsage)
  );
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geometry.setIndex(index);

  const ring = () => Array.from({ length: RINGS + 1 }, () => new THREE.Vector3());
  return {
    offsets,
    lambdas,
    joints,
    render,
    spine,
    geometry,
    frames: { P: ring(), T: ring(), N: ring(), B: ring(), r: new Float32Array(RINGS + 1) },
    progress: 0,
    initialised: false,
    headQ: new THREE.Quaternion(),
  };
}

type Sim = ReturnType<typeof createSim>;

type Props = {
  path: SwimPath;
  headRef: RefObject<THREE.Group | null>;
  goldMaterial: THREE.Material;
};

export default function DragonBody({ path, headRef, goldMaterial }: Props) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const spikesRef = useRef<THREE.InstancedMesh>(null);
  const legRefs = useRef<(THREE.Mesh | null)[]>([]);
  const simRef = useRef<Sim | null>(null);
  const simPathRef = useRef<SwimPath | null>(null);

  const bodyMaterial = useMemo(() => {
    const { map, bumpMap } = createScaleTextures();
    return new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      map,
      bumpMap,
      bumpScale: 3,
      metalness: 0.88,
      roughness: 0.3,
      clearcoat: 0.6,
      clearcoatRoughness: 0.28,
    });
  }, []);

  const spikeGeometry = useMemo(() => {
    // Swept fin: base at origin, tip along +Y. Sized for a 0.34 radius body.
    const g = new THREE.ConeGeometry(0.1, 0.26, 4, 1);
    g.translate(0, 0.13, 0);
    g.scale(0.35, 1, 1.25);
    return g;
  }, []);

  const legGeometries = useMemo(
    () => ({ right: createLegGeometry(1), left: createLegGeometry(-1) }),
    []
  );

  const spikeSlots = useMemo(() => {
    const slots: { ring: number; dir: "dorsal" | "tail"; a: number; size: number }[] = [];
    for (let s = 0; s < SPIKES; s++) {
      const u = 0.035 + (s / (SPIKES - 1)) * 0.86;
      slots.push({ ring: Math.round(u * RINGS), dir: "dorsal", a: 0, size: 1.05 });
    }
    for (let f = 0; f < TAIL_FINS; f++) {
      slots.push({
        ring: RINGS - 2 - (f % 3),
        dir: "tail",
        a: (f / TAIL_FINS) * Math.PI * 2,
        size: 1.25 - f * 0.08,
      });
    }
    return slots;
  }, []);

  const tmp = useMemo(
    () => ({
      a: new THREE.Vector3(),
      b: new THREE.Vector3(),
      tan: new THREE.Vector3(),
      dorsal: new THREE.Vector3(),
      side: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      pos: new THREE.Vector3(),
      fwd: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      m: new THREE.Matrix4(),
      sway: new THREE.Matrix4(),
      s: new THREE.Vector3(),
      yUp: new THREE.Vector3(0, 1, 0),
    }),
    []
  );

  useEffect(() => {
    const body = bodyRef.current;
    // The skin geometry is created lazily per path; free whichever is live.
    return () => body?.geometry.dispose();
  }, []);

  useEffect(
    () => () => {
      bodyMaterial.dispose();
      spikeGeometry.dispose();
      legGeometries.left.dispose();
      legGeometries.right.dispose();
    },
    [bodyMaterial, spikeGeometry, legGeometries]
  );

  useFrame(({ clock }, delta) => {
    const body = bodyRef.current;
    if (!body) return;

    let sim = simRef.current;
    if (!sim || simPathRef.current !== path) {
      sim?.geometry.dispose();
      sim = simRef.current = createSim(path);
      simPathRef.current = path;
      body.geometry = sim.geometry;
    }

    const dt = Math.min(delta, 1 / 20);
    const still = sceneState.reducedMotion;
    const t = clock.elapsedTime * (still ? 0.2 : 1);
    const { curve, length, sStart, sEnd, radius: R } = path;
    const { joints, render, offsets, lambdas, spine, frames } = sim;
    const first = !sim.initialised;

    // 1 ─ Head travel along its path. GSAP scrubs progress; we add inertia.
    sim.progress = first
      ? sceneState.dragon.progress
      : damp(sim.progress, sceneState.dragon.progress, 1.8, dt);
    const glide = still ? 0 : Math.sin(t * 0.25) * 0.04;
    const sHead = lerp(sStart, sEnd, sim.progress) + glide;

    // Point on the head's trail at arc length s (extrapolated past the ends).
    const trail = (s: number, out: THREE.Vector3) => {
      if (s <= 0) {
        return curve.getPointAt(0, out).addScaledVector(curve.getTangentAt(0, tmp.b), s);
      }
      if (s >= length) {
        return curve.getPointAt(1, out).addScaledVector(curve.getTangentAt(1, tmp.b), s - length);
      }
      return curve.getPointAt(s / length, out);
    };

    // 2 ─ Each joint chases where the head was `offset` ago (its trail).
    for (let i = 0; i < JOINTS; i++) {
      trail(sHead - offsets[i], tmp.a);
      const j = joints[i];
      if (first) {
        j.copy(tmp.a);
      } else {
        j.x = damp(j.x, tmp.a.x, lambdas[i], dt);
        j.y = damp(j.y, tmp.a.y, lambdas[i], dt);
        j.z = damp(j.z, tmp.a.z, lambdas[i], dt);
      }
    }
    // 3 ─ Follow-the-leader constraint: constant spacing, no gaps or stretch.
    for (let i = 1; i < JOINTS; i++) {
      const seg = offsets[i] - offsets[i - 1];
      tmp.dir.subVectors(joints[i], joints[i - 1]);
      const len = tmp.dir.length();
      if (len > 1e-6) joints[i].copy(joints[i - 1]).addScaledVector(tmp.dir, seg / len);
    }

    // 4 ─ Gentle travelling wave, head → tail. Swimming forward drives it too.
    for (let i = 0; i < JOINTS; i++) {
      const f = i / (JOINTS - 1);
      const prev = joints[Math.max(0, i - 1)];
      const next = joints[Math.min(JOINTS - 1, i + 1)];
      tmp.tan.subVectors(next, prev).normalize();
      perpendicular(UP, tmp.tan, tmp.dorsal);
      tmp.side.crossVectors(tmp.tan, tmp.dorsal);

      const tail = f > 0.7;
      // Slow, long-wavelength undulation; barely moves the neck.
      const amp =
        R * (0.1 + 0.18 * f) * (tail ? 1.2 : 1) * smoothstep(i, 2, 8) * (still ? 0.3 : 1);
      const phase = t * 0.8 - i * (tail ? 0.26 : 0.2) + sHead * 0.9;
      render[i]
        .copy(joints[i])
        .addScaledVector(tmp.dorsal, Math.sin(phase) * amp)
        .addScaledVector(tmp.side, Math.cos(phase * 0.7) * amp * 0.35);
    }
    spine.updateArcLengths();

    // 5 ─ Skin: rings along the live spine with rotation-minimising frames.
    const posArr = sim.geometry.getAttribute("position").array as Float32Array;
    const nrmArr = sim.geometry.getAttribute("normal").array as Float32Array;
    for (let r = 0; r <= RINGS; r++) {
      const u = r / RINGS;
      const P = frames.P[r];
      const T = frames.T[r];
      const N = frames.N[r];
      const B = frames.B[r];
      spine.getPointAt(u, P);
      spine.getTangentAt(u, T).normalize();
      perpendicular(r === 0 ? UP : frames.N[r - 1], T, N);
      B.crossVectors(T, N);
      const rad = radiusAt(u, R);
      frames.r[r] = rad;
      for (let j = 0; j <= RADIAL; j++) {
        const ang = (j / RADIAL) * Math.PI * 2;
        const c = Math.cos(ang);
        const s = Math.sin(ang);
        const k = (r * (RADIAL + 1) + j) * 3;
        const nx = N.x * c + B.x * s;
        const ny = N.y * c + B.y * s;
        const nz = N.z * c + B.z * s;
        const rr = rad * sectionScale(c, s);
        posArr[k] = P.x + nx * rr;
        posArr[k + 1] = P.y + ny * rr;
        posArr[k + 2] = P.z + nz * rr;
        nrmArr[k] = nx;
        nrmArr[k + 1] = ny;
        nrmArr[k + 2] = nz;
      }
    }
    sim.geometry.getAttribute("position").needsUpdate = true;
    sim.geometry.getAttribute("normal").needsUpdate = true;

    // 6 ─ Dorsal fins and tail tuft ride the skin frames.
    const spikes = spikesRef.current;
    if (spikes) {
      spikeSlots.forEach((slot, idx) => {
        const i = slot.ring;
        const T = frames.T[i];
        const N = frames.N[i];
        const B = frames.B[i];
        const rad = frames.r[i];
        if (slot.dir === "dorsal") {
          tmp.dir.copy(N).addScaledVector(T, 0.9).normalize();
          tmp.pos.copy(frames.P[i]).addScaledVector(N, rad * 0.95);
          tmp.s.setScalar((rad / 0.34) * slot.size);
        } else {
          tmp.dir
            .copy(T)
            .multiplyScalar(1.1)
            .addScaledVector(N, Math.cos(slot.a) * 0.75)
            .addScaledVector(B, Math.sin(slot.a) * 0.75)
            .normalize();
          tmp.pos.copy(frames.P[i]);
          tmp.s.setScalar((R / 0.34) * slot.size);
        }
        tmp.q.setFromUnitVectors(tmp.yUp, tmp.dir);
        tmp.m.compose(tmp.pos, tmp.q, tmp.s);
        spikes.setMatrixAt(idx, tmp.m);
      });
      spikes.instanceMatrix.needsUpdate = true;
    }

    // 7 ─ Legs inherit the body frame; only a tiny paddle of their own.
    LEGS.forEach((leg, i) => {
      const mesh = legRefs.current[i];
      if (!mesh) return;
      const r = Math.round(leg.u * RINGS);
      const rad = frames.r[r];
      tmp.fwd.copy(frames.T[r]).negate();
      tmp.up.copy(frames.N[r]);
      tmp.right.crossVectors(tmp.fwd, tmp.up).normalize();
      tmp.pos
        .copy(frames.P[r])
        .addScaledVector(tmp.up, -rad * 0.3)
        .addScaledVector(tmp.right, leg.side * rad * 0.6);
      tmp.m.makeBasis(tmp.fwd, tmp.up, tmp.right);
      tmp.sway.makeRotationZ(still ? 0 : Math.sin(t * 1.1 + leg.phase) * 0.12);
      tmp.m.multiply(tmp.sway);
      tmp.m.scale(tmp.s.setScalar(rad));
      tmp.m.setPosition(tmp.pos);
      mesh.matrix.copy(tmp.m);
      mesh.matrixWorldNeedsUpdate = true;
    });

    // 8 ─ Head leads: looks along its direction of travel, never rolls.
    const head = headRef.current;
    if (head) {
      const hs = (R / 0.34) * 1.2;
      tmp.fwd.copy(frames.T[0]).negate();
      perpendicular(UP, tmp.fwd, tmp.up);
      tmp.right.crossVectors(tmp.fwd, tmp.up);
      tmp.m.makeBasis(tmp.fwd, tmp.up, tmp.right);
      tmp.q.setFromRotationMatrix(tmp.m);
      if (first) sim.headQ.copy(tmp.q);
      else sim.headQ.slerp(tmp.q, 1 - Math.exp(-5 * dt));
      head.quaternion.copy(sim.headQ);
      head.position.copy(frames.P[0]).addScaledVector(tmp.fwd, 0.47 * hs);
      head.scale.setScalar(hs);
    }

    sim.initialised = true;
  });

  return (
    <group>
      <mesh ref={bodyRef} material={bodyMaterial} frustumCulled={false} />
      <instancedMesh
        ref={spikesRef}
        args={[spikeGeometry, goldMaterial, spikeSlots.length]}
        frustumCulled={false}
      />
      {LEGS.map((leg, i) => (
        <mesh
          key={i}
          ref={(el) => {
            legRefs.current[i] = el;
          }}
          geometry={leg.side === 1 ? legGeometries.right : legGeometries.left}
          material={goldMaterial}
          matrixAutoUpdate={false}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}
