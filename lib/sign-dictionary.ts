/**
 * ASL Sign Dictionary — bone rotation poses for Mixamo xbot/ybot skeleton.
 *
 * Each pose is an array of [boneName, [rx, ry, rz]] in radians.
 * Bone names use the standard mixamorigXxx convention.
 *
 * Rotation conventions (Three.js Euler XYZ):
 *   Finger MCP/PIP/DIP joints: positive X = curl (flex), negative X = extend
 *   Thumb CMC: positive Z = adduct toward palm, negative Z = abduct away
 *   Wrist: positive X = dorsiflexion, negative X = palmar flexion
 *          positive Y = ulnar deviation, negative Y = radial deviation
 *   Forearm: positive Y = supination (palm up), negative Y = pronation (palm down)
 *   Upper arm Z: negative = raise laterally
 */

export type BonePose = [string, [number, number, number]];
export type SignPose = {
  bones: BonePose[];
  holdMs?: number; // how long to hold this pose before moving on
  label?: string;  // human-readable description
};
export type Sign = {
  id: string;
  poses: SignPose[]; // sequence of poses (for motion signs, multiple poses)
  isFingerspell?: boolean;
};

const H = Math.PI * 0.5; // 90°
const Q = Math.PI * 0.25; // 45°
const E = Math.PI * 0.15; // ~27° (slight bend)
const F = Math.PI * 0.6; // ~108°

// ── Reusable partial poses ────────────────────────────────────────────────

// All right fingers fully extended (flat hand)
const RIGHT_ALL_EXTENDED: BonePose[] = [
  ["mixamorigRightHandIndex1", [0, 0, 0]],
  ["mixamorigRightHandIndex2", [0, 0, 0]],
  ["mixamorigRightHandIndex3", [0, 0, 0]],
  ["mixamorigRightHandMiddle1", [0, 0, 0]],
  ["mixamorigRightHandMiddle2", [0, 0, 0]],
  ["mixamorigRightHandMiddle3", [0, 0, 0]],
  ["mixamorigRightHandRing1", [0, 0, 0]],
  ["mixamorigRightHandRing2", [0, 0, 0]],
  ["mixamorigRightHandRing3", [0, 0, 0]],
  ["mixamorigRightHandPinky1", [0, 0, 0]],
  ["mixamorigRightHandPinky2", [0, 0, 0]],
  ["mixamorigRightHandPinky3", [0, 0, 0]],
  ["mixamorigRightHandThumb1", [0, 0, -Q]],
  ["mixamorigRightHandThumb2", [0, 0, 0]],
  ["mixamorigRightHandThumb3", [0, 0, 0]],
];

// All right fingers fully curled (fist)
const RIGHT_ALL_CURLED: BonePose[] = [
  ["mixamorigRightHandIndex1", [F, 0, 0]],
  ["mixamorigRightHandIndex2", [H, 0, 0]],
  ["mixamorigRightHandIndex3", [Q, 0, 0]],
  ["mixamorigRightHandMiddle1", [F, 0, 0]],
  ["mixamorigRightHandMiddle2", [H, 0, 0]],
  ["mixamorigRightHandMiddle3", [Q, 0, 0]],
  ["mixamorigRightHandRing1", [F, 0, 0]],
  ["mixamorigRightHandRing2", [H, 0, 0]],
  ["mixamorigRightHandRing3", [Q, 0, 0]],
  ["mixamorigRightHandPinky1", [F, 0, 0]],
  ["mixamorigRightHandPinky2", [H, 0, 0]],
  ["mixamorigRightHandPinky3", [Q, 0, 0]],
  ["mixamorigRightHandThumb1", [0, 0, H * 0.3]],
  ["mixamorigRightHandThumb2", [Q, 0, 0]],
  ["mixamorigRightHandThumb3", [E, 0, 0]],
];

// Neutral arm position (arm at side)
const RIGHT_ARM_NEUTRAL: BonePose[] = [
  ["mixamorigRightShoulder", [0, 0, 0]],
  ["mixamorigRightArm", [0, 0, 0]],
  ["mixamorigRightForeArm", [0, 0, 0]],
  ["mixamorigRightHand", [0, 0, 0]],
];

// Arm raised to signing space (forearm up, upper arm slightly out)
const RIGHT_ARM_SIGNING: BonePose[] = [
  ["mixamorigRightShoulder", [0, 0, Q * 0.5]],
  ["mixamorigRightArm", [0, 0, -H * 0.6]],
  ["mixamorigRightForeArm", [H * 0.8, 0, 0]],
  ["mixamorigRightHand", [0, 0, 0]],
];

// ── Fingerspelling — Letters A–Z ──────────────────────────────────────────

function mkLetter(
  bones: BonePose[],
  armOverride?: BonePose[]
): SignPose {
  return {
    bones: [...(armOverride ?? RIGHT_ARM_SIGNING), ...bones],
    holdMs: 350,
  };
}

