"use client";

/**
 * Signer2D — split 2D hand canvas.
 *
 * ViewBox: 0 0 360 260
 * Left hand occupies x:0-180, right hand x:180-360.
 * Both are full SVG with kinematic arms + hand shapes.
 * Right arm is drawn on top — when they overlap the depth is visible.
 * Motion animations are applied per-arm via CSS keyframes.
 */

import React, { useEffect, useState } from "react";

// ─── Palette ──────────────────────────────────────────────────────────────────
const SK  = "#FDDBB4";   // skin
const SKS = "#E8A96A";   // skin shadow / outline
const SHIRT = "#4338CA"; // sleeve / upper arm

// ─── Types ────────────────────────────────────────────────────────────────────
export type FacialExpression = "NEUTRAL" | "HAPPY" | "QUESTION" | "WH_QUESTION" | "NEGATIVE";

type Pt = { x: number; y: number };

interface ArmPose { elbow: Pt; wrist: Pt; }

type HandKey =
  | "FLAT" | "FIST" | "POINT" | "V" | "C" | "OK"
  | "THUMB_UP" | "ILY" | "CLAW" | "HORNS" | "L" | "A" | "O";

interface SignConfig {
  right: ArmPose;
  left?: ArmPose;
  rHand: HandKey;
  lHand?: HandKey;
  expression: FacialExpression;
  /** CSS class applied to RIGHT arm group */
  rMotion?: string;
  /** CSS class applied to LEFT arm group */
  lMotion?: string;
  hint: string;
}

// ─── Anchors — right shoulder at x=270, left at x=90 ─────────────────────────
const SH_R: Pt = { x: 270, y: 90 };
const SH_L: Pt = { x:  90, y: 90 };

const REST_R: ArmPose = { elbow: { x: 290, y: 150 }, wrist: { x: 295, y: 210 } };
const REST_L: ArmPose = { elbow: { x:  70, y: 150 }, wrist: { x:  65, y: 210 } };

