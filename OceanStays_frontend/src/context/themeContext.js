import { createContext } from "react";

/**
 * Theme context handle.
 *
 * Kept in its own module (no components) so ThemeProvider.jsx exports only a
 * component and stays compatible with React Fast Refresh.
 */
export const ThemeContext = createContext(null);

/** localStorage key — also read by the pre-paint script in index.html. */
export const THEME_STORAGE_KEY = "shms.theme";

/** The choices a user can make. "system" follows the OS setting. */
export const THEME_CHOICES = ["light", "dark", "system"];
