"use client";

import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import uiReducer from "./slices/uiSlice";
import learnReducer from "./slices/learnSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    learn: learnReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
