import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SpeciesSelector from '../components/species/SpeciesSelector';

describe('Milestone 14 — SpeciesSelector Component Tests', () => {
  const mockSpeciesList = [
    {
      name: 'Neem',
      soilType: 'Well-drained loam',
      minSpacingMeters: 5.0,
      sunlight: 'Full Sun',
      waterNeed: 'Low-Moderate',
      climateRegion: 'Tropical / Subtropical',
    },
    {
      name: 'Peepal',
      soilType: 'Deep loam',
      minSpacingMeters: 8.0,
      sunlight: 'Full Sun',
      waterNeed: 'Moderate',
      climateRegion: 'Subtropical',
    },
  ];

  it('should render loading state when loading is true', () => {
    render(<SpeciesSelector loading={true} />);
    expect(screen.getByText(/Loading species catalog from database/i)).toBeInTheDocument();
  });

  it('should render error alert when error is passed', () => {
    render(<SpeciesSelector error={{ message: 'Catalog offline' }} onRetry={() => {}} />);
    expect(screen.getByText('Catalog Error')).toBeInTheDocument();
    expect(screen.getByText('Catalog offline')).toBeInTheDocument();
  });

  it('should render canonical species dropdown and selected species biological profile', () => {
    render(
      <SpeciesSelector
        speciesList={mockSpeciesList}
        selectedSpecies="Neem"
        onSelectSpecies={() => {}}
      />
    );

    expect(screen.getByText(/2 canonical species/i)).toBeInTheDocument();
    expect(screen.getByTestId('species-select')).toBeInTheDocument();
    expect(screen.getByText('Well-drained loam')).toBeInTheDocument();
    expect(screen.getByText('5m')).toBeInTheDocument();
    expect(screen.getByText('Full Sun')).toBeInTheDocument();
    expect(screen.getByText('Low-Moderate')).toBeInTheDocument();
    expect(screen.getByText('Tropical / Subtropical')).toBeInTheDocument();
  });

  it('should call onSelectSpecies when a different species is chosen', () => {
    const selectSpy = vi.fn();
    render(
      <SpeciesSelector
        speciesList={mockSpeciesList}
        selectedSpecies="Neem"
        onSelectSpecies={selectSpy}
      />
    );

    fireEvent.change(screen.getByTestId('species-select'), { target: { value: 'Peepal' } });
    expect(selectSpy).toHaveBeenCalledWith('Peepal');
  });
});
