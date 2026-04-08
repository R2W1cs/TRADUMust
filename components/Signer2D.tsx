"use client";

/**
 * Signer2D — 2D signing avatar with detailed hand shapes.
 *
 * ViewBox: 0 0 280 340
 * The avatar shows the upper body. Arms move to signing positions via CSS
 * transitions. Each hand shape is a detailed SVG illustration.
 *
 * Usage:
 *   <Signer2D word="HELLO" />
 *   <Signer2D word="WHERE" tag="ACTION" />
 */

import React, { useEffect, useState, useMemo } from "react";

// ─── Palette ──────────────────────────────────────────────────────────────────
const SK   = "#0F172A";   // Dark silhouette skin
const SKS  = "#1E293B";   // Slightly lighter silhouette shadow
const SKD  = "#334155";   // Crease
const SHIRT = "#4338CA";  // shirt / sleeve
const SHIRT_S = "#3730A3";
const HAIR  = "#0F172A";  // Match skin
const LIP   = "#FFFFFF";  // High contrast

// ─── Types ────────────────────────────────────────────────────────────────────
export type FacialExpression = "NEUTRAL" | "HAPPY" | "QUESTION" | "WH_QUESTION" | "NEGATIVE";

type Pt = { x: number; y: number };

interface ArmPose {
  elbow: Pt;
  wrist: Pt;
}

interface SignConfig {
  right: ArmPose;
  left?: ArmPose;
  /** Hand shape key for the right (dominant) hand */
  rHand: HandKey;
  /** Hand shape key for the left (base) hand — default FLAT */
  lHand?: HandKey;
  expression: FacialExpression;
  motion?: string;   // CSS animation class name
  hint: string;
}

// ─── Skeleton anchors ─────────────────────────────────────────────────────────
const SH_R: Pt = { x: 188, y: 106 }; // right shoulder
const SH_L: Pt = { x:  92, y: 106 }; // left shoulder

const REST_R: ArmPose = { elbow: { x: 205, y: 160 }, wrist: { x: 210, y: 205 } };
const REST_L: ArmPose = { elbow: { x:  75, y: 160 }, wrist: { x:  70, y: 205 } };

// ─── Sign dictionary ──────────────────────────────────────────────────────────
type HandKey =
  | "FLAT" | "FIST" | "POINT" | "V" | "C" | "OK"
  | "THUMB_UP" | "ILY" | "CLAW" | "HORNS" | "L" | "A" | "O";

