"use client";

/** Course map — rich light mesh + studio decor; dark mode uses separate CSS */
export function LearnSceneBackground() {
  return (
    <div className="learn-scene-decor pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* ── Light theme: animated aurora mesh ── */}
      <div className="learn-light-mesh">
        <div className="learn-orb learn-orb-a" />
        <div className="learn-orb learn-orb-b" />
        <div className="learn-orb learn-orb-c" />
        <div className="learn-light-beam learn-light-beam-1" />
        <div className="learn-light-beam learn-light-beam-2" />
      </div>

      <div className="absolute inset-0 learn-world-glow" />

      {/* Visual-focus ripples — signing “sight line” waves */}
      <div className="learn-ripple-stack">
        <span className="learn-ripple learn-ripple-1" />
        <span className="learn-ripple learn-ripple-2" />
        <span className="learn-ripple learn-ripple-3" />
      </div>

      {/* Dot field — spatial language grid */}
      <svg className="absolute inset-0 w-full h-full learn-dot-field" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="learn-dots" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="var(--learn-grid-stroke, rgba(11,94,106,0.12))" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#learn-dots)" />
      </svg>

      <svg
        className="absolute inset-0 w-full h-full learn-grid-pattern"
        style={{ opacity: "var(--learn-decor-opacity, 0.06)" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="learn-sight-grid" width="56" height="56" patternUnits="userSpaceOnUse">
            <path
              d="M 56 0 L 0 0 0 56"
              fill="none"
              stroke="var(--learn-grid-stroke, rgba(11, 94, 106, 0.07))"
              strokeWidth="0.75"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#learn-sight-grid)" />
      </svg>

      {/* Signing motion arcs */}
      <svg
        className="absolute inset-0 w-full h-full learn-sign-arcs"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          className="learn-arc learn-arc-1"
          d="M-40 520 Q360 380 720 440 T1520 400"
          fill="none"
          stroke="url(#arcGrad)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          className="learn-arc learn-arc-2"
          d="M80 680 Q480 560 820 620 T1400 580"
          fill="none"
          stroke="url(#arcGrad2)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0B5E6A" stopOpacity="0" />
            <stop offset="50%" stopColor="#0EA5C9" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0B5E6A" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="arcGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#B8862E" stopOpacity="0" />
            <stop offset="50%" stopColor="#B8862E" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#B8862E" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Studio floor + silhouettes */}
      <svg
        className="absolute bottom-0 left-0 w-full h-[48vh] min-h-[240px] learn-scene-figures"
        style={{ opacity: "var(--learn-decor-opacity, 0.08)" }}
        viewBox="0 0 1440 400"
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="studio-floor" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0B5E6A" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#0B5E6A" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="720" cy="420" rx="560" ry="200" fill="url(#studio-floor)" />
        <g transform="translate(380, 120)">
          <circle cx="0" cy="0" r="28" fill="#0B5E6A" opacity="0.3" />
          <path d="M-20 35 Q-30 120 -10 200 L10 200 Q30 120 20 35 Z" fill="#1E3A5F" opacity="0.2" />
          <path d="M15 55 L55 20 L70 35 L35 75 Z" fill="#0B5E6A" opacity="0.35" />
        </g>
        <g transform="translate(980, 100)">
          <circle cx="0" cy="0" r="28" fill="#0B5E6A" opacity="0.3" />
          <path d="M-20 35 Q-30 120 -10 200 L10 200 Q30 120 20 35 Z" fill="#1E3A5F" opacity="0.2" />
          <path d="M20 50 L65 15 L78 32 L40 70 Z" fill="#B8862E" opacity="0.3" />
        </g>
      </svg>

      <div className="absolute top-[16%] left-1/2 -translate-x-1/2 w-[min(92vw,680px)] aspect-square rounded-full border learn-focus-ring learn-focus-pulse" />
      <div
        className="absolute top-[21%] left-1/2 -translate-x-1/2 w-[min(72vw,500px)] aspect-square rounded-full border learn-focus-ring"
        style={{ opacity: 0.55 }}
      />
    </div>
  );
}
