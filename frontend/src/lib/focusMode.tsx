"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const FOCUS_MODE_KEY = "pm_focus_mode";
const FOCUS_CARDS_KEY = "pm_focus_cards";
const FOCUS_ACTIVE_KEY = "pm_focus_active";

interface FocusCtx {
  focusMode: boolean;       // selecting mode (step 1)
  focusActive: boolean;     // focused view (step 2)
  focusCards: string[];
  toggleFocusMode: () => void;
  startFocus: () => void;   // enter focused view
  handleFocusCardClick: (name: string, onMax?: () => void) => boolean;
  getFocusBadge: (name: string) => number | null;
  isFocusDimmed: (name: string) => boolean;
  isFocusHidden: (name: string) => boolean;
}

const FocusContext = createContext<FocusCtx>({
  focusMode: false,
  focusActive: false,
  focusCards: [],
  toggleFocusMode: () => {},
  startFocus: () => {},
  handleFocusCardClick: () => false,
  getFocusBadge: () => null,
  isFocusDimmed: () => false,
  isFocusHidden: () => false,
});

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const [focusMode, setFocusMode] = useState(false);
  const [focusActive, setFocusActive] = useState(false);
  const [focusCards, setFocusCards] = useState<string[]>([]);

  useEffect(() => {
    const mode = localStorage.getItem(FOCUS_MODE_KEY);
    const active = localStorage.getItem(FOCUS_ACTIVE_KEY);
    const cards = localStorage.getItem(FOCUS_CARDS_KEY);
    if (mode === "true") {
      setFocusMode(true);
      if (cards) { try { setFocusCards(JSON.parse(cards)); } catch {} }
      if (active === "true") setFocusActive(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(FOCUS_CARDS_KEY, JSON.stringify(focusCards));
  }, [focusCards]);

  // Step 1: toggle selection mode (or exit everything)
  const toggleFocusMode = useCallback(() => {
    setFocusMode((prev) => {
      const next = !prev;
      localStorage.setItem(FOCUS_MODE_KEY, String(next));
      if (!next) {
        setFocusCards([]);
        setFocusActive(false);
        localStorage.removeItem(FOCUS_CARDS_KEY);
        localStorage.removeItem(FOCUS_ACTIVE_KEY);
      }
      return next;
    });
  }, []);

  // Step 2: enter focused view with selected cards
  const startFocus = useCallback(() => {
    setFocusActive(true);
    localStorage.setItem(FOCUS_ACTIVE_KEY, "true");
  }, []);

  const handleFocusCardClick = useCallback((name: string, onMax?: () => void): boolean => {
    if (!focusMode || focusActive) return false;
    setFocusCards((prev) => {
      const idx = prev.indexOf(name);
      if (idx >= 0) return prev.filter((n) => n !== name);
      if (prev.length < 3) return [...prev, name];
      onMax?.();
      return prev;
    });
    return true;
  }, [focusMode, focusActive]);

  const getFocusBadge = useCallback((name: string): number | null => {
    if (!focusMode) return null;
    const idx = focusCards.indexOf(name);
    return idx >= 0 ? idx + 1 : null;
  }, [focusMode, focusCards]);

  const isFocusDimmed = useCallback((name: string): boolean => {
    if (!focusMode) return false;
    if (focusActive) return false; // in active mode, hidden cards are filtered out
    if (focusCards.length === 0) return true;
    return !focusCards.includes(name);
  }, [focusMode, focusActive, focusCards]);

  // In active focus view, non-selected cards are completely hidden
  const isFocusHidden = useCallback((name: string): boolean => {
    if (!focusActive) return false;
    return !focusCards.includes(name);
  }, [focusActive, focusCards]);

  return (
    <FocusContext.Provider value={{
      focusMode, focusActive, focusCards,
      toggleFocusMode, startFocus,
      handleFocusCardClick, getFocusBadge, isFocusDimmed, isFocusHidden,
    }}>
      {children}
    </FocusContext.Provider>
  );
}

export function useFocusMode() {
  return useContext(FocusContext);
}
