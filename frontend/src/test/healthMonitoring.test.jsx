import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import HealthLogForm from '../components/health/HealthLogForm';
import HealthHistoryList from '../components/health/HealthHistoryList';
import MonitorPage from '../pages/MonitorPage';
import healthService from '../services/health.service';

vi.mock('../services/health.service');

describe('Milestone 16 — Health Monitoring Components & Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders health log form with all 4 frozen health statuses', () => {
    render(
      <MemoryRouter>
        <HealthLogForm defaultTreeId="ER-PLT-00001" />
      </MemoryRouter>
    );

    expect(screen.getByTestId('health-log-form')).toBeInTheDocument();
    expect(screen.getByTestId('health-tree-id-input')).toHaveValue('ER-PLT-00001');

    // 4 Frozen Statuses must exist
    expect(screen.getByTestId('health-status-option-healthy')).toBeInTheDocument();
    expect(screen.getByTestId('health-status-option-good')).toBeInTheDocument();
    expect(screen.getByTestId('health-status-option-needs-attention')).toBeInTheDocument();
    expect(screen.getByTestId('health-status-option-dead')).toBeInTheDocument();
  });

  it('allows caretaker to submit a health log without sending client-controlled timestamps', async () => {
    const mockCreatedLog = {
      id: 'hl-123',
      treeId: 'ER-PLT-00001',
      healthStatus: 'Good',
      notes: 'New leaves emerging nicely',
      photoReference: 'uploads/photo.jpg',
      recordedAt: '2026-09-09T04:00:00.000Z',
    };

    healthService.createHealthLog.mockResolvedValueOnce({
      healthLog: mockCreatedLog,
    });

    const handleSuccess = vi.fn();

    render(
      <MemoryRouter>
        <HealthLogForm defaultTreeId="ER-PLT-00001" onSuccess={handleSuccess} />
      </MemoryRouter>
    );

    // Select status 'Good'
    fireEvent.click(screen.getByTestId('health-status-option-good'));

    // Type notes & photo
    fireEvent.change(screen.getByTestId('health-notes-input'), {
      target: { value: 'New leaves emerging nicely' },
    });
    fireEvent.change(screen.getByTestId('health-photo-ref-input'), {
      target: { value: 'uploads/photo.jpg' },
    });

    // Submit form
    fireEvent.click(screen.getByTestId('submit-health-log-btn'));

    await waitFor(() => {
      expect(healthService.createHealthLog).toHaveBeenCalledWith('ER-PLT-00001', {
        healthStatus: 'Good',
        notes: 'New leaves emerging nicely',
        photoReference: 'uploads/photo.jpg',
      });
      expect(handleSuccess).toHaveBeenCalledWith(mockCreatedLog);
    });

    // Crucial check: client payload did NOT contain recorded_at or submitted_by
    const sentPayload = healthService.createHealthLog.mock.calls[0][1];
    expect(sentPayload).not.toHaveProperty('recordedAt');
    expect(sentPayload).not.toHaveProperty('recorded_at');
    expect(sentPayload).not.toHaveProperty('submittedBy');
    expect(sentPayload).not.toHaveProperty('submitted_by');
  });

  it('renders chronological health history with status badges and timestamps', () => {
    const mockLogs = [
      {
        id: 'hl-2',
        healthStatus: 'Healthy',
        recordedAt: '2026-09-09T04:00:00.000Z',
        notes: 'Canopy thriving',
        submittedBy: { name: 'Caretaker Sarah' },
      },
      {
        id: 'hl-1',
        healthStatus: 'Needs Attention',
        recordedAt: '2026-09-01T04:00:00.000Z',
        notes: 'Dry soil',
        submittedBy: { name: 'Caretaker John' },
      },
    ];

    render(
      <MemoryRouter>
        <HealthHistoryList healthLogs={mockLogs} treeId="ER-PLT-00001" />
      </MemoryRouter>
    );

    expect(screen.getByTestId('health-history-list')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('Needs Attention')).toBeInTheDocument();
    expect(screen.getByText('Canopy thriving')).toBeInTheDocument();
    expect(screen.getByText(/Caretaker Sarah/)).toBeInTheDocument();
  });

  it('renders "No health record yet" when health history is empty (CRITICAL: NEVER Dead)', () => {
    render(
      <MemoryRouter>
        <HealthHistoryList healthLogs={[]} treeId="ER-PLT-00001" />
      </MemoryRouter>
    );

    expect(screen.getByTestId('no-health-logs-message')).toBeInTheDocument();
    expect(screen.getByText('No health record yet')).toBeInTheDocument();
    // Verify Dead is NOT rendered
    expect(screen.queryByText('Dead')).not.toBeInTheDocument();
  });

  it('renders MonitorPage and retrieves history when treeId is searched', async () => {
    healthService.getHealthHistory.mockResolvedValueOnce({
      treeId: 'ER-PLT-00002',
      healthLogs: [
        {
          id: 'hl-99',
          healthStatus: 'Healthy',
          recordedAt: '2026-09-09T00:00:00.000Z',
          notes: 'Tree looking great',
        },
      ],
      pagination: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
    });

    render(
      <MemoryRouter initialEntries={['/monitor?treeId=ER-PLT-00002']}>
        <MonitorPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Tree Health Monitoring Hub')).toBeInTheDocument();

    await waitFor(() => {
      expect(healthService.getHealthHistory).toHaveBeenCalledWith('ER-PLT-00002');
      expect(screen.getByText('Tree looking great')).toBeInTheDocument();
    });
  });
});
