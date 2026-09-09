import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import dashboardService from '../services/dashboard.service';
import { useAuth } from '../hooks/useAuth';

vi.mock('../services/dashboard.service');
vi.mock('../hooks/useAuth');

describe('Milestone 16 — Dashboards (Contributor & Admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Contributor DashboardPage', () => {
    it('renders contributor metrics and plantation breakdown accurately', async () => {
      useAuth.mockReturnValue({
        user: { name: 'Shane Contributor', role: 'contributor' },
      });

      dashboardService.getMyDashboard.mockResolvedValueOnce({
        plantations: {
          total: 5,
          verified: 2,
          pending: 1,
          underReview: 1,
          rejected: 1,
        },
        health: {
          monitoredTrees: 2,
        },
        rewards: {
          totalPoints: 100,
          recentActivities: [
            { id: '1', activity: 'Verified plantation', points: 50, createdAt: '2026-09-08T00:00:00.000Z' },
          ],
        },
      });

      render(
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(dashboardService.getMyDashboard).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Welcome back, Shane Contributor')).toBeInTheDocument();
        expect(screen.getByTestId('dashboard-stat-total-plantations')).toHaveTextContent('5');
        expect(screen.getByTestId('dashboard-stat-verified-trees')).toHaveTextContent('2');
        expect(screen.getByTestId('dashboard-stat-monitored-trees')).toHaveTextContent('2');
        expect(screen.getByTestId('dashboard-stat-total-points')).toHaveTextContent('100');
        expect(screen.getByTestId('breakdown-verified')).toHaveTextContent('2');
        expect(screen.getByTestId('recent-activity-item-1')).toBeInTheDocument();
      });
    });

    it('handles zeroed metrics safely without crashing', async () => {
      useAuth.mockReturnValue({
        user: { name: 'New User', role: 'contributor' },
      });

      dashboardService.getMyDashboard.mockResolvedValueOnce({
        plantations: { total: 0, verified: 0, pending: 0, underReview: 0, rejected: 0 },
        health: { monitoredTrees: 0 },
        rewards: { totalPoints: 0, recentActivities: [] },
      });

      render(
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-stat-total-plantations')).toHaveTextContent('0');
        expect(screen.getByTestId('dashboard-no-activities')).toBeInTheDocument();
      });
    });
  });

  describe('Admin DashboardPage', () => {
    it('renders aggregate platform-wide metrics and administrative actions', async () => {
      dashboardService.getAdminDashboard.mockResolvedValueOnce({
        plantations: {
          total: 50,
          verified: 30,
          pending: 10,
          underReview: 5,
          rejected: 5,
        },
        health: {
          treesWithHealthLogs: 22,
        },
        rewards: {
          totalPointsIssued: 1500,
        },
      });

      render(
        <MemoryRouter>
          <AdminDashboardPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(dashboardService.getAdminDashboard).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Platform Analytics & Executive Dashboard')).toBeInTheDocument();
        expect(screen.getByTestId('admin-stat-total-plantations')).toHaveTextContent('50');
        expect(screen.getByTestId('admin-stat-verified-trees')).toHaveTextContent('30');
        expect(screen.getByTestId('admin-stat-monitored-trees')).toHaveTextContent('22');
        expect(screen.getByTestId('admin-stat-total-points-issued')).toHaveTextContent('1,500');
        expect(screen.getByTestId('breakdown-verified')).toHaveTextContent('30');
      });
    });
  });
});