// ─── Sign dictionary ──────────────────────────────────────────────────────────
const SIGNS: Record<string, SignConfig> = {
  HELLO: {
    right: { elbow: { x: 255, y: 85  }, wrist: { x: 220, y: 58  } },
    rHand: "FLAT", expression: "HAPPY", rMotion: "motion-wave",
    hint: "Flat hand sweeps out from forehead",
  },
  HI: {
    right: { elbow: { x: 258, y: 90  }, wrist: { x: 225, y: 65  } },
    rHand: "FLAT", expression: "HAPPY", rMotion: "motion-wave",
    hint: "Casual wave",
  },
  GOODBYE: {
    right: { elbow: { x: 255, y: 95  }, wrist: { x: 228, y: 68  } },
    rHand: "FLAT", expression: "NEUTRAL", rMotion: "motion-wave",
    hint: "Wave side to side",
  },
  THANK_YOU: {
    right: { elbow: { x: 250, y: 115 }, wrist: { x: 222, y: 105 } },
    rHand: "FLAT", expression: "HAPPY", rMotion: "motion-push",
    hint: "Flat hand from chin, move forward",
  },
  PLEASE: {
    right: { elbow: { x: 242, y: 115 }, wrist: { x: 218, y: 128 } },
    rHand: "FLAT", expression: "HAPPY", rMotion: "motion-circle",
    hint: "Flat hand circles on chest",
  },
  SORRY: {
    right: { elbow: { x: 245, y: 112 }, wrist: { x: 220, y: 122 } },
    rHand: "FIST", expression: "NEGATIVE", rMotion: "motion-circle",
    hint: "Fist circles on chest",
  },
  YES: {
    right: { elbow: { x: 265, y: 105 }, wrist: { x: 268, y: 72  } },
    rHand: "FIST", expression: "NEUTRAL", rMotion: "motion-nod",
    hint: "Fist bobs up and down",
  },
  NO: {
    right: { elbow: { x: 250, y: 108 }, wrist: { x: 226, y: 90  } },
    rHand: "POINT", expression: "NEGATIVE", rMotion: "motion-shake",
    hint: "Index + middle snap on thumb",
  },
  WHERE: {
    right: { elbow: { x: 282, y: 100 }, wrist: { x: 308, y: 80  } },
    rHand: "POINT", expression: "WH_QUESTION", rMotion: "motion-shake",
    hint: "Waggle index side to side",
  },
  WHAT: {
    right: { elbow: { x: 250, y: 118 }, wrist: { x: 226, y: 100 } },
    rHand: "FLAT", expression: "WH_QUESTION", rMotion: "motion-shake",
    hint: "Brush index along non-dom palm",
  },
  WHO: {
    right: { elbow: { x: 248, y: 98  }, wrist: { x: 228, y: 82  } },
    rHand: "POINT", expression: "WH_QUESTION", rMotion: "motion-circle",
    hint: "Index circles near chin",
  },
  WHEN: {
    right: { elbow: { x: 255, y: 108 }, wrist: { x: 232, y: 92  } },
    rHand: "POINT", expression: "WH_QUESTION",
    hint: "Index circles then taps non-dom index",
  },
  WHY: {
    right: { elbow: { x: 248, y: 98  }, wrist: { x: 228, y: 82  } },
    rHand: "CLAW", expression: "WH_QUESTION", rMotion: "motion-pull",
    hint: "Hand pulls from forehead",
  },
  HOW: {
    right: { elbow: { x: 248, y: 105 }, wrist: { x: 228, y: 92  } },
    left:  { elbow: { x: 112, y: 105 }, wrist: { x: 132, y: 92  } },
    rHand: "CLAW", lHand: "CLAW", expression: "WH_QUESTION",
    rMotion: "motion-roll", lMotion: "motion-roll",
    hint: "Both CLAWs roll knuckles-up",
  },
  HELP: {
    right: { elbow: { x: 248, y: 105 }, wrist: { x: 228, y: 92  } },
    left:  { elbow: { x: 105, y: 112 }, wrist: { x: 128, y: 100 } },
    rHand: "THUMB_UP", lHand: "FLAT", expression: "NEUTRAL",
    rMotion: "motion-lift",
    hint: "Thumb-up on flat palm, lift up",
  },
  UNDERSTAND: {
    right: { elbow: { x: 250, y: 98  }, wrist: { x: 230, y: 82  } },
    rHand: "POINT", expression: "NEUTRAL", rMotion: "motion-flick",
    hint: "Index flicks up near temple",
  },
  KNOW: {
    right: { elbow: { x: 250, y: 102 }, wrist: { x: 230, y: 86  } },
    rHand: "FLAT", expression: "NEUTRAL", rMotion: "motion-tap",
    hint: "Fingertips tap temple",
  },
  WANT: {
    right: { elbow: { x: 248, y: 105 }, wrist: { x: 228, y: 92  } },
    left:  { elbow: { x: 112, y: 105 }, wrist: { x: 132, y: 92  } },
    rHand: "CLAW", lHand: "CLAW", expression: "NEUTRAL",
    rMotion: "motion-pull", lMotion: "motion-pull",
    hint: "Both claws pull toward body",
  },
  LOVE: {
    right: { elbow: { x: 242, y: 112 }, wrist: { x: 220, y: 122 } },
    left:  { elbow: { x: 118, y: 112 }, wrist: { x: 140, y: 122 } },
    rHand: "FIST", lHand: "FIST", expression: "HAPPY",
    hint: "Fists crossed over chest",
  },
  GO: {
    right: { elbow: { x: 282, y: 82  }, wrist: { x: 312, y: 62  } },
    rHand: "POINT", expression: "NEUTRAL", rMotion: "motion-push",
    hint: "Index arcs outward-forward",
  },
  COME: {
    right: { elbow: { x: 282, y: 82  }, wrist: { x: 312, y: 62  } },
    rHand: "POINT", expression: "NEUTRAL", rMotion: "motion-pull",
    hint: "Bent index draws toward body",
  },
  SEE: {
    right: { elbow: { x: 250, y: 102 }, wrist: { x: 230, y: 86  } },
    rHand: "V", expression: "NEUTRAL",
    hint: "V-hand moves from eye level forward",
  },
  GOOD: {
    right: { elbow: { x: 248, y: 115 }, wrist: { x: 222, y: 105 } },
    rHand: "FLAT", expression: "HAPPY", rMotion: "motion-push",
    hint: "Flat hand from mouth, downward",
  },
  BAD: {
    right: { elbow: { x: 248, y: 85  }, wrist: { x: 222, y: 98  } },
    rHand: "FLAT", expression: "NEGATIVE", rMotion: "motion-flip",
    hint: "Fingertips touch lips, flip hand down",
  },
  WAIT: {
    right: { elbow: { x: 258, y: 115 }, wrist: { x: 244, y: 128 } },
    left:  { elbow: { x: 102, y: 115 }, wrist: { x: 116, y: 128 } },
    rHand: "CLAW", lHand: "CLAW", expression: "NEUTRAL",
    rMotion: "motion-wiggle", lMotion: "motion-wiggle",
    hint: "Both claws wiggle, palms up",
  },
  NAME: {
    right: { elbow: { x: 258, y: 92  }, wrist: { x: 244, y: 78  } },
    left:  { elbow: { x: 102, y: 92  }, wrist: { x: 116, y: 78  } },
    rHand: "V", lHand: "V", expression: "NEUTRAL", rMotion: "motion-tap",
    hint: "H-hands tap together twice",
  },
  NEED: {
    right: { elbow: { x: 282, y: 90  }, wrist: { x: 308, y: 70  } },
    rHand: "POINT", expression: "WH_QUESTION", rMotion: "motion-nod",
    hint: "Bent index bends downward twice",
  },
  LEARN: {
    right: { elbow: { x: 248, y: 110 }, wrist: { x: 228, y: 96  } },
    left:  { elbow: { x: 105, y: 105 }, wrist: { x: 128, y: 92  } },
    rHand: "CLAW", lHand: "FLAT", expression: "NEUTRAL", rMotion: "motion-lift",
    hint: "Hand lifts from palm to eye level",
  },
  // ── Tag fallbacks ──
  __TIME: {
    right: { elbow: { x: 282, y: 115 }, wrist: { x: 308, y: 96  } },
    rHand: "POINT", expression: "NEUTRAL", rMotion: "motion-tap",
    hint: "Point to wrist",
  },
  __ACTION: {
    right: { elbow: { x: 272, y: 125 }, wrist: { x: 295, y: 105 } },
    rHand: "FIST", expression: "NEUTRAL", rMotion: "motion-push",
    hint: "Action verb",
  },
  __OBJECT: {
    right: { elbow: { x: 248, y: 105 }, wrist: { x: 228, y: 92  } },
    left:  { elbow: { x: 112, y: 105 }, wrist: { x: 132, y: 92  } },
    rHand: "C", lHand: "C", expression: "NEUTRAL",
    hint: "Noun shape",
  },
  __SUBJECT: {
    right: { elbow: { x: 282, y: 122 }, wrist: { x: 308, y: 102 } },
    rHand: "POINT", expression: "NEUTRAL",
    hint: "Point to referent",
  },
  __MODIFIER: {
    right: { elbow: { x: 255, y: 132 }, wrist: { x: 232, y: 122 } },
    rHand: "OK", expression: "NEUTRAL",
    hint: "Descriptive",
  },
};

