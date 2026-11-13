import { useCallback, useEffect, useMemo, useState } from "react";
import { THEME_CHOICES, THEME_STORAGE_KEY, ThemeContext } from "./themeContext";

/**
 * Light / dark / system theme.
 *
 * The chosen theme is written to `data-theme` on <html>, which is all the CSS
 * needs (see tokens.css). "system" removes the attribute so the
 * prefers-color-scheme media query decides. index.html applies the saved
 * choice before React renders, so there is no flash of the wrong theme.
 *
 * Storage can be unavailable (private windows, blocked site data), so every
 * read and write is guarded and the app works without it.
 */

const DARK_QUERY = "(prefers-color-scheme: dark)";

function readStoredChoice() {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_CHOICES.includes(value) ? value : "system";
  } catch {
    return "system";
  }
}

function writeStoredChoice(choice) {
  try {
    if (choice === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Not persisted; the choice still applies for this visit.
  }
}

/** Writes the choice to <html> (and the browser chrome colour). */
function applyTheme(choice, resolved) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "dark" ? "#08111e" : "#0a2140");
}

function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia?.(DARK_QUERY).matches === true;
}

function ThemeProvider({ children }) {
  const [choice, setChoice] = useState(readStoredChoice);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  // Follow OS changes while the user is on "system".
  useEffect(() => {
    const media = window.matchMedia?.(DARK_QUERY);
    if (!media) return undefined;
    const handleChange = (event) => setSystemDark(event.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  const resolvedTheme = choice === "system" ? (systemDark ? "dark" : "light") : choice;

  useEffect(() => {
    applyTheme(choice, resolvedTheme);
  }, [choice, resolvedTheme]);

  const setTheme = useCallback(
    (next) => {
      if (!THEME_CHOICES.includes(next)) return;
      // Apply before React re-renders, so anything that reads computed CSS
      // during render (the charts) sees the new theme's values.
      applyTheme(next, next === "system" ? (systemDark ? "dark" : "light") : next);
      setChoice(next);
      writeStoredChoice(next);
    },
    [systemDark],
  );

  /** Flip between light and dark (leaves "system" once the user chooses). */
  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  const value = useMemo(
    () => ({ theme: choice, resolvedTheme, setTheme, toggleTheme }),
    [choice, resolvedTheme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export default ThemeProvider;
