import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { SignLanguageCode } from "@/lib/sign-languages";

interface LearnState {
  currentLanguage: SignLanguageCode;
  currentLessonId: string | null;
  lives: number;
  nextLifeRegenAt: string | null;
  xp: number;
  level: number;
  streak: number;
}

const initialState: LearnState = {
  currentLanguage: "ASL",
  currentLessonId: null,
  lives: 5,
  nextLifeRegenAt: null,
  xp: 0,
  level: 1,
  streak: 0,
};

const learnSlice = createSlice({
  name: "learn",
  initialState,
  reducers: {
    setLanguage(state, action: PayloadAction<SignLanguageCode>) {
      state.currentLanguage = action.payload;
    },
    setLesson(state, action: PayloadAction<string | null>) {
      state.currentLessonId = action.payload;
    },
    updateProgress(state, action: PayloadAction<Partial<LearnState>>) {
      Object.assign(state, action.payload);
    },
    loseLife(state) {
      state.lives = Math.max(0, state.lives - 1);
    },
  },
});

export const { setLanguage, setLesson, updateProgress, loseLife } = learnSlice.actions;
export default learnSlice.reducer;
