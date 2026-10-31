import { createContext } from "react";

/**
 * Toast context handle.
 *
 * Kept in its own module (no components) so ToastProvider.jsx exports only a
 * component and stays compatible with React Fast Refresh.
 */
export const ToastContext = createContext(null);
