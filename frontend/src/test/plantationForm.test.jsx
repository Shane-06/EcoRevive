import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PlantationForm from '../components/trees/PlantationForm';
import treeService from '../services/tree.service';
import speciesService from '../services/species.service';

describe('Milestone 15 — PlantationForm Component Tests', () => {
  const mockSpeciesCatalog = {
    species: [
      { name: 'Neem', climateRegion: 'Tropical' },
      { name: 'Peepal', climateRegion: 'Subtropical' },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(speciesService, 'getSpeciesCatalog').mockResolvedValue(mockSpeciesCatalog);
  });

  it('should render form fields for species, latitude, longitude, and date', async () => {
    render(<PlantationForm />);

    expect(screen.getByText('Register New Plantation')).toBeInTheDocument();
    expect(await screen.findByTestId('plantation-species-select')).toBeInTheDocument();
    expect(screen.getByTestId('plantation-lat-input')).toBeInTheDocument();
    expect(screen.getByTestId('plantation-lng-input')).toBeInTheDocument();
    expect(screen.getByTestId('plantation-date-input')).toBeInTheDocument();
    expect(screen.getByTestId('submit-plantation-button')).toBeInTheDocument();

    // Confirm contributor ID is NOT an input field (derived by backend from JWT)
    expect(screen.queryByPlaceholderText(/contributor id/i)).not.toBeInTheDocument();
  });

  it('should submit valid plantation data and trigger success callback', async () => {
    const successSpy = vi.fn();
    vi.spyOn(treeService, 'registerPlantation').mockResolvedValueOnce({
      tree: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        species: 'Neem',
        status: 'Pending',
      },
    });

    render(<PlantationForm onSuccess={successSpy} />);

    expect(await screen.findByTestId('plantation-species-select')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('plantation-lat-input'), { target: { value: '30.6543' } });
    fireEvent.change(screen.getByTestId('plantation-lng-input'), { target: { value: '76.7821' } });
    fireEvent.change(screen.getByTestId('plantation-date-input'), { target: { value: '2026-08-31' } });

    fireEvent.click(screen.getByTestId('submit-plantation-button'));

    await waitFor(() => {
      expect(treeService.registerPlantation).toHaveBeenCalledWith({
        species: 'Neem',
        latitude: 30.6543,
        longitude: 76.7821,
        plantedOn: '2026-08-31',
        photoReference: undefined,
      });
      expect(successSpy).toHaveBeenCalled();
      expect(screen.getByText(/Plantation registered successfully in Pending status!/i)).toBeInTheDocument();
    });
  });

  it('should validate invalid coordinate boundaries', async () => {
    const registerSpy = vi.spyOn(treeService, 'registerPlantation');
    render(<PlantationForm />);

    expect(await screen.findByTestId('plantation-species-select')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('plantation-lat-input'), { target: { value: '100.5' } });
    fireEvent.change(screen.getByTestId('plantation-lng-input'), { target: { value: '-200.0' } });

    fireEvent.click(screen.getByTestId('submit-plantation-button'));

    expect(screen.getByText(/Latitude must be a valid number between -90 and 90/i)).toBeInTheDocument();
    expect(screen.getByText(/Longitude must be a valid number between -180 and 180/i)).toBeInTheDocument();
    expect(registerSpy).not.toHaveBeenCalled();
  });

  it('should render backend submission error when API call fails', async () => {
    vi.spyOn(treeService, 'registerPlantation').mockRejectedValueOnce({
      message: 'Database connection failed',
    });

    render(<PlantationForm />);

    expect(await screen.findByTestId('plantation-species-select')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('submit-plantation-button'));

    await waitFor(() => {
      expect(screen.getByText('Submission Failed')).toBeInTheDocument();
      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    });
  });
});
