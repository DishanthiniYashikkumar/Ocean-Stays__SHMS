import { createContext } from "react";

/**
 * Whether the current shell animates. PublicLayout, AuthLayout and the staff
 * / guest dashboards provide `true`; the admin panel provides `false`, and so
 * does anything rendered outside a shell. CSS reads the matching
 * data-motion="on|off" attribute on the shell element.
 */
export const MotionContext = createContext(false);
