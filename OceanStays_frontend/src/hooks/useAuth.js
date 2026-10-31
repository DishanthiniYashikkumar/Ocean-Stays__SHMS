import { useContext } from "react";
import { AuthContext } from "../context/authContext";

/**
 * Reads the current session.
 *
 *   const { user, isAuthenticated, signIn, signOut } = useAuth();
 *
 * @throws when used outside <AuthProvider>, which is always a wiring mistake
 *         rather than something to handle at runtime.
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an <AuthProvider>.");
  }

  return context;
}

export default useAuth;
