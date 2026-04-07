"use client";

/**
 * Avatar3D — Procedural signing avatar.
 *
 * Builds a humanoid figure from Three.js primitives arranged in a proper
 * parent→child bone hierarchy. All body parts are Object3D nodes, so
 * rotating a parent (e.g. upper arm) automatically moves the forearm and hand.
 *
 * The same sign-dictionary bone names (mixamorigXxx) are mapped to the
 * corresponding Object3D nodes, so the full ASL sign dictionary works
 * unchanged with this avatar.
 */

import { useRef, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  textToSignSequence,
  ASL_WORDS,
  type Sign,
  type SignPose,
} from "@/lib/sign-dictionary";

// ── Colours ──────────────────────────────────────────────────────────────────
const SKIN   = new THREE.MeshStandardMaterial({ color: 0xd4956a, roughness: 0.7 });
const SHIRT  = new THREE.MeshStandardMaterial({ color: 0x4f46e5, roughness: 0.6 });
const PANTS  = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
const SHOE   = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
const HAIR   = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });

// ── Geometry helpers ─────────────────────────────────────────────────────────
function box(w: number, h: number, d: number, mat: THREE.Material, yOff = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  m.position.y = yOff;
  return m;
}
function cyl(r: number, h: number, mat: THREE.Material, yOff = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 10), mat);
  m.castShadow = true;
  m.position.y = yOff;
  return m;
}
function sph(r: number, mat: THREE.Material, yOff = 0) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat);
  m.castShadow = true;
  m.position.y = yOff;
  return m;
}

// ── Build the skeleton hierarchy ──────────────────────────────────────────────
function buildAvatar(): { root: THREE.Group; boneMap: Map<string, THREE.Object3D> } {
  const boneMap = new Map<string, THREE.Object3D>();
  
  // The root hips act as an invisible anchor point
  const root = new THREE.Group();
  root.name = "mixamorigHips";
  // Shift the entire hierarchy so the right hand ends up centered in the camera
  root.position.set(-0.25, 0.4, 0.5); 
  root.scale.set(1.5, 1.5, 1.5); // Make it 1.5x larger!
  boneMap.set("mixamorigHips", root);

  const spine = new THREE.Group(); spine.name = "mixamorigSpine";
  root.add(spine); boneMap.set("mixamorigSpine", spine);

  const spine2 = new THREE.Group(); spine2.name = "mixamorigSpine2";
  spine.add(spine2); boneMap.set("mixamorigSpine2", spine2);

  // ── Only the Right Arm & Hand ──────────────────────────────────────────────
  const shoulder = new THREE.Group();
  shoulder.name = "mixamorigRightShoulder";
  spine2.add(shoulder); boneMap.set("mixamorigRightShoulder", shoulder);

  const upperArm = new THREE.Group();
  upperArm.name = "mixamorigRightArm";
  shoulder.add(upperArm); boneMap.set("mixamorigRightArm", upperArm);

  // We don't render a mesh for the upper arm so it looks like a floating forearm
  
  const foreArm = new THREE.Group();
  foreArm.name = "mixamorigRightForeArm";
  foreArm.position.y = -0.26;
  upperArm.add(foreArm); boneMap.set("mixamorigRightForeArm", foreArm);

  // Forearm mesh
  const faMesh = cyl(0.045, 0.24, SKIN);
  faMesh.position.y = -0.12;
  foreArm.add(faMesh);

  const hand = new THREE.Group();
  hand.name = "mixamorigRightHand";
  hand.position.y = -0.24;
  foreArm.add(hand); boneMap.set("mixamorigRightHand", hand);

  // Palm
  const palmMesh = box(0.08, 0.09, 0.04, SKIN, -0.045);
  hand.add(palmMesh);

  // Fingers
  const fingerNames = ["Thumb", "Index", "Middle", "Ring", "Pinky"] as const;
  const fingerXOffsets = { Thumb: 0.05, Index: 0.03, Middle: 0, Ring: -0.03, Pinky: -0.05 };
  const fingerZOffsets = { Thumb: 0.02, Index: 0, Middle: 0, Ring: 0, Pinky: 0 };

  for (const fname of fingerNames) {
    const isThumb = fname === "Thumb";
    let parent: THREE.Group = hand;
    let yOffset = isThumb ? -0.035 : -0.09;
    const xOff = fingerXOffsets[fname];

    for (let seg = 1; seg <= 3; seg++) {
      const phalanx = new THREE.Group();
      phalanx.name = `mixamorigRightHand${fname}${seg}`;
      phalanx.position.set(seg === 1 ? xOff : 0, seg === 1 ? yOffset : (isThumb ? -0.03 : -0.04), seg === 1 ? fingerZOffsets[fname] : 0);
      parent.add(phalanx);
      boneMap.set(`mixamorigRightHand${fname}${seg}`, phalanx);

      const segLen = seg === 1 ? (isThumb ? 0.03 : 0.04) : (isThumb ? 0.025 : 0.03);
      const segMesh = cyl(isThumb ? 0.012 : 0.01, segLen, SKIN, -segLen / 2);
      phalanx.add(segMesh);

      parent = phalanx;
      yOffset = 0;
    }
  }

  return { root, boneMap };
}

