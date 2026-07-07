"use client";

import React, { useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Float, Environment, ContactShadows, PresentationControls, useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

// ── Components ─────────────────────────────────────────────────────────────

// This component loads and renders the downloaded .glb avatar
const GLBAvatar = ({ word }: { word: string }) => {
  const group = useRef<THREE.Group>(null);
  // Load the model from the public directory
  const { scene, animations } = useGLTF("/models/avatar.glb");
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    // If the model has animations (like an Idle animation), play the first one
    if (animations.length > 0) {
      const actionNames = Object.keys(actions);
      if (actionNames.length > 0 && actions[actionNames[0]]) {
        actions[actionNames[0]]?.reset().fadeIn(0.5).play();
      }
    }
  }, [actions, animations]);

  return (
    <group ref={group} position={[0, -0.9, 0]} dispose={null}>
      <primitive object={scene} />
    </group>
  );
};

// Pre-load the model to prevent UI lag when rendering
useGLTF.preload("/models/avatar.glb");

export function Signer3D({ word = "", className = "" }: { word?: string; className?: string }) {
  return (
    <div className={`w-full h-full min-h-[400px] relative ${className}`}>
      <Canvas shadows camera={{ position: [0, 1, 3], fov: 40 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <spotLight position={[-5, 5, 5]} angle={0.3} penumbra={1} intensity={1} castShadow />
        
        <PresentationControls
          global
          snap
          speed={1.5}
          zoom={1.2}
          polar={[-0.1, 0.2]}
          azimuth={[-0.5, 0.5]}
        >
          <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
            <GLBAvatar word={word} />
          </Float>
        </PresentationControls>

        <ContactShadows position={[0, -0.9, 0]} opacity={0.5} scale={10} blur={2} far={2} />
        <Environment preset="city" />
      </Canvas>
      
      {/* HUD Info */}
      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none">
        <div className="glass-panel px-4 py-2 rounded-xl border-brand-primary/20 backdrop-blur-xl">
           <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary mb-1">Avatar Engine</p>
           <p className="text-xs text-white font-mono">Status: <span className="text-green-400">Model Loaded</span></p>
        </div>
        <div className="text-right">
           <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Mode</p>
           <p className="text-xs text-white font-mono">GLB Rigged Mesh</p>
        </div>
      </div>
    </div>
  );
}

