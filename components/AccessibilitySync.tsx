"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { setAccessibility } from "@/lib/store/slices/uiSlice";

const STORAGE_KEY = "tradumust_a11y";

export function loadA11yPrefs() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function AccessibilitySync() {
  const dispatch = useAppDispatch();
  const { highContrast, largeText, reducedMotion } = useAppSelector((s) => s.ui);

  useEffect(() => {
    const saved = loadA11yPrefs();
    if (Object.keys(saved).length > 0) {
      dispatch(setAccessibility(saved));
    } else if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dispatch(setAccessibility({ reducedMotion: true }));
    }
  }, [dispatch]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("high-contrast", highContrast);
    root.classList.toggle("large-text", largeText);
    root.classList.toggle("reduce-motion", reducedMotion);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ highContrast, largeText, reducedMotion })
    );
  }, [highContrast, largeText, reducedMotion]);

  return null;
}