// ─── Hand SVG shapes — centred at (0,0), caller wraps in translate+scale ──────

function Palm({ w = 26, h = 15 }: { w?: number; h?: number }) {
  return <rect x={-w/2} y={-h/2} width={w} height={h} rx={6} fill={SK} stroke={SKS} strokeWidth="0.9"/>;
}
function Finger({ cx, rootY, tipY, width = 5 }: { cx:number; rootY:number; tipY:number; width?:number }) {
  return <rect x={cx-width/2} y={tipY} width={width} height={rootY-tipY} rx={2.2} fill={SK} stroke={SKS} strokeWidth="0.6"/>;
}
function Knuckle({ cx, y }: { cx:number; y:number }) {
  return <ellipse cx={cx} cy={y} rx={3} ry={1.8} fill={SKS}/>;
}

function HandFLAT() {
  return <g>
    <Palm/>
    <Finger cx={-8} rootY={-7} tipY={-29} width={5}/>
    <Finger cx={-2.5} rootY={-7} tipY={-33} width={5}/>
    <Finger cx={2.5} rootY={-7} tipY={-33} width={5}/>
    <Finger cx={8} rootY={-7} tipY={-27} width={5}/>
    <path d="M -13 2 Q -18 -2 -20 5 Q -18 11 -13 9" fill={SK} stroke={SKS} strokeWidth="0.6"/>
  </g>;
}
function HandFIST() {
  return <g>
    <Palm w={28} h={19}/>
    <Knuckle cx={-9} y={-9}/><Knuckle cx={-3} y={-11}/><Knuckle cx={3} y={-11}/><Knuckle cx={9} y={-9}/>
    <path d="M -14 4 Q -15 -7 -7 -9 Q -1 -9 5 -7" fill="none" stroke={SK} strokeWidth="6.5" strokeLinecap="round"/>
  </g>;
}
function HandPOINT() {
  return <g>
    <Palm/>
    <Finger cx={8} rootY={-7} tipY={-34} width={5.5}/>
    <Knuckle cx={-8} y={-8}/><Knuckle cx={-2.5} y={-9}/><Knuckle cx={2.5} y={-9}/>
    <path d="M -13 2 Q -20 0 -20 7" stroke={SK} strokeWidth="5.5" strokeLinecap="round" fill="none"/>
  </g>;
}
function HandV() {
  return <g>
    <Palm/>
    <path d="M 2.5 -7 Q 0 -20 -5 -32" stroke={SK} strokeWidth="5.5" strokeLinecap="round" fill="none"/>
    <path d="M 8 -7 Q 11 -20 16 -32" stroke={SK} strokeWidth="5.5" strokeLinecap="round" fill="none"/>
    <Knuckle cx={-8} y={-9}/><Knuckle cx={-2.5} y={-10}/>
    <path d="M -13 2 Q -20 0 -20 7" stroke={SK} strokeWidth="5.5" strokeLinecap="round" fill="none"/>
  </g>;
}
function HandC() {
  return <g>
    <path d="M 13 10 A 16 20 0 1 0 13 -10" stroke={SK} strokeWidth="8" fill="none" strokeLinecap="round"/>
    <path d="M 13 10 A 16 20 0 1 0 13 -10" stroke={SKS} strokeWidth="0.8" fill="none" strokeLinecap="round"/>
  </g>;
}
function HandOK() {
  return <g>
    <Palm/>
    <circle cx="-3" cy="-14" r="9" stroke={SK} strokeWidth="7" fill="none"/>
    <circle cx="-3" cy="-14" r="9" stroke={SKS} strokeWidth="0.8" fill="none"/>
    <Finger cx={2.5} rootY={-7} tipY={-30} width={5}/>
    <Finger cx={8} rootY={-7} tipY={-28} width={5}/>
    <Finger cx={-8} rootY={-7} tipY={-24} width={5}/>
  </g>;
}
function HandTHUMB_UP() {
  return <g>
    <Palm/>
    <Knuckle cx={-8} y={-9}/><Knuckle cx={-2.5} y={-11}/><Knuckle cx={3} y={-11}/><Knuckle cx={9} y={-9}/>
    <path d="M -14 3 Q -17 -4 -15 -18 Q -13 -29 -9 -31" stroke={SK} strokeWidth="7" strokeLinecap="round" fill="none"/>
  </g>;
}
function HandILY() {
  return <g>
    <Palm/>
    <Finger cx={-8} rootY={-7} tipY={-29} width={5}/>
    <Finger cx={8} rootY={-7} tipY={-29} width={5}/>
    <path d="M -13 2 Q -20 -2 -22 5" stroke={SK} strokeWidth="6.5" strokeLinecap="round" fill="none"/>
    <Knuckle cx={-2.5} y={-9}/><Knuckle cx={2.5} y={-9}/>
  </g>;
}
function HandCLAW() {
  return <g>
    <Palm w={28} h={15}/>
    {([-9,-3,3,9] as const).map((cx,i) => (
      <path key={i} d={`M ${cx} -7 Q ${cx+2} -16 ${cx-2} -22`} stroke={SK} strokeWidth="5.5" fill="none" strokeLinecap="round"/>
    ))}
    <path d="M -14 2 Q -22 -3 -22 4" stroke={SK} strokeWidth="5.5" strokeLinecap="round" fill="none"/>
  </g>;
}
function HandHORNS() {
  return <g>
    <Palm/>
    <Finger cx={-8} rootY={-7} tipY={-29} width={5}/>
    <Finger cx={8} rootY={-7} tipY={-29} width={5}/>
    <Knuckle cx={-2.5} y={-9}/><Knuckle cx={2.5} y={-9}/>
    <path d="M -13 2 Q -20 0 -20 7" stroke={SK} strokeWidth="5.5" strokeLinecap="round" fill="none"/>
  </g>;
}
function HandL() {
  return <g>
    <Palm/>
    <Finger cx={8} rootY={-7} tipY={-32} width={5.5}/>
    <path d="M -13 0 Q -25 -2 -34 0" stroke={SK} strokeWidth="6.5" strokeLinecap="round" fill="none"/>
    <Knuckle cx={-8} y={-9}/><Knuckle cx={-2.5} y={-10}/><Knuckle cx={2.5} y={-10}/>
  </g>;
}
function HandA() {
  return <g>
    <Palm w={26} h={17}/>
    <Knuckle cx={-8} y={-8}/><Knuckle cx={-2.5} y={-10}/><Knuckle cx={2.5} y={-10}/><Knuckle cx={8} y={-8}/>
    <path d="M -13 -3 Q -20 -7 -20 0" stroke={SK} strokeWidth="6" strokeLinecap="round" fill="none"/>
  </g>;
}
function HandO() {
  return <g>
    <ellipse cx="0" cy="-12" rx="11" ry="14" stroke={SK} strokeWidth="8" fill="none"/>
    <ellipse cx="0" cy="-12" rx="11" ry="14" stroke={SKS} strokeWidth="0.8" fill="none"/>
    <Palm w={22} h={11}/>
  </g>;
}

