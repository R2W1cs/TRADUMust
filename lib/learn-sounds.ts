/** Synthesized UI sounds — no external files required */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.15) {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration);
}

export function playTap() {
  tone(600, 0.05, "sine", 0.08);
}

export function playCorrect() {
  tone(523, 0.12, "sine", 0.12);
  setTimeout(() => tone(659, 0.12, "sine", 0.12), 80);
  setTimeout(() => tone(784, 0.2, "sine", 0.1), 160);
}

export function playWrong() {
  tone(200, 0.25, "square", 0.08);
  setTimeout(() => tone(150, 0.3, "square", 0.06), 100);
}

export function playComplete() {
  [523, 659, 784, 1047].forEach((f, i) => {
    setTimeout(() => tone(f, 0.25, "sine", 0.1), i * 100);
  });
}

export function playHeartLost() {
  tone(300, 0.15, "triangle", 0.1);
  setTimeout(() => tone(180, 0.3, "triangle", 0.08), 120);
}

export function playLessonStart() {
  tone(440, 0.1, "sine", 0.1);
  setTimeout(() => tone(550, 0.15, "sine", 0.1), 100);
}

export function useLearnSounds(enabled = true) {
  return {
    tap: () => enabled && playTap(),
    correct: () => enabled && playCorrect(),
    wrong: () => enabled && playWrong(),
    complete: () => enabled && playComplete(),
    heartLost: () => enabled && playHeartLost(),
    lessonStart: () => enabled && playLessonStart(),
  };
}