// ── Animation engine ──────────────────────────────────────────────────────────
function poseToTargets(
  pose: SignPose,
  boneMap: Map<string, THREE.Object3D>
): Array<{ node: THREE.Object3D; target: THREE.Euler }> {
  return pose.bones
    .map(([name, [x, y, z]]) => {
      const node = boneMap.get(name);
      if (!node) return null;
      return { node, target: new THREE.Euler(x, y, z, "XYZ") };
    })
    .filter(Boolean) as Array<{ node: THREE.Object3D; target: THREE.Euler }>;
}

// ── Inner scene component (runs inside Canvas) ────────────────────────────────
interface AvatarSceneProps {
  signQueue: Sign[];
  onSignStart?: (id: string) => void;
  onQueueEmpty?: () => void;
}

function AvatarScene({ signQueue, onSignStart, onQueueEmpty }: AvatarSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const stateRef = useRef({
    boneMap: new Map<string, THREE.Object3D>(),
    currentTargets: [] as Array<{ node: THREE.Object3D; target: THREE.Euler }>,
    queue: [] as Sign[],
    poseIndex: 0,
    holdTimer: 0,
    isHolding: false,
    idlePhase: 0,
    built: false,
  });

  // Build avatar geometry once
  useEffect(() => {
    const st = stateRef.current;
    if (st.built || !groupRef.current) return;
    st.built = true;

    const { root, boneMap } = buildAvatar();
    groupRef.current.add(root);
    st.boneMap = boneMap;

    // Start in REST pose
    const restPose = ASL_WORDS.REST?.poses?.[0];
    if (restPose) {
        st.currentTargets = poseToTargets(restPose, boneMap);
    }
  }, []);

  // Sync queue from props
  useEffect(() => {
    const st = stateRef.current;
    st.queue = [...signQueue];
    st.poseIndex = 0;
    st.isHolding = false;
    st.holdTimer = 0;
  }, [signQueue]);

  useFrame((_, delta) => {
    const st = stateRef.current;
    if (!st.built) return;

    st.idlePhase += delta * 0.8;

    // Idle breathing
    const spine = st.boneMap.get("mixamorigSpine");
    if (spine) spine.rotation.x = Math.sin(st.idlePhase) * 0.006;
    const head = st.boneMap.get("mixamorigHead");
    if (head) {
      head.rotation.y = Math.sin(st.idlePhase * 0.3) * 0.04;
      head.rotation.x = Math.sin(st.idlePhase * 0.5) * 0.015;
    }

    // Advance sign queue
    if (!st.isHolding && st.queue.length > 0) {
      const sign = st.queue[0];
      const pose = sign.poses[st.poseIndex];
      if (pose) {
        onSignStart?.(sign.id);
        st.currentTargets = poseToTargets(pose, st.boneMap);
        st.holdTimer = (pose.holdMs ?? 400) / 1000;
        st.isHolding = true;
        st.poseIndex++;
      }
    }

    if (st.isHolding) {
      st.holdTimer -= delta;
      if (st.holdTimer <= 0) {
        st.isHolding = false;
        const sign = st.queue[0];
        if (sign && st.poseIndex >= sign.poses.length) {
          st.queue = st.queue.slice(1);
          st.poseIndex = 0;
          if (st.queue.length === 0) onQueueEmpty?.();
        }
      }
    }

    // Lerp bones toward targets
    const lf = Math.min(1, delta * 9);
    for (const { node, target } of st.currentTargets) {
      node.rotation.x = THREE.MathUtils.lerp(node.rotation.x, target.x, lf);
      node.rotation.y = THREE.MathUtils.lerp(node.rotation.y, target.y, lf);
      node.rotation.z = THREE.MathUtils.lerp(node.rotation.z, target.z, lf);
    }
  });

  return <group ref={groupRef} position={[0, -0.6, 0]} />;
}

