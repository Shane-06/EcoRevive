import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import { ROLES } from '../utils/constants';

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

export default function AppRoutes() {
  return (
    <Routes>
      {/* Auth Layout Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Main Application Layout */}
      <Route element={<MainLayout />}>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/tree/:treeId" element={<PublicTreeProfilePage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Authenticated Routes (Contributor & Admin) */}
        <Route
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={[ROLES.CONTRIBUTOR, ROLES.ADMIN]} />
            </ProtectedRoute>
          }
        >
          <Route path="/trees" element={<PlantationPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>

        {/* Authenticated Rewards Route (All Authenticated Users) */}
        <Route
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={[ROLES.CONTRIBUTOR, ROLES.CARETAKER, ROLES.ADMIN]} />
            </ProtectedRoute>
          }
        >
          <Route path="/rewards" element={<RewardsPage />} />
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
  );
}
