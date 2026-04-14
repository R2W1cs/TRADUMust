/**
 * SignBridge — Avatar Renderer
 *
 * Generates SVG strings for a full-body signing avatar.
 *
 * Visual design is ported directly from Signer2D.tsx (Phase 1 LinguaBridge)
 * to maintain brand consistency. Same coordinate system, same handshapes,
 * same CSS motion classes, same color palette.
 *
 * Additions over the Phase 1 component:
 *  - Head/face with configurable facial expressions (ASL non-manual markers)
 *  - Torso / shirt for a fuller avatar silhouette
 *  - Smooth sign transitions via CSS opacity + transform
 *  - Accessible ARIA labels on each sign
 *
 * ── Coordinate system (matches Signer2D.tsx exactly) ─────────────────────
 *   ViewBox: 0 0 360 260   (added 20px height for head)
 *   Right shoulder: (270, 90)   Left shoulder: (90, 90)
 *   Head center:    (180, 48)   radius 32
 *   Torso:          x 140–220,  y 90–175
 */

(function () {
  'use strict';

  window.SignBridge = window.SignBridge || {};

  const SK   = '#FDDBB4';   // skin
  const SKS  = '#E8A96A';   // skin shadow / outline
  const SHIRT = '#4338CA';  // indigo — matches LinguaBridge brand

  // ─── CSS keyframes (mirrors Signer2D.tsx exactly) ─────────────────────────
  const MOTION_CSS = `
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
    @keyframes s-flip   { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(180deg)} }
    .motion-wave   { animation: s-wave   0.9s ease-in-out infinite; transform-origin: 270px 90px; }
    .motion-circle { animation: s-circle 1.4s linear     infinite; }
    .motion-push   { animation: s-push   1.1s ease-in-out infinite; }
    .motion-pull   { animation: s-pull   1.0s ease-in-out infinite; }
    .motion-nod    { animation: s-nod    0.8s ease-in-out infinite; }
    .motion-shake  { animation: s-shake  0.7s ease-in-out infinite; }
    .motion-lift   { animation: s-lift   1.0s ease-in-out infinite; }
    .motion-flick  { animation: s-flick  0.9s ease-in-out 3; }
    .motion-tap    { animation: s-tap    0.5s ease-in-out 3; }
    .motion-wiggle { animation: s-wiggle 0.8s ease-in-out infinite; }
    .motion-roll   { animation: s-circle 1.0s linear     infinite; }
    .motion-flip   { animation: s-flip   0.8s ease-in-out 2; }
  `;

  // ─── Hand shape SVG strings (centred at 0,0 — caller wraps in translate+scale) ──

  function palm(w = 26, h = 15) {
    return `<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="6" fill="${SK}" stroke="${SKS}" stroke-width="0.9"/>`;
  }
  function finger(cx, rootY, tipY, width = 5) {
    return `<rect x="${cx - width/2}" y="${tipY}" width="${width}" height="${rootY - tipY}" rx="2.2" fill="${SK}" stroke="${SKS}" stroke-width="0.6"/>`;
  }
  function knuckle(cx, y) {
    return `<ellipse cx="${cx}" cy="${y}" rx="3" ry="1.8" fill="${SKS}"/>`;
  }

  const HAND_SHAPES = {
    FLAT: `<g>${palm()}
      ${finger(-8,  -7, -29)}
      ${finger(-2.5,-7, -33)}
      ${finger( 2.5,-7, -33)}
      ${finger( 8,  -7, -27)}
      <path d="M -13 2 Q -18 -2 -20 5 Q -18 11 -13 9" fill="${SK}" stroke="${SKS}" stroke-width="0.6"/>
    </g>`,

    FIST: `<g>${palm(28, 19)}
      ${knuckle(-9,-9)}${knuckle(-3,-11)}${knuckle(3,-11)}${knuckle(9,-9)}
      <path d="M -14 4 Q -15 -7 -7 -9 Q -1 -9 5 -7" fill="none" stroke="${SK}" stroke-width="6.5" stroke-linecap="round"/>
    </g>`,

    POINT: `<g>${palm()}
      ${finger(8, -7, -34, 5.5)}
      ${knuckle(-8,-8)}${knuckle(-2.5,-9)}${knuckle(2.5,-9)}
      <path d="M -13 2 Q -20 0 -20 7" stroke="${SK}" stroke-width="5.5" stroke-linecap="round" fill="none"/>
    </g>`,

    V: `<g>${palm()}
      <path d="M 2.5 -7 Q 0 -20 -5 -32" stroke="${SK}" stroke-width="5.5" stroke-linecap="round" fill="none"/>
      <path d="M 8 -7 Q 11 -20 16 -32" stroke="${SK}" stroke-width="5.5" stroke-linecap="round" fill="none"/>
      ${knuckle(-8,-9)}${knuckle(-2.5,-10)}
      <path d="M -13 2 Q -20 0 -20 7" stroke="${SK}" stroke-width="5.5" stroke-linecap="round" fill="none"/>
    </g>`,

    C: `<g>
      <path d="M 13 10 A 16 20 0 1 0 13 -10" stroke="${SK}" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M 13 10 A 16 20 0 1 0 13 -10" stroke="${SKS}" stroke-width="0.8" fill="none" stroke-linecap="round"/>
    </g>`,

    OK: `<g>${palm()}
      <circle cx="-3" cy="-14" r="9" stroke="${SK}" stroke-width="7" fill="none"/>
      <circle cx="-3" cy="-14" r="9" stroke="${SKS}" stroke-width="0.8" fill="none"/>
      ${finger(2.5,-7,-30)}${finger(8,-7,-28)}${finger(-8,-7,-24)}
    </g>`,

    THUMB_UP: `<g>${palm()}
      ${knuckle(-8,-9)}${knuckle(-2.5,-11)}${knuckle(3,-11)}${knuckle(9,-9)}
      <path d="M -14 3 Q -17 -4 -15 -18 Q -13 -29 -9 -31" stroke="${SK}" stroke-width="7" stroke-linecap="round" fill="none"/>
    </g>`,

    ILY: `<g>${palm()}
      ${finger(-8,-7,-29)}
      ${finger(8,-7,-29)}
      <path d="M -13 2 Q -20 -2 -22 5" stroke="${SK}" stroke-width="6.5" stroke-linecap="round" fill="none"/>
      ${knuckle(-2.5,-9)}${knuckle(2.5,-9)}
    </g>`,

    CLAW: `<g>${palm(28, 15)}
      <path d="M -9 -7 Q -7 -16 -11 -22" stroke="${SK}" stroke-width="5.5" fill="none" stroke-linecap="round"/>
      <path d="M -3 -7 Q -1 -16  -5 -22" stroke="${SK}" stroke-width="5.5" fill="none" stroke-linecap="round"/>
      <path d="M  3 -7 Q  5 -16   1 -22" stroke="${SK}" stroke-width="5.5" fill="none" stroke-linecap="round"/>
      <path d="M  9 -7 Q 11 -16   7 -22" stroke="${SK}" stroke-width="5.5" fill="none" stroke-linecap="round"/>
      <path d="M -14 2 Q -22 -3 -22 4"   stroke="${SK}" stroke-width="5.5" stroke-linecap="round" fill="none"/>
    </g>`,

    HORNS: `<g>${palm()}
      ${finger(-8,-7,-29)}
      ${finger( 8,-7,-29)}
      ${knuckle(-2.5,-9)}${knuckle(2.5,-9)}
      <path d="M -13 2 Q -20 0 -20 7" stroke="${SK}" stroke-width="5.5" stroke-linecap="round" fill="none"/>
    </g>`,

    L: `<g>${palm()}
      ${finger(8,-7,-32,5.5)}
      <path d="M -13 0 Q -25 -2 -34 0" stroke="${SK}" stroke-width="6.5" stroke-linecap="round" fill="none"/>
      ${knuckle(-8,-9)}${knuckle(-2.5,-10)}${knuckle(2.5,-10)}
    </g>`,

    A: `<g>${palm(26,17)}
      ${knuckle(-8,-8)}${knuckle(-2.5,-10)}${knuckle(2.5,-10)}${knuckle(8,-8)}
      <path d="M -13 -3 Q -20 -7 -20 0" stroke="${SK}" stroke-width="6" stroke-linecap="round" fill="none"/>
    </g>`,

    O: `<g>
      <ellipse cx="0" cy="-12" rx="11" ry="14" stroke="${SK}" stroke-width="8" fill="none"/>
      <ellipse cx="0" cy="-12" rx="11" ry="14" stroke="${SKS}" stroke-width="0.8" fill="none"/>
      ${palm(22, 11)}
    </g>`,
  };

  function renderHand(key, flip = false) {
    const content = HAND_SHAPES[key] || HAND_SHAPES.FLAT;
    return flip
      ? `<g transform="scale(-1,1)">${content}</g>`
      : content;
  }

  function renderArm(shoulder, pose, handKey, motionClass = '', isLeft = false) {
    const E = pose.elbow;
    const W = pose.wrist;
    return `<g class="${motionClass}" aria-hidden="true">
      <line x1="${shoulder.x}" y1="${shoulder.y}" x2="${E.x}" y2="${E.y}"
            stroke="${SHIRT}" stroke-width="22" stroke-linecap="round"/>
      <line x1="${E.x}" y1="${E.y}" x2="${W.x}" y2="${W.y}"
            stroke="${SK}" stroke-width="18" stroke-linecap="round"/>
      <line x1="${E.x}" y1="${E.y}" x2="${W.x}" y2="${W.y}"
            stroke="${SKS}" stroke-width="18.8" stroke-linecap="round" opacity="0.25"/>
      <circle cx="${E.x}" cy="${E.y}" r="8" fill="${SKS}"/>
      <circle cx="${W.x}" cy="${W.y}" r="28" fill="${SHIRT}" opacity="0.07"/>
      <g transform="translate(${W.x},${W.y}) scale(1.6)">
        ${renderHand(handKey, isLeft)}
      </g>
    </g>`;
  }

  // ─── Face rendering ────────────────────────────────────────────────────────

  const EXPR_EYEBROW = {
    NEUTRAL:     { l: 'M 163 36 Q 170 33 177 36', r: 'M 183 36 Q 190 33 197 36' },
    HAPPY:       { l: 'M 163 34 Q 170 30 177 34', r: 'M 183 34 Q 190 30 197 34' },
    QUESTION:    { l: 'M 163 32 Q 170 28 177 32', r: 'M 183 32 Q 190 28 197 32' },
    WH_QUESTION: { l: 'M 163 40 Q 170 38 177 42', r: 'M 183 40 Q 190 38 197 42' },
    NEGATIVE:    { l: 'M 163 40 Q 170 38 177 42', r: 'M 183 42 Q 190 38 197 40' },
    EMPHATIC:    { l: 'M 163 30 Q 170 26 177 30', r: 'M 183 30 Q 190 26 197 30' },
  };
  const EXPR_MOUTH = {
    NEUTRAL:     'M 170 62 Q 180 65 190 62',
    HAPPY:       'M 168 60 Q 180 70 192 60',
    QUESTION:    'M 172 62 Q 180 60 188 62',
    WH_QUESTION: 'M 170 64 Q 180 60 190 64',
    NEGATIVE:    'M 170 66 Q 180 62 190 66',
    EMPHATIC:    'M 170 58 Q 180 68 190 58',
  };

  function renderFace(expression = 'NEUTRAL') {
    const expr  = expression in EXPR_EYEBROW ? expression : 'NEUTRAL';
    const brows = EXPR_EYEBROW[expr];
    const mouth = EXPR_MOUTH[expr];
    const isHappy    = expr === 'HAPPY' || expr === 'EMPHATIC';
    const isQuestion = expr === 'QUESTION' || expr === 'WH_QUESTION';

    return `
      <!-- Head -->
      <circle cx="180" cy="50" r="32" fill="${SK}" stroke="${SKS}" stroke-width="1.2"/>
      <!-- Hair accent -->
      <ellipse cx="180" cy="21" rx="32" ry="8" fill="#5B4E3A" opacity="0.7"/>
      <!-- Eyes -->
      <ellipse cx="170" cy="46" rx="${isQuestion ? 5 : 4}" ry="${isQuestion ? 5.5 : 4.5}" fill="#1e293b"/>
      <ellipse cx="190" cy="46" rx="${isQuestion ? 5 : 4}" ry="${isQuestion ? 5.5 : 4.5}" fill="#1e293b"/>
      <circle cx="171.5" cy="44.5" r="1.2" fill="white"/>
      <circle cx="191.5" cy="44.5" r="1.2" fill="white"/>
      <!-- Nose -->
      <path d="M 178 52 Q 180 57 182 52" stroke="${SKS}" stroke-width="0.8" fill="none"/>
      <!-- Eyebrows -->
      <path d="${brows.l}" stroke="#5B4E3A" stroke-width="${isQuestion || expr === 'NEGATIVE' ? 2.5 : 2}" fill="none" stroke-linecap="round"/>
      <path d="${brows.r}" stroke="#5B4E3A" stroke-width="${isQuestion || expr === 'NEGATIVE' ? 2.5 : 2}" fill="none" stroke-linecap="round"/>
      <!-- Mouth -->
      <path d="${mouth}" stroke="#C87B5A" stroke-width="2" fill="none" stroke-linecap="round"/>
      ${isHappy ? `<circle cx="165" cy="60" r="5" fill="#F87171" opacity="0.3"/>
                   <circle cx="195" cy="60" r="5" fill="#F87171" opacity="0.3"/>` : ''}
      <!-- Neck -->
      <rect x="174" y="80" width="12" height="14" rx="3" fill="${SK}"/>
    `;
  }

  // ─── Torso ────────────────────────────────────────────────────────────────

  function renderTorso() {
    return `
      <!-- Shirt body -->
      <path d="M 90,92 L 145,92 L 148,96 L 165,92 L 195,92 L 212,96 L 215,92 L 270,92 L 268,175 L 92,175 Z"
            fill="${SHIRT}" opacity="0.9"/>
      <!-- Collar V-neck -->
      <path d="M 155,92 L 180,130 L 205,92 Z" fill="white" opacity="0.12"/>
      <!-- Collar outline -->
      <path d="M 155,92 L 180,130 L 205,92" stroke="white" stroke-width="0.8" fill="none" opacity="0.3"/>
      <!-- Shoulder seams -->
      <line x1="90"  y1="92" x2="145" y2="92" stroke="white" stroke-width="0.5" opacity="0.2"/>
      <line x1="215" y1="92" x2="270" y2="92" stroke="white" stroke-width="0.5" opacity="0.2"/>
    `;
  }

  // ─── Divider line (matches Signer2D.tsx) ─────────────────────────────────
  function renderDivider() {
    return `<line x1="180" y1="90" x2="180" y2="230"
              stroke="#E2E8F0" stroke-width="0.5" stroke-dasharray="3 6" opacity="0.3"/>`;
  }

  // ─── Main render function ─────────────────────────────────────────────────

  window.SignBridge.AvatarRenderer = {

    MOTION_CSS,

    /**
     * Render a complete avatar SVG string from a sign configuration.
     *
     * @param {Object}  cfg     - sign config (from SIGNS dictionary)
     * @param {Object}  options - { width, height, showLabels }
     * @returns {string}        - full SVG markup string
     */
    render(cfg, options = {}) {
      const { width = 360, height = 260, showLabels = false } = options;

      // Arm positions: fall back to resting pose if not specified
      const SH_R = { x: 270, y: 90 };
      const SH_L = { x:  90, y: 90 };
      const REST_R = window.SignBridge.SignMapper.REST_R;
      const REST_L = window.SignBridge.SignMapper.REST_L;

      const rPose  = cfg.right || REST_R;
      const lPose  = cfg.left  || REST_L;
      const rHand  = cfg.rHand || 'FLAT';
      const lHand  = cfg.lHand || 'FLAT';
      const expr   = cfg.expression || 'NEUTRAL';
      const rMot   = cfg.rMotion || '';
      const lMot   = cfg.lMotion || '';

      // Detect arm overlap (same as Signer2D.tsx)
      const overlap = cfg.left &&
        Math.abs(rPose.wrist.x - lPose.wrist.x) < 55 &&
        Math.abs(rPose.wrist.y - lPose.wrist.y) < 55;

      const label = cfg._word || cfg.gloss || '';

      return `<svg
          viewBox="0 0 360 260"
          width="${width}"
          height="${height}"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Sign language avatar signing: ${label}"
        >
        <defs>
          <style>${MOTION_CSS}</style>
        </defs>

        <!-- Background transparent — overlay handles background -->

        ${renderFace(expr)}
        ${renderTorso()}
        ${renderDivider()}

        <!-- LEFT arm (behind) -->
        ${renderArm(SH_L, lPose, lHand, lMot, true)}

        <!-- RIGHT arm (in front) -->
        ${renderArm(SH_R, rPose, rHand, rMot, false)}

        ${overlap ? `<text x="180" y="248" font-size="8.5" fill="#D97706" font-weight="700"
            text-anchor="middle" font-family="sans-serif">⚡ right in front</text>` : ''}

        ${showLabels && label ? `
          <text x="180" y="248" font-size="10" fill="#94A3B8" font-weight="600"
              text-anchor="middle" font-family="sans-serif" letter-spacing="1">${label.toUpperCase()}</text>
        ` : ''}
      </svg>`;
    },

    /**
     * Render the neutral resting pose (no sign active).
     */
    renderRest(options = {}) {
      return this.render({
        expression: 'NEUTRAL',
        right: window.SignBridge.SignMapper.REST_R,
        left:  window.SignBridge.SignMapper.REST_L,
        rHand: 'FLAT',
        lHand: 'FLAT',
      }, options);
    },
  };

})();