export const ASL_LETTERS: Record<string, Sign> = {
  A: {
    id: "A",
    isFingerspell: true,
    poses: [mkLetter([
      // Fist with thumb resting on side
      ...RIGHT_ALL_CURLED,
      ["mixamorigRightHandThumb1", [0, 0, -Q * 0.5]],
      ["mixamorigRightHandThumb2", [E, 0, 0]],
    ])],
  },
  B: {
    id: "B",
    isFingerspell: true,
    poses: [mkLetter([
      // Flat hand, fingers together, thumb tucked across palm
      ...RIGHT_ALL_EXTENDED,
      ["mixamorigRightHandThumb1", [0, 0, Q * 1.2]],
      ["mixamorigRightHandThumb2", [E, 0, 0]],
    ])],
  },
  C: {
    id: "C",
    isFingerspell: true,
    poses: [mkLetter([
      // Curved "C" shape
      ["mixamorigRightHandIndex1", [Q, 0, 0]],
      ["mixamorigRightHandIndex2", [E, 0, 0]],
      ["mixamorigRightHandIndex3", [0, 0, 0]],
      ["mixamorigRightHandMiddle1", [Q, 0, 0]],
      ["mixamorigRightHandMiddle2", [E, 0, 0]],
      ["mixamorigRightHandMiddle3", [0, 0, 0]],
      ["mixamorigRightHandRing1", [Q, 0, 0]],
      ["mixamorigRightHandRing2", [E, 0, 0]],
      ["mixamorigRightHandRing3", [0, 0, 0]],
      ["mixamorigRightHandPinky1", [Q, 0, 0]],
      ["mixamorigRightHandPinky2", [E, 0, 0]],
      ["mixamorigRightHandPinky3", [0, 0, 0]],
      ["mixamorigRightHandThumb1", [0, 0, -Q]],
      ["mixamorigRightHandThumb2", [E, 0, 0]],
    ])],
  },
  D: {
    id: "D",
    isFingerspell: true,
    poses: [mkLetter([
      // Index pointing up, others curled, touching thumb
      ["mixamorigRightHandIndex1", [0, 0, 0]],
      ["mixamorigRightHandIndex2", [0, 0, 0]],
      ["mixamorigRightHandIndex3", [0, 0, 0]],
      ["mixamorigRightHandMiddle1", [F, 0, 0]],
      ["mixamorigRightHandMiddle2", [H, 0, 0]],
      ["mixamorigRightHandMiddle3", [Q, 0, 0]],
      ["mixamorigRightHandRing1", [F, 0, 0]],
      ["mixamorigRightHandRing2", [H, 0, 0]],
      ["mixamorigRightHandRing3", [Q, 0, 0]],
      ["mixamorigRightHandPinky1", [F, 0, 0]],
      ["mixamorigRightHandPinky2", [H, 0, 0]],
      ["mixamorigRightHandPinky3", [Q, 0, 0]],
      ["mixamorigRightHandThumb1", [0, 0, -Q * 0.3]],
      ["mixamorigRightHandThumb2", [Q, 0, 0]],
    ])],
  },
  E: {
    id: "E",
    isFingerspell: true,
    poses: [mkLetter([
      // All fingers bent at middle joints, touching thumb
      ["mixamorigRightHandIndex1", [Q, 0, 0]],
      ["mixamorigRightHandIndex2", [H, 0, 0]],
      ["mixamorigRightHandIndex3", [Q, 0, 0]],
      ["mixamorigRightHandMiddle1", [Q, 0, 0]],
      ["mixamorigRightHandMiddle2", [H, 0, 0]],
      ["mixamorigRightHandMiddle3", [Q, 0, 0]],
      ["mixamorigRightHandRing1", [Q, 0, 0]],
      ["mixamorigRightHandRing2", [H, 0, 0]],
      ["mixamorigRightHandRing3", [Q, 0, 0]],
      ["mixamorigRightHandPinky1", [Q, 0, 0]],
      ["mixamorigRightHandPinky2", [H, 0, 0]],
      ["mixamorigRightHandPinky3", [Q, 0, 0]],
      ["mixamorigRightHandThumb1", [0, 0, Q * 0.8]],
      ["mixamorigRightHandThumb2", [E, 0, 0]],
    ])],
  },
  F: {
    id: "F",
    isFingerspell: true,
    poses: [mkLetter([
      // Index + thumb touching (OK-like), others extended
      ["mixamorigRightHandIndex1", [Q * 1.2, 0, 0]],
      ["mixamorigRightHandIndex2", [Q, 0, 0]],
      ["mixamorigRightHandIndex3", [E, 0, 0]],
      ["mixamorigRightHandMiddle1", [0, 0, 0]],
      ["mixamorigRightHandMiddle2", [0, 0, 0]],
      ["mixamorigRightHandMiddle3", [0, 0, 0]],
      ["mixamorigRightHandRing1", [0, 0, 0]],
      ["mixamorigRightHandRing2", [0, 0, 0]],
      ["mixamorigRightHandRing3", [0, 0, 0]],
      ["mixamorigRightHandPinky1", [0, 0, 0]],
      ["mixamorigRightHandPinky2", [0, 0, 0]],
      ["mixamorigRightHandPinky3", [0, 0, 0]],
      ["mixamorigRightHandThumb1", [0, 0, -Q * 0.3]],
      ["mixamorigRightHandThumb2", [Q * 0.8, 0, 0]],
    ])],
  },
  G: {
    id: "G",
    isFingerspell: true,
    poses: [mkLetter([
      // Index pointing sideways, thumb parallel
      ["mixamorigRightHandIndex1", [0, 0, 0]],
      ["mixamorigRightHandIndex2", [0, 0, 0]],
      ["mixamorigRightHandIndex3", [0, 0, 0]],
      ["mixamorigRightHandMiddle1", [F, 0, 0]],
      ["mixamorigRightHandMiddle2", [H, 0, 0]],
      ["mixamorigRightHandMiddle3", [Q, 0, 0]],
      ["mixamorigRightHandRing1", [F, 0, 0]],
      ["mixamorigRightHandRing2", [H, 0, 0]],
      ["mixamorigRightHandRing3", [Q, 0, 0]],
      ["mixamorigRightHandPinky1", [F, 0, 0]],
      ["mixamorigRightHandPinky2", [H, 0, 0]],
      ["mixamorigRightHandPinky3", [Q, 0, 0]],
      ["mixamorigRightHandThumb1", [0, -Q * 0.5, -Q]],
      ["mixamorigRightHandThumb2", [0, 0, 0]],
    ], [
      // Arm pointing forward/sideways for G
      ["mixamorigRightShoulder", [0, 0, Q * 0.3]],
      ["mixamorigRightArm", [0, -H * 0.4, -H * 0.5]],
      ["mixamorigRightForeArm", [0, 0, 0]],
      ["mixamorigRightHand", [0, 0, 0]],
    ])],
  },
  H: {
    id: "H",
    isFingerspell: true,
    poses: [mkLetter([
      // Index + middle extended side-by-side, horizontal
      ["mixamorigRightHandIndex1", [0, 0, 0]],
      ["mixamorigRightHandIndex2", [0, 0, 0]],
      ["mixamorigRightHandIndex3", [0, 0, 0]],
      ["mixamorigRightHandMiddle1", [0, 0, 0]],
      ["mixamorigRightHandMiddle2", [0, 0, 0]],
      ["mixamorigRightHandMiddle3", [0, 0, 0]],
      ["mixamorigRightHandRing1", [F, 0, 0]],
      ["mixamorigRightHandRing2", [H, 0, 0]],
      ["mixamorigRightHandRing3", [Q, 0, 0]],
      ["mixamorigRightHandPinky1", [F, 0, 0]],
      ["mixamorigRightHandPinky2", [H, 0, 0]],
      ["mixamorigRightHandPinky3", [Q, 0, 0]],
      ["mixamorigRightHandThumb1", [0, 0, Q * 0.6]],
      ["mixamorigRightHandThumb2", [E, 0, 0]],
    ])],
  },
  I: {
    id: "I",
    isFingerspell: true,
    poses: [mkLetter([
      // Pinky up, all others curled
      ["mixamorigRightHandIndex1", [F, 0, 0]],
      ["mixamorigRightHandIndex2", [H, 0, 0]],
      ["mixamorigRightHandIndex3", [Q, 0, 0]],
      ["mixamorigRightHandMiddle1", [F, 0, 0]],
      ["mixamorigRightHandMiddle2", [H, 0, 0]],
      ["mixamorigRightHandMiddle3", [Q, 0, 0]],
      ["mixamorigRightHandRing1", [F, 0, 0]],
      ["mixamorigRightHandRing2", [H, 0, 0]],
      ["mixamorigRightHandRing3", [Q, 0, 0]],
      ["mixamorigRightHandPinky1", [0, 0, 0]],
      ["mixamorigRightHandPinky2", [0, 0, 0]],
      ["mixamorigRightHandPinky3", [0, 0, 0]],
      ["mixamorigRightHandThumb1", [0, 0, Q * 0.4]],
      ["mixamorigRightHandThumb2", [E, 0, 0]],
    ])],
  },
  J: {
    id: "J",
    isFingerspell: true,
    poses: [
      // J = I + a hook motion (two-pose animation)
      mkLetter([
        ["mixamorigRightHandIndex1", [F, 0, 0]],
        ["mixamorigRightHandIndex2", [H, 0, 0]],
        ["mixamorigRightHandIndex3", [Q, 0, 0]],
        ["mixamorigRightHandMiddle1", [F, 0, 0]],
        ["mixamorigRightHandMiddle2", [H, 0, 0]],
        ["mixamorigRightHandMiddle3", [Q, 0, 0]],
        ["mixamorigRightHandRing1", [F, 0, 0]],
        ["mixamorigRightHandRing2", [H, 0, 0]],
        ["mixamorigRightHandRing3", [Q, 0, 0]],
        ["mixamorigRightHandPinky1", [0, 0, 0]],
        ["mixamorigRightHandPinky2", [0, 0, 0]],
        ["mixamorigRightHandPinky3", [0, 0, 0]],
        ["mixamorigRightHandThumb1", [0, 0, Q * 0.4]],
        ["mixamorigRightHandThumb2", [E, 0, 0]],
      ]),
      {
        // Sweep the wrist in an arc
        bones: [
          ...RIGHT_ARM_SIGNING,
          ["mixamorigRightHand", [0, -Q * 0.8, 0]],
          ["mixamorigRightHandPinky1", [0, 0, 0]],
          ["mixamorigRightHandPinky2", [0, 0, 0]],
          ["mixamorigRightHandPinky3", [0, 0, 0]],
        ],
        holdMs: 200,
      },
    ],
  },
  K: {
    id: "K",
    isFingerspell: true,
    poses: [mkLetter([
      // Index + middle in V, thumb tucked between
      ["mixamorigRightHandIndex1", [0, 0, Q * 0.2]],
      ["mixamorigRightHandIndex2", [0, 0, 0]],
      ["mixamorigRightHandIndex3", [0, 0, 0]],
      ["mixamorigRightHandMiddle1", [0, 0, -Q * 0.2]],
      ["mixamorigRightHandMiddle2", [0, 0, 0]],
      ["mixamorigRightHandMiddle3", [0, 0, 0]],
      ["mixamorigRightHandRing1", [F, 0, 0]],
      ["mixamorigRightHandRing2", [H, 0, 0]],
      ["mixamorigRightHandRing3", [Q, 0, 0]],
      ["mixamorigRightHandPinky1", [F, 0, 0]],
      ["mixamorigRightHandPinky2", [H, 0, 0]],
      ["mixamorigRightHandPinky3", [Q, 0, 0]],
      ["mixamorigRightHandThumb1", [0, 0, -E]],
      ["mixamorigRightHandThumb2", [Q * 0.7, 0, 0]],
    ])],
  },
  L: {
    id: "L",
    isFingerspell: true,
    poses: [mkLetter([
      // L-shape: index up, thumb out
      ["mixamorigRightHandIndex1", [0, 0, 0]],
      ["mixamorigRightHandIndex2", [0, 0, 0]],
      ["mixamorigRightHandIndex3", [0, 0, 0]],
      ["mixamorigRightHandMiddle1", [F, 0, 0]],
      ["mixamorigRightHandMiddle2", [H, 0, 0]],
      ["mixamorigRightHandMiddle3", [Q, 0, 0]],
      ["mixamorigRightHandRing1", [F, 0, 0]],
      ["mixamorigRightHandRing2", [H, 0, 0]],
      ["mixamorigRightHandRing3", [Q, 0, 0]],
      ["mixamorigRightHandPinky1", [F, 0, 0]],
      ["mixamorigRightHandPinky2", [H, 0, 0]],
      ["mixamorigRightHandPinky3", [Q, 0, 0]],
      ["mixamorigRightHandThumb1", [0, 0, -H * 0.9]],
      ["mixamorigRightHandThumb2", [0, 0, 0]],
    ])],
  },
  M: {
    id: "M",
    isFingerspell: true,
    poses: [mkLetter([
      // Three fingers over thumb
      ["mixamorigRightHandIndex1", [Q, 0, 0]],
      ["mixamorigRightHandIndex2", [H, 0, 0]],
      ["mixamorigRightHandIndex3", [Q, 0, 0]],
      ["mixamorigRightHandMiddle1", [Q, 0, 0]],
      ["mixamorigRightHandMiddle2", [H, 0, 0]],
      ["mixamorigRightHandMiddle3", [Q, 0, 0]],
      ["mixamorigRightHandRing1", [Q, 0, 0]],
      ["mixamorigRightHandRing2", [H, 0, 0]],
      ["mixamorigRightHandRing3", [Q, 0, 0]],
      ["mixamorigRightHandPinky1", [F, 0, 0]],
      ["mixamorigRightHandPinky2", [H, 0, 0]],
      ["mixamorigRightHandPinky3", [Q, 0, 0]],
      ["mixamorigRightHandThumb1", [0, 0, Q * 0.6]],
      ["mixamorigRightHandThumb2", [E, 0, 0]],
    ])],
  },
  N: {
    id: "N",
    isFingerspell: true,
    poses: [mkLetter([
      // Two fingers over thumb
      ["mixamorigRightHandIndex1", [Q, 0, 0]],
      ["mixamorigRightHandIndex2", [H, 0, 0]],
      ["mixamorigRightHandIndex3", [Q, 0, 0]],
      ["mixamorigRightHandMiddle1", [Q, 0, 0]],
      ["mixamorigRightHandMiddle2", [H, 0, 0]],
      ["mixamorigRightHandMiddle3", [Q, 0, 0]],
      ["mixamorigRightHandRing1", [F, 0, 0]],
      ["mixamorigRightHandRing2", [H, 0, 0]],
      ["mixamorigRightHandRing3", [Q, 0, 0]],
      ["mixamorigRightHandPinky1", [F, 0, 0]],
      ["mixamorigRightHandPinky2", [H, 0, 0]],
      ["mixamorigRightHandPinky3", [Q, 0, 0]],
      ["mixamorigRightHandThumb1", [0, 0, Q * 0.5]],
      ["mixamorigRightHandThumb2", [E, 0, 0]],
    ])],
  },
  O: {
    id: "O",
    isFingerspell: true,
    poses: [mkLetter([
      // O shape — fingers curved to touch thumb
      ["mixamorigRightHandIndex1", [Q * 1.1, 0, 0]],
      ["mixamorigRightHandIndex2", [Q, 0, 0]],
      ["mixamorigRightHandIndex3", [E, 0, 0]],
      ["mixamorigRightHandMiddle1", [Q * 1.1, 0, 0]],
      ["mixamorigRightHandMiddle2", [Q, 0, 0]],
      ["mixamorigRightHandMiddle3", [E, 0, 0]],
      ["mixamorigRightHandRing1", [Q * 1.1, 0, 0]],
      ["mixamorigRightHandRing2", [Q, 0, 0]],
      ["mixamorigRightHandRing3", [E, 0, 0]],
      ["mixamorigRightHandPinky1", [Q * 1.1, 0, 0]],
      ["mixamorigRightHandPinky2", [Q, 0, 0]],
      ["mixamorigRightHandPinky3", [E, 0, 0]],
      ["mixamorigRightHandThumb1", [0, 0, -Q * 0.5]],
      ["mixamorigRightHandThumb2", [Q * 0.8, 0, 0]],
    ])],
  },
  P: {
    id: "P",
    isFingerspell: true,
    poses: [mkLetter([
      // Like K but pointing downward
      ["mixamorigRightHandIndex1", [0, 0, 0]],
      ["mixamorigRightHandIndex2", [0, 0, 0]],
      ["mixamorigRightHandIndex3", [0, 0, 0]],
      ["mixamorigRightHandMiddle1", [0, 0, 0]],
      ["mixamorigRightHandMiddle2", [0, 0, 0]],
      ["mixamorigRightHandMiddle3", [0, 0, 0]],
      ["mixamorigRightHandRing1", [F, 0, 0]],
      ["mixamorigRightHandRing2", [H, 0, 0]],
      ["mixamorigRightHandRing3", [Q, 0, 0]],
      ["mixamorigRightHandPinky1", [F, 0, 0]],
      ["mixamorigRightHandPinky2", [H, 0, 0]],
      ["mixamorigRightHandPinky3", [Q, 0, 0]],
      ["mixamorigRightHandThumb1", [0, 0, -Q]],
      ["mixamorigRightHandThumb2", [Q, 0, 0]],
    ], [
      ["mixamorigRightShoulder", [0, 0, Q * 0.3]],
      ["mixamorigRightArm", [0, 0, -H * 0.4]],
      ["mixamorigRightForeArm", [H * 1.1, 0, 0]],
      ["mixamorigRightHand", [H * 0.5, 0, 0]],
    ])],
  },
  Q: {
    id: "Q",
    isFingerspell: true,
    poses: [mkLetter([
      // Index + thumb pointing down
      ["mixamorigRightHandIndex1", [0, 0, 0]],
      ["mixamorigRightHandIndex2", [0, 0, 0]],
      ["mixamorigRightHandIndex3", [0, 0, 0]],
      ["mixamorigRightHandMiddle1", [F, 0, 0]],
      ["mixamorigRightHandMiddle2", [H, 0, 0]],
      ["mixamorigRightHandMiddle3", [Q, 0, 0]],
      ["mixamorigRightHandRing1", [F, 0, 0]],
      ["mixamorigRightHandRing2", [H, 0, 0]],
      ["mixamorigRightHandRing3", [Q, 0, 0]],
      ["mixamorigRightHandPinky1", [F, 0, 0]],
      ["mixamorigRightHandPinky2", [H, 0, 0]],
      ["mixamorigRightHandPinky3", [Q, 0, 0]],
      ["mixamorigRightHandThumb1", [0, 0, -H * 0.9]],
      ["mixamorigRightHandThumb2", [E, 0, 0]],
    ])],
  },
  R: {
    id: "R",
    isFingerspell: true,
    poses: [mkLetter([
      // Index + middle crossed
      ["mixamorigRightHandIndex1", [0, Q * 0.3, 0]],
      ["mixamorigRightHandIndex2", [0, 0, 0]],
      ["mixamorigRightHandIndex3", [0, 0, 0]],
      ["mixamorigRightHandMiddle1", [0, -Q * 0.3, 0]],
      ["mixamorigRightHandMiddle2", [0, 0, 0]],
      ["mixamorigRightHandMiddle3", [0, 0, 0]],
      ["mixamorigRightHandRing1", [F, 0, 0]],
      ["mixamorigRightHandRing2", [H, 0, 0]],
      ["mixamorigRightHandRing3", [Q, 0, 0]],
      ["mixamorigRightHandPinky1", [F, 0, 0]],
      ["mixamorigRightHandPinky2", [H, 0, 0]],
      ["mixamorigRightHandPinky3", [Q, 0, 0]],
      ["mixamorigRightHandThumb1", [0, 0, Q * 0.5]],
      ["mixamorigRightHandThumb2", [E, 0, 0]],
    ])],
  },
  S: {
    id: "S",
    isFingerspell: true,
    poses: [mkLetter([
      // Fist with thumb over fingers
      ...RIGHT_ALL_CURLED,
      ["mixamorigRightHandThumb1", [0, 0, -Q * 0.1]],
      ["mixamorigRightHandThumb2", [Q * 1.1, 0, 0]],
    ])],
  },
  T: {
    id: "T",
    isFingerspell: true,
    poses: [mkLetter([
      // Thumb between index and middle
      ["mixamorigRightHandIndex1", [Q * 1.2, 0, 0]],
      ["mixamorigRightHandIndex2", [H, 0, 0]],
      ["mixamorigRightHandIndex3", [Q, 0, 0]],
      ["mixamorigRightHandMiddle1", [F, 0, 0]],
      ["mixamorigRightHandMiddle2", [H, 0, 0]],
      ["mixamorigRightHandMiddle3", [Q, 0, 0]],
      ["mixamorigRightHandRing1", [F, 0, 0]],
      ["mixamorigRightHandRing2", [H, 0, 0]],
      ["mixamorigRightHandRing3", [Q, 0, 0]],
      ["mixamorigRightHandPinky1", [F, 0, 0]],
      ["mixamorigRightHandPinky2", [H, 0, 0]],
      ["mixamorigRightHandPinky3", [Q, 0, 0]],
      ["mixamorigRightHandThumb1", [0, 0, Q * 0.3]],
      ["mixamorigRightHandThumb2", [Q * 0.7, 0, 0]],
    ])],
  },
  U: {
    id: "U",
    isFingerspell: true,
    poses: [mkLetter([
      // Index + middle up, together
      ["mixamorigRightHandIndex1", [0, 0, 0]],
      ["mixamorigRightHandIndex2", [0, 0, 0]],
      ["mixamorigRightHandIndex3", [0, 0, 0]],
      ["mixamorigRightHandMiddle1", [0, 0, 0]],
      ["mixamorigRightHandMiddle2", [0, 0, 0]],
      ["mixamorigRightHandMiddle3", [0, 0, 0]],
      ["mixamorigRightHandRing1", [F, 0, 0]],
      ["mixamorigRightHandRing2", [H, 0, 0]],
      ["mixamorigRightHandRing3", [Q, 0, 0]],
      ["mixamorigRightHandPinky1", [F, 0, 0]],
      ["mixamorigRightHandPinky2", [H, 0, 0]],
      ["mixamorigRightHandPinky3", [Q, 0, 0]],
      ["mixamorigRightHandThumb1", [0, 0, Q * 0.6]],
      ["mixamorigRightHandThumb2", [E, 0, 0]],
    ])],
  },
  V: {
    id: "V",
    isFingerspell: true,
    poses: [mkLetter([
      // Victory / V-sign
      ["mixamorigRightHandIndex1", [0, 0, Q * 0.3]],
      ["mixamorigRightHandIndex2", [0, 0, 0]],
      ["mixamorigRightHandIndex3", [0, 0, 0]],
      ["mixamorigRightHandMiddle1", [0, 0, -Q * 0.3]],
      ["mixamorigRightHandMiddle2", [0, 0, 0]],
      ["mixamorigRightHandMiddle3", [0, 0, 0]],
      ["mixamorigRightHandRing1", [F, 0, 0]],
      ["mixamorigRightHandRing2", [H, 0, 0]],
      ["mixamorigRightHandRing3", [Q, 0, 0]],
      ["mixamorigRightHandPinky1", [F, 0, 0]],
      ["mixamorigRightHandPinky2", [H, 0, 0]],
      ["mixamorigRightHandPinky3", [Q, 0, 0]],
      ["mixamorigRightHandThumb1", [0, 0, Q * 0.5]],
      ["mixamorigRightHandThumb2", [E, 0, 0]],
    ])],
  },
  W: {
    id: "W",
    isFingerspell: true,
    poses: [mkLetter([
      // Three fingers spread (index, middle, ring)
      ["mixamorigRightHandIndex1", [0, 0, Q * 0.4]],
      ["mixamorigRightHandIndex2", [0, 0, 0]],
      ["mixamorigRightHandIndex3", [0, 0, 0]],
      ["mixamorigRightHandMiddle1", [0, 0, 0]],
      ["mixamorigRightHandMiddle2", [0, 0, 0]],
      ["mixamorigRightHandMiddle3", [0, 0, 0]],
      ["mixamorigRightHandRing1", [0, 0, -Q * 0.4]],
      ["mixamorigRightHandRing2", [0, 0, 0]],
      ["mixamorigRightHandRing3", [0, 0, 0]],
      ["mixamorigRightHandPinky1", [F, 0, 0]],
      ["mixamorigRightHandPinky2", [H, 0, 0]],
      ["mixamorigRightHandPinky3", [Q, 0, 0]],
      ["mixamorigRightHandThumb1", [0, 0, Q * 0.8]],
      ["mixamorigRightHandThumb2", [E, 0, 0]],
    ])],
  },
  X: {
    id: "X",
    isFingerspell: true,
    poses: [mkLetter([
      // Index finger hooked
      ["mixamorigRightHandIndex1", [Q * 0.8, 0, 0]],
      ["mixamorigRightHandIndex2", [H, 0, 0]],
      ["mixamorigRightHandIndex3", [Q * 0.5, 0, 0]],
      ["mixamorigRightHandMiddle1", [F, 0, 0]],
      ["mixamorigRightHandMiddle2", [H, 0, 0]],
      ["mixamorigRightHandMiddle3", [Q, 0, 0]],
      ["mixamorigRightHandRing1", [F, 0, 0]],
      ["mixamorigRightHandRing2", [H, 0, 0]],
      ["mixamorigRightHandRing3", [Q, 0, 0]],
      ["mixamorigRightHandPinky1", [F, 0, 0]],
      ["mixamorigRightHandPinky2", [H, 0, 0]],
      ["mixamorigRightHandPinky3", [Q, 0, 0]],
      ["mixamorigRightHandThumb1", [0, 0, Q * 0.4]],
      ["mixamorigRightHandThumb2", [E, 0, 0]],
    ])],
  },
  Y: {
    id: "Y",
    isFingerspell: true,
    poses: [mkLetter([
      // Thumb + pinky out (shaka / hang-loose)
      ["mixamorigRightHandIndex1", [F, 0, 0]],
      ["mixamorigRightHandIndex2", [H, 0, 0]],
      ["mixamorigRightHandIndex3", [Q, 0, 0]],
      ["mixamorigRightHandMiddle1", [F, 0, 0]],
      ["mixamorigRightHandMiddle2", [H, 0, 0]],
      ["mixamorigRightHandMiddle3", [Q, 0, 0]],
      ["mixamorigRightHandRing1", [F, 0, 0]],
      ["mixamorigRightHandRing2", [H, 0, 0]],
      ["mixamorigRightHandRing3", [Q, 0, 0]],
      ["mixamorigRightHandPinky1", [0, 0, 0]],
      ["mixamorigRightHandPinky2", [0, 0, 0]],
      ["mixamorigRightHandPinky3", [0, 0, 0]],
      ["mixamorigRightHandThumb1", [0, 0, -H * 0.8]],
      ["mixamorigRightHandThumb2", [0, 0, 0]],
    ])],
  },
  Z: {
    id: "Z",
    isFingerspell: true,
    poses: [
      // Z = D shape + trace a Z in the air (two poses)
      mkLetter([
        ["mixamorigRightHandIndex1", [0, 0, 0]],
        ["mixamorigRightHandIndex2", [0, 0, 0]],
        ["mixamorigRightHandIndex3", [0, 0, 0]],
        ["mixamorigRightHandMiddle1", [F, 0, 0]],
        ["mixamorigRightHandMiddle2", [H, 0, 0]],
        ["mixamorigRightHandMiddle3", [Q, 0, 0]],
        ["mixamorigRightHandRing1", [F, 0, 0]],
        ["mixamorigRightHandRing2", [H, 0, 0]],
        ["mixamorigRightHandRing3", [Q, 0, 0]],
        ["mixamorigRightHandPinky1", [F, 0, 0]],
        ["mixamorigRightHandPinky2", [H, 0, 0]],
        ["mixamorigRightHandPinky3", [Q, 0, 0]],
        ["mixamorigRightHandThumb1", [0, 0, Q * 0.4]],
        ["mixamorigRightHandThumb2", [Q, 0, 0]],
      ]),
      {
        bones: [
          ["mixamorigRightShoulder", [0, 0, Q * 0.5]],
          ["mixamorigRightArm", [0, 0, -H * 0.6]],
          ["mixamorigRightForeArm", [H * 0.6, 0, 0]],
          ["mixamorigRightHand", [0, -Q * 0.4, 0]],
          ["mixamorigRightHandIndex1", [0, 0, 0]],
          ["mixamorigRightHandIndex2", [0, 0, 0]],
          ["mixamorigRightHandIndex3", [0, 0, 0]],
        ],
        holdMs: 200,
      },
    ],
  },
};

