import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/layout/AuthLayout";
import RegisterForm from "../../components/RegisterForm";
import { getDashboardRoute } from "../../services/authService";

/**
 * Guest registration. A new account is signed in immediately, so someone who
 * arrived mid-booking is returned to where they left off rather than being
 * asked to sign in again.
 */
function Register() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleRegistered = useCallback(
    (user) => {
      const intended = location.state?.from;
      navigate(intended ?? getDashboardRoute(user.role), { replace: true });
    },
    [navigate, location.state],
  );

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Book faster, track your stay, and manage requests in one place"
      icon="bi-person-plus"
      wide
    >
      <RegisterForm onRegistered={handleRegistered} />

      <p className="shms-secure">
        <i className="bi bi-shield-lock" aria-hidden="true" />
        Your details are encrypted and never shared
      </p>
    </AuthLayout>
  );
}

export default Register;
