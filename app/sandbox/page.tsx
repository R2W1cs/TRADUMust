"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, XCircle, Heart, Sparkles,
  ArrowRight, HandMetal, Sun, Moon,
  GraduationCap, Award, Compass
} from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { Signer2D } from "@/components/Signer2D";
import { SignPracticeWebcam } from "@/components/SignPracticeWebcam";
import { useTheme } from "@/lib/theme-context";
import { LEVELS, getLesson, type PathType, type Exercise } from "@/lib/curriculum";
import { LogoCompact } from "@/components/Logo";

// ── Components ─────────────────────────────────────────────────────────────

export default function SandboxPage() {
  const { mode, toggleMode } = useTheme();
  const [selectedPath, setSelectedPath] = useState<PathType | null>(null);
  const [activeLevel, setActiveLevel] = useState<number | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hearts, setHearts] = useState(5);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [, setResults] = useState<boolean[]>([]);
  const [lessonFinished, setLessonFinished] = useState(false);

  const currentExercise = exercises[currentIndex];
  const progress = exercises.length > 0 ? (currentIndex / exercises.length) * 100 : 0;

  const startLesson = (levelId: number) => {
    if (!selectedPath) return;
    const lesson = getLesson(selectedPath, levelId);
    setExercises(lesson);
    setActiveLevel(levelId);
    setCurrentIndex(0);
    setHearts(5);
    setResults([]);
    setLessonFinished(false);
    setFeedback(null);
    setSelectedOption(null);
  };

  const checkAnswer = (wasCorrect?: boolean) => {
    const isCorrect = wasCorrect !== undefined ? wasCorrect : selectedOption === currentExercise.correctAnswer;

    if (isCorrect) {
      setFeedback("correct");
      setResults(prev => [...prev, true]);
    } else {
      setFeedback("incorrect");
      setHearts(prev => Math.max(0, prev - 1));
      setResults(prev => [...prev, false]);
    }
  };

  const nextExercise = () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setFeedback(null);
      setSelectedOption(null);
    } else {
      finishLesson();
    }
  };

  const finishLesson = () => {
    setLessonFinished(true);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#6366f1", "#a855f7", "#3b82f6"]
    });
  };

  const resetToPath = () => {
    setActiveLevel(null);
    setExercises([]);
    setLessonFinished(false);
  };

  const resetToRoot = () => {
    setSelectedPath(null);
    resetToPath();
  };

  // --- RENDERING PATH SELECTION ---
  if (!selectedPath) {
    return (
      <div className="page-shell min-h-screen flex flex-col selection:bg-[var(--brand-primary)]/30">
        <header className="glass-panel px-8 h-20 flex items-center justify-between border-b border-[var(--panel-border)] sticky top-0 z-50">
           <Link href="/" className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors group">
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <LogoCompact />
           </Link>
           <button onClick={toggleMode} className="p-2.5 rounded-2xl bg-[var(--surface)] border border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--foreground)] transition-all shadow-sm">
              {mode === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
           </button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-8">
           <div className="max-w-4xl w-full text-center space-y-12">
              <div className="space-y-4">
                 <h1 className="text-7xl font-black tracking-tighter text-[var(--foreground)] decoration-[var(--brand-primary)] decoration-8">Choose Your Path</h1>
                 <p className="text-[var(--text-secondary)] text-xl font-bold max-w-xl mx-auto text-balance antialiased">Select a career track to begin your specialized training. Exercises from these paths remain distinct to ensure total focus.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                 {[
                   {
                     id: "TRANSLATOR" as PathType,
                     title: "Cultural Translator",
                     desc: "Master the logic, nuances, and social etiquette of world cultures.",
                     icon: GraduationCap,
                     color: "from-blue-600 to-cyan-500"
                   },
                   {
                     id: "SPECIALIST" as PathType,
                     title: "Sign Specialist",
                     desc: "Acquire high-fidelity sign language skills through physical application.",
                     icon: HandMetal,
                     color: "from-purple-600 to-indigo-500"
                   }
                 ].map((path) => (
                    <button
                      key={path.id}
                      onClick={() => setSelectedPath(path.id)}
                      className="group relative bg-[var(--surface)] border border-[var(--panel-border)] hover:border-[var(--brand-primary)]/40 shadow-sm hover:shadow-md p-12 rounded-[3.5rem] text-left transition-all overflow-hidden flex flex-col"
                    >
                       <div className={cn("w-20 h-20 rounded-[2rem] bg-gradient-to-br flex items-center justify-center shadow-2xl mb-10 transition-transform group-hover:rotate-6 group-hover:scale-110", path.color)}>
                          <path.icon className="w-10 h-10 text-white" />
                       </div>
                       <h3 className="text-4xl font-black text-[var(--foreground)] mb-4 tracking-tighter">{path.title}</h3>
                       <p className="text-[var(--text-secondary)] mb-8 leading-relaxed font-bold text-lg">{path.desc}</p>
                       <div className="mt-auto flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-[var(--brand-primary)]">
                          Select Certification <ArrowRight className="w-4 h-4" />
                       </div>
                    </button>
                 ))}
              </div>
           </div>
        </main>
      </div>
    );
  }

  // --- RENDERING LEVEL DASHBOARD ---
  if (selectedPath && !activeLevel) {
    return (
      <div className="page-shell min-h-screen flex flex-col">
         <header className="glass-panel px-8 h-20 flex items-center justify-between border-b border-[var(--panel-border)]">
           <button onClick={resetToRoot} className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors group">
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-black tracking-widest text-[10px] uppercase">ALL PATHS</span>
           </button>
           <div className="flex items-center gap-4">
              <div className="bg-[var(--brand-primary)]/10 border-2 border-[var(--brand-primary)]/20 text-[var(--brand-primary)] px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                 <Award className="w-4 h-4" /> {selectedPath === "TRANSLATOR" ? "Translator Path" : "Sign Path"}
              </div>
              <button onClick={toggleMode} className="p-2.5 rounded-2xl bg-[var(--surface)] border border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--foreground)] transition-all shadow-sm">
                {mode === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
           </div>
        </header>

        <main className="max-w-5xl mx-auto w-full p-12 py-20">
           <div className="flex items-end justify-between mb-16">
              <div>
                 <h2 className="text-6xl font-black tracking-tighter mb-3 text-[var(--foreground)]">Certification Dashboard</h2>
                 <p className="text-[var(--text-secondary)] font-bold text-xl">Master 50+ specialized training modules in this track.</p>
              </div>
              <div className="flex gap-2">
                 {[1,2,3,4,5].map(i => <div key={i} className="w-10 h-2.5 bg-[var(--brand-primary)]/10 rounded-full" />)}
              </div>
           </div>

           <div className="grid md:grid-cols-3 gap-6">
              {LEVELS[selectedPath].map((lv) => (
                 <button
                   key={lv.id}
                   onClick={() => startLesson(lv.id)}
                   className="bg-[var(--surface)] border border-[var(--panel-border)] hover:border-[var(--brand-primary)]/30 shadow-sm hover:shadow-md p-8 rounded-[2.5rem] transition-all text-left group"
                 >
                    <div className="w-16 h-16 rounded-[1.5rem] bg-[var(--card-bg)] border border-[var(--panel-border)] shadow-inner flex items-center justify-center mb-6 group-hover:bg-[var(--brand-primary)]/10 transition-colors">
                       <span className="text-2xl font-black text-[var(--text-secondary)] group-hover:text-[var(--brand-primary)]">{lv.id}</span>
                    </div>
                    <h4 className="text-3xl font-black text-[var(--foreground)] mb-3 leading-tight tracking-tighter">{lv.title}</h4>
                    <p className="text-[var(--text-secondary)] text-base leading-relaxed font-bold">{lv.description}</p>
                 </button>
              ))}
              <div className="p-8 rounded-[2rem] border border-[var(--panel-border)] border-dashed flex flex-col items-center justify-center opacity-30">
                 <Compass className="w-8 h-8 mb-4 text-[var(--text-muted)]" />
                 <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Future Modules Locked</p>
              </div>
           </div>
        </main>
      </div>
    );
  }

  // --- RENDERING LESSON RESULT ---
  if (lessonFinished) {
    return (
      <div className="page-shell min-h-screen flex flex-col items-center justify-center p-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md w-full glass-panel p-12 rounded-[3.5rem] text-center space-y-8">
           <div className="w-24 h-24 bg-[var(--brand-primary)]/20 rounded-full flex items-center justify-center mx-auto border-4 border-[var(--brand-primary)]/40">
              <Award className="w-12 h-12 text-[var(--brand-primary)]" />
           </div>
           <div>
              <h2 className="text-4xl font-black text-[var(--foreground)] mb-2 tracking-tighter">Module Cleared!</h2>
              <p className="text-[var(--text-muted)]">You've successfully completed Level {activeLevel} of your certification.</p>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--card-bg)] p-6 rounded-3xl border border-[var(--panel-border)]">
                 <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Focus Result</p>
                 <p className="text-2xl font-bold text-[var(--brand-primary)]">{hearts} / 5</p>
              </div>
              <div className="bg-[var(--card-bg)] p-6 rounded-3xl border border-[var(--panel-border)]">
                 <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">XP Earned</p>
                 <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">+500</p>
              </div>
           </div>

           <button onClick={resetToPath} className="w-full bg-[var(--brand-primary)] text-white font-black py-5 rounded-[2.5rem] shadow-lg hover:opacity-90 transition-all text-lg tracking-tight">
              Return to Dashboard
           </button>
        </motion.div>
      </div>
    );
  }

  // --- RENDERING LESSON RUNNER ---
  if (!currentExercise) return null;

  return (
    <div className="page-shell min-h-screen font-sans">
      <header className="fixed top-0 left-0 right-0 z-50 px-6 h-20 flex items-center justify-center glass-panel border-b border-[var(--panel-border)] backdrop-blur-xl">
        <div className="max-w-4xl w-full flex items-center gap-8">
           <button onClick={resetToPath} className="text-[var(--text-muted)] hover:text-red-500 transition-colors">
              <XCircle className="w-7 h-7" />
           </button>

           <div className="flex-1 h-3 bg-[var(--surface-deep)] rounded-full overflow-hidden border border-[var(--panel-border)]">
              <motion.div className="h-full bg-[var(--brand-primary)]" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
           </div>

           <div className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-red-500 fill-red-500" />
              <span className="font-bold text-[var(--foreground)] text-lg">{hearts}</span>
           </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-32 pb-48">
        <AnimatePresence mode="wait">
          <motion.div key={currentIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
             <div>
                <h2 className="text-4xl font-black text-[var(--foreground)] mb-3 leading-tight tracking-tight">{currentExercise.question}</h2>
                <p className="text-[var(--text-secondary)] text-lg font-medium">{currentExercise.instruction}</p>
             </div>

             <div className="grid gap-4">
                {currentExercise.type === "CULTURE_QUIZ" && (
                   <div className="grid gap-3">
                      {currentExercise.options?.map((opt, i) => (
                         <button
                           key={i}
                           onClick={() => !feedback && setSelectedOption(opt)}
                           className={cn(
                             "w-full text-left p-6 rounded-2xl border-2 transition-all text-lg font-bold",
                             selectedOption === opt
                               ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 text-[var(--foreground)]"
                               : "border-[var(--panel-border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/30"
                           )}
                           disabled={!!feedback}
                         >
                            <span className="inline-block w-10 h-10 rounded-xl bg-[var(--card-bg)] border border-[var(--panel-border)] text-center leading-10 text-xs mr-6 font-black text-[var(--text-muted)]">{i + 1}</span>
                            {opt}
                         </button>
                      ))}
                   </div>
                )}

                {currentExercise.type === "SIGN" && (
                   <div className="space-y-6">
                      {/* Target sign label — themed */}
                      <div className="bg-[var(--surface)] p-6 rounded-3xl border border-[var(--panel-border)] text-center">
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--brand-primary)] mb-2">Target Action</p>
                          <p className="text-3xl font-black text-[var(--foreground)] uppercase">{currentExercise.target?.replace('_', ' ')}</p>
                      </div>
                      {/* Webcam — intentionally dark for video contrast */}
                      <SignPracticeWebcam
                        targetSign={currentExercise.target || ""}
                        onValidated={() => !feedback && checkAnswer(true)}
                        className="aspect-video w-full shadow-[0_0_50px_rgba(168,85,247,0.1)] border-white/10"
                      />
                   </div>
                )}

                {currentExercise.type === "PICK_SIGN" && (
                   <div className="grid lg:grid-cols-2 gap-8">
                      {/* Signer2D — intentionally dark for 3D contrast */}
                      <div className="bg-slate-950/90 dark:bg-slate-950/80 p-10 rounded-[3rem] border border-white/5 flex items-center justify-center">
                         <Signer2D word={currentExercise.target} className="w-[400px] h-[500px]" />
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                         {currentExercise.options?.map((opt, i) => (
                           <button
                             key={i}
                             onClick={() => !feedback && setSelectedOption(opt)}
                             className={cn(
                               "w-full text-left p-6 rounded-3xl border-2 transition-all font-black text-xl",
                               selectedOption === opt
                                 ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 text-[var(--foreground)]"
                                 : "border-[var(--panel-border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/30"
                             )}
                             disabled={!!feedback}
                           >
                              {opt}
                           </button>
                         ))}
                      </div>
                   </div>
                )}
             </div>
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className={cn(
        "fixed bottom-0 left-0 right-0 z-50 p-10 pt-12 border-t transition-all duration-700",
        feedback === "correct"   ? "bg-emerald-950 border-emerald-900" :
        feedback === "incorrect" ? "bg-red-950 border-red-900" :
        "bg-[var(--panel-bg)] border-[var(--panel-border)]"
      )}>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
           {feedback ? (
             <div className="flex-1 flex gap-6 items-start">
                <div className={cn("w-20 h-20 rounded-[2rem] flex items-center justify-center shrink-0 shadow-2xl", feedback === "correct" ? "bg-emerald-500" : "bg-red-500")}>
                   {feedback === "correct" ? <Sparkles className="w-10 h-10 text-white" /> : <XCircle className="w-10 h-10 text-white" />}
                </div>
                <div>
                   <h4 className={cn("text-3xl font-black tracking-tighter mb-1", feedback === "correct" ? "text-emerald-400" : "text-red-400")}>
                      {feedback === "correct" ? "Masterful!" : "Reviewing Detail"}
                   </h4>
                   <p className="text-base text-white/80 font-medium max-w-xl leading-relaxed">{currentExercise.assessment}</p>
                </div>
             </div>
           ) : (
             <div className="flex-1 hidden md:block" />
           )}

           <button
             onClick={feedback ? nextExercise : () => checkAnswer()}
             disabled={!selectedOption && currentExercise.type !== "SIGN"}
             className={cn(
               "w-full md:w-64 py-6 rounded-[2rem] font-black text-white text-xl shadow-2xl transition-all hover:-translate-y-1 active:scale-95",
               feedback === "correct"   ? "bg-emerald-600 shadow-emerald-500/20" :
               feedback === "incorrect" ? "bg-red-600 shadow-red-500/20" :
               "bg-[var(--brand-primary)] shadow-[var(--brand-primary)]/30 disabled:opacity-20 disabled:grayscale"
             )}
           >
              {feedback ? "Continue" : "Check Assessment"}
           </button>
        </div>
      </footer>
    </div>
  );
}
