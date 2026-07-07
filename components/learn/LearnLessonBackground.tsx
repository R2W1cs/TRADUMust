"use client";

/** Lesson studio — light mesh + stage glow */
export function LearnLessonBackground() {
  return (
    <div className="learn-lesson-decor pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="learn-light-mesh learn-light-mesh-lesson">
        <div className="learn-orb learn-orb-a" />
        <div className="learn-orb learn-orb-b" />
      </div>

      <div className="absolute inset-0 learn-lesson-glow" />

      <div className="learn-ripple-stack learn-ripple-stack-lesson">
        <span className="learn-ripple learn-ripple-1" />
        <span className="learn-ripple learn-ripple-2" />
      </div>

      <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[min(98vw,780px)] h-[min(60vh,520px)] learn-lesson-spotlight rounded-[50%] blur-3xl" />

      <svg
        className="absolute inset-0 w-full h-full learn-lesson-frame"
        style={{ opacity: "var(--learn-decor-opacity, 0.06)" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="6%"
          y="8%"
          width="88%"
          height="76%"
          rx="28"
          fill="none"
          stroke="var(--learn-grid-stroke, rgba(11, 94, 106, 0.1))"
          strokeWidth="1.5"
          strokeDasharray="10 14"
        />
      </svg>
    </div>
  );
}
