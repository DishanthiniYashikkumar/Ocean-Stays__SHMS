import { useState } from "react";
import { useTheme } from "../../hooks/useTheme";

/**
 * Light/dark switch for the topbar and the public navbar.
 *
 * Icon-only, so the accessible name states what pressing it will do.
 *
 * @param {{ className?: string }} props
 */
function ThemeToggle({ className = "shms-icon-btn" }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [hasToggled, setHasToggled] = useState(false);
  const isDark = resolvedTheme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      className={`${className} shms-theme-toggle`}
      onClick={() => {
        setHasToggled(true);
        toggleTheme();
      }}
      aria-label={label}
      title={label}
    >
      <i
        key={resolvedTheme}
        className={`bi ${isDark ? "bi-sun" : "bi-moon-stars"} shms-theme-icon${hasToggled ? " is-turning" : ""}`}
        aria-hidden="true"
      />
    </button>
  );
}

export default ThemeToggle;
