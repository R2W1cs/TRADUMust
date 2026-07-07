/**
 * SignBridge — ProceduralHand
 *
 * Builds a realistic animated 3D hand from Three.js primitives.
 * Completely independent of the avatar GLB's bone structure — no naming
 * convention issues, no axis ambiguity, full control over every joint.
 *
 * Usage:
 *   const hand = new ProceduralHand('right', scene, { color: 0xfcd5b0 });
 *   hand.setShape('V');          // snap
 *   hand.setShapeSmooth('FIST'); // animated
 *   // in render loop:
 *   hand.update(delta);
 *   hand.syncToWristBone(wristBone); // follow avatar wrist
 */

import * as THREE from './lib/three.module.js';

// ── Geometry constants (metres, real hand proportions) ─────────────────────
const PALM_W  = 0.075;  // palm width
const PALM_H  = 0.085;  // palm height (wrist→knuckles)
const PALM_D  = 0.020;  // palm depth (back to front)

// Finger base positions on palm (local X across palm, Y up from wrist)
// Right hand: thumb on left (−X), pinky on right (+X)
const FINGER_BASES = {
  thumb:  { x: -0.036, y:  0.040 },
  index:  { x: -0.026, y:  0.085 },
  middle: { x: -0.006, y:  0.090 },
  ring:   { x:  0.014, y:  0.085 },
  pinky:  { x:  0.031, y:  0.074 },
};

// Segment lengths [proximal, middle, distal] in metres
const FINGER_LENGTHS = {
  thumb:  [0.042, 0.028, 0.022],
  index:  [0.038, 0.024, 0.018],
  middle: [0.043, 0.026, 0.020],
  ring:   [0.038, 0.024, 0.018],
  pinky:  [0.028, 0.018, 0.014],
};

// Segment radii [proximal, middle, distal]
const FINGER_RADII = {
  thumb:  [0.010, 0.009, 0.008],
  index:  [0.009, 0.008, 0.007],
  middle: [0.009, 0.008, 0.007],
  ring:   [0.008, 0.007, 0.006],
  pinky:  [0.007, 0.006, 0.005],
};

// Default resting angle offset from straight (thumb sits at an angle)
const FINGER_REST_ANGLE = {
  thumb:  -0.52,  // ~30° outward in rest position
  index:  0,
  middle: 0,
  ring:   0,
  pinky:  0,
};

// ── ASL Handshape Definitions ──────────────────────────────────────────────
// Format per finger: { mcp, pip, dip } curl in DEGREES (0=straight, 90=curled)
// thumb: { mcp, ip, abd } where abd = abduction (outward spread)
// spread: lateral separation between fingers in degrees

const DEG = Math.PI / 180;

