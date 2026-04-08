"use client";

/**
 * FingerspellBoard — Renders ASL fingerspelling hand shapes (A–Z) as SVG cards.
 *
 * Each letter is a standalone SVG component on a 60×80 viewBox.
 * Palm base is consistent; only finger states change per letter.
 *
 * Anatomy (viewBox 0 0 60 80):
 *   Palm base: rounded rect  x=13 y=44 w=34 h=24
 *   Finger x-centers: pinky=20 ring=26 middle=32 index=38
 *   Finger root y: 44 (top of palm)
 *   Extended top:  pinky=16 ring=10 middle=6 index=10
 *   Thumb root: (13, 52) exits to the left
 */

import React from "react";

// ── Palette ──────────────────────────────────────────────────────────────────
const SK  = "#CBD5E1";   // skin fill
const SKD = "#94A3B8";   // skin dark / crease
const LN  = "#475569";   // stroke / outline

// ── Shared palm base ─────────────────────────────────────────────────────────
function Palm() {
  return (
    <>
      <rect x="13" y="44" width="34" height="24" rx="10" fill={SK} />
      {/* Knuckle crease line */}
      <path d="M 16 44 Q 31 40 46 44" stroke={SKD} strokeWidth="1.2" fill="none" />
    </>
  );
}

// ── Finger helpers ────────────────────────────────────────────────────────────
interface FingerProps { cx: number; tipY: number; width?: number }
function FingerUp({ cx, tipY, width = 6 }: FingerProps) {
  return <rect x={cx - width / 2} y={tipY} width={width} height={44 - tipY} rx={width / 2} fill={SK} />;
}
function FingerBent({ cx, ky = 32 }: { cx: number; ky?: number }) {
  // Finger folds to a knuckle bump — drawn as a small arc
  return (
    <path
      d={`M ${cx - 3} 44 Q ${cx - 5} ${ky} ${cx} ${ky - 4} Q ${cx + 5} ${ky} ${cx + 3} 44`}
      fill={SK} stroke={SKD} strokeWidth="0.8"
    />
  );
}
function FingerCurl({ cx }: { cx: number }) {
  // Fully curled — just a tiny bump at knuckle
  return <ellipse cx={cx} cy={43} rx={3} ry={2} fill={SKD} />;
}

// Thumb variants
function ThumbLeft() {
  // Extended left
  return <rect x="2" y="46" width="14" height="7" rx="3.5" fill={SK} />;
}
function ThumbUp() {
  // Pointing up-left at ~45°
  return (
    <path
      d={`M 13 56 Q 8 50 5 42`}
      stroke={SK} strokeWidth="7" strokeLinecap="round" fill="none"
    />
  );
}
function ThumbCurl() {
  // Tucked under
  return <ellipse cx="16" cy="52" rx="4" ry="3" fill={SKD} />;
}
function ThumbAcross({ toX = 28 }: { toX?: number }) {
  // Crosses in front of bent fingers
  return (
    <path
      d={`M 13 54 Q ${(13 + toX) / 2} 49 ${toX} 50`}
      stroke={SK} strokeWidth="6.5" strokeLinecap="round" fill="none"
    />
  );
}
function ThumbBetween({ atX = 32 }: { atX?: number }) {
  // Thumb pokes up between two fingers
  return (
    <path
      d={`M 13 56 Q 20 44 ${atX} 38`}
      stroke={SK} strokeWidth="6" strokeLinecap="round" fill="none"
    />
  );
}
function ThumbDown() {
  // Pointing down-forward
  return (
    <path d="M 13 52 Q 8 56 6 63" stroke={SK} strokeWidth="7" strokeLinecap="round" fill="none" />
  );
}

// ── Letter SVG components ─────────────────────────────────────────────────────
// Each returns child elements (no wrapping SVG — caller provides that)

function LetterA() {
  return <>
    <Palm />
    <ThumbAcross toX={26} />
    <FingerCurl cx={20} />
    <FingerCurl cx={26} />
    <FingerCurl cx={32} />
    <FingerCurl cx={38} />
  </>;
}

function LetterB() {
  return <>
    <Palm />
    <ThumbAcross toX={24} />
    <FingerUp cx={20} tipY={16} width={5} />
    <FingerUp cx={26} tipY={10} width={5} />
    <FingerUp cx={32} tipY={8}  width={5} />
    <FingerUp cx={38} tipY={11} width={5} />
  </>;
}

