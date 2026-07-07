/**
 * SignBridge — 3D Avatar Controller (Pure Procedural Floating Hands Edition)
 * Runs inside extension/3d/avatar3d.html as an ES module iframe.
 *
 * Provides ultra-fast startup (0ms asset load), maximum screen real estate,
 * and pristine readability by rendering stylish holographic arms and high-resolution
 * procedural fingers spelling ASL letters.
 *
 * Communication (postMessage from content script):
 *   Parent → iframe:  { type: 'SB_POSE', key: 'HELLO' }
 *   Parent → iframe:  { type: 'SB_IDLE' }
 *   Parent → iframe:  { type: 'SB_PING' }
 *   Iframe → parent:  { type: 'SB_PONG', ready: bool }
 *   Iframe → parent:  { type: 'SB_POSE_ACK', key: string }
 */

import * as THREE from './lib/three.module.js';
import { GLTFLoader } from './lib/GLTFLoader.js';
import { POSES, BONE_ALIASES, MOTION_CONFIGS, MOTION_CSS_MAP, WORD_TO_POSE_KEY, NEUTRAL_POOL } from './pose-library.js?v=3';
import { ProceduralHand } from './procedural-hand.js';

const RENDER_MODE = new URLSearchParams(location.search).get('mode') || 'hands';

// ── Constants ─────────────────────────────────────────────────────────────────
const LERP_DURATION   = 0.28;  // seconds for pose transition

// Hands mode: tight framing on both signing hands
const HANDS_CAMERA_POS    = new THREE.Vector3(0, 1.08, 1.95);
const HANDS_CAMERA_TARGET = new THREE.Vector3(0, 1.02, 0);
const HANDS_FOV           = 52;

// Model mode: upper-body framing for full GLB avatar
const MODEL_CAMERA_POS    = new THREE.Vector3(0, 1.35, 2.65);
const MODEL_CAMERA_TARGET = new THREE.Vector3(0, 1.15, 0);
const MODEL_FOV           = 38;

const CAMERA_POS    = RENDER_MODE === 'model' ? MODEL_CAMERA_POS    : HANDS_CAMERA_POS;
const CAMERA_TARGET = RENDER_MODE === 'model' ? MODEL_CAMERA_TARGET : HANDS_CAMERA_TARGET;
const CAMERA_FOV    = RENDER_MODE === 'model' ? MODEL_FOV           : HANDS_FOV;

// Brings procedural hands slightly toward the camera (applied once per sync, not accumulated)
const HAND_FORWARD_Z  = 0.08;
const ZOOM_MIN        = 0.5;
const ZOOM_MAX        = 3.0;
const ZOOM_STEP_IN    = 0.82;  // multiply distance by this to zoom in
const ZOOM_STEP_OUT   = 1.22;  // multiply distance by this to zoom out

// ── Avatar3D class ────────────────────────────────────────────────────────────
class Avatar3D {
  constructor(mode = 'hands') {
    this.mode = mode;
    this.renderer   = null;
    this.scene      = null;
    this.camera     = null;
    this.clock      = new THREE.Clock();
    this.mixer      = null;        // THREE.AnimationMixer (not needed without GLB)
    this.bones      = {};          // role → THREE.Group
    this.rawBones   = {};          // Empty placeholder

    this.fromRots   = {};          // snapshot of rotations at transition start
    this.toPose     = null;        // target pose object
    this.lerpT      = 1;           // 0→1 progress; 1 = done

    this.motionTime     = 0;
    this.activeMotion   = null;
    this._pendingMotion = null;

    this.currentKey  = 'REST';
    this.ready       = false;

    this.rightHand   = null;
    this.leftHand    = null;
    this._modelRoot  = null;
    this._modelScale = 1.0;
    this._handOffset = new THREE.Vector3(0, 0, HAND_FORWARD_Z);
    this._fingerspellQueue = [];  // remaining letters when fingerspelling a word
  }

  // ── Initialisation ───────────────────────────────────────────────────────────