const SHAPES = {

  // ── Open / flat hands ────────────────────────────────────────────────────
  FLAT: {
    thumb:  { mcp:  5, ip:  0, abd: 30 },
    index:  { mcp:  0, pip:  0, dip:  0, spread:  0 },
    middle: { mcp:  0, pip:  0, dip:  0, spread:  0 },
    ring:   { mcp:  0, pip:  0, dip:  0, spread:  0 },
    pinky:  { mcp:  0, pip:  0, dip:  0, spread:  0 },
  },

  OPEN: {  // fingers spread wide
    thumb:  { mcp:  5, ip:  0, abd: 40 },
    index:  { mcp:  0, pip:  0, dip:  0, spread: -15 },
    middle: { mcp:  0, pip:  0, dip:  0, spread:  -5 },
    ring:   { mcp:  0, pip:  0, dip:  0, spread:   5 },
    pinky:  { mcp:  0, pip:  0, dip:  0, spread:  15 },
  },

  // ── Fist / closed hands ───────────────────────────────────────────────────
  FIST: {
    thumb:  { mcp: 45, ip: 30, abd:  0 },
    index:  { mcp: 85, pip: 90, dip: 65, spread:  0 },
    middle: { mcp: 85, pip: 90, dip: 65, spread:  0 },
    ring:   { mcp: 85, pip: 90, dip: 65, spread:  0 },
    pinky:  { mcp: 85, pip: 90, dip: 65, spread:  0 },
  },

  A: {  // fist with thumb to side
    thumb:  { mcp: 30, ip: 20, abd: 10 },
    index:  { mcp: 85, pip: 90, dip: 65, spread:  0 },
    middle: { mcp: 85, pip: 90, dip: 65, spread:  0 },
    ring:   { mcp: 85, pip: 90, dip: 65, spread:  0 },
    pinky:  { mcp: 85, pip: 90, dip: 65, spread:  0 },
  },

  S: {  // fist with thumb over fingers
    thumb:  { mcp: 55, ip: 35, abd: -5 },
    index:  { mcp: 90, pip: 90, dip: 70, spread:  0 },
    middle: { mcp: 90, pip: 90, dip: 70, spread:  0 },
    ring:   { mcp: 90, pip: 90, dip: 70, spread:  0 },
    pinky:  { mcp: 90, pip: 90, dip: 70, spread:  0 },
  },

  // ── Index pointing ────────────────────────────────────────────────────────
  INDEX: {
    thumb:  { mcp: 40, ip: 25, abd: 20 },
    index:  { mcp:  0, pip:  0, dip:  0, spread:  0 },
    middle: { mcp: 90, pip: 90, dip: 65, spread:  0 },
    ring:   { mcp: 90, pip: 90, dip: 65, spread:  0 },
    pinky:  { mcp: 90, pip: 90, dip: 65, spread:  0 },
  },

  D: {  // D-hand: index up, others curled, thumb touches middle
    thumb:  { mcp: 20, ip: 10, abd:  5 },
    index:  { mcp:  0, pip:  0, dip:  0, spread:  0 },
    middle: { mcp: 75, pip: 85, dip: 60, spread:  0 },
    ring:   { mcp: 80, pip: 90, dip: 65, spread:  0 },
    pinky:  { mcp: 85, pip: 90, dip: 65, spread:  0 },
  },

  // ── V / peace / scissors ─────────────────────────────────────────────────
  V: {
    thumb:  { mcp: 30, ip: 15, abd: 25 },
    index:  { mcp:  0, pip:  0, dip:  0, spread: -12 },
    middle: { mcp:  0, pip:  0, dip:  0, spread:  12 },
    ring:   { mcp: 85, pip: 90, dip: 65, spread:   0 },
    pinky:  { mcp: 85, pip: 90, dip: 65, spread:   0 },
  },

  U: {  // index+middle together and up
    thumb:  { mcp: 35, ip: 20, abd: 15 },
    index:  { mcp:  0, pip:  0, dip:  0, spread: -4 },
    middle: { mcp:  0, pip:  0, dip:  0, spread:  4 },
    ring:   { mcp: 85, pip: 90, dip: 65, spread:  0 },
    pinky:  { mcp: 85, pip: 90, dip: 65, spread:  0 },
  },

  H: {  // index+middle horizontal
    thumb:  { mcp: 35, ip: 20, abd: 15 },
    index:  { mcp:  0, pip:  0, dip:  0, spread: -4 },
    middle: { mcp:  0, pip:  0, dip:  0, spread:  4 },
    ring:   { mcp: 85, pip: 90, dip: 65, spread:  0 },
    pinky:  { mcp: 85, pip: 90, dip: 65, spread:  0 },
  },

  // ── Three fingers ─────────────────────────────────────────────────────────
  W: {
    thumb:  { mcp: 40, ip: 25, abd: 10 },
    index:  { mcp:  0, pip:  0, dip:  0, spread: -15 },
    middle: { mcp:  0, pip:  0, dip:  0, spread:   0 },
    ring:   { mcp:  0, pip:  0, dip:  0, spread:  15 },
    pinky:  { mcp: 85, pip: 90, dip: 65, spread:   0 },
  },

  // ── L-hand ───────────────────────────────────────────────────────────────
  L: {
    thumb:  { mcp:  0, ip:  0, abd: 80 },  // thumb fully extended upward
    index:  { mcp:  0, pip:  0, dip:  0, spread:  0 },
    middle: { mcp: 85, pip: 90, dip: 65, spread:  0 },
    ring:   { mcp: 85, pip: 90, dip: 65, spread:  0 },
    pinky:  { mcp: 85, pip: 90, dip: 65, spread:  0 },
  },

  // ── Y-hand (shaka / ILY thumb+pinky) ─────────────────────────────────────
  Y: {
    thumb:  { mcp:  5, ip:  0, abd: 50 },
    index:  { mcp: 85, pip: 90, dip: 65, spread:  0 },
    middle: { mcp: 85, pip: 90, dip: 65, spread:  0 },
    ring:   { mcp: 85, pip: 90, dip: 65, spread:  0 },
    pinky:  { mcp:  0, pip:  0, dip:  0, spread:  0 },
  },

  // ── ILY (I Love You — thumb + index + pinky) ─────────────────────────────
  ILY: {
    thumb:  { mcp:  5, ip:  0, abd: 50 },
    index:  { mcp:  0, pip:  0, dip:  0, spread: -5 },
    middle: { mcp: 85, pip: 90, dip: 65, spread:  0 },
    ring:   { mcp: 85, pip: 90, dip: 65, spread:  0 },
    pinky:  { mcp:  0, pip:  0, dip:  0, spread:  5 },
  },

  // ── Horns (index + pinky) ─────────────────────────────────────────────────
  HORNS: {
    thumb:  { mcp: 35, ip: 20, abd: 15 },
    index:  { mcp:  0, pip:  0, dip:  0, spread: -5 },
    middle: { mcp: 85, pip: 90, dip: 65, spread:  0 },
    ring:   { mcp: 85, pip: 90, dip: 65, spread:  0 },
    pinky:  { mcp:  0, pip:  0, dip:  0, spread:  5 },
  },

  // ── C-hand (curved, like holding a ball) ──────────────────────────────────
  C: {
    thumb:  { mcp: 20, ip: 10, abd: 40 },
    index:  { mcp: 45, pip: 45, dip: 30, spread: -5 },
    middle: { mcp: 45, pip: 45, dip: 30, spread:  0 },
    ring:   { mcp: 45, pip: 45, dip: 30, spread:  0 },
    pinky:  { mcp: 45, pip: 45, dip: 30, spread:  5 },
  },

  // ── O-hand (all fingers touch thumb tip) ─────────────────────────────────
  O: {
    thumb:  { mcp: 50, ip: 35, abd: 20 },
    index:  { mcp: 70, pip: 75, dip: 55, spread:  0 },
    middle: { mcp: 70, pip: 75, dip: 55, spread:  0 },
    ring:   { mcp: 70, pip: 75, dip: 55, spread:  0 },
    pinky:  { mcp: 65, pip: 70, dip: 50, spread:  0 },
  },

  // ── F-hand (index+thumb circle, rest extended) ────────────────────────────
  F: {
    thumb:  { mcp: 40, ip: 25, abd:  5 },
    index:  { mcp: 65, pip: 70, dip: 50, spread:  0 },
    middle: { mcp:  0, pip:  0, dip:  0, spread: -5 },
    ring:   { mcp:  0, pip:  0, dip:  0, spread:  5 },
    pinky:  { mcp:  0, pip:  0, dip:  0, spread: 12 },
  },

  // ── X-hook (index hooks) ──────────────────────────────────────────────────
  X: {
    thumb:  { mcp: 35, ip: 20, abd: 15 },
    index:  { mcp: 30, pip: 70, dip: 50, spread:  0 },
    middle: { mcp: 85, pip: 90, dip: 65, spread:  0 },
    ring:   { mcp: 85, pip: 90, dip: 65, spread:  0 },
    pinky:  { mcp: 85, pip: 90, dip: 65, spread:  0 },
  },

  // ── Bent (all fingers bent at MCP, like knocking) ────────────────────────
  BENT: {
    thumb:  { mcp: 25, ip: 15, abd: 20 },
    index:  { mcp: 60, pip: 30, dip: 10, spread:  0 },
    middle: { mcp: 60, pip: 30, dip: 10, spread:  0 },
    ring:   { mcp: 60, pip: 30, dip: 10, spread:  0 },
    pinky:  { mcp: 60, pip: 30, dip: 10, spread:  0 },
  },

  // ── K-hand (index+middle up, thumb between them) ─────────────────────────
  K: {
    thumb:  { mcp: 10, ip:  5, abd: 25 },
    index:  { mcp:  0, pip:  0, dip:  0, spread: -8 },
    middle: { mcp: 20, pip: 10, dip:  5, spread:  8 },
    ring:   { mcp: 85, pip: 90, dip: 65, spread:  0 },
    pinky:  { mcp: 85, pip: 90, dip: 65, spread:  0 },
  },

  // ── Relaxed / natural rest ────────────────────────────────────────────────
  REST: {
    thumb:  { mcp: 15, ip:  8, abd: 25 },
    index:  { mcp: 20, pip: 15, dip: 10, spread: -3 },
    middle: { mcp: 20, pip: 15, dip: 10, spread:  0 },
    ring:   { mcp: 22, pip: 18, dip: 12, spread:  3 },
    pinky:  { mcp: 25, pip: 20, dip: 14, spread:  7 },
  },

  // ── PINKY (I-hand / J-hand: only pinky extended) ─────────────────────────
  PINKY: {
    thumb:  { mcp: 40, ip: 25, abd: 10 },
    index:  { mcp: 85, pip: 90, dip: 65, spread:  0 },
    middle: { mcp: 85, pip: 90, dip: 65, spread:  0 },
    ring:   { mcp: 85, pip: 90, dip: 65, spread:  0 },
    pinky:  { mcp:  0, pip:  0, dip:  0, spread:  0 },
  },

  // ── CLAW (E-hand: all fingers bent, thumb tucked) ────────────────────────
  CLAW: {
    thumb:  { mcp: 45, ip: 30, abd:  5 },
    index:  { mcp: 70, pip: 65, dip: 50, spread:  0 },
    middle: { mcp: 70, pip: 65, dip: 50, spread:  0 },
    ring:   { mcp: 70, pip: 65, dip: 50, spread:  0 },
    pinky:  { mcp: 65, pip: 60, dip: 45, spread:  0 },
  },
};

