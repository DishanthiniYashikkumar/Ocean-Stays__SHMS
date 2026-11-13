import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/layout/AuthLayout";
import LoginForm from "../../components/LoginForm";
import { canRoleOpen, getDashboardRoute } from "../../services/authService";

/**
 * One login page for every role. After authentication the role returned by the
 * backend decides the destination -- see ROLE_ROUTES in authService.js.
 */
function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleAuthenticated = useCallback(
    (user) => {
      // If a guard bounced the user here, send them back where they came from.
      const intended = location.state?.from;
      const destination = canRoleOpen(user.role, intended) ? intended : getDashboardRoute(user.role);
      navigate(destination, { replace: true });
    },
    [navigate, location.state],
  );

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to continue to your dashboard">
      <LoginForm onAuthenticated={handleAuthenticated} />

      <p className="shms-secure">
        <i className="bi bi-shield-lock" aria-hidden="true" />
        Secure authentication with role-based access
      </p>
    </AuthLayout>
  );
}

export default Login;
