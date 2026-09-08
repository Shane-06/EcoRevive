import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import { ROLES } from '../utils/constants';

// Pages
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import UnauthorizedPage from '../pages/UnauthorizedPage';
import NotFoundPage from '../pages/NotFoundPage';
import MapPage from '../pages/MapPage';

// Placeholders for future milestone features
import TreesPage from '../pages/placeholders/TreesPage';
import MonitorPage from '../pages/placeholders/MonitorPage';
import DashboardPage from '../pages/placeholders/DashboardPage';
import AdminPage from '../pages/placeholders/AdminPage';

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
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Authenticated Contributor Routes */}
        <Route
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={[ROLES.CONTRIBUTOR, ROLES.ADMIN]} />
            </ProtectedRoute>
          }
        >
          <Route path="/trees" element={<TreesPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
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
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/verifications" element={<AdminPage />} />
          <Route path="/admin/dashboard" element={<AdminPage />} />
        </Route>

        {/* 404 Catch-All Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