function Hand({ k, flip = false }: { k: HandKey; flip?: boolean }) {
  const inner = (() => {
    switch (k) {
      case "FLAT":     return <HandFLAT/>;
      case "FIST":     return <HandFIST/>;
      case "POINT":    return <HandPOINT/>;
      case "V":        return <HandV/>;
      case "C":        return <HandC/>;
      case "OK":       return <HandOK/>;
      case "THUMB_UP": return <HandTHUMB_UP/>;
      case "ILY":      return <HandILY/>;
      case "CLAW":     return <HandCLAW/>;
      case "HORNS":    return <HandHORNS/>;
      case "L":        return <HandL/>;
      case "A":        return <HandA/>;
      case "O":        return <HandO/>;
    }
  })();
  return <g transform={flip ? "scale(-1,1)" : undefined}>{inner}</g>;
}

// ─── Arm renderer ─────────────────────────────────────────────────────────────
function Arm({
  shoulder, pose, handKey, motionClass = "", flip = false,
}: {
  shoulder: Pt; pose: ArmPose; handKey: HandKey; motionClass?: string; flip?: boolean;
}) {
  const { elbow: E, wrist: W } = pose;
  return (
    <g className={motionClass}>
      {/* Sleeve / upper arm */}
      <line x1={shoulder.x} y1={shoulder.y} x2={E.x} y2={E.y}
        stroke={SHIRT} strokeWidth="22" strokeLinecap="round"/>
      {/* Forearm skin */}
      <line x1={E.x} y1={E.y} x2={W.x} y2={W.y}
        stroke={SK} strokeWidth="18" strokeLinecap="round"/>
      {/* Forearm outline */}
      <line x1={E.x} y1={E.y} x2={W.x} y2={W.y}
        stroke={SKS} strokeWidth="18.8" strokeLinecap="round" opacity="0.25"/>
      {/* Elbow cap */}
      <circle cx={E.x} cy={E.y} r={8} fill={SKS}/>
      {/* Wrist glow */}
      <circle cx={W.x} cy={W.y} r={28} fill={SHIRT} opacity="0.07"/>
      {/* Hand */}
      <g transform={`translate(${W.x},${W.y}) scale(1.6)`}>
        <Hand k={handKey} flip={flip}/>
      </g>
    </g>
  );
}

