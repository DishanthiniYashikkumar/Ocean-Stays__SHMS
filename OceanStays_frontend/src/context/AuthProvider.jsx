import { useCallback, useMemo, useState } from "react";
import { AuthContext } from "./authContext";
import {
  getCurrentUser,
  login as loginRequest,
  logout as clearSession,
  register as registerRequest,
} from "../services/authService";

/**
 * Holds the signed-in user for the whole app.
 *
 * Before this existed, every component read the session straight out of
 * storage, so signing in or out never re-rendered anything else. Now the
 * navbar, route guards and dashboards all react to the same state.
 *
 * FRONTEND ONLY: this tracks who the UI believes is signed in. It is not a
 * security boundary — the API must authorise every request independently.
 */
function AuthProvider({ children }) {
  // Seed from storage so a refresh doesn't bounce a signed-in user to /login.
  const [user, setUser] = useState(() => getCurrentUser());

  const signIn = useCallback(async (credentials) => {
    const session = await loginRequest(credentials);
    setUser(session.user);
    return session;
  }, []);

  const signUp = useCallback(async (details) => {
    const session = await registerRequest(details);
    setUser(session.user);
    return session;
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      isAuthenticated: Boolean(user),
      signIn,
      signUp,
      signOut,
    }),
    [user, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
