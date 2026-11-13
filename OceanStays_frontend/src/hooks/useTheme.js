import { useContext } from "react";
import { ThemeContext } from "../context/themeContext";

/**
 * The current colour theme.
 *
 *   const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
 *
 * `theme` is the user's choice ("light" | "dark" | "system");
 * `resolvedTheme` is what is actually showing ("light" | "dark").
 *
 * @throws when used outside <ThemeProvider>, which is a wiring mistake.
 */
export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside a <ThemeProvider>.");
  }

  return context;
}

export default useTheme;
