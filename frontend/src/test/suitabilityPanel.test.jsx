import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SuitabilityPanel from '../components/suitability/SuitabilityPanel';

describe('Milestone 14 — SuitabilityPanel Component Tests', () => {
  const createMockSuitability = ({
    species = 'Neem',
    overallStatus = 'suitable',
    overallExplanation = 'All parameters are fully compatible.',
    soilStatus = 'suitable',
    soilReason = 'Soil pH 7.0 and texture Loam are compatible.',
    sunlightStatus = 'suitable',
    sunlightReason = 'Full sunlight requirement met.',
    waterStatus = 'suitable',
    waterReason = 'Humidity supported.',
    spacingStatus = 'suitable',
    spacingReason = 'Minimum 5.0m spacing required.',
  } = {}) => ({
    species,
    location: { latitude: 30.65, longitude: 76.78 },
    overall: {
      status: overallStatus,
      explanation: overallExplanation,
    },
    checks: {
      soil: { status: soilStatus, reason: soilReason },
      sunlight: { status: sunlightStatus, reason: sunlightReason },
      water: { status: waterStatus, reason: waterReason },
      spacing: { status: spacingStatus, reason: spacingReason },
    },
  });

  it('should render loading state when loading is true', () => {
    render(<SuitabilityPanel loading={true} />);
    expect(screen.getByText(/Evaluating deterministic suitability rules/i)).toBeInTheDocument();
  });

  it('should render error state when error is passed', () => {
    render(
      <SuitabilityPanel
        error={{ message: 'Species not found in database' }}
        onAssess={() => {}}
      />
    );
    expect(screen.getByText('Suitability Assessment Error')).toBeInTheDocument();
    expect(screen.getByText('Species not found in database')).toBeInTheDocument();
  });

  it('should render initial prompt when suitability is null', () => {
    render(<SuitabilityPanel suitability={null} />);
    expect(screen.getByText('Suitability Ready')).toBeInTheDocument();
  });

  it('Status 1/4: should render "suitable" result and all 4 biological check details', () => {
    const data = createMockSuitability({
      overallStatus: 'suitable',
      overallExplanation: 'All evaluated parameters meet the baseline deterministic suitability rules.',
    });

    render(<SuitabilityPanel suitability={data} />);

    expect(screen.getByText('Species Suitability Result')).toBeInTheDocument();
    const overallBadge = screen.getByTestId('overall-status-suitable');
    expect(within(overallBadge).getByText('Suitable')).toBeInTheDocument();
    expect(screen.getByText(/All evaluated parameters meet the baseline deterministic/i)).toBeInTheDocument();

    // Check biological checks
    expect(screen.getByTestId('check-soil')).toBeInTheDocument();
    expect(screen.getByTestId('check-sunlight')).toBeInTheDocument();
    expect(screen.getByTestId('check-water')).toBeInTheDocument();
    expect(screen.getByTestId('check-spacing')).toBeInTheDocument();

    // Advisory notice
    expect(screen.getByText(/V1 Decision-Support Notice/i)).toBeInTheDocument();
  });

  it('Status 2/4: should render "moderate" result correctly', () => {
    const data = createMockSuitability({
      overallStatus: 'moderate',
      overallExplanation: 'Environmental conditions are moderately suitable for Neem.',
      soilStatus: 'moderate',
      soilReason: 'Soil pH 5.8 presents mild stress.',
    });

    render(<SuitabilityPanel suitability={data} />);

    const overallBadge = screen.getByTestId('overall-status-moderate');
    expect(within(overallBadge).getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('Soil pH 5.8 presents mild stress.')).toBeInTheDocument();
  });

  it('Status 3/4: should render "unsuitable" result correctly', () => {
    const data = createMockSuitability({
      overallStatus: 'unsuitable',
      overallExplanation: 'One or more environmental parameters are incompatible.',
      soilStatus: 'unsuitable',
      soilReason: 'Soil pH 5.2 is outside biological tolerance.',
    });

    render(<SuitabilityPanel suitability={data} />);

    const overallBadge = screen.getByTestId('overall-status-unsuitable');
    expect(within(overallBadge).getByText('Unsuitable')).toBeInTheDocument();
    expect(screen.getByText('Soil pH 5.2 is outside biological tolerance.')).toBeInTheDocument();
  });

  it('Status 4/4: should render "insufficient_data" result correctly without assuming suitability', () => {
    const data = createMockSuitability({
      overallStatus: 'insufficient_data',
      overallExplanation: 'One or more environmental data sources were unavailable.',
      soilStatus: 'insufficient_data',
      soilReason: 'Soil data unavailable from external provider.',
    });

    render(<SuitabilityPanel suitability={data} />);

    const overallBadge = screen.getByTestId('overall-status-insufficient_data');
    expect(within(overallBadge).getByText('Insufficient Data')).toBeInTheDocument();
    expect(screen.getByText('Soil data unavailable from external provider.')).toBeInTheDocument();
  });
});
