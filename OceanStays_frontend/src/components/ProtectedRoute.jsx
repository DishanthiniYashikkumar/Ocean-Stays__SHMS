import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/**
 * Route guard for RBAC.
 *
 *   <ProtectedRoute allow={[ROLES.ADMIN]}> <AdminDashboard /> </ProtectedRoute>
 *
 * Omit `allow` to require only that the user is signed in.
 *
 * This is a UX guard, not a security boundary — the API must enforce the same
 * rules server-side on every request.
 */
function ProtectedRoute({ allow, children }) {
  const location = useLocation();
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    // Remember where they were headed so login can send them back. The query
    // string matters — booking deep links carry the dates and guest count.
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  if (allow?.length && !allow.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

export default ProtectedRoute;