// ─── Overlap detector ─────────────────────────────────────────────────────────
function isOverlap(r: Pt, l: Pt) {
  return Math.abs(r.x - l.x) < 55 && Math.abs(r.y - l.y) < 55;
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
    setCfg(resolved ?? {
      right: REST_R, rHand: "FLAT", expression: "NEUTRAL",
      hint: key ? `Fingerspell: ${key}` : "",
    });
  }, [word, tag]);

  const rPose       = cfg.right;
  const lPose       = cfg.left ?? REST_L;
  const leftActive  = !!cfg.left;
  const overlap     = leftActive && isOverlap(rPose.wrist, lPose.wrist);

  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      {/* ── CSS keyframes ── */}
      <style>{`
        @keyframes s-wave   { 0%,100%{transform:rotate(0deg)} 35%{transform:rotate(20deg)} 65%{transform:rotate(-8deg)} }
        @keyframes s-circle { 0%{transform:translate(0,0)} 25%{transform:translate(10px,-10px)} 50%{transform:translate(0,-20px)} 75%{transform:translate(-10px,-10px)} 100%{transform:translate(0,0)} }
        @keyframes s-push   { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-10px,10px)} }
        @keyframes s-pull   { 0%,100%{transform:translate(0,0)} 50%{transform:translate(10px,-7px)} }
        @keyframes s-nod    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(9px)} }
        @keyframes s-shake  { 0%,100%{transform:translateX(0)} 25%{transform:translateX(9px)} 75%{transform:translateX(-9px)} }
        @keyframes s-lift   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-13px)} }
        @keyframes s-flick  { 0%,70%{transform:translateY(0)} 85%{transform:translateY(-11px)} 100%{transform:translateY(0)} }
        @keyframes s-tap    { 0%,100%{transform:translateY(0)} 40%{transform:translateY(7px)} }
        @keyframes s-wiggle { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(14deg)} 75%{transform:rotate(-14deg)} }
        .motion-wave   { animation: s-wave   0.9s ease-in-out infinite; transform-origin: 270px 90px; }
        .motion-circle { animation: s-circle 1.4s linear     infinite; }
        .motion-push   { animation: s-push   1.1s ease-in-out infinite; }
        .motion-pull   { animation: s-pull   1.0s ease-in-out infinite; }
        .motion-nod    { animation: s-nod    0.8s ease-in-out infinite; }
        .motion-shake  { animation: s-shake  0.7s ease-in-out infinite; }
        .motion-lift   { animation: s-lift   1.0s ease-in-out infinite; }
        .motion-flick  { animation: s-flick  0.9s ease-in-out 2; }
        .motion-tap    { animation: s-tap    0.5s ease-in-out 3; }
        .motion-wiggle { animation: s-wiggle 0.8s ease-in-out infinite; }
        .motion-roll   { animation: s-circle 1.0s linear     infinite; }
        .motion-flip   { animation: s-wave   0.8s ease-in-out 2; }
      `}</style>

      {/* ── SVG canvas ── */}
      <svg
        viewBox="0 0 360 240"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Subtle centre divider */}
        <line x1="180" y1="10" x2="180" y2="230"
          stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 6"/>

        {/* Side labels */}
        <text x="40" y="22" fontSize="9" fontWeight="800" fill="#38BDF8"
          letterSpacing="2" textAnchor="middle" fontFamily="sans-serif">LEFT</text>
        <text x="320" y="22" fontSize="9" fontWeight="800" fill="#818CF8"
          letterSpacing="2" textAnchor="middle" fontFamily="sans-serif">RIGHT ✦</text>

        {/* ── LEFT arm (drawn behind) ── */}
        <Arm
          shoulder={SH_L}
          pose={lPose}
          handKey={cfg.lHand ?? "FLAT"}
          motionClass={cfg.lMotion ?? ""}
          flip
        />

        {/* ── RIGHT arm (drawn on top) ── */}
        <Arm
          shoulder={SH_R}
          pose={rPose}
          handKey={cfg.rHand}
          motionClass={cfg.rMotion ?? ""}
        />

        {/* Depth label when overlapping */}
        {overlap && (
          <text x="180" y="245" fontSize="8.5" fill="#D97706" fontWeight="700"
            textAnchor="middle" fontFamily="sans-serif">
            ⚡ right in front
          </text>
        )}
      </svg>

      {/* Hint */}
      {cfg.hint && (
        <p className="text-[11px] text-slate-400 italic text-center leading-snug px-2">
          {cfg.hint}
        </p>
      )}
    </div>
  );
}