function LetterC() {
  return <>
    <Palm />
    <ThumbLeft />
    {/* C arc — thumb + fingers form open C */}
    <path d="M 8 52 A 22 22 0 0 1 44 24" stroke={SK} strokeWidth="9" fill="none" strokeLinecap="round" />
    <path d="M 8 52 A 22 22 0 0 1 44 24" stroke={LN} strokeWidth="1.2" fill="none" strokeLinecap="round" />
  </>;
}

function LetterD() {
  return <>
    <Palm />
    {/* Index straight up */}
    <FingerUp cx={38} tipY={8} width={6} />
    {/* Middle/ring/pinky curl to touch thumb */}
    <FingerBent cx={20} ky={34} />
    <FingerBent cx={26} ky={32} />
    <FingerBent cx={32} ky={30} />
    {/* Thumb curves up to meet them */}
    <path d="M 13 56 Q 18 42 28 36" stroke={SK} strokeWidth="7" strokeLinecap="round" fill="none" />
  </>;
}

function LetterE() {
  return <>
    <Palm />
    <ThumbAcross toX={18} />
    <FingerBent cx={20} ky={34} />
    <FingerBent cx={26} ky={30} />
    <FingerBent cx={32} ky={28} />
    <FingerBent cx={38} ky={30} />
  </>;
}

function LetterF() {
  return <>
    <Palm />
    {/* Index + thumb form circle */}
    <circle cx="25" cy="32" r="9" stroke={SK} strokeWidth="7" fill="none" />
    <circle cx="25" cy="32" r="9" stroke={LN} strokeWidth="1.2" fill="none" />
    {/* Middle, ring, pinky up */}
    <FingerUp cx={32} tipY={8}  width={5} />
    <FingerUp cx={38} tipY={10} width={5} />
    <FingerUp cx={26} tipY={10} width={5} />
  </>;
}

function LetterG() {
  return <>
    <Palm />
    {/* Index pointing right */}
    <rect x="38" y="37" width="18" height="6" rx="3" fill={SK} />
    {/* Thumb parallel, slightly lower */}
    <rect x="38" y="46" width="16" height="6" rx="3" fill={SK} />
    <FingerCurl cx={20} />
    <FingerCurl cx={26} />
    <FingerCurl cx={32} />
  </>;
}

function LetterH() {
  return <>
    <Palm />
    {/* Index + middle pointing right */}
    <rect x="36" y="33" width="18" height="6" rx="3" fill={SK} />
    <rect x="36" y="41" width="18" height="6" rx="3" fill={SK} />
    <FingerCurl cx={20} />
    <FingerCurl cx={26} />
    <ThumbAcross toX={24} />
  </>;
}

function LetterI() {
  return <>
    <Palm />
    <ThumbAcross toX={26} />
    {/* Only pinky up */}
    <FingerUp cx={20} tipY={12} width={6} />
    <FingerCurl cx={26} />
    <FingerCurl cx={32} />
    <FingerCurl cx={38} />
  </>;
}

function LetterJ() {
  // Like I but show J motion path
  return <>
    <Palm />
    <ThumbAcross toX={26} />
    <FingerUp cx={20} tipY={12} width={6} />
    <FingerCurl cx={26} />
    <FingerCurl cx={32} />
    <FingerCurl cx={38} />
    {/* J trace */}
    <path d="M 20 12 Q 20 4 14 4 Q 8 4 8 10" stroke="#a78bfa" strokeWidth="1.8" fill="none"
      strokeLinecap="round" strokeDasharray="3 2" />
  </>;
}

function LetterK() {
  return <>
    <Palm />
    {/* Index straight up */}
    <FingerUp cx={38} tipY={9} width={6} />
    {/* Middle angled at ~45° */}
    <path d="M 32 44 Q 36 30 44 20" stroke={SK} strokeWidth="6" strokeLinecap="round" fill="none" />
    {/* Thumb up between */}
    <ThumbBetween atX={36} />
    <FingerCurl cx={20} />
    <FingerCurl cx={26} />
  </>;
}

function LetterL() {
  return <>
    <Palm />
    {/* Index up */}
    <FingerUp cx={38} tipY={8} width={6} />
    {/* Thumb pointing left */}
    <ThumbLeft />
    <FingerCurl cx={20} />
    <FingerCurl cx={26} />
    <FingerCurl cx={32} />
  </>;
}

