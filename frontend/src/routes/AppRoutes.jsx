import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import { ROLES } from '../utils/constants';
import { getRoleLandingRoute } from '../utils/navigation';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ScrollToTop from '../components/common/ScrollToTop';

// Public & Common Pages
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import UnauthorizedPage from '../pages/UnauthorizedPage';
import NotFoundPage from '../pages/NotFoundPage';
import MapPage from '../pages/MapPage';
import PublicTreeProfilePage from '../pages/PublicTreeProfilePage';

// Contributor & Authenticated Pages
import PlantationPage from '../pages/PlantationPage';
import DashboardPage from '../pages/DashboardPage';
import RewardsPage from '../pages/RewardsPage';

// Caretaker Pages
import MonitorPage from '../pages/MonitorPage';

// Admin / Coordinator Pages
import AdminVerificationsPage from '../pages/AdminVerificationsPage';
import AdminDashboardPage from '../pages/AdminDashboardPage';

// AI Assistant Pages (V2-M2)
import EcoGuidePage from '../pages/EcoGuidePage';

/**
 * RootRoute:
 * - If auth state is hydrating from storage, displays LoadingSpinner.
 * - If user is authenticated, redirects to the role-specific default workspace.
 * - If user is unauthenticated, renders public HomePage.
 */
export function RootRoute() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen message="Checking authentication session..." />;
  }

  if (isAuthenticated && user?.role) {
    return <Navigate to={getRoleLandingRoute(user.role)} replace />;
  }

  return <HomePage />;
}

/**
 * DashboardRoute:
 * - Contributor: renders DashboardPage (Contributor Workspace).
 * - Admin: redirects to /admin/dashboard.
 * - Caretaker: redirects to /monitor.
 */
export function DashboardRoute() {
  const { user } = useAuth();

  if (user?.role === ROLES.ADMIN) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (user?.role === ROLES.CARETAKER) {
    return <Navigate to="/monitor" replace />;
  }

  return <DashboardPage />;
}

export default function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
      {/* Auth Layout Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Main Application Layout */}
      <Route element={<MainLayout />}>
        {/* Public Routes */}
        <Route path="/" element={<RootRoute />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/tree/:treeId" element={<PublicTreeProfilePage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Authenticated Dashboard Route (Role-Aware Dispatcher) */}
        <Route
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={[ROLES.CONTRIBUTOR, ROLES.CARETAKER, ROLES.ADMIN]} />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardRoute />} />
        </Route>

        {/* Authenticated Contributor & Admin Routes */}
        <Route
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={[ROLES.CONTRIBUTOR, ROLES.ADMIN]} />
            </ProtectedRoute>
          }
        >
          <Route path="/trees" element={<PlantationPage />} />
        </Route>

        {/* Authenticated All-User Routes (Rewards & EcoGuide) */}
        <Route
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={[ROLES.CONTRIBUTOR, ROLES.CARETAKER, ROLES.ADMIN]} />
            </ProtectedRoute>
          }
        >
          <Route path="/rewards" element={<RewardsPage />} />
          <Route path="/ecoguide" element={<EcoGuidePage />} />
        </Route>

        {/* Authenticated Caretaker Routes */}
        <Route
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={[ROLES.CARETAKER, ROLES.ADMIN]} />
            </ProtectedRoute>
          }
        >
          <Route path="/monitor" element={<MonitorPage />} />
        </Route>

        {/* Authenticated Admin Routes */}
        <Route
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={[ROLES.ADMIN]} />
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<AdminVerificationsPage />} />
          <Route path="/admin/verifications" element={<AdminVerificationsPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        </Route>

        {/* 404 Catch-All Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </>
  );
}