const SIGNS: Record<string, SignConfig> = {
  // ── Greetings ──
  HELLO: {
    right: { elbow: { x: 168, y: 102 }, wrist: { x: 145, y: 80 } },
    rHand: "FLAT", expression: "HAPPY", motion: "motion-wave",
    hint: "Flat hand sweeps outward from forehead level",
  },
  HI: {
    right: { elbow: { x: 170, y: 105 }, wrist: { x: 148, y: 86 } },
    rHand: "FLAT", expression: "HAPPY", motion: "motion-wave",
    hint: "Casual side wave",
  },
  GOODBYE: {
    right: { elbow: { x: 168, y: 110 }, wrist: { x: 150, y: 88 } },
    rHand: "FLAT", expression: "NEUTRAL", motion: "motion-wave",
    hint: "Wave hand side to side",
  },
  THANK_YOU: {
    right: { elbow: { x: 165, y: 128 }, wrist: { x: 145, y: 120 } },
    rHand: "FLAT", expression: "HAPPY", motion: "motion-push",
    hint: "Flat hand from chin area, move forward",
  },
  PLEASE: {
    right: { elbow: { x: 158, y: 128 }, wrist: { x: 140, y: 138 } },
    rHand: "FLAT", expression: "HAPPY", motion: "motion-circle",
    hint: "Flat hand circles on chest",
  },
  SORRY: {
    right: { elbow: { x: 160, y: 125 }, wrist: { x: 142, y: 135 } },
    rHand: "FIST", expression: "NEGATIVE", motion: "motion-circle",
    hint: "Fist circles on chest",
  },
  // ── Yes / No ──
  YES: {
    right: { elbow: { x: 175, y: 118 }, wrist: { x: 178, y:  92 } },
    rHand: "FIST", expression: "NEUTRAL", motion: "motion-nod",
    hint: "Fist bobs up and down",
  },
  NO: {
    right: { elbow: { x: 165, y: 120 }, wrist: { x: 148, y: 105 } },
    rHand: "POINT", expression: "NEGATIVE", motion: "motion-shake",
    hint: "Index + middle snap on thumb",
  },
  // ── WH-questions ──
  WHERE: {
    right: { elbow: { x: 195, y: 115 }, wrist: { x: 218, y:  98 } },
    rHand: "POINT", expression: "WH_QUESTION", motion: "motion-shake",
    hint: "Waggle index finger side to side",
  },
  WHAT: {
    right: { elbow: { x: 165, y: 130 }, wrist: { x: 148, y: 116 } },
    rHand: "FLAT", expression: "WH_QUESTION", motion: "motion-shake",
    hint: "Brush index along non-dom palm",
  },
  WHO: {
    right: { elbow: { x: 162, y: 112 }, wrist: { x: 148, y:  98 } },
    rHand: "POINT", expression: "WH_QUESTION", motion: "motion-circle",
    hint: "Index circles near chin",
  },
  WHEN: {
    right: { elbow: { x: 168, y: 120 }, wrist: { x: 152, y: 107 } },
    rHand: "POINT", expression: "WH_QUESTION",
    hint: "Index circles then taps non-dom index",
  },
  WHY: {
    right: { elbow: { x: 162, y: 112 }, wrist: { x: 148, y:  98 } },
    rHand: "CLAW", expression: "WH_QUESTION", motion: "motion-pull",
    hint: "Hand pulls away from forehead area",
  },
  HOW: {
    right: { elbow: { x: 162, y: 118 }, wrist: { x: 148, y: 108 } },
    left:  { elbow: { x: 118, y: 118 }, wrist: { x: 132, y: 108 } },
    rHand: "CLAW", lHand: "CLAW", expression: "WH_QUESTION", motion: "motion-roll",
    hint: "Two CLAW hands roll together knuckles up",
  },
  // ── Verbs ──
  HELP: {
    right: { elbow: { x: 162, y: 118 }, wrist: { x: 148, y: 108 } },
    left:  { elbow: { x: 112, y: 125 }, wrist: { x: 128, y: 115 } },
    rHand: "THUMB_UP", lHand: "FLAT", expression: "NEUTRAL", motion: "motion-lift",
    hint: "Thumb-up on flat palm, lift up",
  },
  UNDERSTAND: {
    right: { elbow: { x: 165, y: 112 }, wrist: { x: 150, y:  98 } },
    rHand: "POINT", expression: "NEUTRAL", motion: "motion-flick",
    hint: "Index flicks up near temple",
  },
  KNOW: {
    right: { elbow: { x: 165, y: 115 }, wrist: { x: 150, y: 102 } },
    rHand: "FLAT", expression: "NEUTRAL", motion: "motion-tap",
    hint: "Fingertips tap near temple",
  },
  WANT: {
    right: { elbow: { x: 162, y: 118 }, wrist: { x: 148, y: 108 } },
    left:  { elbow: { x: 118, y: 118 }, wrist: { x: 132, y: 108 } },
    rHand: "CLAW", lHand: "CLAW", expression: "NEUTRAL", motion: "motion-pull",
    hint: "Both claws pull toward body",
  },
  LOVE: {
    right: { elbow: { x: 158, y: 125 }, wrist: { x: 142, y: 132 } },
    left:  { elbow: { x: 122, y: 125 }, wrist: { x: 138, y: 132 } },
    rHand: "FIST", lHand: "FIST", expression: "HAPPY",
    hint: "Fists crossed over chest",
  },
  GO: {
    right: { elbow: { x: 195, y:  98 }, wrist: { x: 218, y:  80 } },
    rHand: "POINT", expression: "NEUTRAL", motion: "motion-push",
    hint: "Both indexes arc outward-forward",
  },
  COME: {
    right: { elbow: { x: 195, y:  98 }, wrist: { x: 218, y:  80 } },
    rHand: "POINT", expression: "NEUTRAL", motion: "motion-pull",
    hint: "Bent index draws toward body",
  },
  SEE: {
    right: { elbow: { x: 165, y: 116 }, wrist: { x: 150, y: 102 } },
    rHand: "V", expression: "NEUTRAL",
    hint: "V-hand moves from eye level forward",
  },
  // ── Descriptors ──
  GOOD: {
    right: { elbow: { x: 162, y: 128 }, wrist: { x: 144, y: 120 } },
    rHand: "FLAT", expression: "HAPPY", motion: "motion-push",
    hint: "Flat hand from mouth area downward",
  },
  BAD: {
    right: { elbow: { x: 162, y:  98 }, wrist: { x: 144, y: 112 } },
    rHand: "FLAT", expression: "NEGATIVE", motion: "motion-flip",
    hint: "Fingertips touch lips, flip hand down",
  },
  WAIT: {
    right: { elbow: { x: 172, y: 128 }, wrist: { x: 158, y: 138 } },
    left:  { elbow: { x: 108, y: 128 }, wrist: { x: 122, y: 138 } },
    rHand: "CLAW", lHand: "CLAW", expression: "NEUTRAL", motion: "motion-wiggle",
    hint: "Both claws wiggle, palms up",
  },
  NAME: {
    right: { elbow: { x: 172, y: 108 }, wrist: { x: 158, y:  96 } },
    left:  { elbow: { x: 108, y: 108 }, wrist: { x: 122, y:  96 } },
    rHand: "V", lHand: "V", expression: "NEUTRAL", motion: "motion-tap",
    hint: "H-hands tap together twice",
  },
  NEED: {
    right: { elbow: { x: 195, y: 105 }, wrist: { x: 215, y:  88 } },
    rHand: "POINT", expression: "WH_QUESTION", motion: "motion-nod",
    hint: "Bent index bends downward twice",
  },
  LEARN: {
    right: { elbow: { x: 162, y: 122 }, wrist: { x: 148, y: 110 } },
    left:  { elbow: { x: 110, y: 118 }, wrist: { x: 126, y: 108 } },
    rHand: "CLAW", lHand: "FLAT", expression: "NEUTRAL", motion: "motion-lift",
    hint: "Hand lifts from palm to eye level",
  },
  // ── Tag fallbacks ──
  __TIME:    { right: { elbow: { x: 195, y: 128 }, wrist: { x: 215, y: 110 } }, rHand: "POINT",    expression: "NEUTRAL", motion: "motion-tap",    hint: "Point to wrist" },
  __ACTION:  { right: { elbow: { x: 185, y: 138 }, wrist: { x: 200, y: 120 } }, rHand: "FIST",     expression: "NEUTRAL", motion: "motion-push",   hint: "Action verb" },
  __OBJECT:  { right: { elbow: { x: 162, y: 118 }, wrist: { x: 148, y: 108 } }, left: { elbow: { x: 118, y: 118 }, wrist: { x: 132, y: 108 } }, rHand: "C", lHand: "C", expression: "NEUTRAL", hint: "Noun shape" },
  __SUBJECT: { right: { elbow: { x: 195, y: 135 }, wrist: { x: 215, y: 118 } }, rHand: "POINT",    expression: "NEUTRAL",                          hint: "Point to referent" },
  __MODIFIER:{ right: { elbow: { x: 168, y: 145 }, wrist: { x: 152, y: 135 } }, rHand: "OK",       expression: "NEUTRAL",                          hint: "Descriptive" },
};

