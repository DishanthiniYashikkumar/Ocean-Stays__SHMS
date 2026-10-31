import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import AuthProvider from "./context/AuthProvider";
import ToastProvider from "./context/ToastProvider";
import DashboardLayout from "./components/layout/DashboardLayout";
import PublicLayout from "./components/layout/PublicLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import ComingSoon from "./pages/ComingSoon";
import BookingDetails from "./pages/guest/BookingDetails";
import Feedback from "./pages/guest/Feedback";
import GuestDashboard from "./pages/guest/GuestDashboard";
import MyBookings from "./pages/guest/MyBookings";
import Notifications from "./pages/guest/Notifications";
import Payments from "./pages/guest/Payments";
import Profile from "./pages/guest/Profile";
import ServiceRequests from "./pages/guest/ServiceRequests";
import DiningRequests from "./pages/service/DiningRequests";
import GuestRequests from "./pages/service/GuestRequests";
import ServiceMaintenance from "./pages/service/MaintenanceRequests";
import RoomService from "./pages/service/RoomService";
import ServiceDashboard from "./pages/service/ServiceDashboard";
import TransportRequests from "./pages/service/TransportRequests";
import AssignedRooms from "./pages/housekeeping/AssignedRooms";
import CleaningTasks from "./pages/housekeeping/CleaningTasks";
import HousekeepingDashboard from "./pages/housekeeping/HousekeepingDashboard";
import HousekeepingRequests from "./pages/housekeeping/HousekeepingRequests";
import MaintenanceIssues from "./pages/housekeeping/MaintenanceIssues";
import CheckIn from "./pages/reception/CheckIn";
import CheckOut from "./pages/reception/CheckOut";
import Guests from "./pages/reception/Guests";
import ReceptionDashboard from "./pages/reception/ReceptionDashboard";
import ReceptionPayments from "./pages/reception/Payments";
import ReceptionRequests from "./pages/reception/Requests";
import Reservations from "./pages/reception/Reservations";
import RoomAllocation from "./pages/reception/RoomAllocation";
import BookingFlow from "./pages/booking/BookingFlow";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ResetPassword from "./pages/auth/ResetPassword";
import Activities from "./pages/public/Activities";
import Contact from "./pages/public/Contact";
import Facilities from "./pages/public/Facilities";
import Gallery from "./pages/public/Gallery";
import Home from "./pages/public/Home";
import RoomDetails from "./pages/public/RoomDetails";
import Rooms from "./pages/public/Rooms";
import Testimonials from "./pages/public/Testimonials";
import { ROLES } from "./services/authService";

/*
 * Admin is loaded on demand. It is the only area that pulls in Recharts, and a
 * guest browsing the public site should never download a charting library to
 * look at a room. React's own code splitting — no extra dependency.
 */
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminRoles = lazy(() => import("./pages/admin/RolesPermissions"));
const AdminRooms = lazy(() => import("./pages/admin/Rooms"));
const AdminFacilities = lazy(() => import("./pages/admin/Facilities"));
const AdminStaff = lazy(() => import("./pages/admin/Staff"));
const AdminReservations = lazy(() => import("./pages/admin/Reservations"));
const AdminPayments = lazy(() => import("./pages/admin/Payments"));
const AdminReports = lazy(() => import("./pages/admin/Reports"));
const AdminNotifications = lazy(() => import("./pages/admin/Notifications"));
const AdminAuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));

/** Shown while an admin chunk downloads. Matches the skeletons used elsewhere. */
function RouteFallback() {
  return (
    <div className="shms-route-loading" aria-hidden="true">
      <div className="shms-skeleton" style={{ height: 96 }} />
      <div className="shms-skeleton" style={{ height: 280 }} />
    </div>
  );
}

/**
 * Route table.
 *
 * Public pages sit under PublicLayout (navbar + footer) and need no session —
 * guests browse rooms, facilities and the gallery before ever signing in.
 *
 * The five dashboards share ONE login page: the role returned by the backend
 * decides the destination (ROLE_ROUTES in authService.js) and ProtectedRoute
 * keeps each dashboard restricted to its role.
 */

