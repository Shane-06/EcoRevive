import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MapView from '../components/map/MapView';
import L from 'leaflet';

vi.mock('leaflet', () => {
  const events = {};
  const map = { on: vi.fn((event, callback) => { events[event] = callback; }), off: vi.fn(), remove: vi.fn(), getBounds: () => ({ getSouth: () => 30, getWest: () => 76, getNorth: () => 31, getEast: () => 77 }) };
  return { default: {
    map: vi.fn(() => map), tileLayer: () => ({ addTo: vi.fn() }),
    layerGroup: () => ({ addTo() { return this; }, clearLayers: vi.fn(), addLayer: vi.fn() }),
    divIcon: vi.fn(), marker: () => ({ bindPopup: vi.fn() }),
    __events: events,
  } };
});

afterEach(cleanup);

describe('Leaflet click location wiring', () => {
  it('forwards the clicked latitude/longitude and uses the current callback after a render', () => {
    const first = vi.fn(), latest = vi.fn();
    const { rerender } = render(<MapView onSelectLocation={first} />);
    L.__events.click({ latlng: { lat: 30.694480768, lng: 76.835722251 } });
    expect(first).toHaveBeenCalledWith({ lat: 30.694481, lng: 76.835722 });
    rerender(<MapView onSelectLocation={latest} />);
    L.__events.click({ latlng: { lat: 28.61, lng: 77.2 } });
    expect(latest).toHaveBeenCalledWith({ lat: 28.61, lng: 77.2 });
    expect(first).toHaveBeenCalledTimes(1);
  });
});