// ─── Detailed hand shape SVGs ─────────────────────────────────────────────────
// All centred at (0,0). Caller wraps in <g transform="translate(wx,wy)">.
// Orientation: fingers point UP.

/** Shared palm base */
function Palm({ w = 28, h = 16 }: { w?: number; h?: number }) {
  return (
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={7} fill={SK} stroke={SKS} strokeWidth="0.8" />
  );
}

function Finger({ cx, rootY, tipY, width = 5.5, rx = 2.5, fill = SK }: {
  cx: number; rootY: number; tipY: number; width?: number; rx?: number; fill?: string;
}) {
  return (
    <rect
      x={cx - width / 2} y={tipY}
      width={width} height={rootY - tipY}
      rx={rx} fill={fill} stroke={SKS} strokeWidth="0.6"
    />
  );
}

function Knuckle({ cx, y }: { cx: number; y: number }) {
  return <ellipse cx={cx} cy={y} rx={3.5} ry={2} fill={SKS} />;
}

// ── FLAT (B hand) ─────────────────────────────────────────────────────────────
function HandFLAT() {
  return (
    <g>
      <Palm />
      {/* 4 fingers close together */}
      <Finger cx={-9}  rootY={-8} tipY={-32} width={5.5} />
      <Finger cx={-3}  rootY={-8} tipY={-36} width={5.5} />
      <Finger cx={ 3}  rootY={-8} tipY={-36} width={5.5} />
      <Finger cx={ 9}  rootY={-8} tipY={-30} width={5.5} />
      {/* Thumb tucked left */}
      <path d="M -14 2 Q -20 -2 -22 6 Q -20 12 -14 10" fill={SK} stroke={SKS} strokeWidth="0.6" />
    </g>
  );
}

