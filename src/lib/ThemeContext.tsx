"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type AppTheme = "light-color" | "light-plain" | "dark-color" | "dark-plain";

export const THEME_LABELS: Record<AppTheme, string> = {
  "light-color": "Light · Colored",
  "light-plain": "Light · Plain",
  "dark-color":  "Dark · Colored",
  "dark-plain":  "Dark · Plain",
};

export const THEMES = Object.keys(THEME_LABELS) as AppTheme[];

interface ThemeContextValue {
  theme:     AppTheme;
  setTheme:  (t: AppTheme) => void;
  isColored: boolean;
  isDark:    boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme:     "light-plain",
  setTheme:  () => {},
  isColored: false,
  isDark:    false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("light-plain");

  // Load from localStorage after mount — avoids SSR mismatch
  useEffect(() => {
    const saved = (localStorage.getItem("rco_theme") as AppTheme) || "light-plain";
    applyTheme(saved);
    setThemeState(saved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyTheme(t: AppTheme) {
    if (t.startsWith("dark")) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  function setTheme(t: AppTheme) {
    setThemeState(t);
    localStorage.setItem("rco_theme", t);
    applyTheme(t);
  }

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      isColored: theme.endsWith("color"),
      isDark:    theme.startsWith("dark"),
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
