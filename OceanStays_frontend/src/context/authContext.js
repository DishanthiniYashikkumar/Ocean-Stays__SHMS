import { createContext } from "react";

/**
 * Auth context handle.
 *
 * Kept in its own module (no components) so that AuthProvider.jsx exports only
 * a component and stays compatible with React Fast Refresh.
 *
 * Consume it through the `useAuth` hook rather than importing this directly.
 */
export const AuthContext = createContext(null);