// ── FIST (S / A hand) ─────────────────────────────────────────────────────────
function HandFIST() {
  return (
    <g>
      <Palm w={30} h={20} />
      {/* Knuckle row */}
      <Knuckle cx={-10} y={-10} />
      <Knuckle cx={-3}  y={-12} />
      <Knuckle cx={ 4}  y={-12} />
      <Knuckle cx={11}  y={-10} />
      {/* Thumb over fingers */}
      <path d="M -15 4 Q -16 -8 -8 -10 Q -2 -10 4 -8" fill="none" stroke={SK} strokeWidth="7" strokeLinecap="round" />
    </g>
  );
}

// ── POINT (D / index-up hand) ─────────────────────────────────────────────────
function HandPOINT() {
  return (
    <g>
      <Palm />
      <Finger cx={9}  rootY={-8} tipY={-38} width={6} />  {/* index up */}
      <Knuckle cx={-9}  y={-9} />
      <Knuckle cx={-3}  y={-10} />
      <Knuckle cx={ 3}  y={-10} />
      {/* Thumb at side */}
      <path d="M -14 2 Q -22 0 -22 8" stroke={SK} strokeWidth="6" strokeLinecap="round" fill="none" />
    </g>
  );
}

// ── V (peace / 2 hand) ────────────────────────────────────────────────────────
function HandV() {
  return (
    <g>
      <Palm />
      {/* Index + middle spread */}
      <path d="M 3 -8 Q 0 -22 -6 -36" stroke={SK} strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M 9 -8 Q 12 -22 18 -36" stroke={SK} strokeWidth="6" strokeLinecap="round" fill="none" />
      <Knuckle cx={-9}  y={-10} />
      <Knuckle cx={-3}  y={-11} />
      {/* Thumb */}
      <path d="M -14 2 Q -22 0 -22 8" stroke={SK} strokeWidth="6" strokeLinecap="round" fill="none" />
    </g>
  );
}

// ── C (curved C) ──────────────────────────────────────────────────────────────
function HandC() {
  return (
    <g>
      {/* C arc */}
      <path d="M 14 12 A 18 22 0 1 0 14 -12" stroke={SK} strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M 14 12 A 18 22 0 1 0 14 -12" stroke={SKS} strokeWidth="0.8" fill="none" strokeLinecap="round" />
    </g>
  );
}

// ── OK (F hand) ───────────────────────────────────────────────────────────────
function HandOK() {
  return (
    <g>
      <Palm />
      {/* Index + thumb circle */}
      <circle cx="-4" cy="-16" r="10" stroke={SK} strokeWidth="8" fill="none" />
      <circle cx="-4" cy="-16" r="10" stroke={SKS} strokeWidth="0.8" fill="none" />
      {/* Middle, ring, pinky up */}
      <Finger cx={ 3}  rootY={-8} tipY={-34} width={5.5} />
      <Finger cx={ 9}  rootY={-8} tipY={-32} width={5.5} />
      <Finger cx={-9} rootY={-8} tipY={-28} width={5.5} />
    </g>
  );
}

// ── THUMB_UP ──────────────────────────────────────────────────────────────────
function HandTHUMB_UP() {
  return (
    <g>
      <Palm />
      <Knuckle cx={-9}  y={-10} />
      <Knuckle cx={-3}  y={-12} />
      <Knuckle cx={ 4}  y={-12} />
      <Knuckle cx={11}  y={-10} />
      {/* Thumb pointing up */}
      <path d="M -15 4 Q -18 -5 -16 -20 Q -14 -32 -10 -34" stroke={SK} strokeWidth="8" strokeLinecap="round" fill="none" />
    </g>
  );
}

// ── ILY (I Love You) ──────────────────────────────────────────────────────────
function HandILY() {
  return (
    <g>
      <Palm />
      {/* Pinky up */}
      <Finger cx={-9}  rootY={-8} tipY={-32} width={5.5} />
      {/* Index up */}
      <Finger cx={ 9}  rootY={-8} tipY={-32} width={5.5} />
      {/* Thumb out left */}
      <path d="M -14 2 Q -22 -2 -24 6" stroke={SK} strokeWidth="7" strokeLinecap="round" fill="none" />
      {/* Middle + ring curled */}
      <Knuckle cx={-3} y={-10} />
      <Knuckle cx={ 3} y={-10} />
    </g>
  );
}

