import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import RewardsPage from '../pages/RewardsPage';
import RewardPointsCard from '../components/rewards/RewardPointsCard';
import RewardActivityTable from '../components/rewards/RewardActivityTable';
import rewardService from '../services/reward.service';

vi.mock('../services/reward.service');

describe('Milestone 16 — Rewards Components & Ledger Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders RewardPointsCard with authoritative total points', () => {
    render(<RewardPointsCard totalPoints={150} />);

    expect(screen.getByTestId('reward-points-card')).toBeInTheDocument();
    expect(screen.getByTestId('total-points-display')).toHaveTextContent('150');
    expect(screen.getByText('Verified Balance')).toBeInTheDocument();
    expect(screen.getByText(/50 points/)).toBeInTheDocument();
  });

  it('renders RewardActivityTable with activities and pagination', () => {
    const mockActivities = [
      { id: 'r1', activity: 'Verified plantation', points: 50, createdAt: '2026-09-01T10:00:00.000Z' },
      { id: 'r2', activity: 'Verified plantation', points: 50, createdAt: '2026-09-02T10:00:00.000Z' },
    ];
    const mockPagination = { page: 1, pageSize: 20, total: 2, totalPages: 1 };

    render(
      <RewardActivityTable
        activities={mockActivities}
        pagination={mockPagination}
        loading={false}
      />
    );

    expect(screen.getByTestId('reward-activity-table')).toBeInTheDocument();
    expect(screen.getByTestId('reward-activity-row-r1')).toBeInTheDocument();
    expect(screen.getByTestId('reward-activity-row-r2')).toBeInTheDocument();
    expect(screen.getAllByText('+50 PTS')).toHaveLength(2);
  });

  it('renders empty state when user has 0 rewards', () => {
    render(
      <RewardActivityTable
        activities={[]}
        pagination={{ page: 1, pageSize: 20, total: 0, totalPages: 1 }}
        loading={false}
      />
    );

    expect(screen.getByTestId('no-rewards-message')).toBeInTheDocument();
    expect(screen.getByText('No reward activities recorded yet')).toBeInTheDocument();
  });

  it('loads and renders RewardsPage from backend service', async () => {
    rewardService.getMyRewards.mockResolvedValueOnce({
      totalPoints: 100,
      activities: [
        { id: 'act-1', activity: 'Verified plantation', points: 50, createdAt: '2026-09-01T00:00:00.000Z' },
        { id: 'act-2', activity: 'Verified plantation', points: 50, createdAt: '2026-09-02T00:00:00.000Z' },
      ],
      pagination: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <RewardsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Rewards & Contribution Points')).toBeInTheDocument();

    await waitFor(() => {
      expect(rewardService.getMyRewards).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
      expect(screen.getByTestId('total-points-display')).toHaveTextContent('100');
      expect(screen.getByTestId('reward-activity-row-act-1')).toBeInTheDocument();
    });
  });

  it('handles pagination next and previous buttons', async () => {
    rewardService.getMyRewards
      .mockResolvedValueOnce({
        totalPoints: 150,
        activities: [{ id: 'act-1', activity: 'Verified plantation', points: 50 }],
        pagination: { total: 25, page: 1, pageSize: 20, totalPages: 2 },
      })
      .mockResolvedValueOnce({
        totalPoints: 150,
        activities: [{ id: 'act-2', activity: 'Verified plantation', points: 50 }],
        pagination: { total: 25, page: 2, pageSize: 20, totalPages: 2 },
      });

    render(
      <MemoryRouter>
        <RewardsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('rewards-next-page-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('rewards-next-page-btn'));

    await waitFor(() => {
      expect(rewardService.getMyRewards).toHaveBeenCalledWith({ page: 2, pageSize: 20 });
    });
  });
});
