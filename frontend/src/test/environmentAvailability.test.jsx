import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import environmentService from '../services/environment.service';
import { apiClient } from '../api/client';
import MapPage from '../pages/MapPage';
import speciesService from '../services/species.service';
import suitabilityService from '../services/suitability.service';
import EnvironmentPanel from '../components/environment/EnvironmentPanel';

vi.mock('../components/map/MapView', () => ({ default: (props) => <div>
  <button onClick={() => props.onSelectLocation({ lat: 28.61, lng: 77.2 })}>Select Delhi</button>
  <button onMouseMove={() => props.onHoverLocation({ lat: 28.61, lng: 77.2 })}>Hover Delhi</button>
  <button onMouseMove={() => props.onHoverLocation({ lat: 19.07, lng: 72.87 })}>Hover Mumbai</button>
  <button onMouseLeave={() => props.onHoverLocation(null)}>Leave map</button>
</div> }));

const coords = { lat: 30.65, lng: 76.78 };
const weather = { status: 'available', source: 'Open-Meteo', verifiedAt: new Date().toISOString(), data: { temperature: 25, humidity: 65, windSpeed: 2, precipitation: 0, condition: 'Clear sky' } };
const soil = { status: 'available', source: 'ISRIC SoilGrids', verifiedAt: new Date().toISOString(), data: { ph: 7.2, clayPercentage: 23, sandPercentage: 40, siltPercentage: 37 } };
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };

beforeEach(() => { vi.restoreAllMocks(); environmentService._clearInFlight(); });
afterEach(() => { cleanup(); environmentService._clearInFlight(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Progressive environmental loading', () => {
  it('publishes weather while soil is still pending, then caches both without new requests', async () => {
    const slowSoil = deferred();
    const get = vi.spyOn(apiClient, 'get').mockImplementation((url) => url.includes('section=weather')
      ? Promise.resolve({ data: { weather } }) : slowSoil.promise);
    const updates = [];
    const result = environmentService.getEnvironment(coords, { onUpdate: (value) => updates.push(value) });
    await act(async () => {});
    expect(updates.at(-1).weather.data.temperature).toBe(25);
    expect(updates.at(-1).soil.status).toBe('loading');
    slowSoil.resolve({ data: { soil } });
    await result;
    expect(environmentService.getCachedEnvironment(coords).soil.data.ph).toBe(7.2);
    await environmentService.getEnvironment(coords);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('deduplicates simultaneous callers even when they have cancellation signals', async () => {
    const delayed = deferred();
    const get = vi.spyOn(apiClient, 'get').mockReturnValue(delayed.promise);
    const first = new AbortController();
    const second = new AbortController();
    const a = environmentService.getEnvironment(coords, { signal: first.signal }).catch((e) => e);
    const b = environmentService.getEnvironment(coords, { signal: second.signal });
    first.abort();
    expect(get.mock.calls.every((call) => !call[1].signal.aborted)).toBe(true);
    delayed.resolve({ data: { weather, soil } });
    expect((await a).name).toBe('AbortError');
    expect((await b).soil.data.ph).toBe(7.2);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('cancels both HTTP requests when the last subscriber leaves', async () => {
    const get = vi.spyOn(apiClient, 'get').mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const controller = new AbortController();
    const result = environmentService.getEnvironment(coords, { signal: controller.signal }).catch((e) => e);
    controller.abort();
    expect((await result).name).toBe('AbortError');
    expect(get.mock.calls.every((call) => call[1].signal.aborted)).toBe(true);
  });

  it('retains cached observations with timestamps when refresh fails', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { weather, soil } });
    await environmentService.getEnvironment(coords);
    get.mockRejectedValue(new Error('Service unavailable'));
    const result = await environmentService.getEnvironment(coords, { force: true });
    expect(result.weather.stale).toBe(true);
    expect(result.weather.verifiedAt).toBe(weather.verifiedAt);
    expect(result.soil.data.ph).toBe(7.2);
  });

  it('does not reuse weather older than 24 hours', async () => {
    vi.useFakeTimers();
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { weather, soil } });
    await environmentService.getEnvironment(coords);
    vi.advanceTimersByTime(86400001);
    expect(environmentService.getCachedEnvironment(coords).weather.data).toBeNull();
  });

  it('shows the completed weather section while soil loads', () => {
    render(<EnvironmentPanel loading environment={{ location: { latitude: coords.lat, longitude: coords.lng }, weather, soil: { status: 'loading' } }} />);
    expect(screen.getByText(/25 °C/)).toBeInTheDocument();
    expect(screen.getAllByText('Loading soil...').length).toBeGreaterThan(0);
    expect(screen.queryByText('Soil Provider Unavailable')).not.toBeInTheDocument();
  });
});

