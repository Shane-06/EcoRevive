import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import PlantationList from '../components/trees/PlantationList';

describe('Milestone 15 — PlantationList Component Tests', () => {
  const mockTrees = [
    {
      id: 'tree-1',
      species: 'Neem',
      status: 'Pending',
      plantedOn: '2026-08-31',
      latitude: 30.6543,
      longitude: 76.7821,
      createdAt: '2026-08-31T10:00:00.000Z',
    },
    {
      id: 'tree-2',
      species: 'Peepal',
      status: 'Under Review',
      plantedOn: '2026-08-20',
      latitude: 30.7000,
      longitude: 76.8000,
      createdAt: '2026-08-20T10:00:00.000Z',
    },
    {
      id: 'tree-3',
      species: 'Banyan',
      status: 'Verified',
      treeId: 'ER-PLT-00042',
      plantedOn: '2026-08-15',
      latitude: 28.6139,
      longitude: 77.2090,
      createdAt: '2026-08-15T10:00:00.000Z',
    },
    {
      id: 'tree-4',
      species: 'Arjun',
      status: 'Rejected',
      rejectionReason: 'Photo evidence is too dark and blurry to verify species.',
      plantedOn: '2026-08-10',
      latitude: 25.3176,
      longitude: 82.9739,
      createdAt: '2026-08-10T10:00:00.000Z',
    },
  ];

  it('should render empty notice when trees array is empty', () => {
    render(<PlantationList trees={[]} />);
    expect(screen.getByTestId('empty-plantations-notice')).toBeInTheDocument();
    expect(screen.getByText('No Plantations Registered Yet')).toBeInTheDocument();
  });

  it('should render all 4 lifecycle statuses correctly', () => {
    render(
      <MemoryRouter>
        <PlantationList trees={mockTrees} />
      </MemoryRouter>
    );

    expect(screen.getByTestId('status-badge-pending')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-under-review')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-verified')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-rejected')).toBeInTheDocument();
  });

  it('should render authoritative backend-generated Tree ID and public profile link for Verified tree', () => {
    render(
      <MemoryRouter>
        <PlantationList trees={mockTrees} />
      </MemoryRouter>
    );

    const treeIdEl = screen.getByTestId('authoritative-tree-id-tree-3');
    expect(treeIdEl).toHaveTextContent('ER-PLT-00042');

    const profileLink = screen.getByTestId('view-public-profile-btn-tree-3');
    expect(profileLink).toHaveAttribute('href', '/tree/ER-PLT-00042');
  });

  it('should render rejection reason from coordinator for Rejected tree', () => {
    render(
      <MemoryRouter>
        <PlantationList trees={mockTrees} />
      </MemoryRouter>
    );

    expect(screen.getByTestId('rejection-reason-box')).toBeInTheDocument();
    expect(screen.getByText(/Photo evidence is too dark and blurry to verify species/i)).toBeInTheDocument();
  });

  it('should support pagination controls', () => {
    const pageChangeSpy = vi.fn();
    render(
      <MemoryRouter>
        <PlantationList
          trees={mockTrees}
          pagination={{ page: 1, pageSize: 2, total: 4, totalPages: 2 }}
          onPageChange={pageChangeSpy}
        />
      </MemoryRouter>
    );

    const nextBtn = screen.getByTitle('Next Page');
    fireEvent.click(nextBtn);
    expect(pageChangeSpy).toHaveBeenCalledWith(2);
  });
});