// ── CLAW (bent 5) ─────────────────────────────────────────────────────────────
function HandCLAW() {
  return (
    <g>
      <Palm w={30} h={16} />
      {([-10, -4, 2, 8] as const).map((cx, i) => (
        <path key={i} d={`M ${cx} -8 Q ${cx + 2} -18 ${cx - 3} -24`}
          stroke={SK} strokeWidth="6" fill="none" strokeLinecap="round" />
      ))}
      {/* Thumb angled */}
      <path d="M -15 2 Q -24 -4 -24 4" stroke={SK} strokeWidth="6" strokeLinecap="round" fill="none" />
    </g>
  );
}

// ── HORNS (devil horns / rock) ────────────────────────────────────────────────
function HandHORNS() {
  return (
    <g>
      <Palm />
      <Finger cx={-9}  rootY={-8} tipY={-32} width={5.5} />  {/* pinky */}
      <Finger cx={ 9}  rootY={-8} tipY={-32} width={5.5} />  {/* index */}
      <Knuckle cx={-3} y={-10} />
      <Knuckle cx={ 3} y={-10} />
      {/* Thumb at side */}
      <path d="M -14 2 Q -22 0 -22 8" stroke={SK} strokeWidth="6" strokeLinecap="round" fill="none" />
    </g>
  );
}

// ── L hand ────────────────────────────────────────────────────────────────────
function HandL() {
  return (
    <g>
      <Palm />
      <Finger cx={9} rootY={-8} tipY={-36} width={6} />   {/* index up */}
      {/* Thumb pointing right */}
      <path d="M -14 0 Q -28 -2 -38 0" stroke={SK} strokeWidth="7" strokeLinecap="round" fill="none" />
      <Knuckle cx={-9}  y={-10} />
      <Knuckle cx={-3}  y={-11} />
      <Knuckle cx={ 3}  y={-11} />
    </g>
  );
}

// ── A hand (fist, thumb at side) ──────────────────────────────────────────────
function HandA() {
  return (
    <g>
      <Palm w={28} h={18} />
      <Knuckle cx={-9} y={-9} />
      <Knuckle cx={-3} y={-11} />
      <Knuckle cx={ 3} y={-11} />
      <Knuckle cx={ 9} y={-9} />
      {/* Thumb at side */}
      <path d="M -14 -4 Q -22 -8 -22 0" stroke={SK} strokeWidth="6.5" strokeLinecap="round" fill="none" />
    </g>
  );
}

// ── O hand ────────────────────────────────────────────────────────────────────
function HandO() {
  return (
    <g>
      {/* Fingers + thumb form oval */}
      <ellipse cx="0" cy="-14" rx="12" ry="16" stroke={SK} strokeWidth="9" fill="none" />
      <ellipse cx="0" cy="-14" rx="12" ry="16" stroke={SKS} strokeWidth="0.8" fill="none" />
      <Palm w={24} h={12} />
    </g>
  );
}

function Hand({ k, flip = false }: { k: HandKey; flip?: boolean }) {
  const inner = (() => {
    switch (k) {
      case "FLAT":     return <HandFLAT />;
      case "FIST":     return <HandFIST />;
      case "POINT":    return <HandPOINT />;
      case "V":        return <HandV />;
      case "C":        return <HandC />;
      case "OK":       return <HandOK />;
      case "THUMB_UP": return <HandTHUMB_UP />;
      case "ILY":      return <HandILY />;
      case "CLAW":     return <HandCLAW />;
      case "HORNS":    return <HandHORNS />;
      case "L":        return <HandL />;
      case "A":        return <HandA />;
      case "O":        return <HandO />;
    }
  })();
  return <g transform={flip ? "scale(-1,1)" : undefined}>{inner}</g>;
}

