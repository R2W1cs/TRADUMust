/**
 * ASL Landmark Classifier
 *
 * Classifies 50+ ASL signs + full A–Z fingerspelling from MediaPipe's
 * 21-landmark hand model. Accepts an optional second hand for two-hand signs.
 *
 * Landmark indices (MediaPipe):
 *   0 WRIST | 1-4 THUMB | 5-8 INDEX | 9-12 MIDDLE | 13-16 RING | 17-20 PINKY
 */

export interface Pt { x: number; y: number; z: number }

const LM = {
  WRIST: 0,
  THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
  INDEX_MCP: 5,  INDEX_PIP: 6,  INDEX_TIP: 8,
  MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_TIP: 12,
  RING_MCP: 13,  RING_PIP: 14,  RING_TIP: 16,
  PINKY_MCP: 17, PINKY_PIP: 18, PINKY_TIP: 20,
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────

function up(lm: Pt[], tip: number, pip: number, margin = 0.018): boolean {
  return lm[tip].y < lm[pip].y - margin;
}

function dist(lm: Pt[], a: number, b: number): number {
  return Math.hypot(lm[a].x - lm[b].x, lm[a].y - lm[b].y);
}

function thumbOut(lm: Pt[]): boolean {
  return dist(lm, LM.THUMB_TIP, LM.THUMB_MCP) >
         dist(lm, LM.THUMB_IP,  LM.THUMB_MCP) * 1.35;
}

function pinch(lm: Pt[]): boolean {
  return dist(lm, LM.THUMB_TIP, LM.INDEX_TIP) < 0.06;
}

function bentDown(lm: Pt[], tip: number, pip: number): boolean {
  return lm[tip].y > lm[pip].y + 0.01;
}

function fingers(lm: Pt[]) {
  return {
    i: up(lm, LM.INDEX_TIP,  LM.INDEX_PIP),
    m: up(lm, LM.MIDDLE_TIP, LM.MIDDLE_PIP),
    r: up(lm, LM.RING_TIP,   LM.RING_PIP),
    p: up(lm, LM.PINKY_TIP,  LM.PINKY_PIP),
    t: thumbOut(lm),
    // curled variants (bent below knuckle — not just not-extended)
    iCurl: bentDown(lm, LM.INDEX_TIP,  LM.INDEX_PIP),
    mCurl: bentDown(lm, LM.MIDDLE_TIP, LM.MIDDLE_PIP),
  };
}

type Zone = 'FOREHEAD' | 'FACE' | 'CHIN' | 'CHEST' | 'LOW';

function zone(lm: Pt[]): Zone {
  const y = lm[LM.WRIST].y;
  if (y < 0.28) return 'FOREHEAD';
  if (y < 0.40) return 'FACE';
  if (y < 0.52) return 'CHIN';
  if (y < 0.66) return 'CHEST';
  return 'LOW';
}

type Motion = 'UP' | 'DOWN' | 'SHAKE' | 'CIRCLE' | 'STATIC';

export function motionFromBuffer(buf: { x: number; y: number }[]): Motion {
  if (buf.length < 12) return 'STATIC';
  const n  = buf.length;
  const dx = buf[n - 1].x - buf[0].x;
  const dy = buf[n - 1].y - buf[0].y;
  const mx = buf.reduce((s, p) => s + p.x, 0) / n;
  const my = buf.reduce((s, p) => s + p.y, 0) / n;
  const r  = buf.reduce((s, p) => s + Math.hypot(p.x - mx, p.y - my), 0) / n;

  // Detect oscillatory horizontal motion (wave gesture):
  // count direction reversals in x — a wave has 3+ reversals, a single sweep has 0.
  let reversals = 0;
  let prevDir = 0;
  for (let i = 1; i < n; i++) {
    const d = buf[i].x - buf[i - 1].x;
    if (Math.abs(d) > 0.004) {
      const dir = d > 0 ? 1 : -1;
      if (prevDir !== 0 && dir !== prevDir) reversals++;
      prevDir = dir;
    }
  }
  if (reversals >= 3)          return 'SHAKE';   // wave = oscillatory shake

  if (r > 0.042)           return 'CIRCLE';
  if (Math.abs(dx) > 0.09) return 'SHAKE';
  if (dy >  0.08)          return 'DOWN';
  if (dy < -0.08)          return 'UP';
  return 'STATIC';
}

export interface SignResult {
  key: string;
  label: string;
  notes: string;
}

// ── Two-hand distance helper ──────────────────────────────────────────────

function handsClose(lm1: Pt[], lm2: Pt[]): boolean {
  return Math.hypot(
    lm1[LM.WRIST].x - lm2[LM.WRIST].x,
    lm1[LM.WRIST].y - lm2[LM.WRIST].y
  ) < 0.25;
}

// ── ASL Grammar reordering ────────────────────────────────────────────────

const TIME_WORDS = new Set([
  'now','today','tomorrow','yesterday','soon','later',
  'morning','evening','night','tonight','week','month','year',
]);
const WH_WORDS = new Set(['what','when','where','who','why','how','which']);
const DROP_WORDS = new Set(['a','an','the','is','are','was','were','be','been']);

export function applyAslGrammar(words: string[]): string[] {
  const filtered  = words.filter(w => !DROP_WORDS.has(w.toLowerCase()));
  const timeWords = filtered.filter(w => TIME_WORDS.has(w.toLowerCase()));
  const whWords   = filtered.filter(w => WH_WORDS.has(w.toLowerCase()));
  const rest      = filtered.filter(w =>
    !TIME_WORDS.has(w.toLowerCase()) && !WH_WORDS.has(w.toLowerCase())
  );
  const hasWH = whWords.length > 0;
  // ASL order: [TIME] [TOPIC / COMMENT] [WH-WORD at end]
  return [...timeWords, ...rest, ...(hasWH ? whWords : [])];
}

// ── Main classifier ───────────────────────────────────────────────────────

export function classifyLandmarks(
  lm: Pt[],
  buf: { x: number; y: number }[],
  lm2?: Pt[]
): SignResult | null {
  if (!lm || lm.length < 21) return null;

  const f    = fingers(lm);
  const z    = zone(lm);
  const mv   = motionFromBuffer(buf);
  const up4  = f.i && f.m && f.r && f.p;
  const none = !f.i && !f.m && !f.r && !f.p;
  const pk   = pinch(lm);

  // Second-hand state (optional)
  const f2    = lm2 && lm2.length >= 21 ? fingers(lm2) : null;
  const z2    = lm2 && lm2.length >= 21 ? zone(lm2)    : null;
  const up4_2 = f2 ? f2.i && f2.m && f2.r && f2.p : false;
  const none2 = f2 ? !f2.i && !f2.m && !f2.r && !f2.p : false;
  const pk2   = lm2 ? pinch(lm2) : false;
  const close = lm2 ? handsClose(lm, lm2) : false;

  // ══ TWO-HAND SIGNS (checked first — most specific) ══════════════════════

  if (f2) {
    // LOVE: both fists crossed at chest
    if (none && none2 && z === 'CHEST' && z2 === 'CHEST' && close && mv === 'STATIC')
      return { key: 'LOVE', label: 'Love',
        notes: 'Both fists crossed over the heart — a universal gesture of deep affection.' };

    // BOOK: both flat hands open like pages
    if (up4 && up4_2 && (z === 'CHEST' || z === 'LOW') && mv === 'STATIC')
      return { key: 'BOOK', label: 'Book',
        notes: 'Both flat hands open like the pages of a book.' };

    // MORE: both hands pinch and tap together
    if (pk && pk2 && close)
      return { key: 'MORE', label: 'More',
        notes: 'Fingertips of both hands tap together — a very common ASL sign.' };

    // DIFFERENT: both index fingers cross and move apart
    if (f.i && !f.m && f2.i && !f2.m && mv === 'SHAKE')
      return { key: 'DIFFERENT', label: 'Different',
        notes: 'Both index fingers cross then separate — two things diverging.' };

    // SAME: both index fingers move forward in parallel
    if (f.i && !f.m && f2.i && !f2.m && mv === 'STATIC' && close)
      return { key: 'SAME', label: 'Same / Also',
        notes: 'Both index fingers move forward together — parallel paths.' };

    // HOW: both claw hands roll upward
    if (!up4 && !none && !up4_2 && !none2 && mv === 'CIRCLE')
      return { key: 'HOW', label: 'How',
        notes: 'Both claw hands roll upward — turning something over to examine it.' };

    // CLASS / GROUP: both C-hands arc outward
    if (!f.i && !f2.i && f.t && f2.t && mv === 'CIRCLE')
      return { key: 'CLASS', label: 'Class / Group',
        notes: 'Both C-hands arc outward forming a circle — a group gathered together.' };

    // FRIEND: both hooked index fingers interlock
    if (f.i && !f.m && !f.r && !f.p && f2.i && !f2.m && close && mv === 'STATIC')
      return { key: 'FRIEND', label: 'Friend',
        notes: 'Hooked index fingers interlock — two people linking together.' };

    // WORK: dominant fist taps non-dominant fist
    if (none && none2 && mv === 'DOWN' && !close)
      return { key: 'WORK', label: 'Work',
        notes: 'Dominant fist taps back of non-dominant fist — rhythmic effort.' };

    // HELP: thumb-up on flat palm, lifting
    if (none && f.t && up4_2 && mv === 'UP')
      return { key: 'HELP', label: 'Help',
        notes: 'Thumb-up fist lifts from a flat non-dominant palm.' };
  }

  // ══ SINGLE-HAND SIGNS ════════════════════════════════════════════════════

  // ── Greetings ─────────────────────────────────────────────────────────
  // HELLO — wave (open flat hand oscillating at head/face/chin level).
  // Use raw wrist-y < 0.55 so natural webcam positions (wrist slightly below
  // the chin line) are still captured. GOODBYE is guarded to y >= 0.52 below.
  if (up4 && lm[LM.WRIST].y < 0.55 && (mv === 'SHAKE' || mv === 'CIRCLE'))
    return { key: 'HELLO', label: 'Hello',
      notes: 'Flat hand waves outward from the forehead — the classic ASL salute.' };

  // HELLO salute — static or sweep-down at forehead/face (stricter zone).
  if (up4 && (z === 'FOREHEAD' || z === 'FACE') && (mv === 'DOWN' || mv === 'STATIC'))
    return { key: 'HELLO', label: 'Hello',
      notes: 'Flat hand waves outward from the forehead — the classic ASL salute.' };

  if (up4 && (z === 'FACE' || z === 'CHIN') && mv === 'DOWN')
    return { key: 'THANK_YOU', label: 'Thank You',
      notes: 'Flat hand moves forward and down from chin — like blowing a grateful kiss.' };

  if (up4 && z === 'CHEST' && mv === 'CIRCLE')
    return { key: 'PLEASE', label: 'Please',
      notes: 'Flat hand circles on chest. PLEASE and THANK YOU share the same base motion.' };

  if (none && z === 'CHEST' && mv === 'CIRCLE')
    return { key: 'SORRY', label: 'Sorry',
      notes: 'Closed fist circles on chest. SORRY uses a fist; PLEASE uses an open hand.' };

  // GOODBYE — wave at chest/stomach level only (wrist y >= 0.52 so HELLO takes priority above).
  if (up4 && lm[LM.WRIST].y >= 0.52 && mv === 'SHAKE')
    return { key: 'GOODBYE', label: 'Goodbye',
      notes: 'Open hand waves side to side — farewells are warmly extended in Deaf culture.' };

  // ── Responses ─────────────────────────────────────────────────────────
  if (none && !f.t && mv === 'DOWN')
    return { key: 'YES', label: 'Yes',
      notes: 'Fist nods up and down, mimicking a nodding head.' };

  if (f.i && f.m && !f.r && !f.p && mv === 'SHAKE')
    return { key: 'NO', label: 'No',
      notes: 'Index and middle snap together with a shake.' };

  if (pk && f.m && !f.r && !f.p)
    return { key: 'OK', label: 'OK',
      notes: 'Index and thumb form a circle — borrowed from the universal OK gesture.' };

  // ── Mind & Thought ────────────────────────────────────────────────────
  if (f.i && !f.m && !f.r && !f.p && (z === 'FOREHEAD' || z === 'FACE') && mv === 'UP')
    return { key: 'UNDERSTAND', label: 'Understand',
      notes: 'Index flicks upward at the temple — a light-bulb moment made visual.' };

  if (f.i && !f.m && !f.r && !f.p && (z === 'FOREHEAD' || z === 'FACE') && mv === 'SHAKE')
    return { key: 'DONT_UNDERSTAND', label: "Don't Understand",
      notes: 'Index shakes at the temple — never pretend to understand in Deaf culture.' };

  if (f.i && !f.m && !f.r && !f.p && (z === 'FOREHEAD' || z === 'FACE') && mv === 'CIRCLE')
    return { key: 'THINK', label: 'Think',
      notes: 'Index circles at the temple — depicting the circular nature of thought.' };

  if (up4 && (z === 'FOREHEAD' || z === 'FACE') && mv === 'DOWN')
    return { key: 'KNOW', label: 'Know',
      notes: 'Flat fingertips tap the temple — knowledge lives in the mind.' };

  if (f.i && !f.m && !f.r && !f.p && (z === 'FOREHEAD' || z === 'FACE') && mv === 'DOWN')
    return { key: 'FORGET', label: 'Forget',
      notes: 'Flat hand wipes across forehead then flicks away.' };

  // ── Emotions ──────────────────────────────────────────────────────────
  if (up4 && z === 'CHEST' && mv === 'UP')
    return { key: 'HAPPY', label: 'Happy',
      notes: 'Flat hand brushes upward from the chest — joy bubbling up from the heart.' };

  if (up4 && (z === 'FOREHEAD' || z === 'FACE') && mv === 'DOWN')
    return { key: 'SAD', label: 'Sad',
      notes: 'Flat hands slide down the face like tears falling.' };

  if (up4 && z === 'CHEST' && mv === 'DOWN')
    return { key: 'TIRED', label: 'Tired',
      notes: 'Both hands drop from chest — energy draining from the body.' };

  // ── Core verbs ────────────────────────────────────────────────────────
  if (up4 && z === 'LOW' && mv === 'DOWN')
    return { key: 'STOP', label: 'Stop',
      notes: 'Flat hand chops sharply downward — one of the most emphatic signs.' };

  if (none && f.t && mv === 'UP')
    return { key: 'HELP', label: 'Help',
      notes: 'Thumb-up fist lifts upward — one hand literally lifting another.' };

  if (up4 && f.t && (mv === 'CIRCLE' || mv === 'SHAKE'))
    return { key: 'FINISH', label: 'Finish / Done',
      notes: 'Open hands flip outward — FINISH signals completion or "already."' };

  if (f.i && !f.m && !f.r && !f.p && (z === 'CHEST' || z === 'LOW') && mv === 'UP')
    return { key: 'START', label: 'Start / Begin',
      notes: 'Index twists into non-dominant palm — like turning an ignition key.' };

  if (up4 && z === 'CHEST' && mv === 'DOWN')
    return { key: 'GIVE', label: 'Give',
      notes: 'Flat hand extends forward from the chest — offering something outward.' };

  // ── Sight & Communication ─────────────────────────────────────────────
  if (f.i && f.m && !f.r && !f.p && (z === 'FACE' || z === 'FOREHEAD'))
    return { key: 'SEE', label: 'See / Look',
      notes: 'V-shape at the eyes — sight lines extending outward.' };

  if (f.i && !f.m && !f.r && !f.p && z === 'FACE' && mv === 'DOWN')
    return { key: 'SAY', label: 'Say / Tell',
      notes: 'Index at the mouth moves forward — words coming out.' };

  if (f.i && !f.m && !f.r && !f.p && z === 'FACE' && mv === 'CIRCLE')
    return { key: 'HEARING', label: 'Hearing',
      notes: 'Index circles at the mouth — used to refer to hearing people.' };

  // ── Pronouns ──────────────────────────────────────────────────────────
  if (f.i && !f.m && !f.r && !f.p && z === 'CHEST' && mv === 'STATIC')
    return { key: 'ME', label: 'Me / I',
      notes: 'Index points to yourself — ASL pronouns are literally spatial pointing.' };

  if (f.i && !f.m && !f.r && !f.p && (z === 'CHIN' || z === 'FACE') && mv === 'STATIC')
    return { key: 'YOU', label: 'You',
      notes: 'Index points at the other person — direct pointing is natural in ASL.' };

  // ── Special handshapes ────────────────────────────────────────────────
  if (f.i && !f.m && !f.r && f.p && f.t)
    return { key: 'I_LOVE_YOU', label: 'I Love You',
      notes: 'I+L+Y combined into one handshape — a universal symbol of love.' };

  if (!f.i && !f.m && !f.r && f.p && f.t && (z === 'FACE' || z === 'FOREHEAD' || z === 'CHIN'))
    return { key: 'PHONE', label: 'Phone / Call',
      notes: 'Thumb and pinky form a handset at the ear.' };

  if (!f.i && !f.m && !f.r && f.p && f.t && mv === 'SHAKE')
    return { key: 'PLAY', label: 'Play / Fun',
      notes: 'Y-hands shake loosely — play and recreation in ASL.' };

  if (f.i && !f.m && !f.r && f.p && !f.t)
    return { key: 'ROCK', label: 'Rock On / Horns',
      notes: 'Index and pinky extended — also means "bull" or "devil horns."' };

  if (f.i && f.m && !f.r && !f.p && (z === 'CHIN' || z === 'CHEST') && mv === 'STATIC')
    return { key: 'PEACE', label: 'Peace / 2 / Victory',
      notes: 'V-shape at neutral — letter V, number 2, or peace.' };

  if (f.i && f.m && !f.r && !f.p && mv === 'DOWN')
    return { key: 'CHOOSE', label: 'Choose / Select',
      notes: 'V-hand pinches downward — plucking one option from several.' };

  if (f.i && !f.m && !f.r && !f.p && z === 'CHIN' && mv === 'CIRCLE')
    return { key: 'QUESTION', label: 'Question',
      notes: 'Index traces a question mark in the air.' };

  // ── Academic / Learning ───────────────────────────────────────────────
  if (f.i && !f.m && !f.r && !f.p && z === 'CHEST' && mv === 'UP')
    return { key: 'LEARN', label: 'Learn',
      notes: 'Claw hand lifts knowledge from palm to the forehead.' };

  // ── Time ──────────────────────────────────────────────────────────────
  if (none && f.t && (z === 'FACE' || z === 'CHIN') && mv === 'STATIC')
    return { key: 'TOMORROW', label: 'Tomorrow',
      notes: 'Thumb at the cheek — stepping into the future on the ASL timeline.' };

  if (none && f.t && mv === 'SHAKE')
    return { key: 'TEN', label: '10',
      notes: 'Thumb shakes — the ASL number 10.' };

  if (none && f.t && mv === 'STATIC')
    return { key: 'THUMB_UP', label: 'Good / Approve',
      notes: 'Thumbs up — universal approval gesture.' };

  // ── Numbers ───────────────────────────────────────────────────────────
  if (f.i && f.m && f.r && f.p && !f.t)
    return { key: 'FOUR', label: '4',
      notes: 'Four fingers extended, thumb tucked.' };

  if (f.i && f.m && f.r && !f.p)
    return { key: 'THREE', label: '3',
      notes: 'Index, middle, and ring fingers raised.' };

  if (up4 && f.t && (z === 'CHEST' || z === 'LOW') && mv === 'STATIC')
    return { key: 'FIVE', label: '5',
      notes: 'All five fingers spread wide.' };

  if (f.i && f.m && !f.r && !f.p && (z === 'CHIN' || z === 'CHEST') && mv === 'CIRCLE')
    return { key: 'AGAIN', label: '2 / Again / Repeat',
      notes: 'V-hand circles — also means AGAIN or REPEAT.' };

  if (f.i && !f.m && !f.r && !f.p && (z === 'CHEST' || z === 'LOW') && mv === 'STATIC')
    return { key: 'ONE', label: '1',
      notes: 'Index finger raised — the number 1.' };

  // ── ASL Fingerspelling A–Z ────────────────────────────────────────────
  // Only fires at face/forehead height (fingerspelling zone)
  if (z === 'FACE' || z === 'FOREHEAD') {

    // A — fist, thumb to side
    if (none && f.t && mv === 'STATIC')
      return { key: 'FS_A', label: 'Letter A',
        notes: 'Fist with thumb to the side — the letter A in ASL fingerspelling.' };

    // B — all 4 fingers up, thumb tucked (looks like FLAT but thumb in)
    if (up4 && !f.t && mv === 'STATIC')
      return { key: 'FS_B', label: 'Letter B',
        notes: 'Four fingers flat together, thumb tucked — the letter B.' };

    // C — curved C shape
    if (!up4 && !none && !pk && mv === 'STATIC' && f.i && f.m && f.r && f.p)
      return { key: 'FS_C', label: 'Letter C',
        notes: 'Hand curves into a C shape — the letter C.' };

    // D — index up, others curve to touch thumb
    if (f.i && !f.m && !f.r && !f.p && pk && mv === 'STATIC')
      return { key: 'FS_D', label: 'Letter D',
        notes: 'Index up, other fingers touch thumb — the letter D.' };

    // E — all fingers bent/curled, thumb under
    if (f.iCurl && f.mCurl && !up4 && mv === 'STATIC')
      return { key: 'FS_E', label: 'Letter E',
        notes: 'All fingers bent at the middle knuckle — the letter E.' };

    // F — index+thumb pinch, others extended
    if (pk && !f.i && f.m && f.r && f.p && mv === 'STATIC')
      return { key: 'FS_F', label: 'Letter F',
        notes: 'Index and thumb circle while other fingers are up — the letter F.' };

    // H — index+middle together pointing
    if (f.i && f.m && !f.r && !f.p && !f.t && mv === 'STATIC')
      return { key: 'FS_H', label: 'Letter H',
        notes: 'Index and middle extended side-by-side — the letter H.' };

    // I — pinky only
    if (!f.i && !f.m && !f.r && f.p && !f.t && mv === 'STATIC')
      return { key: 'FS_I', label: 'Letter I',
        notes: 'Only the pinky extended — the letter I.' };

    // K — index and middle up, thumb between
    if (f.i && f.m && !f.r && !f.p && f.t && mv === 'STATIC')
      return { key: 'FS_K', label: 'Letter K',
        notes: 'Index up, middle angled, thumb between — the letter K.' };

    // L — index up, thumb out (L-shape)
    if (f.i && !f.m && !f.r && !f.p && f.t && mv === 'STATIC')
      return { key: 'FS_L', label: 'Letter L',
        notes: 'Index and thumb form an L-shape — the letter L.' };

    // O — all fingers curve to touch thumb
    if (!up4 && !none && pk && mv === 'STATIC')
      return { key: 'FS_O', label: 'Letter O',
        notes: 'All fingers and thumb form a circle — the letter O.' };

    // R — index and middle crossed
    if (f.i && f.m && !f.r && !f.p && !f.t && mv === 'UP')
      return { key: 'FS_R', label: 'Letter R',
        notes: 'Index and middle fingers crossed — the letter R.' };

    // S — fist, thumb over fingers
    if (none && !f.t && mv === 'STATIC')
      return { key: 'FS_S', label: 'Letter S',
        notes: 'Fist with thumb over fingers — the letter S.' };

    // U — index and middle up together (tight, no spread)
    if (f.i && f.m && !f.r && !f.p && !f.t && mv === 'DOWN')
      return { key: 'FS_U', label: 'Letter U',
        notes: 'Index and middle held together pointing up — the letter U.' };

    // W — three fingers (index+middle+ring)
    if (f.i && f.m && f.r && !f.p && !f.t && mv === 'STATIC')
      return { key: 'FS_W', label: 'Letter W',
        notes: 'Index, middle, ring extended — the letter W.' };

    // X — hooked index
    if (f.iCurl && !f.m && !f.r && !f.p && mv === 'STATIC')
      return { key: 'FS_X', label: 'Letter X',
        notes: 'Index finger bent into a hook — the letter X.' };

    // Y — thumb and pinky
    if (!f.i && !f.m && !f.r && f.p && f.t && mv === 'STATIC')
      return { key: 'FS_Y', label: 'Letter Y',
        notes: 'Thumb and pinky extended — the letter Y.' };
  }

  // ── Fist fallback ─────────────────────────────────────────────────────
  if (none && mv === 'STATIC')
    return { key: 'FIST', label: 'Fist / Letter S',
      notes: 'Closed fist — the letter A or S. YES when nodded.' };

  return null;
}