  async init() {
    this._setupRenderer();
    this._setupScene();
    this._setupCamera();
    this._setupLights();
    await this._loadAvatar();
    this._startLoop();
    this._listenMessages();
  }

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    // Transparent background lets user page overlays show behind hands
  }

  _setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      CAMERA_FOV, window.innerWidth / window.innerHeight, 0.1, 50
    );
    this.camera.position.copy(CAMERA_POS);
    this.camera.lookAt(CAMERA_TARGET);
  }

  _setupLights() {
    // Soft ambient light
    this.scene.add(new THREE.AmbientLight(0xd0d8ff, 0.9));

    // Key light (front-left, slightly above)
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(1.5, 3, 2);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    this.scene.add(key);

    // Fill light (right)
    const fill = new THREE.DirectionalLight(0x8899ff, 0.5);
    fill.position.set(-2, 1.5, 1);
    this.scene.add(fill);

    // Rim light (deep violet glow to fit the academic brand aesthetics)
    const rim = new THREE.DirectionalLight(0x8264ff, 0.45);
    rim.position.set(0, 2, -3);
    this.scene.add(rim);
  }

  async _loadAvatar() {
    if (this.mode === 'model') {
      return this._loadGLBAvatar();
    }
    return this._loadProceduralHandsAvatar();
  }

  async _loadProceduralHandsAvatar() {
    return new Promise((resolve) => {
      this._buildProgrammaticSkeleton();

      const skinColor = 0xfdd5b1;
      this.rightHand = new ProceduralHand('right', this.scene, { color: skinColor, scale: 1.12 });
      this.leftHand  = new ProceduralHand('left',  this.scene, { color: skinColor, scale: 1.12 });
      this.rightHand.group.renderOrder = 10;
      this.leftHand.group.renderOrder = 10;

      this._applyInstant('REST');

      const loading = document.getElementById('sb-loading');
      if (loading) loading.style.display = 'none';
      const label = document.getElementById('sb-sign-label');
      if (label) label.textContent = 'HANDS';
      const badge = document.getElementById('sb-mode-badge');
      if (badge) badge.textContent = '3D · Hands';

      this.ready = true;
      console.log('[SignBridge 3D] Procedural hands mode ready.');
      resolve();
    });
  }

  async _loadGLBAvatar() {
    const url = new URL('models/avatar.glb', import.meta.url).href;
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);

    this._modelRoot = gltf.scene;
    this._modelRoot.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    // Auto-scale to ~1.75m height
    const box = new THREE.Box3().setFromObject(this._modelRoot);
    const size = box.getSize(new THREE.Vector3());
    const scale = 1.75 / Math.max(size.y, 0.01);
    this._modelRoot.scale.setScalar(scale);
    this._modelScale = scale;

    const center = box.getCenter(new THREE.Vector3());
    this._modelRoot.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

    this.scene.add(this._modelRoot);
    this._mapBonesFromScene(this._modelRoot);

    if (gltf.animations?.length) {
      this.mixer = new THREE.AnimationMixer(this._modelRoot);
      const idle = this.mixer.clipAction(gltf.animations[0]);
      idle.setEffectiveWeight(0.35);
      idle.play();
    }

    this._applyInstant('REST');

    const loading = document.getElementById('sb-loading');
    if (loading) loading.style.display = 'none';
    const label = document.getElementById('sb-sign-label');
    if (label) label.textContent = 'MODEL';
    const badge = document.getElementById('sb-mode-badge');
    if (badge) badge.textContent = '3D · GLB';

    this.ready = true;
    console.log('[SignBridge 3D] GLB model loaded. Bones:', Object.keys(this.bones));
  }

  _mapBonesFromScene(root) {
    const found = {};
    root.traverse((obj) => {
      if (obj.isBone) found[obj.name] = obj;
      if (obj.isSkinnedMesh?.skeleton) {
        for (const bone of obj.skeleton.bones) found[bone.name] = bone;
      }
    });

    this.bones = {};
    for (const [role, aliases] of Object.entries(BONE_ALIASES)) {
      for (const name of aliases) {
        if (found[name]) { this.bones[role] = found[name]; break; }
      }
    }

    // Fuzzy fallback for custom rigs
    for (const [role] of Object.entries(BONE_ALIASES)) {
      if (this.bones[role]) continue;
      const isLeft = role.includes('Left');
      const isRight = role.includes('Right');
      const hint = role.replace(/^(Left|Right)/, '').toLowerCase();
      for (const [name, bone] of Object.entries(found)) {
        const n = name.toLowerCase();
        if (isLeft && !n.includes('left')) continue;
        if (isRight && !n.includes('right')) continue;
        if (hint && n.includes(hint)) { this.bones[role] = bone; break; }
      }
    }
  }

  /**
   * Programmatically wires a complete hierarchical skeleton.
   * Leverages Nested Alignment Groups so standard pose Euler rotations
   * map flawlessly to the physical movements (coronal raising, sagittal swinging, elbow bends).
   */
  _buildProgrammaticSkeleton() {
    this.skeletonGroup = new THREE.Group();
    this.scene.add(this.skeletonGroup);

    // Base placement — pulled slightly toward camera so both hands stay in frame
    this.skeletonGroup.position.set(0, 0.44, 0.14);

    const spine = new THREE.Group();
    spine.name = 'Spine';
    this.skeletonGroup.add(spine);

    const chest = new THREE.Group();
    chest.name = 'Chest';
    spine.add(chest);

    const head = new THREE.Group();
    head.name = 'Head';
    head.position.set(0, 0.52, 0);
    chest.add(head);

    // Physical segment proportions (meters)
    const L_UPPER = 0.28;
    const L_FORE  = 0.25;

    // Visual Material 1: Holographic Arm cylinders
    const boneMat = new THREE.MeshPhysicalMaterial({
      color: 0x8264ff,
      transparent: true,
      opacity: 0.28,
      roughness: 0.1,
      metalness: 0.9,
      transmission: 0.5,
      thickness: 0.05
    });

    // Visual Material 2: Glowing cyan joint anchors
    const jointMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x005577,
      roughness: 0.2,
      metalness: 0.8
    });

    // ── RIGHT ARM Armature ──
    const rUpperArmAlign = new THREE.Group();
    rUpperArmAlign.position.set(-0.24, 0.38, 0);
    rUpperArmAlign.rotation.set(0, 0, Math.PI / 2); // local +Y faces world -X
    chest.add(rUpperArmAlign);

    const rUpperArm = new THREE.Group();
    rUpperArm.name = 'RightUpperArm';
    rUpperArmAlign.add(rUpperArm);

    // Visual bone representation
    const rUpperCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, L_UPPER, 8), boneMat);
    rUpperCyl.position.set(0, L_UPPER / 2, 0);
    rUpperArm.add(rUpperCyl);

    const rShoulderSph = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), jointMat);
    rUpperArm.add(rShoulderSph);

    const rForeArm = new THREE.Group();
    rForeArm.name = 'RightForeArm';
    rForeArm.position.set(0, L_UPPER, 0); // Elbow joint
    rUpperArm.add(rForeArm);

    const rForeCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, L_FORE, 8), boneMat);
    rForeCyl.position.set(0, L_FORE / 2, 0);
    rForeArm.add(rForeCyl);

    const rElbowSph = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), jointMat);
    rForeArm.add(rElbowSph);

    const rHand = new THREE.Group();
    rHand.name = 'RightHand';
    rHand.position.set(0, L_FORE, 0); // Wrist joint
    rForeArm.add(rHand);

    const rWristSph = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 8), jointMat);
    rHand.add(rWristSph);

    // ── LEFT ARM Armature ──
    const lUpperArmAlign = new THREE.Group();
    lUpperArmAlign.position.set(0.24, 0.38, 0);
    lUpperArmAlign.rotation.set(0, 0, -Math.PI / 2); // local +Y faces world +X
    chest.add(lUpperArmAlign);

    const lUpperArm = new THREE.Group();
    lUpperArm.name = 'LeftUpperArm';
    lUpperArmAlign.add(lUpperArm);

    const lUpperCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, L_UPPER, 8), boneMat);
    lUpperCyl.position.set(0, L_UPPER / 2, 0);
    lUpperArm.add(lUpperCyl);

    const lShoulderSph = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), jointMat);
    lUpperArm.add(lShoulderSph);

    const lForeArm = new THREE.Group();
    lForeArm.name = 'LeftForeArm';
    lForeArm.position.set(0, L_UPPER, 0); // Elbow joint
    lUpperArm.add(lForeArm);

    const lForeCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, L_FORE, 8), boneMat);
    lForeCyl.position.set(0, L_FORE / 2, 0);
    lForeArm.add(lForeCyl);

    const lElbowSph = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), jointMat);
    lForeArm.add(lElbowSph);

    const lHand = new THREE.Group();
    lHand.name = 'LeftHand';
    lHand.position.set(0, L_FORE, 0); // Wrist joint
    lForeArm.add(lHand);

    const lWristSph = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 8), jointMat);
    lHand.add(lWristSph);

    // Register active armature segments exactly to matching pose roles
    this.bones = {
      Spine: spine,
      Chest: chest,
      Head: head,
      RightUpperArm: rUpperArm,
      RightForeArm: rForeArm,
      RightHand: rHand,
      LeftUpperArm: lUpperArm,
      LeftForeArm: lForeArm,
      LeftHand: lHand
    };
  }

  // ── Pose application ──────────────────────────────────────────────────────────

  _resolvePose(rawKey) {
    const upper = (rawKey || 'REST').toUpperCase().replace(/[_\s]+/g, '_');

    // Direct match (also handles FINGERSPELL_A … FINGERSPELL_Z)
    if (POSES[upper]) return { key: upper, pose: POSES[upper] };

    // Word → pose key mapping
    const lower   = rawKey.toLowerCase().trim();
    const mapped  = WORD_TO_POSE_KEY[lower];
    if (mapped && POSES[mapped]) return { key: mapped, pose: POSES[mapped] };

    // Partial match (first word)
    const firstWord = lower.split(/\s+/)[0];
    const partial   = WORD_TO_POSE_KEY[firstWord];
    if (partial && POSES[partial]) return { key: partial, pose: POSES[partial] };

    // Unknown word → fingerspell it letter-by-letter via the queue
    const letters = upper.replace(/[^A-Z]/g, '').split('');
    if (letters.length > 0) {
      const firstKey = `FINGERSPELL_${letters[0]}`;
      if (POSES[firstKey]) {
        this._fingerspellQueue = letters.slice(1).map(l => `FINGERSPELL_${l}`);
        return { key: firstKey, pose: POSES[firstKey] };
      }
    }

    // Absolute last resort fallback
    const hash = [...rawKey].reduce((s, c) => s + c.charCodeAt(0), 0);
    const fallbackKey = NEUTRAL_POOL[hash % NEUTRAL_POOL.length];
    return { key: fallbackKey, pose: POSES[fallbackKey] };
  }

  _drainFingerspellQueue() {
    if (!this._fingerspellQueue || this._fingerspellQueue.length === 0) return;
    const nextKey = this._fingerspellQueue.shift();
    if (POSES[nextKey]) {
      setTimeout(() => {
        this._applySmooth(nextKey);
      }, (LERP_DURATION * 1000) + 220); // transition + 220 ms hold
    }
  }

  /** Snap directly to a pose without lerping. */
  _applyInstant(poseKey, overrides = {}) {
    const { pose } = this._resolvePose(poseKey);
    const effectivePose = overrides.rHand || overrides.lHand
      ? { ...pose, rHand: overrides.rHand || pose.rHand, lHand: overrides.lHand || pose.lHand }
      : pose;
    for (const [role, rot] of Object.entries(effectivePose)) {
      if (role === 'motion' || role === 'rHand' || role === 'lHand') continue;
      const bone = this.bones[role];
      if (bone) bone.rotation.set(rot.x, rot.y, rot.z);
    }
    if (this.rightHand) this.rightHand.setShape(_poseToHandShape(effectivePose, 'right'));
    if (this.leftHand)  this.leftHand.setShape(_poseToHandShape(effectivePose, 'left'));
    const motionKey = overrides.motion
      ? (MOTION_CSS_MAP[overrides.motion] || effectivePose.motion || null)
      : (effectivePose.motion || null);
    this.activeMotion   = motionKey;
    this._pendingMotion = null;
    this.motionTime     = 0;
    this.lerpT          = 1;
    this.toPose         = null;
  }

  /** Smooth lerp to a new pose. overrides: { rHand, lHand, motion } from sign-mapper. */
  _applySmooth(rawKey, overrides = {}) {
    const { key, pose } = this._resolvePose(rawKey);
    this.currentKey = key;

    const effectivePose = overrides.rHand || overrides.lHand
      ? { ...pose, rHand: overrides.rHand || pose.rHand, lHand: overrides.lHand || pose.lHand }
      : pose;

    const motionKey = overrides.motion
      ? (MOTION_CSS_MAP[overrides.motion] || pose.motion || null)
      : (pose.motion || null);

    // Snapshot current rotations
    this.fromRots = {};
    for (const role of Object.keys(BONE_ALIASES)) {
      const bone = this.bones[role];
      if (bone) {
        this.fromRots[role] = { x: bone.rotation.x, y: bone.rotation.y, z: bone.rotation.z };
      }
    }

    this.toPose       = effectivePose;
    this.lerpT        = 0;
    this.activeMotion = null; 
    this._pendingMotion = motionKey;
    this.motionTime   = 0;

    if (this.rightHand) this.rightHand.setShapeSmooth(_poseToHandShape(effectivePose, 'right'), LERP_DURATION);
    if (this.leftHand)  this.leftHand.setShapeSmooth(_poseToHandShape(effectivePose, 'left'),  LERP_DURATION);

    const label = document.getElementById('sb-sign-label');
    if (label) {
      label.textContent = key.startsWith('FINGERSPELL_')
        ? key.replace('FINGERSPELL_', '') 
        : key.replace(/_/g, ' ');
    }

    this._drainFingerspellQueue();
  }

  // ── Per-frame update ──────────────────────────────────────────────────────────

  _update(delta) {
    if (this.mixer) this.mixer.update(delta);

    if (this.mode === 'hands') {
      if (this.rightHand && this.bones.RightHand) {
        this.rightHand.syncToWristBone(this.bones.RightHand, this._modelScale);
        this.rightHand.group.position.add(this._handOffset);
        this.rightHand.update(delta);
      }
      if (this.leftHand && this.bones.LeftHand) {
        this.leftHand.syncToWristBone(this.bones.LeftHand, this._modelScale);
        this.leftHand.group.position.add(this._handOffset);
        this.leftHand.update(delta);
      }
    }

    // 2. Pose transition interpolator (LERP)
    if (this.lerpT < 1 && this.toPose) {
      this.lerpT = Math.min(this.lerpT + delta / LERP_DURATION, 1);
      const t = _easeInOut(this.lerpT);

      for (const [role, toRot] of Object.entries(this.toPose)) {
        if (role === 'motion' || role === 'rHand' || role === 'lHand') continue;
        const bone    = this.bones[role];
        const fromRot = this.fromRots[role];
        if (!bone || !fromRot) continue;

        bone.rotation.x = fromRot.x + (toRot.x - fromRot.x) * t;
        bone.rotation.y = fromRot.y + (toRot.y - fromRot.y) * t;
        bone.rotation.z = fromRot.z + (toRot.z - fromRot.z) * t;
      }

      if (this.lerpT >= 1) {
        this.activeMotion   = this._pendingMotion || null;
        this._pendingMotion = null;
        this.motionTime     = 0;
        this.toPose         = null;
      }
    }

    // 3. Wave/Wiggle/Node overlay simulator
    if (this.activeMotion) {
      this.motionTime += delta;
      this._applyMotion(this.activeMotion, this.motionTime);
    }
  }

  _applyMotion(motionName, t) {
    const cfg = MOTION_CONFIGS[motionName];
    if (!cfg) return;

    const bone = this.bones[cfg.bone];
    if (!bone) return;

    const v = Math.sin(t * cfg.freq) * cfg.amp;

    if (cfg.axis === 'y')  bone.rotation.y = (bone.rotation.y * 0.7) + v * 0.3;
    if (cfg.axis === 'x')  bone.rotation.x = (bone.rotation.x * 0.7) + v * 0.3;
    if (cfg.axis === 'z')  bone.rotation.z = (bone.rotation.z * 0.7) + v * 0.3;
    if (cfg.axis === 'xz') {
      bone.rotation.x = (bone.rotation.x * 0.7) + Math.sin(t * cfg.freq) * cfg.amp * 0.3;
      bone.rotation.z = (bone.rotation.z * 0.7) + Math.cos(t * cfg.freq) * cfg.amp * 0.3;
    }
  }

  // ── Camera zoom ──────────────────────────────────────────────────────────────

  _zoom(factor) {
    const offset = this.camera.position.clone().sub(CAMERA_TARGET);
    const current = offset.length();
    const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, current * factor));
    offset.setLength(next);
    this.camera.position.copy(CAMERA_TARGET).add(offset);
  }

  zoomIn()  { this._zoom(ZOOM_STEP_IN);  }
  zoomOut() { this._zoom(ZOOM_STEP_OUT); }

  // ── Render loop ───────────────────────────────────────────────────────────────

  _startLoop() {
    const tick = () => {
      requestAnimationFrame(tick);
      const delta = this.clock.getDelta();
      this._update(delta);
      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  // ── postMessage interface ─────────────────────────────────────────────────────

  _listenMessages() {
    window.addEventListener('message', (e) => {
      if (e.source !== window.parent) return;

      const { type, key, rHand, lHand, motion } = e.data || {};

      switch (type) {
        case 'SB_POSE':
          if (!this.ready) return;
          this._applySmooth(key || 'REST', { rHand, lHand, motion });
          window.parent.postMessage({ type: 'SB_POSE_ACK', key }, '*');
          break;

        case 'SB_IDLE':
          this._applySmooth('REST');
          break;

        case 'SB_PING':
          window.parent.postMessage({ type: 'SB_PONG', ready: this.ready }, '*');
          break;

        case 'SB_ZOOM_IN':
          this.zoomIn();
          this._notifyZoomLevel();
          break;

        case 'SB_ZOOM_OUT':
          this.zoomOut();
          this._notifyZoomLevel();
          break;

        case 'SB_ZOOM_RESET':
          this.camera.position.copy(CAMERA_POS);
          this._notifyZoomLevel();
          break;
      }
    });
  }

  _notifyZoomLevel() {
    const offset   = this.camera.position.clone().sub(CAMERA_TARGET);
    const defaultD = CAMERA_POS.clone().sub(CAMERA_TARGET).length();
    const pct      = Math.round((defaultD / offset.length()) * 100);
    window.parent.postMessage({ type: 'SB_ZOOM_LEVEL', pct }, '*');
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * Maps static poses to corresponding ASL handshapes.
 */
function _poseToHandShape(pose, side) {
  if (side === 'right' && pose.rHand) return pose.rHand;
  if (side === 'left'  && pose.lHand) return pose.lHand;

  const R = side === 'right';
  const z = (role) => {
    const bone = pose[R ? role : role.replace('Right', 'Left')];
    return bone ? (bone.z || 0) : 0;
  };

  const idx  = z('RightIndex1');
  const mid  = z('RightMiddle1');
  const ring = z('RightRing1');
  const pnky = z('RightPinky1');

  const CURL_THRESH = 1.0;  
  const OPEN_THRESH = 0.25; 

  const idxCurl  = idx  > CURL_THRESH;
  const midCurl  = mid  > CURL_THRESH;
  const ringCurl = ring > CURL_THRESH;
  const pnkyCurl = pnky > CURL_THRESH;

  const idxOpen  = idx  < OPEN_THRESH;
  const midOpen  = mid  < OPEN_THRESH;
  const pnkyOpen = pnky < OPEN_THRESH;

  if (idxCurl && midCurl && ringCurl && pnkyCurl) return 'FIST';
  if (idxOpen && midCurl && ringCurl && pnkyCurl) return 'INDEX';
  if (idxOpen && midOpen && ringCurl && pnkyCurl) return 'V';
  if (idxCurl && midCurl && ringCurl && pnkyOpen) return 'Y';
  if (idx > 0.4 && mid > 0.4 && ring > 0.4 && pnky > 0.4) return 'BENT';

  return 'FLAT';
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
const avatar = new Avatar3D(RENDER_MODE);
avatar.init().catch(err => {
  console.error('[SignBridge 3D] init error:', err);
  const loading = document.getElementById('sb-loading');
  if (loading) loading.style.display = 'none';
  const errEl = document.getElementById('sb-error');
  if (errEl) {
    errEl.textContent = '⚠️ ' + (err.message || 'Failed to load 3D avatar');
    errEl.classList.add('visible');
  }
});