// ── Word-level ASL Signs ──────────────────────────────────────────────────
export const ASL_WORDS: Record<string, Sign> = {
  HELLO: {
    id: "HELLO",
    poses: [
      {
        // Flat hand at temple
        bones: [
          ["mixamorigRightShoulder", [0, 0, Q * 0.5]],
          ["mixamorigRightArm", [-Q * 0.3, 0, -H * 0.7]],
          ["mixamorigRightForeArm", [H * 0.5, 0, 0]],
          ["mixamorigRightHand", [0, Q * 0.3, 0]],
          ...RIGHT_ALL_EXTENDED,
        ],
        holdMs: 300,
        label: "Hand at temple",
      },
      {
        // Sweep away from temple (wave-out)
        bones: [
          ["mixamorigRightShoulder", [0, 0, Q * 0.5]],
          ["mixamorigRightArm", [-Q * 0.2, Q * 0.5, -H * 0.5]],
          ["mixamorigRightForeArm", [H * 0.5, 0, 0]],
          ["mixamorigRightHand", [0, -Q * 0.3, 0]],
          ...RIGHT_ALL_EXTENDED,
        ],
        holdMs: 400,
        label: "Sweep outward",
      },
    ],
  },

  THANK_YOU: {
    id: "THANK_YOU",
    poses: [
      {
        // Flat hand starts at chin
        bones: [
          ["mixamorigRightShoulder", [0, 0, Q * 0.3]],
          ["mixamorigRightArm", [-Q * 0.5, 0, -H * 0.5]],
          ["mixamorigRightForeArm", [H, 0, 0]],
          ["mixamorigRightHand", [0, 0, 0]],
          ...RIGHT_ALL_EXTENDED,
        ],
        holdMs: 200,
        label: "At chin",
      },
      {
        // Move forward and down
        bones: [
          ["mixamorigRightShoulder", [0, 0, Q * 0.3]],
          ["mixamorigRightArm", [-Q * 0.2, 0, -H * 0.4]],
          ["mixamorigRightForeArm", [H * 0.6, 0, 0]],
          ["mixamorigRightHand", [Q * 0.3, 0, 0]],
          ...RIGHT_ALL_EXTENDED,
        ],
        holdMs: 500,
        label: "Forward",
      },
    ],
  },

  PLEASE: {
    id: "PLEASE",
    poses: [
      {
        // Flat hand on chest, circular motion
        bones: [
          ["mixamorigRightShoulder", [0, 0, Q * 0.2]],
          ["mixamorigRightArm", [-Q * 0.3, 0, -H * 0.3]],
          ["mixamorigRightForeArm", [H * 1.1, 0, 0]],
          ["mixamorigRightHand", [0, 0, 0]],
          ...RIGHT_ALL_EXTENDED,
        ],
        holdMs: 200,
        label: "Hand on chest",
      },
      {
        // Circular motion on chest (phase 2)
        bones: [
          ["mixamorigRightShoulder", [0, 0, Q * 0.2]],
          ["mixamorigRightArm", [-Q * 0.3, Q * 0.3, -H * 0.3]],
          ["mixamorigRightForeArm", [H, 0, 0]],
          ["mixamorigRightHand", [Q * 0.2, 0, 0]],
          ...RIGHT_ALL_EXTENDED,
        ],
        holdMs: 400,
        label: "Circular",
      },
    ],
  },

  SORRY: {
    id: "SORRY",
    poses: [
      {
        // Fist rubbing on chest in circles
        bones: [
          ["mixamorigRightShoulder", [0, 0, Q * 0.2]],
          ["mixamorigRightArm", [-Q * 0.3, 0, -H * 0.3]],
          ["mixamorigRightForeArm", [H, 0, 0]],
          ["mixamorigRightHand", [0, 0, 0]],
          ...RIGHT_ALL_CURLED,
        ],
        holdMs: 300,
      },
      {
        bones: [
          ["mixamorigRightShoulder", [0, 0, Q * 0.2]],
          ["mixamorigRightArm", [-Q * 0.3, Q * 0.4, -H * 0.3]],
          ["mixamorigRightForeArm", [H * 0.9, 0, 0]],
          ["mixamorigRightHand", [0, 0, 0]],
          ...RIGHT_ALL_CURLED,
        ],
        holdMs: 400,
      },
    ],
  },

  YES: {
    id: "YES",
    poses: [
      {
        // Fist nodding (Y hand shape + up-down motion)
        bones: [
          ...RIGHT_ARM_SIGNING,
          ...RIGHT_ALL_CURLED,
          ["mixamorigRightHand", [-Q * 0.4, 0, 0]],
        ],
        holdMs: 200,
      },
      {
        bones: [
          ...RIGHT_ARM_SIGNING,
          ...RIGHT_ALL_CURLED,
          ["mixamorigRightHand", [Q * 0.2, 0, 0]],
        ],
        holdMs: 300,
      },
    ],
  },

  NO: {
    id: "NO",
    poses: [
      {
        // Index + middle snap shut to thumb (twice)
        bones: [
          ...RIGHT_ARM_SIGNING,
          ["mixamorigRightHandIndex1", [0, 0, 0]],
          ["mixamorigRightHandIndex2", [0, 0, 0]],
          ["mixamorigRightHandIndex3", [0, 0, 0]],
          ["mixamorigRightHandMiddle1", [0, 0, 0]],
          ["mixamorigRightHandMiddle2", [0, 0, 0]],
          ["mixamorigRightHandMiddle3", [0, 0, 0]],
          ["mixamorigRightHandRing1", [F, 0, 0]],
          ["mixamorigRightHandRing2", [H, 0, 0]],
          ["mixamorigRightHandRing3", [Q, 0, 0]],
          ["mixamorigRightHandPinky1", [F, 0, 0]],
          ["mixamorigRightHandPinky2", [H, 0, 0]],
          ["mixamorigRightHandPinky3", [Q, 0, 0]],
          ["mixamorigRightHandThumb1", [0, 0, -E]],
          ["mixamorigRightHandThumb2", [0, 0, 0]],
        ],
        holdMs: 200,
      },
      {
        bones: [
          ...RIGHT_ARM_SIGNING,
          ["mixamorigRightHandIndex1", [Q, 0, 0]],
          ["mixamorigRightHandIndex2", [H, 0, 0]],
          ["mixamorigRightHandIndex3", [Q, 0, 0]],
          ["mixamorigRightHandMiddle1", [Q, 0, 0]],
          ["mixamorigRightHandMiddle2", [H, 0, 0]],
          ["mixamorigRightHandMiddle3", [Q, 0, 0]],
          ["mixamorigRightHandRing1", [F, 0, 0]],
          ["mixamorigRightHandRing2", [H, 0, 0]],
          ["mixamorigRightHandRing3", [Q, 0, 0]],
          ["mixamorigRightHandPinky1", [F, 0, 0]],
          ["mixamorigRightHandPinky2", [H, 0, 0]],
          ["mixamorigRightHandPinky3", [Q, 0, 0]],
          ["mixamorigRightHandThumb1", [0, 0, Q * 0.3]],
          ["mixamorigRightHandThumb2", [Q * 0.5, 0, 0]],
        ],
        holdMs: 300,
      },
    ],
  },

  HELP: {
    id: "HELP",
    poses: [
      {
        // Fist (A-hand) on top of flat left hand — lift upward
        bones: [
          ["mixamorigRightShoulder", [0, 0, Q * 0.3]],
          ["mixamorigRightArm", [0, 0, -H * 0.4]],
          ["mixamorigRightForeArm", [H * 0.7, 0, 0]],
          ["mixamorigRightHand", [0, 0, 0]],
          ...RIGHT_ALL_CURLED,
          ["mixamorigRightHandThumb1", [0, 0, -Q * 0.5]],
        ],
        holdMs: 200,
        label: "A-hand resting",
      },
      {
        bones: [
          ["mixamorigRightShoulder", [0, 0, Q * 0.3]],
          ["mixamorigRightArm", [-Q * 0.4, 0, -H * 0.5]],
          ["mixamorigRightForeArm", [H * 0.5, 0, 0]],
          ["mixamorigRightHand", [0, 0, 0]],
          ...RIGHT_ALL_CURLED,
          ["mixamorigRightHandThumb1", [0, 0, -Q * 0.5]],
        ],
        holdMs: 500,
        label: "Lift upward",
      },
    ],
  },

  UNDERSTAND: {
    id: "UNDERSTAND",
    poses: [
      {
        // Index finger at temple, flick open
        bones: [
          ["mixamorigRightShoulder", [0, 0, Q * 0.5]],
          ["mixamorigRightArm", [-Q * 0.5, 0, -H * 0.7]],
          ["mixamorigRightForeArm", [H * 0.6, 0, 0]],
          ...RIGHT_ALL_CURLED,
          ["mixamorigRightHandIndex1", [0, 0, 0]],
          ["mixamorigRightHandIndex2", [Q, 0, 0]],
          ["mixamorigRightHandIndex3", [Q, 0, 0]],
        ],
        holdMs: 200,
        label: "At temple",
      },
      {
        bones: [
          ["mixamorigRightShoulder", [0, 0, Q * 0.5]],
          ["mixamorigRightArm", [-Q * 0.5, 0, -H * 0.7]],
          ["mixamorigRightForeArm", [H * 0.6, 0, 0]],
          ...RIGHT_ALL_CURLED,
          ["mixamorigRightHandIndex1", [0, 0, 0]],
          ["mixamorigRightHandIndex2", [0, 0, 0]],
          ["mixamorigRightHandIndex3", [0, 0, 0]],
        ],
        holdMs: 400,
        label: "Flick up",
      },
    ],
  },

  WHERE: {
    id: "WHERE",
    poses: [
      {
        // Index pointing up, wrist waggle
        bones: [
          ...RIGHT_ARM_SIGNING,
          ["mixamorigRightHandIndex1", [0, 0, 0]],
          ["mixamorigRightHandIndex2", [0, 0, 0]],
          ["mixamorigRightHandIndex3", [0, 0, 0]],
          ["mixamorigRightHandMiddle1", [F, 0, 0]],
          ["mixamorigRightHandMiddle2", [H, 0, 0]],
          ["mixamorigRightHandMiddle3", [Q, 0, 0]],
          ["mixamorigRightHandRing1", [F, 0, 0]],
          ["mixamorigRightHandRing2", [H, 0, 0]],
          ["mixamorigRightHandRing3", [Q, 0, 0]],
          ["mixamorigRightHandPinky1", [F, 0, 0]],
          ["mixamorigRightHandPinky2", [H, 0, 0]],
          ["mixamorigRightHandPinky3", [Q, 0, 0]],
          ["mixamorigRightHandThumb1", [0, 0, Q * 0.6]],
          ["mixamorigRightHand", [0, Q * 0.5, 0]],
        ],
        holdMs: 250,
      },
      {
        bones: [
          ...RIGHT_ARM_SIGNING,
          ["mixamorigRightHandIndex1", [0, 0, 0]],
          ["mixamorigRightHandIndex2", [0, 0, 0]],
          ["mixamorigRightHandIndex3", [0, 0, 0]],
          ["mixamorigRightHandMiddle1", [F, 0, 0]],
          ["mixamorigRightHandRing1", [F, 0, 0]],
          ["mixamorigRightHandPinky1", [F, 0, 0]],
          ["mixamorigRightHandThumb1", [0, 0, Q * 0.6]],
          ["mixamorigRightHand", [0, -Q * 0.5, 0]],
        ],
        holdMs: 350,
      },
    ],
  },

  NICE_TO_MEET_YOU: {
    id: "NICE_TO_MEET_YOU",
    poses: [
      {
        // NICE: Flat hand slides off non-dom palm
        bones: [
          ["mixamorigRightShoulder", [0, 0, Q * 0.2]],
          ["mixamorigRightArm", [-E, 0, -H * 0.4]],
          ["mixamorigRightForeArm", [H, 0, 0]],
          ["mixamorigRightHand", [Q * 0.3, 0, 0]],
          ...RIGHT_ALL_EXTENDED,
        ],
        holdMs: 400,
        label: "NICE",
      },
      {
        // MEET: Both index fingers come together
        bones: [
          ...RIGHT_ARM_SIGNING,
          ["mixamorigRightHandIndex1", [0, 0, 0]],
          ["mixamorigRightHandIndex2", [0, 0, 0]],
          ["mixamorigRightHandIndex3", [0, 0, 0]],
          ["mixamorigRightHandMiddle1", [F, 0, 0]],
          ["mixamorigRightHandRing1", [F, 0, 0]],
          ["mixamorigRightHandPinky1", [F, 0, 0]],
          ["mixamorigRightHandThumb1", [0, 0, Q * 0.5]],
        ],
        holdMs: 400,
        label: "MEET",
      },
    ],
  },

  // Rest pose — used between signs
  REST: {
    id: "REST",
    poses: [
      {
        bones: [
          ...RIGHT_ARM_NEUTRAL,
          ...RIGHT_ALL_EXTENDED,
        ],
        holdMs: 200,
      },
    ],
  },
};

// ── Helper: text → sign sequence ────────────────────────────────────────────

export function textToSignSequence(text: string): Sign[] {
  const words = text.toUpperCase().replace(/[^A-Z\s]/g, "").split(/\s+/).filter(Boolean);
  const sequence: Sign[] = [];

  for (const word of words) {
    // Check if we have a whole-word sign first
    const wordSign = ASL_WORDS[word] ?? ASL_WORDS[word.replace(/_/g, "")] ?? null;
    if (wordSign) {
      sequence.push(wordSign);
    } else {
      // Fingerspell the word letter by letter
      for (const letter of word) {
        const letterSign = ASL_LETTERS[letter];
        if (letterSign) sequence.push(letterSign);
      }
    }
    // Brief rest between words
    sequence.push(ASL_WORDS.REST);
  }

  return sequence;
}