// ── Public component ──────────────────────────────────────────────────────────
interface Avatar3DProps {
  text?: string;
  signIds?: string[];
  autoPlay?: boolean;
  onComplete?: () => void;
  onSignStart?: (signId: string) => void;
  className?: string;
  height?: string;
  showControls?: boolean;
}

export function Avatar3D({
  text,
  signIds,
  autoPlay = false,
  onComplete,
  onSignStart,
  className = "",
  height = "100%",
  showControls = false,
}: Avatar3DProps) {
  const [signQueue, setSignQueue] = useState<Sign[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentLabel, setCurrentLabel] = useState("");

  const buildQueue = useCallback((): Sign[] => {
    if (text) return textToSignSequence(text);
    if (signIds) return signIds.map((id) => ASL_WORDS[id] ?? ASL_WORDS[id.toUpperCase()]).filter(Boolean);
    return [];
  }, [text, signIds]);

  useEffect(() => {
    if (autoPlay) {
      const q = buildQueue();
      if (q.length > 0) { setSignQueue(q); setIsAnimating(true); }
    }
  }, [autoPlay, buildQueue]);

  const handlePlay = () => {
    const q = buildQueue();
    if (!q.length) return;
    setSignQueue(q);
    setIsAnimating(true);
  };

  const handleQueueEmpty = useCallback(() => {
    setIsAnimating(false);
    setCurrentLabel("");
    onComplete?.();
  }, [onComplete]);

  const handleSignStart = useCallback((id: string) => {
    setCurrentLabel(id === "REST" ? "" : id.replace(/_/g, " "));
    onSignStart?.(id);
  }, [onSignStart]);

  return (
    <div className={`relative flex flex-col ${className}`} style={{ height }}>
      <Canvas
        camera={{ position: [0, 0.5, 1.8], fov: 50 }}
        shadows
        style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)" }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 4, 2]} intensity={1.3} castShadow />
        <pointLight position={[-2, 2, -2]} intensity={0.5} color="#a78bfa" />
        <pointLight position={[0, 3, 1]} intensity={0.3} color="#60a5fa" />

        <AvatarScene
          signQueue={signQueue}
          onSignStart={handleSignStart}
          onQueueEmpty={handleQueueEmpty}
        />

        {showControls && <OrbitControls target={[0, 0, 0]} />}
      </Canvas>

      {/* HUD */}
      <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
        <div className="flex items-center justify-between">
          <div className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
            {currentLabel ? (
              <p className="text-white text-xs font-semibold">{currentLabel}</p>
            ) : isAnimating ? (
              <p className="text-white/50 text-xs">Signing...</p>
            ) : (
              <p className="text-white/40 text-xs">Ready</p>
            )}
          </div>
          <div className="bg-black/40 rounded-full px-2.5 py-1">
            <p className="text-white/40 text-[10px]">ASL Avatar · TRADUMUST</p>
          </div>
        </div>
      </div>

      {/* Play button */}
      {!autoPlay && !isAnimating && (text || signIds) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <button
            onClick={handlePlay}
            className="w-16 h-16 rounded-full bg-purple-600/90 hover:bg-purple-500 text-white flex items-center justify-center transition-all shadow-2xl hover:scale-105 active:scale-95"
          >
            <svg className="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
