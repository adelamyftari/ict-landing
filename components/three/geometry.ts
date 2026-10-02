import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type TubeFrames = {
  points: THREE.Vector3[];
  tangents: THREE.Vector3[];
  normals: THREE.Vector3[];
  binormals: THREE.Vector3[];
  radii: number[];
};

/**
 * Samples a curve into rings with rotation-minimising frames.
 * The first normal is aligned with `up` so "dorsal" stays on top.
 */
export function sampleFrames(
  curve: THREE.Curve<THREE.Vector3>,
  rings: number,
  radius: (u: number) => number,
  up = new THREE.Vector3(0, 1, 0)
): TubeFrames {
  const points: THREE.Vector3[] = [];
  const tangents: THREE.Vector3[] = [];
  const normals: THREE.Vector3[] = [];
  const binormals: THREE.Vector3[] = [];
  const radii: number[] = [];

  let prevN: THREE.Vector3 | null = null;
  for (let i = 0; i <= rings; i++) {
    const u = i / rings;
    const P = curve.getPointAt(u);
    const T = curve.getTangentAt(u).normalize();
    const seed: THREE.Vector3 = prevN ?? up;
    const N: THREE.Vector3 = seed.clone().sub(T.clone().multiplyScalar(T.dot(seed)));
    if (N.lengthSq() < 1e-6) N.set(0, 0, 1);
    N.normalize();
    const B = new THREE.Vector3().crossVectors(T, N).normalize();
    points.push(P);
    tangents.push(T);
    normals.push(N);
    binormals.push(B);
    radii.push(radius(u));
    prevN = N;
  }
  return { points, tangents, normals, binormals, radii };
}

/**
 * Builds an indexed tube from precomputed frames. Ring `i` vertex `j` lives at
 * index i * (radial + 1) + j, so callers can rewrite positions per frame.
 */
export function buildTube(
  frames: TubeFrames,
  radial: number,
  uvScale: [number, number] = [1, 1]
) {
  const rings = frames.points.length - 1;
  const count = (rings + 1) * (radial + 1);
  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const index: number[] = [];

  const tmp = new THREE.Vector3();
  for (let i = 0; i <= rings; i++) {
    const { points, normals, binormals, radii } = frames;
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const k = i * (radial + 1) + j;
      tmp
        .copy(normals[i])
        .multiplyScalar(Math.cos(a))
        .addScaledVector(binormals[i], Math.sin(a));
      normal.set([tmp.x, tmp.y, tmp.z], k * 3);
      position.set(
        [
          points[i].x + tmp.x * radii[i],
          points[i].y + tmp.y * radii[i],
          points[i].z + tmp.z * radii[i],
        ],
        k * 3
      );
      uv.set([(i / rings) * uvScale[0], (j / radial) * uvScale[1]], k * 2);
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normal, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geometry.setIndex(index);
  return geometry;
}

/** Static tapered tube (horns, whiskers). */
export function taperedTube(
  pts: [number, number, number][],
  r0: number,
  r1: number,
  rings = 24,
  radial = 6
) {
  const curve = new THREE.CatmullRomCurve3(
    pts.map((p) => new THREE.Vector3(...p))
  );
  const frames = sampleFrames(curve, rings, (u) =>
    THREE.MathUtils.lerp(r0, r1, Math.pow(u, 0.8))
  );
  return buildTube(frames, radial);
}

/**
 * Overlapping dragon scales drawn on a canvas: dark bronze centres with
 * champagne edges. Returns a colour map and a matching bump map.
 */
export function createScaleTextures() {
  const size = 256;
  const cols = 4;
  const rows = 4;
  const cw = size / cols;
  const rh = size / rows;

  const color = document.createElement("canvas");
  const bump = document.createElement("canvas");
  color.width = color.height = bump.width = bump.height = size;
  const c = color.getContext("2d")!;
  const b = bump.getContext("2d")!;

  c.fillStyle = "#120a06";
  c.fillRect(0, 0, size, size);
  b.fillStyle = "#000";
  b.fillRect(0, 0, size, size);

  // Draw back-to-front so each row overlaps the previous one.
  for (let row = rows; row >= -1; row--) {
    for (let col = -1; col <= cols; col++) {
      const cx = col * cw + (row % 2 ? cw / 2 : 0);
      const cy = row * rh;
      const r = cw * 0.62;

      const g = c.createRadialGradient(cx, cy - r * 0.25, r * 0.1, cx, cy, r);
      g.addColorStop(0, "#3a2210");
      g.addColorStop(0.5, "#6b4422");
      g.addColorStop(0.8, "#b8894a");
      g.addColorStop(0.93, "#e6c584");
      g.addColorStop(1, "#1a0d06");
      c.fillStyle = g;
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI);
      c.closePath();
      c.fill();

      const bg = b.createRadialGradient(cx, cy - r * 0.3, 0, cx, cy, r);
      bg.addColorStop(0, "#fff");
      bg.addColorStop(0.8, "#999");
      bg.addColorStop(1, "#000");
      b.fillStyle = bg;
      b.beginPath();
      b.arc(cx, cy, r, 0, Math.PI);
      b.closePath();
      b.fill();
    }
  }

  const map = new THREE.CanvasTexture(color);
  map.colorSpace = THREE.SRGBColorSpace;
  const bumpMap = new THREE.CanvasTexture(bump);
  for (const t of [map, bumpMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
  }
  return { map, bumpMap };
}

/**
 * One dragon leg in body-radius units. Local frame: +X toward the head,
 * +Y dorsal (up), +Z = `side`. Origin is where the leg meets the body.
 */
export function createLegGeometry(side: 1 | -1) {
  const limb = taperedTube(
    [
      [0, 0, 0],
      [0.35, -0.9, 0.55 * side],
      [0.15, -1.75, 0.85 * side],
      [0.75, -2.35, 0.9 * side],
      [1.35, -2.5, 0.85 * side],
    ],
    0.42,
    0.17,
    20,
    8
  );

  const parts: THREE.BufferGeometry[] = [limb.toNonIndexed()];
  limb.dispose();
  // Three forward-reaching claws.
  for (let c = -1; c <= 1; c++) {
    const claw = new THREE.ConeGeometry(0.09, 0.55, 5);
    claw.translate(0, 0.27, 0);
    claw.rotateZ(-Math.PI / 2 + 0.35); // forward and slightly down
    claw.rotateY(c * 0.38);
    claw.translate(1.4, -2.52, 0.85 * side + c * 0.16);
    parts.push(claw.toNonIndexed());
    claw.dispose();
  }
  const merged = mergeGeometries(parts)!;
  parts.forEach((g) => g.dispose());
  return merged;
}