// Map sign-mapper hand shape strings to SHAPES keys
const SHAPE_ALIASES = {
  'FLAT':    'FLAT',   'OPEN': 'OPEN',  'B': 'FLAT',  'FLAT_B': 'FLAT',
  'FIST':    'FIST',   'S': 'S',        'A': 'A',      'E': 'CLAW',
  'V':       'V',      'U': 'U',        'H': 'H',
  'INDEX':   'INDEX',  'D': 'D',        'G': 'INDEX',  'POINT': 'INDEX',
  'W':       'W',
  'L':       'L',
  'Y':       'Y',      'ILY': 'ILY',   'HORNS': 'HORNS',
  'C':       'C',      'O': 'O',
  'F':       'F',      'OK': 'F',
  'X':       'X',      'HOOK': 'X',
  'BENT':    'BENT',   'RELAXED': 'REST', 'CLAW': 'CLAW',
  'K':       'K',      'R': 'V',
  'N':       'FIST',   'T': 'FIST',   'M': 'FIST',
  'PINKY':   'PINKY',  'I': 'PINKY',
};

// ── ProceduralHand ─────────────────────────────────────────────────────────
export class ProceduralHand {
  /**
   * @param {'right'|'left'} side
   * @param {THREE.Scene} scene
   * @param {object} opts
   * @param {number} opts.color - skin hex color (default: light skin)
   * @param {number} opts.scale - overall scale multiplier (default: 1)
   */
  constructor(side, scene, opts = {}) {
    this.side    = side;
    this.scene   = scene;
    this.scale   = opts.scale || 1.0;
    this._mirror = side === 'left' ? -1 : 1;

    this._currentAngles = null;  // { thumb, index, middle, ring, pinky }
    this._targetAngles  = null;
    this._lerpT    = 1;
    this._lerpDur  = 0.22;  // seconds

    this._material = new THREE.MeshStandardMaterial({
      color:     opts.color ?? 0xfcd5b0,
      roughness: 0.35,
      metalness: 0.05,
    });

    this.group = new THREE.Group();
    this.group.name = `ProceduralHand_${side}`;
    scene.add(this.group);

    this._segments = {};  // finger → [seg0Group, seg1Group, seg2Group]
    this._build();
    this.setShape('REST');
    this._applyAnglesInstant(this._targetAngles);
  }

