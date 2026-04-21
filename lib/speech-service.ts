"use client";

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== "undefined") {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    this.voices = this.synth?.getVoices() || [];
  }

  /**
   * Selection strategy for "Premium" voices:
   * 1. Target the specific language.
   * 2. Prioritize names containing "Natural", "Online", or "Microsoft" (premium on Windows).
   * 3. Fallback to the first voice for that language.
   */
  private getBestVoice(langCode: string): SpeechSynthesisVoice | null {
    // Normalize langCode (e.g., 'fr' -> 'fr-FR')
    const normalizedLang = langCode.toLowerCase();
    
    const possibleVoices = this.voices.filter(v => 
      v.lang.toLowerCase().startsWith(normalizedLang)
    );

    if (possibleVoices.length === 0) return null;

    // Rank voices
    const sorted = [...possibleVoices].sort((a, b) => {
      const score = (name: string) => {
        let s = 0;
        if (name.includes("Natural")) s += 100;
        if (name.includes("Online")) s += 50;
        if (name.includes("Microsoft")) s += 10;
        return s;
      };
      return score(b.name) - score(a.name);
    });

    return sorted[0];
  }

  public speak(text: string, lang: string = "en", rate: number = 0.9) {
    if (!this.synth) return;

    // Cancel any existing speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.getBestVoice(lang);
    
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = lang;
    }

    utterance.rate = rate;
    utterance.pitch = 1.0;

    this.synth.speak(utterance);
  }
}

export const speechService = new SpeechService();
