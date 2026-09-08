import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MapPage from '../pages/MapPage';
import mapService from '../services/map.service';
import environmentService from '../services/environment.service';
import speciesService from '../services/species.service';
import suitabilityService from '../services/suitability.service';

describe('Milestone 14 — MapPage End-to-End Integration Tests', () => {
  const mockSpeciesCatalog = {
    species: [
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
    ],
  };

  const mockEnvironmentData = {
    location: { latitude: 30.65, longitude: 76.78 },
    weather: {
      status: 'available',
      source: 'Open-Meteo',
      data: {
        temperature: 28.5,
        temperatureUnit: '°C',
        humidity: 58,
        humidityUnit: '%',
        windSpeed: 10.5,
        windSpeedUnit: 'km/h',
        condition: 'Clear sky',
        forecast: { maxTemp: 33.0, minTemp: 22.0 },
      },
    },
    soil: {
      status: 'available',
      source: 'ISRIC SoilGrids',
      data: {
        ph: 7.1,
        texture: 'Loam',
        clayPercentage: 20.0,
        sandPercentage: 45.0,
        siltPercentage: 35.0,
        organicCarbon: 15.0,
      },
    },
  };

  const mockSuitabilityData = {
    species: 'Neem',
    location: { latitude: 30.65, longitude: 76.78 },
    overall: {
      status: 'suitable',
      explanation: 'All environmental parameters meet baseline deterministic rules.',
    },
    checks: {
      soil: { status: 'suitable', reason: 'pH 7.1 and Loam texture are compatible.' },
      sunlight: { status: 'suitable', reason: 'Full sun supported.' },
      water: { status: 'suitable', reason: 'Supported humidity.' },
      spacing: { status: 'suitable', reason: '5.0m spacing required.' },
    },
  };

  const mockTreeViewportData = {
    trees: [
      {
        treeId: 'TRE-2026-00001',
        species: 'Neem',
        latitude: 30.65,
        longitude: 76.78,
        status: 'Verified',
      },
    ],
    pagination: { total: 1, page: 1, pageSize: 50, totalPages: 1 },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(speciesService, 'getSpeciesCatalog').mockResolvedValue(mockSpeciesCatalog);
    vi.spyOn(environmentService, 'getEnvironment').mockResolvedValue(mockEnvironmentData);
    vi.spyOn(suitabilityService, 'assessSuitability').mockResolvedValue(mockSuitabilityData);
    vi.spyOn(mapService, 'getTreesInViewport').mockResolvedValue(mockTreeViewportData);
  });

  it('should render the MapPage with title, search bar, and map container', async () => {
    render(<MapPage />);

    expect(screen.getByText('Environmental Map & Information')).toBeInTheDocument();
    expect(screen.getByTestId('leaflet-map')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Lat/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Lng/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(speciesService.getSpeciesCatalog).toHaveBeenCalled();
      expect(environmentService.getEnvironment).toHaveBeenCalled();
      expect(suitabilityService.assessSuitability).toHaveBeenCalled();
    });
  });

  it('should render environment data when environment tab is active', async () => {
    render(<MapPage />);

    await waitFor(() => {
      expect(screen.getByText('Atmospheric Weather')).toBeInTheDocument();
      expect(screen.getByText('28.5 °C')).toBeInTheDocument();
      expect(screen.getByText('58 %')).toBeInTheDocument();
      expect(screen.getByText('Soil Properties (0–5cm)')).toBeInTheDocument();
      expect(screen.getByText('7.1')).toBeInTheDocument();
    });
  });

  it('should switch to Suitability tab and display deterministic evaluation', async () => {
    render(<MapPage />);

    await waitFor(() => {
      expect(screen.getByText('Atmospheric Weather')).toBeInTheDocument();
    });

    const suitabilityTabBtn = screen.getByRole('button', { name: /suitability/i });
    fireEvent.click(suitabilityTabBtn);

    await waitFor(() => {
      expect(screen.getByTestId('suitability-panel')).toBeInTheDocument();
      expect(screen.getByTestId('overall-status-suitable')).toBeInTheDocument();
      expect(screen.getByText(/pH 7.1 and Loam texture are compatible/i)).toBeInTheDocument();
    });
  });

  it('should switch to Species tab and display species catalog overview', async () => {
    render(<MapPage />);

    await waitFor(() => {
      expect(screen.getByText('Atmospheric Weather')).toBeInTheDocument();
    });

    const speciesTabBtn = screen.getByRole('button', { name: /species/i });
    fireEvent.click(speciesTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Species Catalog Overview')).toBeInTheDocument();
      expect(screen.getByText(/EcoRevive supports 10 canonical native tree species/i)).toBeInTheDocument();
    });
  });

  it('should validate invalid coordinate inputs in search form', async () => {
    render(<MapPage />);

    await waitFor(() => {
      expect(screen.getByText('Atmospheric Weather')).toBeInTheDocument();
    });

    const latInput = screen.getByPlaceholderText(/Lat/i);
    const assessBtn = screen.getByRole('button', { name: /assess/i });

    // Enter out-of-range latitude (e.g. 120)
    fireEvent.change(latInput, { target: { value: '120' } });
    fireEvent.click(assessBtn);

    expect(screen.getByText(/Latitude must be a valid number between -90 and 90/i)).toBeInTheDocument();
  });

  it('should update location and trigger environment/suitability queries on valid coordinate submit', async () => {
    render(<MapPage />);

    await waitFor(() => {
      expect(screen.getByText('Atmospheric Weather')).toBeInTheDocument();
    });

    const latInput = screen.getByPlaceholderText(/Lat/i);
    const lngInput = screen.getByPlaceholderText(/Lng/i);
    const assessBtn = screen.getByRole('button', { name: /assess/i });

    fireEvent.change(latInput, { target: { value: '28.61' } });
    fireEvent.change(lngInput, { target: { value: '77.20' } });
    fireEvent.click(assessBtn);

    await waitFor(() => {
      expect(environmentService.getEnvironment).toHaveBeenCalledWith({ lat: 28.61, lng: 77.2 });
      expect(suitabilityService.assessSuitability).toHaveBeenCalledWith({
        lat: 28.61,
        lng: 77.2,
        species: 'Neem',
      });
    });
  });
});