  // ── Build geometry ────────────────────────────────────────────────────────

  _build() {
    // Palm
    const palmGeo = new THREE.BoxGeometry(
      PALM_W, PALM_H, PALM_D, 1, 1, 1
    );
    const palmMesh = new THREE.Mesh(palmGeo, this._material);
    palmMesh.position.set(0, PALM_H / 2, 0);
    palmMesh.castShadow = true;
    this.group.add(palmMesh);

    // Fingers
    const fingers = ['thumb', 'index', 'middle', 'ring', 'pinky'];
    for (const name of fingers) {
      const base   = FINGER_BASES[name];
      const lens   = FINGER_LENGTHS[name];
      const radii  = FINGER_RADII[name];

      // Root pivot at knuckle position
      const root = new THREE.Group();
      root.name = `${name}_root`;
      root.position.set(
        base.x * this._mirror,
        base.y,
        0
      );
      this.group.add(root);

      const segs = [];
      let parent = root;

      for (let i = 0; i < 3; i++) {
        // Pivot group (rotation applied here)
        const pivot = new THREE.Group();
        pivot.name = `${name}_seg${i}_pivot`;

        // Mesh offset so geometry extends from pivot upward
        const geo  = this._makeCapsule(radii[i], lens[i]);
        const mesh = new THREE.Mesh(geo, this._material);
        mesh.position.set(0, lens[i] / 2, 0);
        mesh.castShadow = true;

        pivot.add(mesh);

        // Small sphere at joint for visual continuity
        const jointGeo  = new THREE.SphereGeometry(radii[i] * 1.05, 8, 6);
        const jointMesh = new THREE.Mesh(jointGeo, this._material);
        pivot.add(jointMesh);

        parent.add(pivot);

        segs.push(pivot);

        // Next segment's parent is at tip of current segment
        const nextParent = new THREE.Group();
        nextParent.position.set(0, lens[i], 0);
        pivot.add(nextParent);
        parent = nextParent;
      }

      this._segments[name] = segs;
    }
  }

