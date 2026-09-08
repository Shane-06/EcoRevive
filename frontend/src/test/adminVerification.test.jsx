import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VerificationQueue from '../components/admin/VerificationQueue';
import VerificationModal from '../components/admin/VerificationModal';
import verificationService from '../services/verification.service';

describe('Milestone 15 — Admin Verification Workflow Tests', () => {
  const mockQueueTrees = [
    {
      id: 'tree-pending',
      species: 'Neem',
      status: 'Pending',
      contributor: { name: 'Alice Green' },
      plantedOn: '2026-08-31',
      latitude: 30.6543,
      longitude: 76.7821,
      photoReference: 'uploads/tree-photo-1.jpg',
    },
    {
      id: 'tree-under-review',
      species: 'Peepal',
      status: 'Under Review',
      contributor: { name: 'Bob Forest' },
      plantedOn: '2026-08-20',
      latitude: 30.7000,
      longitude: 76.8000,
      photoReference: 'uploads/tree-photo-2.jpg',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('VerificationQueue', () => {
    it('should render review queue rows and status filter tabs', () => {
      render(
        <VerificationQueue
          trees={mockQueueTrees}
          activeFilter="All"
          onFilterChange={() => {}}
          onSelectTree={() => {}}
        />
      );

      expect(screen.getByText('Plantation Verification Queue')).toBeInTheDocument();
      expect(screen.getByTestId('queue-filter-pending')).toBeInTheDocument();
      expect(screen.getByTestId('queue-filter-under-review')).toBeInTheDocument();
      expect(screen.getByTestId('queue-row-tree-pending')).toBeInTheDocument();
      expect(screen.getByTestId('queue-row-tree-under-review')).toBeInTheDocument();
      expect(screen.getByText('Alice Green')).toBeInTheDocument();
    });

    it('should trigger filter change when tab is clicked', () => {
      const filterSpy = vi.fn();
      render(
        <VerificationQueue
          trees={mockQueueTrees}
          activeFilter="All"
          onFilterChange={filterSpy}
          onSelectTree={() => {}}
        />
      );

      fireEvent.click(screen.getByTestId('queue-filter-pending'));
      expect(filterSpy).toHaveBeenCalledWith('Pending');
    });
  });

  describe('VerificationModal', () => {
    it('Transition 1: Pending tree displays "Start Review" and calls startReview API', async () => {
      const statusUpdatedSpy = vi.fn();
      vi.spyOn(verificationService, 'startReview').mockResolvedValueOnce({
        tree: { id: 'tree-pending', status: 'Under Review' },
      });

      render(
        <VerificationModal
          tree={mockQueueTrees[0]}
          onClose={() => {}}
          onStatusUpdated={statusUpdatedSpy}
        />
      );

      expect(screen.getByTestId('start-review-button')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('start-review-button'));

      await waitFor(() => {
        expect(verificationService.startReview).toHaveBeenCalledWith('tree-pending');
        expect(statusUpdatedSpy).toHaveBeenCalled();
        expect(screen.getByText('Under Review')).toBeInTheDocument();
      });
    });

    it('Transition 2: Under Review tree displays "Approve" and assigns authoritative Tree ID', async () => {
      const statusUpdatedSpy = vi.fn();
      vi.spyOn(verificationService, 'approveVerification').mockResolvedValueOnce({
        tree: { id: 'tree-under-review', status: 'Verified', treeId: 'ER-PLT-00099' },
        identity: { treeId: 'ER-PLT-00099' },
      });

      render(
        <MemoryRouter>
          <VerificationModal
            tree={mockQueueTrees[1]}
            onClose={() => {}}
            onStatusUpdated={statusUpdatedSpy}
          />
        </MemoryRouter>
      );

      expect(screen.getByTestId('approve-verification-button')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('approve-verification-button'));

      await waitFor(() => {
        expect(verificationService.approveVerification).toHaveBeenCalledWith('tree-under-review');
        expect(statusUpdatedSpy).toHaveBeenCalled();
        expect(screen.getByTestId('verified-success-box')).toBeInTheDocument();
        expect(screen.getByTestId('authoritative-tree-id-display')).toHaveTextContent('ER-PLT-00099');
      });
    });

    it('Transition 3: Rejection requires mandatory non-blank reason', async () => {
      render(
        <VerificationModal
          tree={mockQueueTrees[1]}
          onClose={() => {}}
          onStatusUpdated={() => {}}
        />
      );

      const rejectSpy = vi.spyOn(verificationService, 'rejectVerification');

      // Attempt to reject with empty reason
      fireEvent.click(screen.getByTestId('reject-verification-button'));
      expect(screen.getByText(/Rejection reason is mandatory and cannot be blank/i)).toBeInTheDocument();
      expect(rejectSpy).not.toHaveBeenCalled();

      // Submit valid rejection reason
      rejectSpy.mockResolvedValueOnce({
        tree: {
          id: 'tree-under-review',
          status: 'Rejected',
          reason: 'Photo evidence is insufficient to verify species.',
        },
      });

      fireEvent.change(screen.getByTestId('rejection-reason-textarea'), {
        target: { value: 'Photo evidence is insufficient to verify species.' },
      });
      fireEvent.click(screen.getByTestId('reject-verification-button'));

      await waitFor(() => {
        expect(verificationService.rejectVerification).toHaveBeenCalledWith('tree-under-review', {
          reason: 'Photo evidence is insufficient to verify species.',
        });
        expect(screen.getByText('Verification Rejected')).toBeInTheDocument();
      });
    });

    it('Error Handling: Invalid state transition (409 Conflict) renders clear error alert', async () => {
      vi.spyOn(verificationService, 'approveVerification').mockRejectedValueOnce({
        statusCode: 409,
        code: 'INVALID_STATE_TRANSITION',
        message: 'Cannot transition tree in Rejected state to Verified',
      });

      render(
        <VerificationModal
          tree={mockQueueTrees[1]}
          onClose={() => {}}
          onStatusUpdated={() => {}}
        />
      );

      fireEvent.click(screen.getByTestId('approve-verification-button'));

      await waitFor(() => {
        expect(screen.getByText('Verification Action Error')).toBeInTheDocument();
        expect(screen.getByText(/Cannot transition tree in Rejected state to Verified/i)).toBeInTheDocument();
      });
    });
  });
});