function LetterM() {
  return <>
    <Palm />
    {/* Three fingers over thumb */}
    <FingerBent cx={26} ky={36} />
    <FingerBent cx={32} ky={34} />
    <FingerBent cx={38} ky={36} />
    {/* Thumb tucked under */}
    <path d="M 13 56 Q 20 52 28 54" stroke={SK} strokeWidth="6" strokeLinecap="round" fill="none" />
    <FingerCurl cx={20} />
  </>;
}

function LetterN() {
  return <>
    <Palm />
    {/* Two fingers over thumb */}
    <FingerBent cx={32} ky={34} />
    <FingerBent cx={38} ky={36} />
    {/* Thumb tucked under index+middle */}
    <path d="M 13 56 Q 22 52 30 53" stroke={SK} strokeWidth="6" strokeLinecap="round" fill="none" />
    <FingerCurl cx={20} />
    <FingerCurl cx={26} />
  </>;
}

function LetterO() {
  return <>
    <Palm />
    {/* All fingers form O with thumb */}
    <path d="M 16 52 A 14 18 0 0 1 44 38" stroke={SK} strokeWidth="8" fill="none" strokeLinecap="round" />
    <path d="M 16 52 A 14 18 0 0 1 44 38" stroke={LN} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    {/* Thumb close */}
    <path d="M 13 54 Q 22 46 36 40" stroke={SK} strokeWidth="7" strokeLinecap="round" fill="none" />
    {/* O tip */}
    <ellipse cx="40" cy="38" rx="5" ry="4" fill={SK} />
  </>;
}

function LetterP() {
  return <>
    <Palm />
    {/* Like K but pointing down-forward */}
    <path d="M 32 44 Q 28 56 22 64" stroke={SK} strokeWidth="7" strokeLinecap="round" fill="none" />
    <path d="M 38 44 Q 42 56 48 62" stroke={SK} strokeWidth="7" strokeLinecap="round" fill="none" />
    <ThumbBetween atX={36} />
    <FingerCurl cx={20} />
    <FingerCurl cx={26} />
  </>;
}

function LetterQ() {
  return <>
    <Palm />
    {/* Index + thumb point down */}
    <path d="M 38 44 Q 40 56 38 66" stroke={SK} strokeWidth="6" strokeLinecap="round" fill="none" />
    <ThumbDown />
    <FingerCurl cx={20} />
    <FingerCurl cx={26} />
    <FingerCurl cx={32} />
  </>;
}

function LetterR() {
  return <>
    <Palm />
    {/* Index + middle crossed */}
    <path d="M 34 44 Q 38 26 42 10" stroke={SK} strokeWidth="6" strokeLinecap="round" fill="none" />
    <path d="M 38 44 Q 36 28 34 10" stroke={SK} strokeWidth="6" strokeLinecap="round" fill="none" />
    <FingerCurl cx={20} />
    <FingerCurl cx={26} />
    <ThumbAcross toX={26} />
  </>;
}

function LetterS() {
  return <>
    <Palm />
    {/* Fist with thumb over fingers */}
    <ThumbAcross toX={32} />
    <FingerCurl cx={20} />
    <FingerCurl cx={26} />
    <FingerCurl cx={32} />
    <FingerCurl cx={38} />
  </>;
}

function LetterT() {
  return <>
    <Palm />
    {/* Thumb between index and middle */}
    <FingerBent cx={38} ky={34} />
    <ThumbBetween atX={36} />
    <FingerCurl cx={20} />
    <FingerCurl cx={26} />
    <FingerCurl cx={32} />
  </>;
}

function LetterU() {
  return <>
    <Palm />
    {/* Index + middle together, pointing up */}
    <FingerUp cx={35} tipY={8} width={6} />
    <FingerUp cx={41} tipY={8} width={6} />
    <FingerCurl cx={20} />
    <FingerCurl cx={26} />
    <ThumbAcross toX={24} />
  </>;
}

function LetterV() {
  return <>
    <Palm />
    {/* Index + middle spread V */}
    <path d="M 32 44 Q 28 28 24 10" stroke={SK} strokeWidth="6" strokeLinecap="round" fill="none" />
    <path d="M 38 44 Q 42 28 46 10" stroke={SK} strokeWidth="6" strokeLinecap="round" fill="none" />
    <FingerCurl cx={20} />
    <FingerCurl cx={26} />
    <ThumbAcross toX={26} />
  </>;
}