describe('Map hover traffic controls', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(speciesService, 'getSpeciesCatalog').mockResolvedValue({ species: [] });
    vi.spyOn(suitabilityService, 'assessSuitability').mockResolvedValue(null);
    vi.spyOn(environmentService, 'getEnvironment').mockResolvedValue({ weather, soil });
  });

  it('debounces movement, ignores repeat events within a bucket, and does not run suitability for hover', async () => {
    render(<MapPage />);
    await act(async () => {});
    const initialSuitability = suitabilityService.assessSuitability.mock.calls.length;
    fireEvent.mouseMove(screen.getByText('Hover Delhi'));
    await act(async () => { vi.advanceTimersByTime(300); });
    fireEvent.mouseMove(screen.getByText('Hover Mumbai'));
    await act(async () => { vi.advanceTimersByTime(449); });
    expect(environmentService.getEnvironment).toHaveBeenCalledTimes(1);
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(environmentService.getEnvironment).toHaveBeenCalledTimes(2);
    expect(environmentService.getEnvironment.mock.calls[1][0]).toEqual({ lat: 19.07, lng: 72.87 });
    for (let i = 0; i < 30; i++) fireEvent.mouseMove(screen.getByText('Hover Mumbai'));
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(environmentService.getEnvironment).toHaveBeenCalledTimes(2);
    expect(suitabilityService.assessSuitability).toHaveBeenCalledTimes(initialSuitability);
  });

  it('cancels a pending hover on mouse leave and unmount', async () => {
    const { unmount } = render(<MapPage />);
    await act(async () => {});
    fireEvent.mouseMove(screen.getByText('Hover Delhi'));
    fireEvent.mouseLeave(screen.getByText('Leave map'));
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(environmentService.getEnvironment).toHaveBeenCalledTimes(1);
    fireEvent.mouseMove(screen.getByText('Hover Mumbai'));
    unmount();
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(environmentService.getEnvironment).toHaveBeenCalledTimes(1);
  });

  it('performs one automatic recovery after Retry-After without polling or retrying early', async () => {
    environmentService.getEnvironment.mockResolvedValue({
      weather: { status: 'unavailable', isRateLimited: true, remainingCooldownSeconds: 60, data: null }, soil,
    });
    render(<MapPage />);
    await act(async () => {});
    await act(async () => { vi.advanceTimersByTime(60000); });
    expect(environmentService.getEnvironment).toHaveBeenCalledTimes(1);
    await act(async () => { vi.advanceTimersByTime(100); });
    expect(environmentService.getEnvironment).toHaveBeenCalledTimes(2);
    await act(async () => { vi.advanceTimersByTime(180000); });
    expect(environmentService.getEnvironment).toHaveBeenCalledTimes(2);
  });

  it('keeps the clicked location selected when the cursor moves and permits explicit hover resumption', async () => {
    render(<MapPage />);
    await act(async () => {});
    fireEvent.click(screen.getByText('Select Delhi'));
    expect(screen.getByPlaceholderText(/Lat/).value).toBe('28.61');
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(environmentService.getEnvironment.mock.calls.at(-1)[0]).toEqual({ lat: 28.61, lng: 77.2 });
    const calls = environmentService.getEnvironment.mock.calls.length;
    fireEvent.mouseMove(screen.getByText('Hover Mumbai'));
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(environmentService.getEnvironment).toHaveBeenCalledTimes(calls);
    expect(screen.getByPlaceholderText(/Lat/).value).toBe('28.61');
    expect(screen.getByText(/Selected location locked/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Resume hover preview'));
    fireEvent.mouseMove(screen.getByText('Hover Mumbai'));
    await act(async () => { vi.advanceTimersByTime(450); });
    expect(environmentService.getEnvironment.mock.calls.at(-1)[0]).toEqual({ lat: 19.07, lng: 72.87 });
  });
});
