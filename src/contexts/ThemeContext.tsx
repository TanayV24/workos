// src/contexts/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeChoice = "light" | "dark" | "system";

type ThemeCtx = {
  choice: ThemeChoice;
  setChoice: (c: ThemeChoice) => void;
  isDark: boolean;
};

const THEME_KEY = "workos:theme";

const ThemeContext = createContext<ThemeCtx | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [choice, setChoiceState] = useState<ThemeChoice>(() => {
    try {
      const s = localStorage.getItem(THEME_KEY);
      if (s === "light" || s === "dark" || s === "system") return s;
    } catch {}
    return "system";
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (choice === "light") return false;
    if (choice === "dark") return true;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const applyDarkClass = (shouldBeDark: boolean) => {
    try {
      const el = document.documentElement;
      if (shouldBeDark) el.classList.add("dark");
      else el.classList.remove("dark");
    } catch {}
  };

  useEffect(() => {
    let mq: MediaQueryList | null = null;

    const updateFromSystem = () => {
      const systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      const effective = choice === "system" ? systemDark : choice === "dark";
      setIsDark(!!effective);
      applyDarkClass(!!effective);
    };

    if (choice === "system") {
      if (window.matchMedia) {
        mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => updateFromSystem();
        if (typeof mq.addEventListener === "function") mq.addEventListener("change", handler);
        else mq.addListener(handler);
        updateFromSystem();
      } else {
        setIsDark(false);
        applyDarkClass(false);
      }
    } else {
      const effective = choice === "dark";
      setIsDark(effective);
      applyDarkClass(effective);
    }

    return () => {
      if (mq) {
        try {
          if (typeof mq.removeEventListener === "function") mq.removeEventListener("change", updateFromSystem);
          else mq.removeListener(updateFromSystem);
        } catch {}
      }
    };
  }, [choice]);

  const setChoice = (c: ThemeChoice) => {
    try {
      localStorage.setItem(THEME_KEY, c);
    } catch {}
    setChoiceState(c);
  };

  return <ThemeContext.Provider value={{ choice, setChoice, isDark }}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeCtx => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
};