function LetterW() {
  return <>
    <Palm />
    {/* Index + middle + ring spread */}
    <path d="M 26 44 Q 22 28 18 10" stroke={SK} strokeWidth="6" strokeLinecap="round" fill="none" />
    <FingerUp cx={32} tipY={8} width={6} />
    <path d="M 38 44 Q 42 28 46 10" stroke={SK} strokeWidth="6" strokeLinecap="round" fill="none" />
    <FingerCurl cx={20} />
    <ThumbAcross toX={22} />
  </>;
}

function LetterX() {
  return <>
    <Palm />
    {/* Index hooked — bent at mid-finger */}
    <path d="M 38 44 Q 42 34 38 28 Q 34 22 36 18" stroke={SK} strokeWidth="6" strokeLinecap="round" fill="none" />
    <FingerCurl cx={20} />
    <FingerCurl cx={26} />
    <FingerCurl cx={32} />
    <ThumbAcross toX={28} />
  </>;
}

function LetterY() {
  return <>
    <Palm />
    {/* Pinky up, thumb out */}
    <FingerUp cx={20} tipY={12} width={6} />
    <ThumbLeft />
    <FingerCurl cx={26} />
    <FingerCurl cx={32} />
    <FingerCurl cx={38} />
  </>;
}

function LetterZ() {
  return <>
    <Palm />
    {/* Index traces Z — show end position with dashed path */}
    <FingerBent cx={38} ky={30} />
    <FingerCurl cx={20} />
    <FingerCurl cx={26} />
    <FingerCurl cx={32} />
    <ThumbAcross toX={28} />
    {/* Z trace guide */}
    <path d="M 28 20 L 48 20 L 28 36 L 48 36" stroke="#a78bfa" strokeWidth="1.8"
      fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 2" />
  </>;
}

// ── Registry ──────────────────────────────────────────────────────────────────
const LETTER_MAP: Record<string, React.ReactNode> = {
  A: <LetterA />, B: <LetterB />, C: <LetterC />, D: <LetterD />,
  E: <LetterE />, F: <LetterF />, G: <LetterG />, H: <LetterH />,
  I: <LetterI />, J: <LetterJ />, K: <LetterK />, L: <LetterL />,
  M: <LetterM />, N: <LetterN />, O: <LetterO />, P: <LetterP />,
  Q: <LetterQ />, R: <LetterR />, S: <LetterS />, T: <LetterT />,
  U: <LetterU />, V: <LetterV />, W: <LetterW />, X: <LetterX />,
  Y: <LetterY />, Z: <LetterZ />,
};

// ── Single letter card ────────────────────────────────────────────────────────
function LetterCard({ letter, active = false }: { letter: string; active?: boolean }) {
  const shape = LETTER_MAP[letter.toUpperCase()];
  if (!shape) return null;

  return (
    <div className={`
      flex flex-col items-center gap-1.5 rounded-xl border transition-all duration-300
      ${active
        ? "border-purple-400 bg-purple-50 shadow-lg shadow-purple-100 scale-110"
        : "border-slate-200 bg-white shadow-sm"}
    `}>
      <svg
        viewBox="0 0 60 80"
        className="w-14 h-[4.5rem]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {shape}
      </svg>
      <span className={`text-xs font-black pb-1.5 tracking-widest ${active ? "text-purple-700" : "text-slate-600"}`}>
        {letter.toUpperCase()}
      </span>
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────
interface FingerspellBoardProps {
  /** Word or phrase to fingerspell */
  text: string;
  /** Index of the currently active letter (e.g. during animation) */
  activeIndex?: number;
  className?: string;
}

export function FingerspellBoard({ text, activeIndex = -1, className = "" }: FingerspellBoardProps) {
  const letters = text.toUpperCase().replace(/[^A-Z]/g, "").split("");
  if (letters.length === 0) return null;

  return (
    <div className={className}>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
        <span className="w-4 h-4 rounded bg-purple-100 text-purple-600 flex items-center justify-center text-[10px]">✋</span>
        Fingerspelling: <span className="text-purple-600">{text.toUpperCase()}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {letters.map((letter, i) => (
          <LetterCard key={i} letter={letter} active={activeIndex === i} />
        ))}
      </div>
    </div>
  );
}
