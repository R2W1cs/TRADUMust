/**
 * SignBridge — ASL Pose Library
 *
 * Pre-computed bone rotations (Euler angles, radians) for each ASL sign.
 * Convention: rotations are applied in THREE.Euler XYZ order to local bone space.
 *
 * Bone name aliases are provided for both Ready Player Me (RPM) and Mixamo rigs.
 * The avatar3d.js controller tries aliases in order until it finds a match.
 *
 * TUNING: Load the extension, open DevTools in the avatar iframe, and read
 * the logged bone names. Adjust values here until poses look correct.
 * Each ±0.1 rad ≈ ±5.7°. Typical full-arm raise needs ~1.2–1.5 rad.
 */

const D = Math.PI / 180; // degrees → radians helper

// ── Bone name aliases (tried in order, first match wins) ─────────────────────
// Keys here map to what we call "roles" in the pose definitions.
export const BONE_ALIASES = {
  // Right arm chain — exact names first, then common fallbacks
  RightUpperArm:  ['RightArm_035',      'RightArm',        'mixamorigRightArm',     'upperarm_r', 'UpperArm_R'],
  RightForeArm:   ['RightForeArm_036',  'RightForeArm',    'mixamorigRightForeArm', 'lowerarm_r', 'ForeArm_R'],
  RightHand:      ['RightHand_037',     'RightHand',       'mixamorigRightHand',    'hand_r',     'Hand_R'],
  // Left arm chain
  LeftUpperArm:   ['LeftArm_011',       'LeftArm',         'mixamorigLeftArm',      'upperarm_l', 'UpperArm_L'],
  LeftForeArm:    ['LeftForeArm_012',   'LeftForeArm',     'mixamorigLeftForeArm',  'lowerarm_l', 'ForeArm_L'],
  LeftHand:       ['LeftHand_013',      'LeftHand',        'mixamorigLeftHand',     'hand_l',     'Hand_L'],
  // Head / neck / spine
  Head:           ['Head_06',           'Head',            'mixamorigHead',         'head'],
  Neck:           ['Neck_05',           'Neck',            'mixamorigNeck',         'neck'],
  Spine:          ['Spine_02',          'Spine',           'mixamorigSpine',        'spine'],
  Chest:          ['Spine2_04',         'Spine2',          'mixamorigSpine2',       'spine2', 'Chest'],
  // Right hand fingers (for fingerspelling)
  RightIndex1:    ['RightHandIndex1_042',  'RightHandIndex1',  'mixamorigRightHandIndex1'],
  RightIndex2:    ['RightHandIndex2_043',  'RightHandIndex2',  'mixamorigRightHandIndex2'],
  RightIndex3:    ['RightHandIndex3_044',  'RightHandIndex3',  'mixamorigRightHandIndex3'],
  RightMiddle1:   ['RightHandMiddle1_046', 'RightHandMiddle1', 'mixamorigRightHandMiddle1'],
  RightMiddle2:   ['RightHandMiddle2_047', 'RightHandMiddle2', 'mixamorigRightHandMiddle2'],
  RightRing1:     ['RightHandRing1_050',   'RightHandRing1',   'mixamorigRightHandRing1'],
  RightPinky1:    ['RightHandPinky1_054',  'RightHandPinky1',  'mixamorigRightHandPinky1'],
  RightThumb1:    ['RightHandThumb1_038',  'RightHandThumb1',  'mixamorigRightHandThumb1'],
  RightThumb2:    ['RightHandThumb2_039',  'RightHandThumb2',  'mixamorigRightHandThumb2'],
  // Left hand fingers
  LeftIndex1:     ['LeftHandIndex1_018',   'LeftHandIndex1',   'mixamorigLeftHandIndex1'],
  LeftMiddle1:    ['LeftHandMiddle1_022',  'LeftHandMiddle1',  'mixamorigLeftHandMiddle1'],
  LeftThumb1:     ['LeftHandThumb1_014',   'LeftHandThumb1',   'mixamorigLeftHandThumb1'],
};

// ── Motion type definitions ───────────────────────────────────────────────────
// Used by avatar3d.js animation loop to layer procedural movement on top of poses
export const MOTION_CONFIGS = {
  wave:       { freq: 8,  amp: 0.45, bone: 'RightHand',    axis: 'y'  },
  wave_l:     { freq: 8,  amp: 0.45, bone: 'LeftHand',     axis: 'y'  },
  nod:        { freq: 4,  amp: 0.15, bone: 'Head',          axis: 'x'  },
  shake_head: { freq: 6,  amp: 0.20, bone: 'Head',          axis: 'y'  },
  circle_r:   { freq: 3,  amp: 0.30, bone: 'RightHand',    axis: 'xz' },
  circle_l:   { freq: 3,  amp: 0.30, bone: 'LeftHand',     axis: 'xz' },
  lift_r:     { freq: 2,  amp: 0.20, bone: 'RightForeArm', axis: 'x'  },
  push_r:     { freq: 3,  amp: 0.18, bone: 'RightForeArm', axis: 'z'  },
  pull_r:     { freq: 3,  amp: 0.18, bone: 'RightForeArm', axis: 'z'  },
  push_l:     { freq: 3,  amp: 0.18, bone: 'LeftForeArm',  axis: 'z'  },
  tap_r:      { freq: 8,  amp: 0.12, bone: 'RightHand',    axis: 'x'  },
  tap_l:      { freq: 8,  amp: 0.12, bone: 'LeftHand',     axis: 'x'  },
  flick_r:    { freq: 6,  amp: 0.22, bone: 'RightHand',    axis: 'x'  },
  wiggle_r:   { freq: 10, amp: 0.18, bone: 'RightHand',    axis: 'y'  },
  roll_r:     { freq: 3,  amp: 0.30, bone: 'RightHand',    axis: 'xz' },
};

// Maps sign-mapper CSS motion class names → MOTION_CONFIGS keys
export const MOTION_CSS_MAP = {
  'motion-wave':   'wave',
  'motion-circle': 'circle_r',
  'motion-roll':   'roll_r',
  'motion-push':   'push_r',
  'motion-pull':   'pull_r',
  'motion-nod':    'nod',
  'motion-shake':  'shake_head',
  'motion-lift':   'lift_r',
  'motion-flick':  'flick_r',
  'motion-tap':    'tap_r',
  'motion-wiggle': 'wiggle_r',
  'motion-flip':   'circle_r',
};

// ── ASL Pose Definitions ──────────────────────────────────────────────────────
// Each entry: { [role]: { x, y, z } in radians, motion?: string }
// Roles must match keys in BONE_ALIASES above.
//
// Reference frame (standard humanoid T-pose):
// Bone axis convention for this rig (facing +Z, Mixamo-style _NNN suffix):
//   RightUpperArm z NEGATIVE = arm raises up from T-pose
//   RightUpperArm x POSITIVE = arm swings forward toward viewer
//   RightForeArm  x POSITIVE = elbow bends (forearm folds up)
//   Finger        z POSITIVE = finger curls into fist (Mixamo convention)

const OPEN       = { x: 0, y: 0, z: 0    };   // finger fully extended
const CURL       = { x: 0, y: 0, z: 1.4  };   // finger fully curled (fist)
const SEMI       = { x: 0, y: 0, z: 0.7  };   // finger half-curled
const THUMB_CURL = { x: 0, y: 0, z: 0.6  };   // thumb curled in