// ─── Arm renderer ─────────────────────────────────────────────────────────────
function Arm({
  shoulder, pose, handKey, motionClass = "", flip = false, sleeve = SHIRT,
}: {
  shoulder: Pt; pose: ArmPose; handKey: HandKey;
  motionClass?: string; flip?: boolean; sleeve?: string;
}) {
  const { elbow: E, wrist: W } = pose;
  return (
    <g className={motionClass}>
      {/* Upper arm */}
      <line x1={shoulder.x} y1={shoulder.y} x2={E.x} y2={E.y}
        stroke={sleeve} strokeWidth="22" strokeLinecap="round" />
      {/* Forearm */}
      <line x1={E.x} y1={E.y} x2={W.x} y2={W.y}
        stroke={SK} strokeWidth="17" strokeLinecap="round" />
      {/* Elbow crease */}
      <circle cx={E.x} cy={E.y} r={8} fill={SKS} />
      {/* Hand at wrist */}
      <g transform={`translate(${W.x},${W.y})`}
        style={{ transition: "transform 0.42s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <Hand k={handKey} flip={flip} />
      </g>
      {/* Hand Glow for visibility against dark head */}
      <circle cx={W.x} cy={W.y} r="25" fill="#4338CA" opacity="0.05" />
    </g>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Signer2DProps {
  word?: string;
  tag?: string;
  className?: string;
}

export function Signer2D({ word = "", tag = "", className = "" }: Signer2DProps) {
  const [cfg, setCfg] = useState<SignConfig>({
    right: REST_R, rHand: "FLAT", expression: "NEUTRAL", hint: "",
  });

  useEffect(() => {
    const key  = word.toUpperCase();
    const tKey = `__${tag.toUpperCase()}`;
    const resolved = SIGNS[key] ?? SIGNS[tKey] ?? null;
    if (resolved) {
      setCfg(resolved);
    } else {
      setCfg({ right: REST_R, rHand: "FLAT", expression: "NEUTRAL",
        hint: key ? `Fingerspell: ${key}` : "" });
    }
  }, [word, tag]);

  const rPose = cfg.right;
  const lPose = cfg.left ?? REST_L;

  // Eyebrow + mouth driven by expression
  const browStyle = useMemo(() => {
    switch (cfg.expression) {
      case "HAPPY":      return "translateY(-2px) rotate(-4deg)";
      case "NEGATIVE":   return "translateY(2px) rotate(6deg)";
      case "WH_QUESTION":return "translateY(3px)";
      case "QUESTION":   return "translateY(-2px)";
      default:           return "translateY(0)";
    }
  }, [cfg.expression]);

  const mouthD = useMemo(() => {
    switch (cfg.expression) {
      case "HAPPY":    return "M 118 133 Q 140 144 162 133";
      case "NEGATIVE": return "M 120 140 Q 140 130 160 140";
      case "QUESTION": return "M 126 136 L 154 136";
      default:         return "M 122 136 L 158 136";
    }
  }, [cfg.expression]);

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      <style>{`
        @keyframes s-wave   { 0%,100%{transform:rotate(0deg)} 35%{transform:rotate(20deg)} 65%{transform:rotate(-8deg)} }
        @keyframes s-circle { 0%{transform:translate(0,0)} 25%{transform:translate(10px,-10px)} 50%{transform:translate(0,-20px)} 75%{transform:translate(-10px,-10px)} 100%{transform:translate(0,0)} }
        @keyframes s-push   { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-10px,10px)} }
        @keyframes s-pull   { 0%,100%{transform:translate(0,0)} 50%{transform:translate(10px,-6px)} }
        @keyframes s-nod    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(8px)} }
        @keyframes s-shake  { 0%,100%{transform:translateX(0)} 25%{transform:translateX(8px)} 75%{transform:translateX(-8px)} }
        @keyframes s-lift   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes s-flick  { 0%,70%{transform:translateY(0)} 85%{transform:translateY(-10px)} 100%{transform:translateY(0)} }
        @keyframes s-tap    { 0%,100%{transform:translate(0,0)} 40%{transform:translate(0,6px)} }
        @keyframes s-wiggle { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(12deg)} 75%{transform:rotate(-12deg)} }
        .motion-wave   { animation: s-wave   0.9s ease-in-out infinite; transform-origin:${SH_R.x}px ${SH_R.y}px; }
        .motion-circle { animation: s-circle 1.4s linear infinite; }
        .motion-push   { animation: s-push   1.1s ease-in-out infinite; }
        .motion-pull   { animation: s-pull   1.0s ease-in-out infinite; }
        .motion-nod    { animation: s-nod    0.8s ease-in-out infinite; }
        .motion-shake  { animation: s-shake  0.7s ease-in-out infinite; }
        .motion-lift   { animation: s-lift   1.0s ease-in-out infinite; }
        .motion-flick  { animation: s-flick  0.9s ease-in-out 1; }
        .motion-tap    { animation: s-tap    0.5s ease-in-out 2; }
        .motion-wiggle { animation: s-wiggle 0.8s ease-in-out infinite; }
        .motion-roll   { animation: s-circle 1.0s linear infinite; }
        .motion-flip   { animation: s-push   0.8s ease-in-out 2; }
      `}</style>

      <svg viewBox="0 0 280 340" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">

        {/* ── Left arm (behind torso) ── */}
        <Arm shoulder={SH_L} pose={lPose} handKey={cfg.lHand ?? "FLAT"}
          flip sleeve={SHIRT_S} />

        {/* ── Torso ── */}
        <path d="M 92 106 Q 86 175 90 215 Q 108 228 140 230 Q 172 228 190 215 Q 194 175 188 106 Z"
          fill={SHIRT} />
        {/* Collar */}
        <path d="M 115 106 L 140 128 L 165 106" fill={SHIRT_S} />
        {/* Shirt crease */}
        <line x1="140" y1="130" x2="140" y2="230" stroke={SHIRT_S} strokeWidth="1.5" opacity="0.4" />

        {/* ── Neck ── */}
        <rect x="128" y="88" width="24" height="20" rx="8" fill={SK} />

        {/* ── Head ── */}
        <ellipse cx="140" cy="62" rx="36" ry="38" fill={SK} />

        {/* Jaw shadow */}
        <ellipse cx="140" cy="88" rx="22" ry="8" fill={SKS} opacity="0.35" />

        {/* Hair */}
        <path d="M 104 50 Q 108 22 140 20 Q 172 22 176 50 Q 170 36 140 34 Q 110 36 104 50 Z" fill={HAIR} />
        <ellipse cx="140" cy="28" rx="36" ry="14" fill={HAIR} />

        {/* Ears */}
        <ellipse cx="104" cy="64" rx="6" ry="9" fill={SKS} />
        <ellipse cx="176" cy="64" rx="6" ry="9" fill={SKS} />

        {/* Eyebrows */}
        <g style={{ transform: browStyle, transformOrigin: "140px 52px", transition: "transform 0.3s ease" }}>
          <path d="M 118 52 Q 126 48 130 52" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M 150 52 Q 154 48 162 52" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </g>

        {/* Eyes */}
        <ellipse cx="124" cy="60" rx="5" ry="6" fill="#FFFFFF" />
        <ellipse cx="156" cy="60" rx="5" ry="6" fill="#FFFFFF" />
        {/* Highlights */}
        <circle cx="126" cy="58" r="1.8" fill="#4338CA" />
        <circle cx="158" cy="58" r="1.8" fill="#4338CA" />
        {/* Eyelid line */}
        <path d="M 119 57 Q 124 54 129 57" stroke="#FFFFFF" strokeWidth="0.8" fill="none" opacity="0.4" />
        <path d="M 151 57 Q 156 54 161 57" stroke="#FFFFFF" strokeWidth="0.8" fill="none" opacity="0.4" />

        {/* Nose */}
        <path d="M 138 64 Q 134 74 136 78 Q 140 80 144 78 Q 146 74 142 64"
          stroke="#FFFFFF" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.3" />

        {/* Mouth */}
        <path d={mouthD} stroke={LIP} strokeWidth="2.4" strokeLinecap="round" fill="none"
          style={{ transition: "d 0.3s ease" }} />

        {/* Lip line */}
        <path d="M 130 136 Q 140 138 150 136" stroke={SKD} strokeWidth="1" fill="none" opacity="0.5" />

        {/* ── Right arm (dominant, drawn on top) ── */}
        <Arm shoulder={SH_R} pose={rPose} handKey={cfg.rHand}
          motionClass={cfg.motion ?? ""} />

        {/* ── Waist / lower body ── */}
        <path d="M 90 215 Q 88 260 94 280 L 140 280 L 186 280 Q 192 260 190 215 Z" fill="#1E293B" />
        <line x1="140" y1="220" x2="140" y2="280" stroke="#263344" strokeWidth="2" />
      </svg>

      {/* Hint label */}
      {cfg.hint && (
        <div className="mt-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm text-center max-w-[240px]">
          <span className="text-[11px] text-slate-500 leading-tight">{cfg.hint}</span>
        </div>
      )}
    </div>
  );
}
