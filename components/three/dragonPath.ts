import * as THREE from "three";

/**
 * The head's swim path. The body is laid along the head's own trail, so the
 * path's opening loop is where the body starts out coiled, and its closing
 * curl is where it coils up again.
 *
 * Paths are authored in "design units" and uniformly scaled to fit the
 * viewport (see `fitScale`), so the dragon keeps its proportions everywhere.
 *   portrait : x ∈ [-1, 1] spans the screen width,  y ∈ [-1.8, 1.8]
 *   landscape: x ∈ [-1.6, 1.6],                      y ∈ [-1, 1] spans the height
 */

type P = [number, number, number];

export type SwimLayout = {
  points: P[];
  /** Arc length of the body laid along the head's trail */
  bodyLength: number;
  /** Index of the control point where the head sits at progress 0 */
  headStart: number;
  /** Max body radius */
  radius: number;
  /** Half extents of the design frame, used to fit the viewport */
  half: [number, number];
};

// Broad, open arcs only: one grand sweep, one long S, one open final turn.
// Turns are kept wide relative to body thickness so it never coils tightly.
const PORTRAIT: SwimLayout = {
  bodyLength: 4.6,
  headStart: 5,
  radius: 0.14,
  half: [1, 1.8],
  points: [
    // tail lead-in, off-screen left
    [-3.4, 0.05, -0.7],
    [-2.5, 0.35, -0.6],
    [-1.6, 0.7, -0.4],
    // grand sweep up into the hero, head arriving upper right
    [-0.8, 0.62, -0.15],
    [-0.28, 0.8, 0.05],
    [0.28, 1.0, 0.1],
    // wide turn down the right side
    [0.8, 0.7, -0.15],
    [0.62, 0.2, -0.45],
    // long S back across, behind the copy and cards
    [-0.15, -0.05, -0.55],
    [-0.75, -0.4, -0.35],
    [-0.7, -0.95, -0.05],
    [0.05, -1.15, 0.15],
    // open final turn: head comes round toward the viewer
    [0.62, -0.92, 0.35],
    [0.48, -0.56, 0.7],
    [0.2, -0.52, 0.9],
    [0.08, -0.55, 1.15],
  ],
};

const LANDSCAPE: SwimLayout = {
  bodyLength: 4.4,
  headStart: 5,
  radius: 0.12,
  half: [1.6, 1],
  points: [
    // tail lead-in, off-screen left
    [-3.9, 0.05, -0.7],
    [-3.0, 0.3, -0.6],
    [-2.1, 0.55, -0.4],
    // grand sweep across the top of the hero
    [-1.25, 0.45, -0.15],
    [-0.4, 0.46, 0.05],
    [0.4, 0.55, 0.1],
    // wide turn at the right
    [1.1, 0.42, -0.1],
    [1.45, 0.2, -0.35],
    [1.0, -0.15, -0.55],
    // long S back left behind the cards
    [0.1, -0.22, -0.55],
    [-0.85, -0.3, -0.4],
    [-1.3, -0.62, -0.1],
    [-0.75, -0.88, 0.15],
    // open final turn toward the viewer
    [0.1, -0.62, 0.35],
    [0.45, -0.32, 0.65],
    [0.22, -0.2, 0.8],
    [0.08, -0.22, 1.05],
  ],
};

export function getSwimLayout(portrait: boolean) {
  const layout = portrait ? PORTRAIT : LANDSCAPE;
  const curve = new THREE.CatmullRomCurve3(
    layout.points.map((p) => new THREE.Vector3(...p)),
    false,
    "centripetal"
  );
  curve.arcLengthDivisions = 1200;
  const length = curve.getLength();
  return {
    ...layout,
    curve,
    length,
    // Head starts at its authored control point; the body lies on the trail
    // behind it (extrapolated off-screen if the lead-in is shorter).
    sStart: arcLengthAtPoint(curve, layout.headStart, layout.points.length),
    sEnd: length,
  };
}

/** Arc length from the path start to the control point at `index`. */
function arcLengthAtPoint(curve: THREE.CatmullRomCurve3, index: number, count: number) {
  const lengths = curve.getLengths();
  const t = index / (count - 1);
  return lengths[Math.round(t * (lengths.length - 1))];
}

export type SwimPath = ReturnType<typeof getSwimLayout>;

/** Uniform design-unit → world scale for a camera at z = 7, fov 35. */
export function fitScale(aspect: number, half: [number, number]) {
  const worldHalfH = 7 * Math.tan(THREE.MathUtils.degToRad(17.5));
  const worldHalfW = worldHalfH * aspect;
  return Math.min(worldHalfW / half[0], worldHalfH / half[1]);
}
