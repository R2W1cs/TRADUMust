"use client";

import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, ContactShadows, PresentationControls } from "@react-three/drei";
import * as THREE from "three";

// ── Types ──────────────────────────────────────────────────────────────────
interface JointProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  children?: React.ReactNode;
}

// ── Components ─────────────────────────────────────────────────────────────

const Joint = ({ position, rotation = [0, 0, 0], children }: JointProps) => (
  <group position={position} rotation={rotation}>
    <mesh>
      <sphereGeometry args={[0.05, 16, 16]} />
      <meshStandardMaterial color="#E8A96A" roughness={0.3} />
    </mesh>
    {children}
  </group>
);

const Bone = ({ length }: { length: number }) => (
  <mesh position={[0, -length / 2, 0]}>
    <cylinderGeometry args={[0.03, 0.03, length, 8]} />
    <meshStandardMaterial color="#FDDBB4" roughness={0.5} />
  </mesh>
);

const Mannequin = ({ word }: { word: string }) => {
  const rUpperArm = useRef<THREE.Group>(null);
  const rForearm = useRef<THREE.Group>(null);
  const lUpperArm = useRef<THREE.Group>(null);
  const lForearm = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);

  // Simple animation logic based on word
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    if (word.toUpperCase() === "HELLO") {
      if (rUpperArm.current) rUpperArm.current.rotation.z = Math.sin(t * 5) * 0.2 + 1.2;
      if (rForearm.current) rForearm.current.rotation.x = -1.5;
    } else if (word.toUpperCase() === "THANK YOU") {
      if (rUpperArm.current) rUpperArm.current.rotation.x = Math.sin(t * 3) * 0.5 - 0.5;
      if (rForearm.current) rForearm.current.rotation.x = -1.2;
      if (mouth.current) mouth.current.scale.y = Math.sin(t * 3) * 0.5 + 1.0;
    } else {
      // Idle breath
      if (rUpperArm.current) rUpperArm.current.rotation.z = Math.sin(t) * 0.05 + 0.1;
      if (lUpperArm.current) lUpperArm.current.rotation.z = Math.sin(t + 1) * 0.05 - 0.1;
      if (mouth.current) mouth.current.scale.y = 1.0;
    }
  });

  return (
    <group position={[0, 0.5, 0]}>
      {/* Torso */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.15, 0.4, 4, 16]} />
        <meshStandardMaterial color="#4338CA" />
      </mesh>

      {/* Head */}
      <group position={[0, 0.45, 0]}>
        <mesh>
          <sphereGeometry args={[0.12, 32, 32]} />
          <meshStandardMaterial color="#FDDBB4" />
        </mesh>
        
        {/* Eyebrows */}
        <mesh position={[-0.04, 0.03, 0.1]}>
          <boxGeometry args={[0.04, 0.01, 0.01]} />
          <meshStandardMaterial color="#2d2d2d" />
        </mesh>
        <mesh position={[0.04, 0.03, 0.1]}>
          <boxGeometry args={[0.04, 0.01, 0.01]} />
          <meshStandardMaterial color="#2d2d2d" />
        </mesh>

        {/* Eyes */}
        <mesh position={[-0.04, 0.0, 0.1]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshStandardMaterial color="#2d2d2d" />
        </mesh>
        <mesh position={[0.04, 0.0, 0.1]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshStandardMaterial color="#2d2d2d" />
        </mesh>

        {/* Mouth */}
        <mesh position={[0, -0.05, 0.1]} ref={mouth}>
          <boxGeometry args={[0.05, 0.01, 0.01]} />
          <meshStandardMaterial color="#b91c1c" />
        </mesh>
      </group>

      {/* Right Arm */}
      <group position={[0.18, 0.2, 0]} ref={rUpperArm}>
        <Bone length={0.3} />
        <group position={[0, -0.3, 0]} ref={rForearm}>
          <Bone length={0.3} />
          {/* Hand */}
          <mesh position={[0, -0.35, 0]}>
            <boxGeometry args={[0.08, 0.1, 0.02]} />
            <meshStandardMaterial color="#FDDBB4" />
          </mesh>
        </group>
      </group>

      {/* Left Arm */}
      <group position={[-0.18, 0.2, 0]} ref={lUpperArm}>
        <Bone length={0.3} />
        <group position={[0, -0.3, 0]} ref={lForearm}>
          <Bone length={0.3} />
          <mesh position={[0, -0.35, 0]}>
            <boxGeometry args={[0.08, 0.1, 0.02]} />
            <meshStandardMaterial color="#FDDBB4" />
          </mesh>
        </group>
      </group>
    </group>
  );
};

export function Signer3D({ word = "", className = "" }: { word?: string; className?: string }) {
  return (
    <div className={`w-full h-full min-h-[400px] relative ${className}`}>
      <Canvas shadows camera={{ position: [0, 0.5, 2], fov: 35 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} castShadow />
        <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
        
        <PresentationControls
          global
          snap
          speed={1.5}
          zoom={1}
          polar={[-0.1, 0.2]}
          azimuth={[-0.5, 0.5]}
        >
          <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
            <Mannequin word={word} />
          </Float>
        </PresentationControls>

        <ContactShadows position={[0, -0.6, 0]} opacity={0.4} scale={10} blur={2} far={1} />
        <Environment preset="city" />
      </Canvas>
      
      {/* HUD Info */}
      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none">
        <div className="glass-panel px-4 py-2 rounded-xl border-brand-primary/20 backdrop-blur-xl">
           <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary mb-1">Kinematic Solver</p>
           <p className="text-xs text-white font-mono">Status: <span className="text-green-400">Stable</span></p>
        </div>
        <div className="text-right">
           <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Mode</p>
           <p className="text-xs text-white font-mono">3D Procedural Mesh</p>
        </div>
      </div>
    </div>
  );
}