function App() {
  return (
    <BrowserRouter>
      {/* AuthProvider sits inside the router so its consumers can navigate;
          ToastProvider inside it so any signed-in action can report an outcome. */}
      <AuthProvider>
        <ToastProvider>
        <Routes>
        {/* ------------------------------------------------ Public website */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/rooms/:slug" element={<RoomDetails />} />
          <Route path="/facilities" element={<Facilities />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/testimonials" element={<Testimonials />} />
          <Route path="/contact" element={<Contact />} />

          {/* Browsing stays open to everyone; authentication is only asked for
              once a guest actually starts booking. ProtectedRoute preserves the
              full URL, so the stay dates survive the login round trip. */}
          <Route
            path="/booking/:slug"
            element={
              <ProtectedRoute>
                <BookingFlow />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* --------------------------------------------------------- Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ------------------------------------------------- Guest portal */}
        <Route
          path="/guest"
          element={
            <ProtectedRoute allow={[ROLES.GUEST]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/guest/dashboard" replace />} />
          <Route path="dashboard" element={<GuestDashboard />} />
          <Route path="bookings" element={<MyBookings />} />
          <Route path="bookings/:bookingId" element={<BookingDetails />} />
          <Route path="requests" element={<ServiceRequests />} />
          <Route path="payments" element={<Payments />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="feedback" element={<Feedback />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* ---------------------------------------------- Front desk */}
        <Route
          path="/reception"
          element={
            <ProtectedRoute allow={[ROLES.RECEPTIONIST]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/reception/dashboard" replace />} />
          <Route path="dashboard" element={<ReceptionDashboard />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="check-in" element={<CheckIn />} />
          <Route path="check-out" element={<CheckOut />} />
          <Route path="rooms" element={<RoomAllocation />} />
          <Route path="guests" element={<Guests />} />
          <Route path="payments" element={<ReceptionPayments />} />
          <Route path="requests" element={<ReceptionRequests />} />
        </Route>

        {/* -------------------------------------------- Housekeeping */}
        <Route
          path="/housekeeping"
          element={
            <ProtectedRoute allow={[ROLES.HOUSEKEEPING]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/housekeeping/dashboard" replace />} />
          <Route path="dashboard" element={<HousekeepingDashboard />} />
          <Route path="tasks" element={<CleaningTasks />} />
          <Route path="rooms" element={<AssignedRooms />} />
          <Route path="requests" element={<HousekeepingRequests />} />
          <Route path="maintenance" element={<MaintenanceIssues />} />
        </Route>

        {/* ------------------------------------------- Service staff */}
        <Route
          path="/service"
          element={
            <ProtectedRoute allow={[ROLES.SERVICE_STAFF]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/service/dashboard" replace />} />
          <Route path="dashboard" element={<ServiceDashboard />} />
          <Route path="requests" element={<GuestRequests />} />
          <Route path="room-service" element={<RoomService />} />
          <Route path="dining" element={<DiningRequests />} />
          <Route path="transport" element={<TransportRequests />} />
          <Route path="maintenance" element={<ServiceMaintenance />} />
        </Route>

        {/* ------------------------------------------------ Administrator */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allow={[ROLES.ADMIN]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route
            element={
              <Suspense fallback={<RouteFallback />}>
                <Outlet />
              </Suspense>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="roles" element={<AdminRoles />} />
            <Route path="rooms" element={<AdminRooms />} />
            <Route path="facilities" element={<AdminFacilities />} />
            <Route path="staff" element={<AdminStaff />} />
            <Route path="reservations" element={<AdminReservations />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="audit-logs" element={<AdminAuditLogs />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>

        {/* The old per-role placeholder path, kept as a redirect so any saved
            link still lands somewhere sensible. */}
        <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />

        {/* ------------------------------------------------------ Fallbacks */}
        <Route
          path="/unauthorized"
          element={
            <ComingSoon
              icon="bi-shield-exclamation"
              tone="danger"
              title="Access denied"
              message="Your role doesn't have permission to view that page."
            />
          }
        />
        <Route path="/dashboard" element={<Navigate to="/login" replace />} />
        <Route
          path="*"
          element={
            <ComingSoon
              icon="bi-compass"
              title="Page not found"
              message="That page doesn't exist at Ocean Stays."
            />
          }
        />
        </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
