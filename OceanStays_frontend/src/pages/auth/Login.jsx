import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/layout/AuthLayout";
import LoginForm from "../../components/LoginForm";
import { getDashboardRoute } from "../../services/authService";

/**
 * DEVELOPMENT AID — delete this component, its <aside> below, and the
 * `.shms-demo-note` block in login.css before any real deployment.
 *
 * These accounts only exist while VITE_USE_MOCK_AUTH is on; each maps to a
 * fixture user so the dashboards have real data behind them.
 */
const DEMO_ACCOUNTS = [
  { email: "amara.perera@example.com", role: "Guest" },
  { email: "reception@oceanstays.com", role: "Front desk" },
  { email: "housekeeping@oceanstays.com", role: "Housekeeping" },
  { email: "service@oceanstays.com", role: "Service" },
  { email: "admin@oceanstays.com", role: "Admin" },
];

function DemoAccounts() {
  return (
    <aside className="shms-demo-note">
      <strong>Demo accounts · any password of 8+ characters</strong>
      <ul className="shms-demo-list">
        {DEMO_ACCOUNTS.map(({ email, role }) => (
          <li key={email}>
            <code>{email}</code>
            <span>{role}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

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
      navigate(intended ?? getDashboardRoute(user.role), { replace: true });
    },
    [navigate, location.state],
  );

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to continue to your dashboard"
      aside={<DemoAccounts />}
    >
      <LoginForm onAuthenticated={handleAuthenticated} />

      <p className="shms-secure">
        <i className="bi bi-shield-lock" aria-hidden="true" />
        Secure authentication with role-based access
      </p>
    </AuthLayout>
  );
}

export default Login;