  _makeCapsule(radius, length) {
    // CapsuleGeometry(radius, length, capSegments, radialSegments)
    if (THREE.CapsuleGeometry) {
      return new THREE.CapsuleGeometry(radius, length - radius * 2, 3, 8);
    }
    // Fallback for older Three.js: cylinder
    return new THREE.CylinderGeometry(radius, radius * 1.1, length, 8);
  }

  // ── Pose API ──────────────────────────────────────────────────────────────

  /** Immediately snap to a named handshape. */
  setShape(shapeName) {
    const angles = this._resolveShape(shapeName);
    this._targetAngles  = angles;
    this._currentAngles = angles;
    this._lerpT = 1;
    this._applyAnglesInstant(angles);
  }

  /** Smoothly animate to a named handshape. */
  setShapeSmooth(shapeName, duration) {
    const angles = this._resolveShape(shapeName);
    if (!this._currentAngles) {
      this.setShape(shapeName);
      return;
    }
    this._targetAngles = angles;
    this._lerpDur = duration ?? 0.22;
    this._lerpT   = 0;
  }

  _resolveShape(name) {
    const key = SHAPE_ALIASES[name] || name;
    return SHAPES[key] || SHAPES.REST;
  }

  // ── Update (call every frame) ─────────────────────────────────────────────

  update(delta) {
    if (this._lerpT < 1 && this._targetAngles) {
      this._lerpT = Math.min(this._lerpT + delta / this._lerpDur, 1);
      const t = _easeInOut(this._lerpT);
      const blended = _blendAngles(this._currentAngles, this._targetAngles, t);
      this._applyAnglesInstant(blended);
      if (this._lerpT >= 1) {
        this._currentAngles = this._targetAngles;
      }
    }
  }

  // ── Sync position to avatar wrist bone ───────────────────────────────────