export const POSES = {

  // ── REST ──────────────────────────────────────────────────────────────────
  REST: {
    RightUpperArm: { x: 0.35, y:  0.3,  z:  0.75 },
    RightForeArm:  { x: 1.1,  y:  0,    z:  0    },
    RightHand:     { x: 0,    y:  0,    z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: OPEN, RightPinky1: OPEN, RightThumb1: OPEN,
    LeftUpperArm:  { x: 0.35, y: -0.3,  z: -0.75 },
    LeftForeArm:   { x: 1.1,  y:  0,    z:  0    },
    LeftHand:      { x: 0,    y:  0,    z:  0    },
    LeftIndex1: OPEN, LeftMiddle1: OPEN, LeftThumb1: OPEN,
    Head:          { x: 0,    y: 0,     z:  0    },
  },

  // ── HELLO — flat open hand salute at forehead, wave ───────────────────────
  HELLO: {
    RightUpperArm: { x: 0.5,  y: -0.2,  z: -1.0  },
    RightForeArm:  { x: 1.2,  y:  0,    z:  0    },
    RightHand:     { x:-0.2,  y:  0.3,  z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: OPEN, RightPinky1: OPEN, RightThumb1: OPEN,
    LeftUpperArm:  { x: 0,    y: 0,     z: -0.15 },
    LeftForeArm:   { x: 0.1,  y: 0,     z:  0    },
    Head:          { x: 0.08, y: 0,     z:  0    },
    motion: 'wave',
  },

  HI: {
    RightUpperArm: { x: 0.5,  y: -0.2,  z: -1.0  },
    RightForeArm:  { x: 1.2,  y:  0,    z:  0    },
    RightHand:     { x:-0.2,  y:  0.3,  z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: OPEN, RightPinky1: OPEN, RightThumb1: OPEN,
    Head:          { x: 0.08, y: 0,     z:  0    },
    motion: 'wave',
  },

  // ── THANK YOU — flat hand sweeps from chin forward ───────────────────────
  THANK_YOU: {
    RightUpperArm: { x: 0.8,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.4,  y:  0,    z:  0    },
    RightHand:     { x:-0.3,  y:  0,    z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: OPEN, RightPinky1: OPEN, RightThumb1: OPEN,
    Head:          { x: 0.1,  y: 0,     z:  0    },
  },

  THANKS: {
    RightUpperArm: { x: 0.8,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.4,  y:  0,    z:  0    },
    RightHand:     { x:-0.3,  y:  0,    z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: OPEN, RightPinky1: OPEN,
    Head:          { x: 0.1,  y: 0,     z:  0    },
  },

  // ── PLEASE — open palm circles on chest ──────────────────────────────────
  PLEASE: {
    RightUpperArm: { x: 0.5,  y:  0.3,  z: -0.3  },
    RightForeArm:  { x: 1.3,  y:  0.4,  z:  0    },
    RightHand:     { x: 0.2,  y:  0,    z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: OPEN, RightPinky1: OPEN, RightThumb1: OPEN,
    Head:          { x: 0,    y: 0,     z:  0    },
    motion: 'circle_r',
  },

  // ── YES — fist nods up and down ───────────────────────────────────────────
  YES: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.4  },
    RightForeArm:  { x: 1.5,  y:  0,    z:  0    },
    RightIndex1: CURL, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL, RightThumb1: THUMB_CURL,
    Head:          { x: 0.15, y: 0,     z:  0    },
    motion: 'nod',
  },

  YEAH: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.4  },
    RightForeArm:  { x: 1.5,  y:  0,    z:  0    },
    RightIndex1: CURL, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL,
    Head:          { x: 0.15, y: 0,     z:  0    },
    motion: 'nod',
  },

  // ── NO — index + middle snap, head shakes ─────────────────────────────────
  NO: {
    RightUpperArm: { x: 0.5,  y: -0.3,  z: -0.5  },
    RightForeArm:  { x: 1.4,  y:  0,    z:  0    },
    RightHand:     { x: 0,    y:  0.4,  z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: CURL, RightPinky1: CURL, RightThumb1: THUMB_CURL,
    Head:          { x: 0,    y: 0,     z:  0    },
    motion: 'shake_head',
  },

  // ── SORRY — fist circles on chest ────────────────────────────────────────
  SORRY: {
    RightUpperArm: { x: 0.4,  y:  0.3,  z: -0.25 },
    RightForeArm:  { x: 1.2,  y:  0.3,  z:  0    },
    RightIndex1: CURL, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL, RightThumb1: THUMB_CURL,
    Head:          { x:-0.08, y: 0,     z:  0    },
    motion: 'circle_r',
  },

  EXCUSE_ME: {
    RightUpperArm: { x: 0.4,  y:  0.3,  z: -0.25 },
    RightForeArm:  { x: 1.2,  y:  0.3,  z:  0    },
    RightIndex1: CURL, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL,
    Head:          { x:-0.08, y: 0,     z:  0    },
    motion: 'circle_r',
  },

  // ── HELP — thumb-up fist lifts on other palm ──────────────────────────────
  HELP: {
    RightUpperArm: { x: 0.3,  y:  0.1,  z: -0.2  },
    RightForeArm:  { x: 0.9,  y:  0.1,  z:  0    },
    RightIndex1: CURL, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL, RightThumb1: OPEN,
    LeftUpperArm:  { x: 0.3,  y: -0.1,  z:  0.2  },
    LeftForeArm:   { x: 0.9,  y: -0.1,  z:  0    },
    LeftIndex1: OPEN, LeftMiddle1: OPEN, LeftThumb1: OPEN,
    Head:          { x: 0,    y: 0,     z:  0    },
    motion: 'lift_r',
  },

  // ── GOODBYE — open hand wave at side ─────────────────────────────────────
  GOODBYE: {
    RightUpperArm: { x: 0,    y: -0.4,  z: -0.9  },
    RightForeArm:  { x: 0.3,  y:  0,    z:  0    },
    RightHand:     { x: 0,    y:  0.3,  z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: OPEN, RightPinky1: OPEN, RightThumb1: OPEN,
    Head:          { x: 0,    y:-0.15,  z:  0    },
    motion: 'wave',
  },

  SEE_YOU_LATER: {
    RightUpperArm: { x: 0,    y: -0.4,  z: -0.9  },
    RightForeArm:  { x: 0.3,  y:  0,    z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: OPEN, RightPinky1: OPEN,
    Head:          { x: 0,    y:-0.15,  z:  0    },
    motion: 'wave',
  },

  NICE_TO_MEET_YOU: {
    RightUpperArm: { x: 0.5,  y: -0.4,  z: -0.4  },
    RightForeArm:  { x: 1.0,  y:  0,    z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: OPEN, RightPinky1: OPEN,
    LeftUpperArm:  { x: 0.5,  y:  0.4,  z:  0.4  },
    LeftForeArm:   { x: 1.0,  y:  0,    z:  0    },
    LeftIndex1: OPEN, LeftMiddle1: OPEN,
    Head:          { x: 0.08, y: 0,     z:  0    },
  },

  // ── GOOD — flat hand from chin forward ───────────────────────────────────
  GOOD: {
    RightUpperArm: { x: 0.8,  y: -0.15, z: -0.4  },
    RightForeArm:  { x: 1.3,  y:  0,    z:  0    },
    RightHand:     { x:-0.25, y:  0,    z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: OPEN, RightPinky1: OPEN,
    LeftUpperArm:  { x: 0.15, y: 0,     z:  0.1  },
    LeftForeArm:   { x: 0.3,  y: 0,     z:  0    },
    Head:          { x: 0.08, y: 0,     z:  0    },
  },

  GOOD_MORNING: {
    RightUpperArm: { x: 0.8,  y: -0.15, z: -0.5  },
    RightForeArm:  { x: 1.4,  y:  0,    z:  0    },
    RightHand:     { x:-0.3,  y:  0,    z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: OPEN, RightPinky1: OPEN,
    Head:          { x: 0.08, y: 0,     z:  0    },
  },

  // ── LOVE — arms crossed on chest ─────────────────────────────────────────
  LOVE: {
    RightUpperArm: { x: 0.4,  y:  0.7,  z:  0.1  },
    RightForeArm:  { x: 1.5,  y:  0.7,  z:  0    },
    RightIndex1: CURL, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL,
    LeftUpperArm:  { x: 0.4,  y: -0.7,  z: -0.1  },
    LeftForeArm:   { x: 1.5,  y: -0.7,  z:  0    },
    LeftIndex1: CURL, LeftMiddle1: CURL, LeftThumb1: CURL,
    Head:          { x: 0.15, y: 0,     z:  0    },
  },

  // ── WHERE — index wagging, head turns ────────────────────────────────────
  WHERE: {
    RightUpperArm: { x: 0.5,  y: -0.4,  z: -0.5  },
    RightForeArm:  { x: 1.3,  y:  0,    z:  0    },
    RightHand:     { x: 0,    y:  0.4,  z:-0.15  },
    RightIndex1: OPEN, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL, RightThumb1: THUMB_CURL,
    Head:          { x: 0,    y: 0.15,  z:  0    },
    motion: 'shake_head',
  },

  // ── UNDERSTAND — index flicks at temple ──────────────────────────────────
  UNDERSTAND: {
    RightUpperArm: { x: 0.7,  y: -0.3,  z: -0.6  },
    RightForeArm:  { x: 1.5,  y:  0,    z:  0    },
    RightHand:     { x: 0,    y:  0,    z:  0.15 },
    RightIndex1: OPEN, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL, RightThumb1: THUMB_CURL,
    Head:          { x: 0.08, y: 0,     z:  0    },
  },

  WELCOME: {
    RightUpperArm: { x: 0.3,  y: -0.25, z: -0.7  },
    RightForeArm:  { x: 0.2,  y:  0,    z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: OPEN, RightPinky1: OPEN,
    LeftUpperArm:  { x: 0.3,  y:  0.25, z:  0.7  },
    LeftForeArm:   { x: 0.2,  y:  0,    z:  0    },
    LeftIndex1: OPEN, LeftMiddle1: OPEN, LeftThumb1: OPEN,
  },

  ME: {
    RightUpperArm: { x: 0.3,  y:  0.15, z: -0.2  },
    RightForeArm:  { x: 0.5,  y:  0.15, z:  0    },
    RightIndex1: OPEN, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL,
  },

  I: {
    RightUpperArm: { x: 0.3,  y:  0.15, z: -0.2  },
    RightForeArm:  { x: 0.5,  y:  0.15, z:  0    },
    RightIndex1: OPEN, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL,
  },

  YOU: {
    RightUpperArm: { x: 0.6,  y: -0.5,  z: -0.2  },
    RightForeArm:  { x: 0.3,  y: -0.35, z:  0    },
    RightIndex1: OPEN, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL,
    Head:          { x: 0,    y:-0.15,  z:  0    },
  },

  WHAT: {
    RightUpperArm: { x: 0.4,  y: -0.2,  z: -0.4  },
    RightForeArm:  { x: 0.8,  y:  0,    z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: OPEN, RightPinky1: OPEN,
    LeftUpperArm:  { x: 0.4,  y:  0.2,  z:  0.4  },
    LeftForeArm:   { x: 0.8,  y:  0,    z:  0    },
    LeftIndex1: OPEN, LeftMiddle1: OPEN,
    motion: 'shake_head',
  },

  WHO: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.3  },
    RightForeArm:  { x: 1.4,  y:  0,    z:  0    },
    RightIndex1: OPEN, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL,
    motion: 'circle_r',
  },

  WHY: {
    RightUpperArm: { x: 0.7,  y: -0.3,  z: -0.5  },
    RightForeArm:  { x: 1.5,  y:  0,    z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: CURL, RightPinky1: CURL, RightThumb1: SEMI,
    Head:          { x:-0.08, y:-0.12,  z:  0    },
  },

  HOW: {
    RightUpperArm: { x: 0.4,  y: -0.3,  z: -0.3  },
    RightForeArm:  { x: 0.7,  y:  0,    z:  0    },
    LeftUpperArm:  { x: 0.4,  y:  0.3,  z:  0.3  },
    LeftForeArm:   { x: 0.7,  y:  0,    z:  0    },
    Head:          { x: 0.08, y: 0,     z:  0    },
  },

  WHEN: {
    RightUpperArm: { x: 0.5,  y: -0.25, z: -0.4  },
    RightForeArm:  { x: 1.1,  y:  0,    z:  0    },
    RightIndex1: OPEN, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL,
    Head:          { x: 0,    y:-0.1,   z:  0    },
    motion: 'circle_r',
  },

  WANT: {
    RightUpperArm: { x: 0.3,  y: -0.1,  z: -0.25 },
    RightForeArm:  { x: 0.6,  y:  0,    z:  0    },
    RightIndex1: SEMI, RightMiddle1: SEMI, RightRing1: SEMI, RightPinky1: SEMI,
    LeftUpperArm:  { x: 0.3,  y:  0.1,  z:  0.25 },
    LeftForeArm:   { x: 0.6,  y:  0,    z:  0    },
    LeftIndex1: SEMI, LeftMiddle1: SEMI,
    Head:          { x: 0.08, y: 0,     z:  0    },
  },

  NEED: {
    RightUpperArm: { x: 0.5,  y: -0.1,  z: -0.25 },
    RightForeArm:  { x: 1.0,  y:  0,    z:  0    },
    RightIndex1: OPEN, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL,
    Head:          { x:-0.08, y: 0,     z:  0    },
  },

  HAVE: {
    RightUpperArm: { x: 0.3,  y:  0.15, z: -0.2  },
    RightForeArm:  { x: 0.8,  y:  0.2,  z:  0    },
    RightIndex1: CURL, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL,
    LeftUpperArm:  { x: 0.3,  y: -0.15, z:  0.2  },
    LeftForeArm:   { x: 0.8,  y: -0.2,  z:  0    },
    LeftIndex1: CURL, LeftMiddle1: CURL, LeftThumb1: CURL,
  },

  KNOW: {
    RightUpperArm: { x: 0.7,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.5,  y:  0,    z:  0    },
    RightIndex1: SEMI, RightMiddle1: SEMI, RightRing1: SEMI, RightPinky1: SEMI, RightThumb1: SEMI,
    Head:          { x: 0.08, y: 0,     z:  0    },
  },

  THINK: {
    RightUpperArm: { x: 0.7,  y: -0.3,  z: -0.55 },
    RightForeArm:  { x: 1.5,  y:  0,    z:  0    },
    RightIndex1: OPEN, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL, RightThumb1: CURL,
    Head:          { x: 0.15, y:-0.2,   z:  0    },
  },

  FEEL: {
    RightUpperArm: { x: 0.45, y:  0.2,  z: -0.25 },
    RightForeArm:  { x: 1.0,  y:  0.2,  z:  0    },
    RightMiddle1: OPEN, RightIndex1: CURL, RightRing1: CURL, RightPinky1: CURL,
    Head:          { x: 0.08, y: 0.08,  z:  0    },
    motion: 'circle_r',
  },

  LIKE: {
    RightUpperArm: { x: 0.4,  y:  0.15, z: -0.2  },
    RightForeArm:  { x: 0.9,  y:  0.15, z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: CURL, RightPinky1: CURL, RightThumb1: OPEN,
    Head:          { x: 0.1,  y: 0,     z:  0    },
  },

  GO: {
    RightUpperArm: { x: 0.6,  y: -0.6,  z: -0.2  },
    RightForeArm:  { x: 0.4,  y: -0.4,  z:  0    },
    RightIndex1: OPEN, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL,
    Head:          { x: 0,    y:-0.2,   z:  0    },
  },

  COME: {
    RightUpperArm: { x: 0.6,  y: -0.3,  z: -0.3  },
    RightForeArm:  { x: 0.5,  y: -0.15, z:  0    },
    RightIndex1: OPEN, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL,
    Head:          { x: 0,    y:-0.1,   z:  0    },
  },

  STOP: {
    RightUpperArm: { x: 0.4,  y: -0.15, z: -0.3  },
    RightForeArm:  { x: 0.8,  y:  0,    z:  0    },
    LeftUpperArm:  { x: 0.3,  y:  0.1,  z:  0.2  },
    LeftForeArm:   { x: 0.6,  y:  0,    z:  0    },
    LeftIndex1: OPEN, LeftMiddle1: OPEN, LeftThumb1: OPEN,
  },

  FINISH: {
    RightUpperArm: { x: 0.5,  y: -0.2,  z: -0.4  },
    RightForeArm:  { x: 0.9,  y:  0,    z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: OPEN, RightPinky1: OPEN,
    LeftUpperArm:  { x: 0.5,  y:  0.2,  z:  0.4  },
    LeftForeArm:   { x: 0.9,  y:  0,    z:  0    },
    LeftIndex1: OPEN, LeftMiddle1: OPEN, LeftThumb1: OPEN,
  },

  AGAIN: {
    RightUpperArm: { x: 0.4,  y: -0.15, z: -0.3  },
    RightForeArm:  { x: 0.8,  y:  0,    z:  0    },
    LeftUpperArm:  { x: 0.3,  y:  0.1,  z:  0.2  },
    LeftForeArm:   { x: 0.5,  y:  0,    z:  0    },
    LeftIndex1: OPEN, LeftMiddle1: OPEN, LeftThumb1: OPEN,
    motion: 'circle_r',
  },

  HOME: {
    RightUpperArm: { x: 0.7,  y: -0.15, z: -0.5  },
    RightForeArm:  { x: 1.3,  y:  0,    z:  0    },
    RightIndex1: SEMI, RightMiddle1: SEMI, RightRing1: SEMI, RightPinky1: SEMI, RightThumb1: SEMI,
  },

  WORK: {
    RightUpperArm: { x: 0.3,  y:  0.1,  z: -0.2  },
    RightForeArm:  { x: 0.7,  y:  0.1,  z:  0    },
    RightIndex1: CURL, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL,
    LeftUpperArm:  { x: 0.3,  y: -0.1,  z:  0.2  },
    LeftForeArm:   { x: 0.7,  y: -0.1,  z:  0    },
    LeftIndex1: CURL, LeftMiddle1: CURL, LeftThumb1: CURL,
    motion: 'nod',
  },

  SCHOOL: {
    RightUpperArm: { x: 0.4,  y:  0.1,  z: -0.25 },
    RightForeArm:  { x: 0.9,  y:  0.1,  z:  0    },
    LeftUpperArm:  { x: 0.35, y: -0.1,  z:  0.2  },
    LeftForeArm:   { x: 0.8,  y: -0.1,  z:  0    },
    LeftIndex1: OPEN, LeftMiddle1: OPEN, LeftThumb1: OPEN,
    Head:          { x: 0.08, y: 0,     z:  0    },
  },

  FOOD: {
    RightUpperArm: { x: 0.8,  y: -0.1,  z: -0.4  },
    RightForeArm:  { x: 1.5,  y:  0,    z:  0    },
    RightIndex1: SEMI, RightMiddle1: SEMI, RightRing1: SEMI, RightPinky1: SEMI, RightThumb1: SEMI,
    Head:          { x: 0.08, y: 0,     z:  0    },
  },

  WATER: {
    RightUpperArm: { x: 0.7,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.4,  y:  0,    z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: CURL, RightPinky1: CURL, RightThumb1: SEMI,
    Head:          { x: 0.08, y: 0,     z:  0    },
  },

  HAPPY: {
    RightUpperArm: { x: 0.4,  y:  0.15, z: -0.2  },
    RightForeArm:  { x: 0.9,  y:  0.15, z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: OPEN, RightPinky1: OPEN,
    Head:          { x: 0.1,  y: 0,     z:  0    },
    motion: 'circle_l',
  },

  SAD: {
    RightUpperArm: { x: 0.7,  y: -0.2,  z: -0.4  },
    RightForeArm:  { x: 1.0,  y:  0,    z:  0    },
    LeftUpperArm:  { x: 0.7,  y:  0.2,  z:  0.4  },
    LeftForeArm:   { x: 1.0,  y:  0,    z:  0    },
    Head:          { x:-0.15, y: 0,     z:  0    },
  },

  BIG: {
    RightUpperArm: { x: 0.3,  y: -0.5,  z: -0.8  },
    RightForeArm:  { x: 0.2,  y: -0.35, z:  0    },
    LeftUpperArm:  { x: 0.3,  y:  0.5,  z:  0.8  },
    LeftForeArm:   { x: 0.2,  y:  0.35, z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN,
    LeftIndex1: OPEN, LeftMiddle1: OPEN,
  },

  SMALL: {
    RightUpperArm: { x: 0.3,  y: -0.15, z: -0.25 },
    RightForeArm:  { x: 0.6,  y:  0,    z:  0    },
    LeftUpperArm:  { x: 0.3,  y:  0.15, z:  0.25 },
    LeftForeArm:   { x: 0.6,  y:  0,    z:  0    },
    RightIndex1: OPEN, LeftIndex1: OPEN,
  },

  // ── Neutral fallback variants (hash-selected for unknown words) ────────────
  NEUTRAL_LOW: {
    RightUpperArm: { x: 0.1,  y: -0.08, z:  0.2  },
    RightForeArm:  { x: 0.15, y:  0,    z:  0    },
    LeftUpperArm:  { x: 0.1,  y:  0.08, z: -0.2  },
    LeftForeArm:   { x: 0.15, y:  0,    z:  0    },
  },
  NEUTRAL_MID: {
    RightUpperArm: { x: 0.4,  y: -0.15, z: -0.3  },
    RightForeArm:  { x: 0.5,  y:  0,    z:  0    },
    LeftUpperArm:  { x: 0.1,  y:  0,    z:  0.1  },
    Head:          { x: 0.05, y: 0,     z:  0    },
  },
  NEUTRAL_HIGH: {
    RightUpperArm: { x: 0.8,  y: -0.25, z: -0.55 },
    RightForeArm:  { x: 0.6,  y:  0,    z:  0    },
    LeftUpperArm:  { x: 0.1,  y:  0,    z:  0.1  },
    Head:          { x: 0.08, y:-0.08,  z:  0    },
  },
  NEUTRAL_WIDE: {
    RightUpperArm: { x: 0.25, y: -0.5,  z: -0.85 },
    RightForeArm:  { x: 0.2,  y: -0.3,  z:  0    },
    LeftUpperArm:  { x: 0.25, y:  0.5,  z:  0.85 },
    LeftForeArm:   { x: 0.2,  y:  0.3,  z:  0    },
  },
  NEUTRAL_CHEST: {
    RightUpperArm: { x: 0.45, y:  0.3,  z: -0.1  },
    RightForeArm:  { x: 1.0,  y:  0.35, z:  0    },
    LeftUpperArm:  { x: 0.45, y: -0.3,  z:  0.1  },
    LeftForeArm:   { x: 1.0,  y: -0.35, z:  0    },
  },
  NEUTRAL_POINT: {
    RightUpperArm: { x: 0.55, y: -0.55, z: -0.2  },
    RightForeArm:  { x: 0.3,  y: -0.4,  z:  0    },
    RightIndex1: OPEN, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL,
    Head:          { x: 0,    y:-0.2,   z:  0    },
  },
  NEUTRAL_THINK: {
    RightUpperArm: { x: 0.65, y: -0.3,  z: -0.5  },
    RightForeArm:  { x: 1.4,  y:  0,    z:  0    },
    RightIndex1: OPEN, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL,
    Head:          { x: 0.15, y:-0.15,  z:  0    },
  },
  NEUTRAL_BOTH_UP: {
    RightUpperArm: { x: 0.65, y: -0.2,  z: -0.55 },
    RightForeArm:  { x: 0.55, y:  0,    z:  0    },
    LeftUpperArm:  { x: 0.65, y:  0.2,  z:  0.55 },
    LeftForeArm:   { x: 0.55, y:  0,    z:  0    },
    Head:          { x: 0.08, y: 0,     z:  0    },
  },

  // ── Fingerspell placeholder ───────────────────────────────────────────────
  FINGERSPELL: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.4  },
    RightForeArm:  { x: 1.2,  y:  0,    z:  0    },
    RightIndex1: OPEN, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL, RightThumb1: CURL,
    LeftUpperArm:  { x: 0.1,  y:  0,    z:  0.1  },
    LeftForeArm:   { x: 0.15, y:  0,    z:  0    },
  },

  // ── ASL Fingerspell A–Z (from sltranslator.com handshapes) ────────────────
  // Arm base for all fingerspell letters: hand raised at chest/face height, palm facing out.
  // A: Fist with thumb resting on side of index finger
  FINGERSPELL_A: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.2,  y:  0.1,  z:  0    },
    RightHand:     { x: 0,    y:  0.1,  z:  0    },
    RightIndex1: CURL, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL,
    RightThumb1: { x: 0, y: 0, z: 0.3 }, RightThumb2: { x: 0, y: 0, z: 0.2 },
  },

  // B: All four fingers extended straight up, thumb folded across palm
  FINGERSPELL_B: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.2,  y:  0.1,  z:  0    },
    RightHand:     { x:-0.1,  y:  0,    z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: OPEN, RightPinky1: OPEN,
    RightThumb1: { x: 0, y: 0.3, z: 1.0 }, RightThumb2: { x: 0, y: 0, z: 0.5 },
  },

  // C: All fingers curved into a C-shape, thumb mirrors the curve
  FINGERSPELL_C: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.1,  y:  0,    z:  0    },
    RightHand:     { x: 0.1,  y: -0.2,  z:  0    },
    RightIndex1: SEMI, RightMiddle1: SEMI, RightRing1: SEMI, RightPinky1: SEMI,
    RightThumb1: { x: 0, y:-0.3, z: 0.4 }, RightThumb2: { x: 0, y: 0, z: 0.2 },
  },

  // D: Index finger straight up, middle+ring+pinky curl to touch thumb tip
  FINGERSPELL_D: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.2,  y:  0.1,  z:  0    },
    RightHand:     { x: 0,    y:  0.1,  z:  0    },
    RightIndex1: OPEN, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL,
    RightThumb1: { x: 0, y: 0.2, z: 0.6 }, RightThumb2: { x: 0, y: 0, z: 0.3 },
  },

  // E: All fingers bent tightly at knuckles (claw), thumb tucked under
  FINGERSPELL_E: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.1,  y:  0.1,  z:  0    },
    RightHand:     { x: 0.1,  y:  0,    z:  0    },
    RightIndex1: { x:0, y:0, z:1.1 }, RightMiddle1: { x:0, y:0, z:1.1 },
    RightRing1:   { x:0, y:0, z:1.1 }, RightPinky1:  { x:0, y:0, z:1.0 },
    RightThumb1: { x: 0, y: 0.1, z: 1.0 }, RightThumb2: { x: 0, y: 0, z: 0.6 },
  },

  // F: Index+thumb tips touching (circle), other 3 fingers extended up
  FINGERSPELL_F: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.2,  y:  0.1,  z:  0    },
    RightHand:     { x: 0,    y:  0,    z:  0    },
    RightIndex1: { x:0, y:0, z:0.9 }, RightIndex2: { x:0, y:0, z:0.5 },
    RightMiddle1: OPEN, RightRing1: OPEN, RightPinky1: OPEN,
    RightThumb1: { x: 0, y:-0.1, z: 0.5 }, RightThumb2: { x: 0, y: 0, z: 0.4 },
  },

  // G: Index+thumb point sideways (horizontal) — hand rotated 90° outward
  FINGERSPELL_G: {
    RightUpperArm: { x: 0.5,  y: -0.4,  z: -0.4  },
    RightForeArm:  { x: 0.8,  y: -0.2,  z:  0    },
    RightHand:     { x: 0,    y: -0.5,  z:  0    },
    RightIndex1: OPEN, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL,
    RightThumb1: { x: 0, y: 0, z: 0.3 },
  },

  // H: Index+middle extended together sideways (horizontal)
  FINGERSPELL_H: {
    RightUpperArm: { x: 0.5,  y: -0.4,  z: -0.4  },
    RightForeArm:  { x: 0.9,  y: -0.2,  z:  0    },
    RightHand:     { x: 0,    y: -0.5,  z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: CURL, RightPinky1: CURL,
    RightThumb1: CURL,
  },

  // I: Pinky finger only extended, all others curled into fist, thumb on side
  FINGERSPELL_I: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.2,  y:  0.1,  z:  0    },
    RightHand:     { x: 0,    y:  0.1,  z:  0    },
    RightIndex1: CURL, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: OPEN,
    RightThumb1: { x: 0, y: 0, z: 0.3 },
  },

  // J: Like I (pinky up) + motion tracing J — uses shake motion
  FINGERSPELL_J: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.2,  y:  0.1,  z:  0    },
    RightHand:     { x: 0,    y:  0.1,  z:  0    },
    RightIndex1: CURL, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: OPEN,
    RightThumb1: { x: 0, y: 0, z: 0.3 },
    motion: 'circle_r',
  },

  // K: Index+middle up, thumb between them (peace sign variant)
  FINGERSPELL_K: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.2,  y:  0.1,  z:  0    },
    RightHand:     { x: 0,    y:  0.1,  z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: CURL, RightPinky1: CURL,
    RightThumb1: { x: 0, y:-0.1, z: 0.5 },
  },

  // L: Index finger up, thumb extended out — classic L-shape
  FINGERSPELL_L: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.2,  y:  0.1,  z:  0    },
    RightHand:     { x: 0,    y:  0.1,  z:  0    },
    RightIndex1: OPEN, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL,
    RightThumb1: { x: 0, y:-0.4, z: 0.1 }, RightThumb2: { x: 0, y: 0, z: 0.1 },
  },

  // M: Three fingers (index+middle+ring) folded over tucked thumb
  FINGERSPELL_M: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.1,  y:  0.1,  z:  0    },
    RightHand:     { x: 0.1,  y:  0,    z:  0    },
    RightIndex1: { x:0, y:0, z:1.2 }, RightMiddle1: { x:0, y:0, z:1.2 },
    RightRing1:   { x:0, y:0, z:1.2 }, RightPinky1: CURL,
    RightThumb1: { x: 0, y: 0.2, z: 0.8 },
  },

  // N: Two fingers (index+middle) folded over tucked thumb
  FINGERSPELL_N: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.1,  y:  0.1,  z:  0    },
    RightHand:     { x: 0.1,  y:  0,    z:  0    },
    RightIndex1: { x:0, y:0, z:1.2 }, RightMiddle1: { x:0, y:0, z:1.2 },
    RightRing1: CURL, RightPinky1: CURL,
    RightThumb1: { x: 0, y: 0.2, z: 0.8 },
  },

  // O: All fingers + thumb curved forming a circle/O shape
  FINGERSPELL_O: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.1,  y:  0.1,  z:  0    },
    RightHand:     { x: 0.1,  y: -0.1,  z:  0    },
    RightIndex1: { x:0, y:0, z:0.8 }, RightMiddle1: { x:0, y:0, z:0.9 },
    RightRing1:   { x:0, y:0, z:0.9 }, RightPinky1:  { x:0, y:0, z:0.8 },
    RightThumb1: { x: 0, y:-0.2, z: 0.5 }, RightThumb2: { x: 0, y: 0, z: 0.3 },
  },

  // P: Like K but hand points downward (index+middle point down, thumb out)
  FINGERSPELL_P: {
    RightUpperArm: { x: 0.5,  y: -0.2,  z: -0.4  },
    RightForeArm:  { x: 0.8,  y:  0.1,  z:  0    },
    RightHand:     { x: 0.6,  y:  0,    z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: CURL, RightPinky1: CURL,
    RightThumb1: { x: 0, y:-0.2, z: 0.5 },
  },

  // Q: Like G but pointing downward
  FINGERSPELL_Q: {
    RightUpperArm: { x: 0.4,  y: -0.2,  z: -0.3  },
    RightForeArm:  { x: 0.6,  y:  0,    z:  0    },
    RightHand:     { x: 0.7,  y: -0.3,  z:  0    },
    RightIndex1: OPEN, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL,
    RightThumb1: { x: 0, y: 0, z: 0.4 },
  },

  // R: Index+middle crossed over each other
  FINGERSPELL_R: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.2,  y:  0.1,  z:  0    },
    RightHand:     { x: 0,    y:  0.2,  z:  0    },
    RightIndex1: OPEN, RightMiddle1: { x:0, y: 0.4, z: 0.1 },
    RightRing1: CURL, RightPinky1: CURL,
    RightThumb1: { x: 0, y: 0, z: 0.7 },
  },

  // S: All fingers curled into fist, thumb crosses OVER fingers
  FINGERSPELL_S: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.2,  y:  0.1,  z:  0    },
    RightHand:     { x: 0,    y:  0.1,  z:  0    },
    RightIndex1: CURL, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL,
    RightThumb1: { x: 0, y: 0.2, z: 1.1 }, RightThumb2: { x: 0, y: 0, z: 0.5 },
  },

  // T: Fist with thumb pushed up between index+middle fingers
  FINGERSPELL_T: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.2,  y:  0.1,  z:  0    },
    RightHand:     { x: 0,    y:  0.1,  z:  0    },
    RightIndex1: { x:0, y:0, z:1.1 }, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL,
    RightThumb1: { x: 0, y:-0.1, z: 0.7 }, RightThumb2: { x: 0, y: 0, z: 0.3 },
  },

  // U: Index+middle extended together straight up, touching, ring+pinky curled
  FINGERSPELL_U: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.2,  y:  0.1,  z:  0    },
    RightHand:     { x: 0,    y:  0.1,  z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: CURL, RightPinky1: CURL,
    RightThumb1: CURL,
  },

  // V: Index+middle extended and spread apart (peace / victory sign)
  FINGERSPELL_V: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.2,  y:  0.1,  z:  0    },
    RightHand:     { x: 0,    y:  0.1,  z:  0    },
    RightIndex1: OPEN, RightMiddle1: { x:0, y:-0.3, z: 0 },
    RightRing1: CURL, RightPinky1: CURL,
    RightThumb1: CURL,
  },

  // W: Index+middle+ring all extended and spread, pinky curled, thumb curled
  FINGERSPELL_W: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.2,  y:  0.1,  z:  0    },
    RightHand:     { x: 0,    y:  0.1,  z:  0    },
    RightIndex1: OPEN, RightMiddle1: OPEN, RightRing1: OPEN, RightPinky1: CURL,
    RightThumb1: CURL,
  },

  // X: Index finger hooked/bent (hook shape), all others curled
  FINGERSPELL_X: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.2,  y:  0.1,  z:  0    },
    RightHand:     { x: 0,    y:  0.1,  z:  0    },
    RightIndex1: { x:0, y:0, z:0.75 }, RightIndex2: { x:0, y:0, z:0.9 },
    RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL,
    RightThumb1: { x: 0, y: 0, z: 0.5 },
  },

  // Y: Thumb + pinky extended, index+middle+ring curled (shaka/hang-loose)
  FINGERSPELL_Y: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.2,  y:  0.1,  z:  0    },
    RightHand:     { x: 0,    y:  0.1,  z:  0    },
    RightIndex1: CURL, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: OPEN,
    RightThumb1: { x: 0, y:-0.4, z: 0.1 },
  },

  // Z: Index extended, hand traces Z shape in the air — uses motion
  FINGERSPELL_Z: {
    RightUpperArm: { x: 0.6,  y: -0.2,  z: -0.5  },
    RightForeArm:  { x: 1.1,  y: -0.1,  z:  0    },
    RightHand:     { x: 0,    y:  0.2,  z:  0    },
    RightIndex1: OPEN, RightMiddle1: CURL, RightRing1: CURL, RightPinky1: CURL,
    RightThumb1: CURL,
    motion: 'wave',
  },

  // ── AUTO-GENERATED POSES (from sign-mapper.js 2D coords) ──────────────────
  GOOD_NIGHT: {
    RightUpperArm: { x:  0.06, y:  0.08, z: -0.79 },
    RightForeArm:  { x:  0.87, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.11, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  YOU_RE_WELCOME: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.70 },
    RightForeArm:  { x:  1.22, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.13, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  OK: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.70 },
    RightForeArm:  { x:  1.20, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.12, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  I_UNDERSTAND: {
    RightUpperArm: { x:  0.05, y:  0.07, z: -0.81 },
    RightForeArm:  { x:  0.94, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  I_DONT_UNDERSTAND: {
    RightUpperArm: { x:  0.05, y:  0.07, z: -0.81 },
    RightForeArm:  { x:  0.94, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'shake_head',
  },
  REPEAT_PLEASE: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.70 },
    RightForeArm:  { x:  1.22, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.13, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'circle_r',
  },
  DO_YOU_UNDERSTAND: {
    RightUpperArm: { x:  0.05, y:  0.07, z: -0.81 },
    RightForeArm:  { x:  0.94, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  CAN_YOU_HELP: {
    RightUpperArm: { x:  0.06, y:  0.08, z: -0.73 },
    RightForeArm:  { x:  1.02, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.12, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    motion: 'lift_r',
  },
  COULD_YOU_REPEAT: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.70 },
    RightForeArm:  { x:  1.22, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.13, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'circle_r',
  },
  STUDENT: {
    RightUpperArm: { x:  0.06, y:  0.08, z: -0.68 },
    RightForeArm:  { x:  1.13, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0.7 }, RightMiddle1: { x: 0, y: 0, z: 0.7 }, RightRing1: { x: 0, y: 0, z: 0.7 }, RightPinky1: { x: 0, y: 0, z: 0.7 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
    motion: 'lift_r',
  },
  TEACHER: {
    RightUpperArm: { x:  0.06, y:  0.08, z: -0.73 },
    RightForeArm:  { x:  1.02, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.12, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0.7 }, RightMiddle1: { x: 0, y: 0, z: 0.7 }, RightRing1: { x: 0, y: 0, z: 0.7 }, RightPinky1: { x: 0, y: 0, z: 0.7 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
  },
  CLASS: {
    RightUpperArm: { x:  0.03, y:  0.05, z: -0.88 },
    RightForeArm:  { x:  0.85, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0.7 }, RightMiddle1: { x: 0, y: 0, z: 0.7 }, RightRing1: { x: 0, y: 0, z: 0.7 }, RightPinky1: { x: 0, y: 0, z: 0.7 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
    motion: 'circle_r',
  },
  LEARN: {
    RightUpperArm: { x:  0.06, y:  0.08, z: -0.68 },
    RightForeArm:  { x:  1.13, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0.7 }, RightMiddle1: { x: 0, y: 0, z: 0.7 }, RightRing1: { x: 0, y: 0, z: 0.7 }, RightPinky1: { x: 0, y: 0, z: 0.7 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
    motion: 'lift_r',
  },
  STUDY: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.70 },
    RightForeArm:  { x:  1.20, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.12, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0.7 }, RightMiddle1: { x: 0, y: 0, z: 0.7 }, RightRing1: { x: 0, y: 0, z: 0.7 }, RightPinky1: { x: 0, y: 0, z: 0.7 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
  },
  HOMEWORK: {
    RightUpperArm: { x:  0.06, y:  0.08, z: -0.73 },
    RightForeArm:  { x:  1.02, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.12, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 1.4 }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.6 },
  },
  TEST: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.70 },
    RightForeArm:  { x:  1.22, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.13, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0.7 }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.6 },
  },
  EXAM: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.70 },
    RightForeArm:  { x:  1.22, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.13, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0.7 }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.6 },
  },
  LECTURE: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.79 },
    RightForeArm:  { x:  0.99, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y: -0.13, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  ASSIGNMENT: {
    RightUpperArm: { x:  0.06, y:  0.08, z: -0.68 },
    RightForeArm:  { x:  1.13, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0.7 }, RightMiddle1: { x: 0, y: 0, z: 0.7 }, RightRing1: { x: 0, y: 0, z: 0.7 }, RightPinky1: { x: 0, y: 0, z: 0.7 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
    motion: 'lift_r',
  },
  GRADE: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.65 },
    RightForeArm:  { x:  1.25, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y: -0.13, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  UNIVERSITY: {
    RightUpperArm: { x:  0.03, y:  0.05, z: -0.88 },
    RightForeArm:  { x:  0.85, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0.7 }, RightMiddle1: { x: 0, y: 0, z: 0.7 }, RightRing1: { x: 0, y: 0, z: 0.7 }, RightPinky1: { x: 0, y: 0, z: 0.7 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
    motion: 'circle_r',
  },
  QUESTION: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.70 },
    RightForeArm:  { x:  1.22, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.13, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'circle_r',
  },
  BOOK: {
    RightUpperArm: { x:  0.03, y:  0.05, z: -0.73 },
    RightForeArm:  { x:  1.31, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.12, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  DEADLINE: {
    RightUpperArm: { x: -0.03, y: -0.04, z: -0.62 },
    RightForeArm:  { x:  1.33, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.16, y:  0.16, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  NOW: {
    RightUpperArm: { x:  0.06, y:  0.08, z: -0.58 },
    RightForeArm:  { x:  0.24, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.07, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  TODAY: {
    RightUpperArm: { x:  0.06, y:  0.08, z: -0.58 },
    RightForeArm:  { x:  0.24, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.07, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  TOMORROW: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.90 },
    RightForeArm:  { x:  0.54, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  YESTERDAY: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.90 },
    RightForeArm:  { x:  0.54, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  LATER: {
    RightUpperArm: { x:  0.01, y:  0.03, z: -0.70 },
    RightForeArm:  { x:  1.53, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.17, y:  0.08, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  SOON: {
    RightUpperArm: { x:  0.01, y:  0.03, z: -0.73 },
    RightForeArm:  { x:  1.36, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.12, y: -0.09, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  MORNING: {
    RightUpperArm: { x:  0.06, y:  0.08, z: -0.58 },
    RightForeArm:  { x:  0.24, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.07, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    motion: 'lift_r',
  },
  NIGHT: {
    RightUpperArm: { x:  0.06, y:  0.08, z: -0.62 },
    RightForeArm:  { x:  0.12, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.09, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  WEEK: {
    RightUpperArm: { x:  0.03, y:  0.05, z: -0.65 },
    RightForeArm:  { x:  1.38, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.17, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  SEE: {
    RightUpperArm: { x:  0.05, y:  0.07, z: -0.77 },
    RightForeArm:  { x:  1.04, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  WAIT: {
    RightUpperArm: { x:  0.03, y:  0.05, z: -0.62 },
    RightForeArm:  { x:  0.30, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.07, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0.7 }, RightMiddle1: { x: 0, y: 0, z: 0.7 }, RightRing1: { x: 0, y: 0, z: 0.7 }, RightPinky1: { x: 0, y: 0, z: 0.7 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
  },
  START: {
    RightUpperArm: { x:  0.03, y:  0.05, z: -0.70 },
    RightForeArm:  { x:  1.35, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  TIRED: {
    RightUpperArm: { x:  0.08, y:  0.10, z: -0.65 },
    RightForeArm:  { x:  0.19, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.05, y: -0.12, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  EXCITED: {
    RightUpperArm: { x:  0.08, y:  0.10, z: -0.65 },
    RightForeArm:  { x:  0.11, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.07, y: -0.12, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    motion: 'circle_r',
  },
  IMPORTANT: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.56 },
    RightForeArm:  { x:  1.42, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y: -0.08, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 1.4 }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.6 },
    motion: 'lift_r',
  },
  NAME: {
    RightUpperArm: { x:  0.03, y:  0.05, z: -0.88 },
    RightForeArm:  { x:  0.85, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.6 },
  },
  FRIEND: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.58 },
    RightForeArm:  { x:  1.41, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.10, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  DEAF: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.90 },
    RightForeArm:  { x:  0.54, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  HEARING: {
    RightUpperArm: { x:  0.05, y:  0.07, z: -0.77 },
    RightForeArm:  { x:  1.00, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'circle_r',
  },
  VIDEO: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.70 },
    RightForeArm:  { x:  1.22, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.13, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  COMPUTER: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.73 },
    RightForeArm:  { x:  1.10, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.12, y: -0.13, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0.7 }, RightMiddle1: { x: 0, y: 0, z: 0.7 }, RightRing1: { x: 0, y: 0, z: 0.7 }, RightPinky1: { x: 0, y: 0, z: 0.7 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
    motion: 'circle_r',
  },
  INTERNET: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.79 },
    RightForeArm:  { x:  0.99, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y: -0.13, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0.7 }, RightMiddle1: { x: 0, y: 0, z: 0.7 }, RightRing1: { x: 0, y: 0, z: 0.7 }, RightPinky1: { x: 0, y: 0, z: 0.7 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
  },
  PHONE: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.90 },
    RightForeArm:  { x:  0.54, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 1.4 }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  CAPTION: {
    RightUpperArm: { x:  0.03, y:  0.05, z: -0.70 },
    RightForeArm:  { x:  1.35, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  TRANSLATE: {
    RightUpperArm: { x:  0.03, y:  0.05, z: -0.73 },
    RightForeArm:  { x:  1.32, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  MUTE: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.79 },
    RightForeArm:  { x:  0.99, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.11, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 1.4 }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.6 },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  BAD: {
    RightUpperArm: { x:  0.06, y:  0.08, z: -0.94 },
    RightForeArm:  { x:  0.59, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.07, y: -0.16, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  DIFFERENT: {
    RightUpperArm: { x:  0.03, y:  0.05, z: -0.70 },
    RightForeArm:  { x:  1.35, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    motion: 'shake_head',
  },
  SAME: {
    RightUpperArm: { x:  0.03, y:  0.05, z: -0.70 },
    RightForeArm:  { x:  1.35, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  DIFFICULT: {
    RightUpperArm: { x:  0.03, y:  0.05, z: -0.79 },
    RightForeArm:  { x:  1.22, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0.7 }, RightMiddle1: { x: 0, y: 0, z: 0.7 }, RightRing1: { x: 0, y: 0, z: 0.7 }, RightPinky1: { x: 0, y: 0, z: 0.7 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
  },
  EASY: {
    RightUpperArm: { x:  0.03, y:  0.05, z: -0.70 },
    RightForeArm:  { x:  0.02, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.10, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0.7 }, RightMiddle1: { x: 0, y: 0, z: 0.7 }, RightRing1: { x: 0, y: 0, z: 0.7 }, RightPinky1: { x: 0, y: 0, z: 0.7 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
    motion: 'lift_r',
  },
  ONE: {
    RightUpperArm: { x:  0.01, y:  0.03, z: -0.73 },
    RightForeArm:  { x:  1.54, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.23, y:  0.00, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  TWO: {
    RightUpperArm: { x:  0.01, y:  0.03, z: -0.73 },
    RightForeArm:  { x:  1.54, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.23, y:  0.00, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  THREE: {
    RightUpperArm: { x:  0.01, y:  0.03, z: -0.73 },
    RightForeArm:  { x:  1.54, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.23, y:  0.00, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.6 },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  FIVE: {
    RightUpperArm: { x:  0.01, y:  0.03, z: -0.73 },
    RightForeArm:  { x:  1.54, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.23, y:  0.00, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  TEN: {
    RightUpperArm: { x:  0.01, y:  0.03, z: -0.73 },
    RightForeArm:  { x:  1.54, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.23, y:  0.00, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'shake_head',
  },
  ANSWER: {
    RightUpperArm: { x:  0.03, y:  0.05, z: -0.65 },
    RightForeArm:  { x:  1.34, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.15, y: -0.09, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  ASK: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.70 },
    RightForeArm:  { x:  1.30, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.15, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'nod',
  },
  BEGIN: {
    RightUpperArm: { x:  0.03, y:  0.05, z: -0.58 },
    RightForeArm:  { x:  1.34, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.10, y: -0.08, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  BRING: {
    RightUpperArm: { x:  0.05, y:  0.07, z: -0.54 },
    RightForeArm:  { x:  1.30, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.10, y: -0.08, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  CALL: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.92 },
    RightForeArm:  { x:  0.40, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.17, y: -0.17, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 1.4 }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  CHANGE: {
    RightUpperArm: { x:  0.03, y:  0.05, z: -0.56 },
    RightForeArm:  { x:  1.37, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.10, y: -0.06, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 1.4 }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.6 },
  },
  CHOOSE: {
    RightUpperArm: { x:  0.01, y:  0.03, z: -0.58 },
    RightForeArm:  { x:  1.45, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y: -0.05, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  CONTINUE: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.58 },
    RightForeArm:  { x:  1.34, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y: -0.09, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  FORGET: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.94 },
    RightForeArm:  { x:  0.19, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.15, y: -0.17, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  LEAVE: {
    RightUpperArm: { x:  0.03, y:  0.05, z: -0.58 },
    RightForeArm:  { x:  1.36, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.10, y: -0.06, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  MEET: {
    RightUpperArm: { x:  0.03, y:  0.05, z: -0.58 },
    RightForeArm:  { x:  1.34, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.10, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  REMEMBER: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.92 },
    RightForeArm:  { x:  0.35, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.15, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  SHOW: {
    RightUpperArm: { x:  0.03, y:  0.05, z: -0.58 },
    RightForeArm:  { x:  1.40, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y: -0.06, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  TEACH: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.90 },
    RightForeArm:  { x:  0.44, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y: -0.15, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  TRY: {
    RightUpperArm: { x:  0.03, y:  0.05, z: -0.58 },
    RightForeArm:  { x:  1.32, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.10, y: -0.08, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 1.4 }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.6 },
  },
  USE: {
    RightUpperArm: { x:  0.02, y:  0.04, z: -0.58 },
    RightForeArm:  { x:  1.36, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.10, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'circle_r',
  },
  MAKE: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.58 },
    RightForeArm:  { x:  1.41, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 1.4 }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.6 },
  },
  TAKE: {
    RightUpperArm: { x: -0.01, y: -0.01, z: -0.47 },
    RightForeArm:  { x:  1.36, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.10, y:  0.16, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0.7 }, RightMiddle1: { x: 0, y: 0, z: 0.7 }, RightRing1: { x: 0, y: 0, z: 0.7 }, RightPinky1: { x: 0, y: 0, z: 0.7 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  GIVE: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.58 },
    RightForeArm:  { x:  1.41, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  SAY: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.70 },
    RightForeArm:  { x:  1.18, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.11, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  WRITE: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.54 },
    RightForeArm:  { x:  0.68, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.08, y: -0.09, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 1.4 }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.6 },
  },
  READ: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.54 },
    RightForeArm:  { x:  0.68, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.08, y: -0.09, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
  },
  PLAY: {
    RightUpperArm: { x: -0.01, y: -0.02, z: -0.58 },
    RightForeArm:  { x:  1.37, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.12, y:  0.11, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 1.4 }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    motion: 'shake_head',
  },
  MOVE: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.58 },
    RightForeArm:  { x:  1.47, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y:  0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  OPEN: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.58 },
    RightForeArm:  { x:  1.46, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.15, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  CLOSE_ACTION: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.58 },
    RightForeArm:  { x:  1.46, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.15, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  FIND: {
    RightUpperArm: { x: -0.01, y: -0.01, z: -0.47 },
    RightForeArm:  { x:  1.47, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'lift_r',
  },
  SEND: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.58 },
    RightForeArm:  { x:  1.41, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  NEW: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.47 },
    RightForeArm:  { x:  0.66, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.09, y: -0.09, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  OLD: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.73 },
    RightForeArm:  { x:  0.05, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.08, y: -0.09, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 1.4 }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.6 },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  FAST: {
    RightUpperArm: { x: -0.01, y: -0.01, z: -0.56 },
    RightForeArm:  { x:  1.37, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.11, y:  0.13, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  SLOW: {
    RightUpperArm: { x:  0.00, y:  0.00, z: -0.45 },
    RightForeArm:  { x:  0.41, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.09, y: -0.05, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  BEAUTIFUL: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.88 },
    RightForeArm:  { x:  0.82, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.15, y: -0.09, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'circle_r',
  },
  HOT: {
    RightUpperArm: { x:  0.04, y:  0.07, z: -0.70 },
    RightForeArm:  { x:  1.20, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y: -0.09, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0.7 }, RightMiddle1: { x: 0, y: 0, z: 0.7 }, RightRing1: { x: 0, y: 0, z: 0.7 }, RightPinky1: { x: 0, y: 0, z: 0.7 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  COLD: {
    RightUpperArm: { x: -0.02, y: -0.03, z: -0.58 },
    RightForeArm:  { x:  1.34, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.10, y:  0.09, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 1.4 }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.6 },
    motion: 'shake_head',
  },
  CORRECT: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.58 },
    RightForeArm:  { x:  1.42, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y: -0.08, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  WRONG: {
    RightUpperArm: { x:  0.05, y:  0.07, z: -0.58 },
    RightForeArm:  { x:  0.42, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.05, y: -0.12, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0.6 },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  RED: {
    RightUpperArm: { x:  0.04, y:  0.07, z: -0.70 },
    RightForeArm:  { x:  1.17, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.11, y: -0.09, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  BLUE: {
    RightUpperArm: { x: -0.02, y: -0.03, z: -0.65 },
    RightForeArm:  { x:  1.35, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y:  0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'shake_head',
  },
  GREEN: {
    RightUpperArm: { x: -0.02, y: -0.03, z: -0.65 },
    RightForeArm:  { x:  1.35, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y:  0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'shake_head',
  },
  YELLOW: {
    RightUpperArm: { x: -0.02, y: -0.03, z: -0.65 },
    RightForeArm:  { x:  1.35, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y:  0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'shake_head',
  },
  WHITE: {
    RightUpperArm: { x:  0.03, y:  0.05, z: -0.58 },
    RightForeArm:  { x:  0.48, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.06, y: -0.09, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  BLACK: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.92 },
    RightForeArm:  { x:  0.44, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  ORANGE: {
    RightUpperArm: { x:  0.04, y:  0.07, z: -0.70 },
    RightForeArm:  { x:  1.15, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.11, y: -0.09, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0.7 }, RightMiddle1: { x: 0, y: 0, z: 0.7 }, RightRing1: { x: 0, y: 0, z: 0.7 }, RightPinky1: { x: 0, y: 0, z: 0.7 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  PURPLE: {
    RightUpperArm: { x: -0.02, y: -0.03, z: -0.65 },
    RightForeArm:  { x:  1.35, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y:  0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'shake_head',
  },
  BROWN: {
    RightUpperArm: { x:  0.03, y:  0.05, z: -0.77 },
    RightForeArm:  { x:  1.26, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.15, y: -0.09, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  MOTHER: {
    RightUpperArm: { x:  0.04, y:  0.07, z: -0.70 },
    RightForeArm:  { x:  1.11, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.10, y: -0.09, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  FATHER: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.92 },
    RightForeArm:  { x:  0.58, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.15, y: -0.09, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  SISTER: {
    RightUpperArm: { x:  0.04, y:  0.07, z: -0.70 },
    RightForeArm:  { x:  1.11, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.10, y: -0.09, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  BROTHER: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.92 },
    RightForeArm:  { x:  0.52, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.09, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  BABY: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.47 },
    RightForeArm:  { x:  0.63, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.10, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    motion: 'nod',
  },
  FAMILY: {
    RightUpperArm: { x: -0.01, y: -0.01, z: -0.65 },
    RightForeArm:  { x:  1.39, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y:  0.12, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    motion: 'circle_r',
  },
  PERSON: {
    RightUpperArm: { x: -0.01, y: -0.01, z: -0.62 },
    RightForeArm:  { x:  0.06, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.17, y:  0.00, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  CHILDREN: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.45 },
    RightForeArm:  { x:  0.29, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.09, y: -0.04, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  EAT: {
    RightUpperArm: { x:  0.04, y:  0.07, z: -0.70 },
    RightForeArm:  { x:  1.19, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.11, y: -0.08, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  DRINK: {
    RightUpperArm: { x:  0.04, y:  0.07, z: -0.70 },
    RightForeArm:  { x:  1.28, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.08, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0.7 }, RightMiddle1: { x: 0, y: 0, z: 0.7 }, RightRing1: { x: 0, y: 0, z: 0.7 }, RightPinky1: { x: 0, y: 0, z: 0.7 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'lift_r',
  },
  HUNGRY: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.65 },
    RightForeArm:  { x:  0.08, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.09, y: -0.08, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0.7 }, RightMiddle1: { x: 0, y: 0, z: 0.7 }, RightRing1: { x: 0, y: 0, z: 0.7 }, RightPinky1: { x: 0, y: 0, z: 0.7 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  COOK: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.54 },
    RightForeArm:  { x:  0.62, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.08, y: -0.08, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  HEAD: {
    RightUpperArm: { x:  0.04, y:  0.07, z: -0.88 },
    RightForeArm:  { x:  0.86, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  HAND: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.45 },
    RightForeArm:  { x:  0.73, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.08, y: -0.09, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  EYE: {
    RightUpperArm: { x:  0.04, y:  0.07, z: -0.83 },
    RightForeArm:  { x:  0.97, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.08, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  EAR: {
    RightUpperArm: { x: -0.01, y: -0.01, z: -0.77 },
    RightForeArm:  { x:  1.37, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y:  0.13, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  NOSE: {
    RightUpperArm: { x:  0.04, y:  0.07, z: -0.81 },
    RightForeArm:  { x:  1.01, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.12, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  SICK: {
    RightUpperArm: { x:  0.04, y:  0.07, z: -0.88 },
    RightForeArm:  { x:  0.86, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0.7 }, RightMiddle1: { x: 0, y: 0, z: 0.7 }, RightRing1: { x: 0, y: 0, z: 0.7 }, RightPinky1: { x: 0, y: 0, z: 0.7 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
  },
  PAIN: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.58 },
    RightForeArm:  { x:  1.45, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.11, y: -0.05, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  DOCTOR: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.47 },
    RightForeArm:  { x:  0.26, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.10, y: -0.04, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
  },
  BETTER: {
    RightUpperArm: { x:  0.04, y:  0.07, z: -0.70 },
    RightForeArm:  { x:  1.23, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.11, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 1.4 }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.6 },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'lift_r',
  },
  UP: {
    RightUpperArm: { x:  0.01, y:  0.03, z: -0.73 },
    RightForeArm:  { x:  1.54, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.28, y:  0.00, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'lift_r',
  },
  DOWN: {
    RightUpperArm: { x:  0.01, y:  0.03, z: -0.32 },
    RightForeArm:  { x:  0.07, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.17, y:  0.00, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  HERE: {
    RightUpperArm: { x:  0.01, y:  0.03, z: -0.41 },
    RightForeArm:  { x:  0.09, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.12, y:  0.00, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    motion: 'circle_r',
  },
  THERE: {
    RightUpperArm: { x:  0.00, y:  0.00, z: -0.58 },
    RightForeArm:  { x:  1.39, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.12, y:  0.15, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  INSIDE: {
    RightUpperArm: { x:  0.03, y:  0.05, z: -0.58 },
    RightForeArm:  { x:  0.17, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.07, y: -0.05, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  OUTSIDE: {
    RightUpperArm: { x:  0.03, y:  0.05, z: -0.58 },
    RightForeArm:  { x:  1.55, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.14, y:  0.01, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    motion: 'lift_r',
  },
  HOUR: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.54 },
    RightForeArm:  { x:  0.52, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.08, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    motion: 'circle_r',
  },
  MINUTE: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.54 },
    RightForeArm:  { x:  0.52, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.08, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  YEAR: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.54 },
    RightForeArm:  { x:  1.43, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.11, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 1.4 }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.6 },
    motion: 'circle_r',
  },
  ALWAYS: {
    RightUpperArm: { x: -0.01, y: -0.01, z: -0.58 },
    RightForeArm:  { x:  1.38, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.12, y:  0.14, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'circle_r',
  },
  NEVER: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.58 },
    RightForeArm:  { x:  1.43, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.12, y: -0.07, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  BEFORE: {
    RightUpperArm: { x: -0.02, y: -0.03, z: -0.65 },
    RightForeArm:  { x:  1.33, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.11, y:  0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  AFTER: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.65 },
    RightForeArm:  { x:  1.40, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.13, y: -0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  DURING: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.58 },
    RightForeArm:  { x:  1.41, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.12, y: -0.08, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  MONDAY: {
    RightUpperArm: { x: -0.01, y: -0.02, z: -0.65 },
    RightForeArm:  { x:  1.34, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.11, y:  0.13, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 1.4 }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.6 },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'circle_r',
  },
  TUESDAY: {
    RightUpperArm: { x: -0.01, y: -0.02, z: -0.65 },
    RightForeArm:  { x:  1.34, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.11, y:  0.13, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 1.4 }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.6 },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'circle_r',
  },
  WEDNESDAY: {
    RightUpperArm: { x: -0.01, y: -0.02, z: -0.65 },
    RightForeArm:  { x:  1.34, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.11, y:  0.13, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'circle_r',
  },
  THURSDAY: {
    RightUpperArm: { x: -0.01, y: -0.02, z: -0.65 },
    RightForeArm:  { x:  1.34, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.11, y:  0.13, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0.6 },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'circle_r',
  },
  FRIDAY: {
    RightUpperArm: { x: -0.01, y: -0.02, z: -0.65 },
    RightForeArm:  { x:  1.34, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.11, y:  0.13, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'circle_r',
  },
  SATURDAY: {
    RightUpperArm: { x: -0.01, y: -0.02, z: -0.65 },
    RightForeArm:  { x:  1.34, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.11, y:  0.13, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 1.4 }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.6 },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'circle_r',
  },
  SUNDAY: {
    RightUpperArm: { x: -0.02, y: -0.03, z: -0.65 },
    RightForeArm:  { x:  1.32, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.11, y:  0.12, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    motion: 'circle_r',
  },
  RAIN: {
    RightUpperArm: { x: -0.01, y: -0.02, z: -0.92 },
    RightForeArm:  { x:  1.30, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.14, y:  0.05, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0.7 }, RightMiddle1: { x: 0, y: 0, z: 0.7 }, RightRing1: { x: 0, y: 0, z: 0.7 }, RightPinky1: { x: 0, y: 0, z: 0.7 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
  },
  SUN: {
    RightUpperArm: { x:  0.01, y:  0.03, z: -0.73 },
    RightForeArm:  { x:  1.56, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.25, y:  0.01, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
    motion: 'circle_r',
  },
  WIND: {
    RightUpperArm: { x: -0.02, y: -0.03, z: -0.65 },
    RightForeArm:  { x:  1.32, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.11, y:  0.12, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    motion: 'wave',
  },
  SNOW: {
    RightUpperArm: { x: -0.01, y: -0.02, z: -0.92 },
    RightForeArm:  { x:  1.30, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.14, y:  0.05, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  CAR: {
    RightUpperArm: { x: -0.02, y: -0.03, z: -0.54 },
    RightForeArm:  { x:  1.34, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.10, y:  0.10, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 1.4 }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.6 },
  },
  WALK: {
    RightUpperArm: { x:  0.01, y:  0.03, z: -0.36 },
    RightForeArm:  { x:  0.22, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.12, y: -0.05, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  BUS: {
    RightUpperArm: { x: -0.02, y: -0.03, z: -0.58 },
    RightForeArm:  { x:  1.32, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.10, y:  0.12, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  TRAIN: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.47 },
    RightForeArm:  { x:  0.70, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.07, y: -0.08, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
  },
  MONEY: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.47 },
    RightForeArm:  { x:  0.60, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.09, y: -0.08, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  PAY: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.47 },
    RightForeArm:  { x:  0.60, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.09, y: -0.08, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  FREE: {
    RightUpperArm: { x: -0.02, y: -0.03, z: -0.58 },
    RightForeArm:  { x:  1.37, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.12, y:  0.09, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  EXPENSIVE: {
    RightUpperArm: { x:  0.00, y:  0.01, z: -0.47 },
    RightForeArm:  { x:  0.60, y:  0.00, z:  0.00 },
    RightHand:     { x: -0.09, y: -0.08, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  MORE: {
    RightUpperArm: { x:  0.04, y:  0.06, z: -0.54 },
    RightForeArm:  { x:  1.32, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.10, y: -0.08, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
  },
  FOUR: {
    RightUpperArm: { x:  0.01, y:  0.03, z: -0.73 },
    RightForeArm:  { x:  1.54, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.25, y:  0.00, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0.7 }, RightMiddle1: { x: 0, y: 0, z: 0.7 }, RightRing1: { x: 0, y: 0, z: 0.7 }, RightPinky1: { x: 0, y: 0, z: 0.7 }, RightThumb1: { x: 0, y: 0, z: 0.7 },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  SIX: {
    RightUpperArm: { x:  0.01, y:  0.03, z: -0.73 },
    RightForeArm:  { x:  1.54, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.25, y:  0.00, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  SEVEN: {
    RightUpperArm: { x:  0.01, y:  0.03, z: -0.73 },
    RightForeArm:  { x:  1.54, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.25, y:  0.00, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0.6 },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  EIGHT: {
    RightUpperArm: { x:  0.01, y:  0.03, z: -0.73 },
    RightForeArm:  { x:  1.54, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.25, y:  0.00, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  NINE: {
    RightUpperArm: { x:  0.01, y:  0.03, z: -0.73 },
    RightForeArm:  { x:  1.54, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.25, y:  0.00, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 0   }, RightMiddle1: { x: 0, y: 0, z: 0   }, RightRing1: { x: 0, y: 0, z: 0   }, RightPinky1: { x: 0, y: 0, z: 0   }, RightThumb1: { x: 0, y: 0, z: 0   },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },
  ZERO: {
    RightUpperArm: { x:  0.01, y:  0.03, z: -0.73 },
    RightForeArm:  { x:  1.54, y:  0.00, z:  0.00 },
    RightHand:     { x:  0.25, y:  0.00, z:  0.00 },
    RightIndex1: { x: 0, y: 0, z: 1.4 }, RightMiddle1: { x: 0, y: 0, z: 1.4 }, RightRing1: { x: 0, y: 0, z: 1.4 }, RightPinky1: { x: 0, y: 0, z: 1.4 }, RightThumb1: { x: 0, y: 0, z: 0.6 },
    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },
    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },
  },

  // ── Fingerspelling A–Z ───────────────────────────────────────────────────────
  // Shared arm position: hand held at face height on the right side.
  // rHand drives ProceduralHand shape directly.
  FS_A: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'A' },
  FS_B: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'FLAT' },
  FS_C: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'C' },
  FS_D: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'D' },
  FS_E: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'CLAW' },
  FS_F: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'F' },
  FS_G: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'L' },
  FS_H: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'H' },
  FS_I: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'PINKY' },
  FS_J: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'PINKY' },
  FS_K: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'K' },
  FS_L: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'L' },
  FS_M: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'FIST' },
  FS_N: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'FIST' },
  FS_O: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'O' },
  FS_P: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'K' },
  FS_Q: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'L' },
  FS_R: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'V' },
  FS_S: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'S' },
  FS_T: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'FIST' },
  FS_U: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'U' },
  FS_V: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'V' },
  FS_W: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'W' },
  FS_X: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'X' },
  FS_Y: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'Y' },
  FS_Z: { RightUpperArm:{x:0.6,y:-0.2,z:-0.4}, RightForeArm:{x:1.2,y:0,z:0}, RightHand:{x:0,y:0,z:0}, LeftUpperArm:{x:0.1,y:0,z:0.1}, LeftForeArm:{x:0.15,y:0,z:0}, rHand:'INDEX' },

};

export const WORD_TO_POSE_KEY = {
  // Greetings
  hello: 'HELLO', hi: 'HI', hey: 'HELLO', howdy: 'HELLO',
  goodbye: 'GOODBYE', 'good bye': 'GOODBYE', bye: 'GOODBYE',
  'see you later': 'SEE_YOU_LATER',
  welcome: 'WELCOME',
  'nice to meet you': 'NICE_TO_MEET_YOU',
  // Politeness
  'thank you': 'THANK_YOU', thank: 'THANK_YOU', thanks: 'THANKS',
  please: 'PLEASE', sorry: 'SORRY', 'excuse me': 'EXCUSE_ME',
  // Responses
  yes: 'YES', yeah: 'YEAH', no: 'NO', ok: 'YES', okay: 'YES',
  // Pronouns
  me: 'ME', i: 'I', you: 'YOU',
  // Common signs (direct sign-mapper key → pose key)
  help: 'HELP', stop: 'STOP', finish: 'FINISH', again: 'AGAIN',
  wait: 'WAIT', give: 'GIVE', make: 'MAKE', go: 'GO', come: 'COME',
  // Questions
  what: 'WHAT', who: 'WHO', why: 'WHY', how: 'HOW', when: 'WHEN',
  where: 'WHERE',
  // Cognition/emotion
  understand: 'UNDERSTAND', know: 'KNOW', think: 'THINK',
  feel: 'FEEL', like: 'LIKE', love: 'LOVE', want: 'WANT', need: 'NEED',
  have: 'HAVE', see: 'SEE', hear: 'HEAR', speak: 'SPEAK',
  // Descriptors
  good: 'GOOD', bad: 'BAD', big: 'BIG', small: 'SMALL',
  happy: 'HAPPY', sad: 'SAD', same: 'SAME', different: 'DIFFERENT',
  // Time
  today: 'TODAY', now: 'NOW', later: 'LATER', tomorrow: 'TOMORROW',
  time: 'TIME',
  // Places/things
  home: 'HOME', work: 'WORK', school: 'SCHOOL',
  food: 'FOOD', water: 'WATER', money: 'MONEY',
  // People
  person: 'PERSON', family: 'FAMILY', name: 'NAME',
  // Actions
  learn: 'LEARN', teach: 'TEACH', read: 'READ', write: 'WRITE',
  question: 'QUESTION',
  // Greetings (alias)
  'good morning': 'GOOD_MORNING',
  'good night': 'GOOD_NIGHT', goodnight: 'GOOD_NIGHT',
  'you\'re welcome': 'YOU_RE_WELCOME', 'youre welcome': 'YOU_RE_WELCOME',
  'nice to meet': 'NICE_TO_MEET_YOU',
  'see you': 'SEE_YOU_LATER',

  // Education / academic
  student: 'STUDENT', students: 'STUDENT',
  teacher: 'TEACHER', instructor: 'TEACHER', professor: 'TEACHER',
  class: 'CLASS', course: 'CLASS', lesson: 'CLASS',
  study: 'STUDY', studying: 'STUDY', review: 'STUDY',
  homework: 'HOMEWORK', assignment: 'ASSIGNMENT',
  test: 'TEST', quiz: 'TEST', exam: 'EXAM', examination: 'EXAM',
  lecture: 'LECTURE', lectures: 'LECTURE',
  grade: 'GRADE', grades: 'GRADE', score: 'GRADE',
  university: 'UNIVERSITY', college: 'UNIVERSITY', school: 'SCHOOL',
  book: 'BOOK', books: 'BOOK', textbook: 'BOOK',
  deadline: 'DEADLINE', due: 'DEADLINE',
  correct: 'CORRECT', wrong: 'WRONG', mistake: 'WRONG',
  difficult: 'DIFFICULT', hard: 'DIFFICULT', easy: 'EASY',
  practice: 'PRACTICE',

  // Time expressions
  yesterday: 'YESTERDAY', morning: 'MORNING', night: 'NIGHT',
  week: 'WEEK', soon: 'SOON', start: 'START', begin: 'START',

  // States / emotions
  tired: 'TIRED', excited: 'EXCITED', important: 'IMPORTANT',
  better: 'BETTER', worse: 'WORSE',

  // People / community
  friend: 'FRIEND', friends: 'FRIEND',
  deaf: 'DEAF', hearing: 'HEARING',
  brother: 'BROTHER', sister: 'SISTER', baby: 'BABY', children: 'CHILDREN',
  doctor: 'DOCTOR', nurse: 'DOCTOR',

  // Technology
  computer: 'COMPUTER', laptop: 'COMPUTER',
  internet: 'INTERNET', online: 'INTERNET', website: 'INTERNET',
  phone: 'PHONE', mobile: 'PHONE', video: 'VIDEO',
  caption: 'CAPTION', subtitle: 'CAPTION', subtitles: 'CAPTION',
  translate: 'TRANSLATE', translation: 'TRANSLATE',

  // Actions / verbs
  answer: 'ANSWER', ask: 'ASK', call: 'CALL', change: 'CHANGE',
  choose: 'CHOOSE', pick: 'CHOOSE', continue: 'CONTINUE', keep: 'CONTINUE',
  cook: 'COOK', bring: 'BRING', carry: 'BRING',
  close: 'CLOSE_ACTION', open: 'OPEN_ACTION',
  down: 'DOWN', up: 'UP',
  always: 'ALWAYS', never: 'NEVER', before: 'BEFORE', after: 'AFTER',
  different: 'DIFFERENT', same: 'SAME',
  cold: 'COLD', hot: 'HOT',
  blue: 'BLUE', black: 'BLACK', white: 'WHITE', red: 'RED',
  beautiful: 'BEAUTIFUL', pretty: 'BEAUTIFUL',
  car: 'CAR', bus: 'BUS',
  ok: 'OK', okay: 'OK', 'all right': 'OK',
  'i understand': 'I_UNDERSTAND', understood: 'I_UNDERSTAND',
  'i don\'t understand': 'I_DONT_UNDERSTAND',
  'repeat please': 'REPEAT_PLEASE', 'say again': 'REPEAT_PLEASE',
  'can you help': 'CAN_YOU_HELP',
}

export const NEUTRAL_POOL = [
  'NEUTRAL_LOW', 'NEUTRAL_MID', 'NEUTRAL_HIGH', 'NEUTRAL_WIDE',
  'NEUTRAL_CHEST', 'NEUTRAL_POINT', 'NEUTRAL_THINK', 'NEUTRAL_BOTH_UP',
];
