import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import EnvironmentPanel from '../components/environment/EnvironmentPanel';

describe('Milestone 14 — EnvironmentPanel Component Tests', () => {
  const mockFullEnvironment = {
    location: { latitude: 30.65, longitude: 76.78 },
    weather: {
      status: 'available',
      source: 'Open-Meteo',
      data: {
        temperature: 29.4,
        temperatureUnit: '°C',
        humidity: 62,
        humidityUnit: '%',
        precipitation: 0.0,
        precipitationUnit: 'mm',
        windSpeed: 11.8,
        windSpeedUnit: 'km/h',
        condition: 'Clear sky',
        forecast: { maxTemp: 34.5, minTemp: 24.0, precipitationSum: 0.0 },
      },
    },
    soil: {
      status: 'available',
      source: 'ISRIC SoilGrids',
      data: {
        ph: 7.2,
        texture: 'Loam',
        clayPercentage: 22.0,
        sandPercentage: 45.0,
        siltPercentage: 33.0,
        organicCarbon: 14.0,
        organicCarbonUnit: 'g/kg',
      },
    },
  };

  it('should render loading state when loading is true', () => {
    render(<EnvironmentPanel loading={true} />);
    expect(screen.getByText(/Fetching normalized environmental metrics/i)).toBeInTheDocument();
  });

  it('should render error state when error is passed', () => {
    render(
      <EnvironmentPanel
        error={{ message: 'External provider unreachable' }}
        onRefresh={() => {}}
      />
    );
    expect(screen.getByText('Environmental Service Error')).toBeInTheDocument();
    expect(screen.getByText('External provider unreachable')).toBeInTheDocument();
  });

  it('should render placeholder prompt when no environment data is present', () => {
    render(<EnvironmentPanel environment={null} />);
    expect(screen.getByText('No Location Selected')).toBeInTheDocument();
  });

  it('should render full environmental metrics when both weather and soil succeed', () => {
    render(<EnvironmentPanel environment={mockFullEnvironment} />);

    expect(screen.getByText('Environmental Assessment')).toBeInTheDocument();
    expect(screen.getByText(/30.6500° N, 76.7800° E/i)).toBeInTheDocument();

    // Weather metrics
    expect(screen.getByText('29.4 °C')).toBeInTheDocument();
    expect(screen.getByText('62 %')).toBeInTheDocument();
    expect(screen.getByText('11.8 km/h')).toBeInTheDocument();
    expect(screen.getByText('Clear sky')).toBeInTheDocument();
    expect(screen.getByText(/Available \(Open-Meteo\)/i)).toBeInTheDocument();

    // Soil metrics
    expect(screen.getByText('7.2')).toBeInTheDocument();
    expect(screen.getByText('Loam')).toBeInTheDocument();
    expect(screen.getByText('14 g/kg')).toBeInTheDocument();
    expect(screen.getByText(/Available \(ISRIC SoilGrids\)/i)).toBeInTheDocument();
  });

  it('Partial Provider Failure: should handle weather available and soil unavailable gracefully', () => {
    const partialEnv = {
      ...mockFullEnvironment,
      soil: {
        status: 'unavailable',
        source: 'ISRIC SoilGrids',
        data: null,
        error: 'SoilGrids service temporarily unavailable',
      },
    };

    render(<EnvironmentPanel environment={partialEnv} />);

    // Weather should still be visible and available
    expect(screen.getByText('29.4 °C')).toBeInTheDocument();
    expect(screen.getByText(/Available \(Open-Meteo\)/i)).toBeInTheDocument();

    // Soil should show unavailable warning
    expect(screen.getByText('Soil Provider Unavailable')).toBeInTheDocument();
    expect(screen.getByText('SoilGrids service temporarily unavailable')).toBeInTheDocument();
  });

  it('Partial Provider Failure: should handle weather unavailable and soil available gracefully', () => {
    const partialEnv = {
      ...mockFullEnvironment,
      weather: {
        status: 'unavailable',
        source: 'Open-Meteo',
        data: null,
        error: 'Open-Meteo request timed out',
      },
    };

    render(<EnvironmentPanel environment={partialEnv} />);

    // Weather should show unavailable warning
    expect(screen.getByText('Weather Provider Unavailable')).toBeInTheDocument();
    expect(screen.getByText('Open-Meteo request timed out')).toBeInTheDocument();

    // Soil should still be available
    expect(screen.getByText('7.2')).toBeInTheDocument();
    expect(screen.getByText(/Available \(ISRIC SoilGrids\)/i)).toBeInTheDocument();
  });
});