  /**
   * Call every frame after the avatar's AnimationMixer has updated.
   * Positions and orients the procedural hand to match the avatar wrist.
   *
   * @param {THREE.Bone} wristBone  - the avatar's wrist/hand bone
   * @param {number}     modelScale - avatar model world scale stored during load.
   *   Passed explicitly because zeroed-out finger bone children can make
   *   matrixWorld decompose return incorrect scale on some rigs.
   */
  syncToWristBone(wristBone, modelScale) {
    if (!wristBone) return;

    const pos  = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    wristBone.getWorldPosition(pos);
    wristBone.getWorldQuaternion(quat);

    this.group.position.copy(pos);
    this.group.quaternion.copy(quat);

    const s = (modelScale && modelScale > 0) ? modelScale : 1;
    this.group.scale.setScalar(s * this.scale);
  }

  // ── Internal angle application ────────────────────────────────────────────

  _applyAnglesInstant(angles) {
    if (!angles) return;
    const m = this._mirror;

    this._applyFinger('index',  angles.index,  m);
    this._applyFinger('middle', angles.middle, m);
    this._applyFinger('ring',   angles.ring,   m);
    this._applyFinger('pinky',  angles.pinky,  m);
    this._applyThumb(angles.thumb, m);
  }

  _applyFinger(name, data, mirror) {
    if (!data || !this._segments[name]) return;
    const [seg0, seg1, seg2] = this._segments[name];
    const spread = (data.spread || 0) * DEG * mirror;

    // MCP: curl + lateral spread
    seg0.rotation.set(data.mcp * DEG, 0, spread);
    // PIP: curl only
    seg1.rotation.set(data.pip * DEG, 0, 0);
    // DIP: curl only (auto-couple to ~70% of PIP if not specified)
    seg2.rotation.set((data.dip ?? data.pip * 0.7) * DEG, 0, 0);
  }

  _applyThumb(data, mirror) {
    if (!data || !this._segments.thumb) return;
    const [seg0, seg1, seg2] = this._segments.thumb;

    // Thumb MCP: abduction (Z in local space) + curl (X)
    const abd = (data.abd || 0) * DEG * mirror;
    seg0.rotation.set(data.mcp * DEG, 0, abd + FINGER_REST_ANGLE.thumb * mirror);
    // Thumb IP: curl
    seg1.rotation.set((data.ip || 0) * DEG, 0, 0);
    seg2.rotation.set((data.ip || 0) * 0.5 * DEG, 0, 0);
  }

  // ── Visibility ────────────────────────────────────────────────────────────

  show() { this.group.visible = true;  }
  hide() { this.group.visible = false; }

  /** Update skin color (e.g. to match avatar skin tone). */
  setSkinColor(hexColor) {
    this._material.color.setHex(hexColor);
  }

  dispose() {
    this.scene.remove(this.group);
    this._material.dispose();
    this.group.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
    });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function _easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function _lerpAngle(a, b, t) {
  return a + (b - a) * t;
}

function _blendFinger(fa, fb, t) {
  if (!fa || !fb) return fb || fa;
  return {
    mcp:    _lerpAngle(fa.mcp    ?? 0, fb.mcp    ?? 0, t),
    pip:    _lerpAngle(fa.pip    ?? 0, fb.pip    ?? 0, t),
    dip:    _lerpAngle(fa.dip    ?? 0, fb.dip    ?? 0, t),
    spread: _lerpAngle(fa.spread ?? 0, fb.spread ?? 0, t),
  };
}

function _blendThumb(ta, tb, t) {
  if (!ta || !tb) return tb || ta;
  return {
    mcp: _lerpAngle(ta.mcp ?? 0, tb.mcp ?? 0, t),
    ip:  _lerpAngle(ta.ip  ?? 0, tb.ip  ?? 0, t),
    abd: _lerpAngle(ta.abd ?? 0, tb.abd ?? 0, t),
  };
}

function _blendAngles(a, b, t) {
  return {
    thumb:  _blendThumb(a.thumb,  b.thumb,  t),
    index:  _blendFinger(a.index,  b.index,  t),
    middle: _blendFinger(a.middle, b.middle, t),
    ring:   _blendFinger(a.ring,   b.ring,   t),
    pinky:  _blendFinger(a.pinky,  b.pinky,  t),
  };
}

// Export shape names for use in pose-library
export { SHAPES, SHAPE_ALIASES };
