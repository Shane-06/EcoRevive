import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Compass } from 'lucide-react';

/**
 * Creates a Leaflet DivIcon for a verified tree marker.
 */
function createTreeIcon(species) {
  return L.divIcon({
    className: 'custom-tree-pin',
    html: `
      <div class="pin-circle" title="${species || 'Tree'}">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 19V5" />
          <path d="M5 12l7-7 7 7" />
          <path d="M8 17l4-4 4 4" />
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

/**
 * Creates a Leaflet DivIcon for the user's selected location pin.
 */
function createSelectedLocationIcon() {
  return L.divIcon({
    className: 'custom-selected-pin',
    html: `
      <div class="pin-circle" title="Selected Location">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3" />
          <path d="M12 19v3" />
          <path d="M2 12h3" />
          <path d="M19 12h3" />
        </svg>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
}

/**
 * Interactive Leaflet Map Component with OpenStreetMap tiles.
 */
export default function MapView({
  trees = [],
  selectedLocation = null,
  selectedTree = null,
  onSelectLocation,
  onSelectTree,
  onViewportChange,
  center = [30.65, 76.78],
  zoom = 12,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const treeLayerRef = useRef(null);
  const selectedPinLayerRef = useRef(null);
  const isInternalMoveRef = useRef(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const treeLayer = L.layerGroup().addTo(map);
    const selectedPinLayer = L.layerGroup().addTo(map);

    treeLayerRef.current = treeLayer;
    selectedPinLayerRef.current = selectedPinLayer;
    mapInstanceRef.current = map;

    // Handle Map Clicks for Location Selection
    map.on('click', (e) => {
      const lat = parseFloat(e.latlng.lat.toFixed(6));
      const lng = parseFloat(e.latlng.lng.toFixed(6));
      if (onSelectLocation) {
        onSelectLocation({ lat, lng });
      }
    });

    // Handle Viewport Changes (Pan / Zoom)
    const handleViewportChange = () => {
      if (!onViewportChange || isInternalMoveRef.current) return;
      const bounds = map.getBounds();
      onViewportChange({
        minLat: parseFloat(bounds.getSouth().toFixed(6)),
        minLng: parseFloat(bounds.getWest().toFixed(6)),
        maxLat: parseFloat(bounds.getNorth().toFixed(6)),
        maxLng: parseFloat(bounds.getEast().toFixed(6)),
      });
    };

    map.on('moveend', handleViewportChange);

    // Initial viewport query
    handleViewportChange();

    return () => {
      map.off('moveend', handleViewportChange);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Render Tree Markers
  useEffect(() => {
    if (!treeLayerRef.current) return;
    treeLayerRef.current.clearLayers();

    trees.forEach((tree) => {
      if (typeof tree.latitude !== 'number' || typeof tree.longitude !== 'number') return;

      const marker = L.marker([tree.latitude, tree.longitude], {
        icon: createTreeIcon(tree.species),
      });

      const popupContent = document.createElement('div');
      popupContent.className = 'p-1 text-slate-100 text-xs space-y-1';
      popupContent.innerHTML = `
        <div class="font-bold text-emerald-400 text-sm">${tree.species || 'Verified Tree'}</div>
        <div class="text-slate-300 font-mono">${tree.treeId || 'ID Pending'}</div>
        <div class="text-slate-400">${tree.latitude.toFixed(4)}, ${tree.longitude.toFixed(4)}</div>
        <div class="inline-block mt-1 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold uppercase tracking-wider">
          ${tree.status || 'Verified'}
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (onSelectTree) {
          onSelectTree(tree);
        }
      });

      treeLayerRef.current.addLayer(marker);
    });
  }, [trees, onSelectTree]);

  // Render Selected Location Marker
  useEffect(() => {
    if (!selectedPinLayerRef.current) return;
    selectedPinLayerRef.current.clearLayers();

    if (selectedLocation && typeof selectedLocation.lat === 'number' && typeof selectedLocation.lng === 'number') {
      const marker = L.marker([selectedLocation.lat, selectedLocation.lng], {
        icon: createSelectedLocationIcon(),
        zIndexOffset: 1000,
      });

      marker.bindPopup(`
        <div class="p-1 text-xs text-slate-100 space-y-1">
          <div class="font-bold text-blue-400 text-sm">Selected Assessment Point</div>
          <div class="font-mono text-slate-300">${selectedLocation.lat.toFixed(5)}, ${selectedLocation.lng.toFixed(5)}</div>
          <div class="text-slate-400 text-[11px]">Ready for environmental and suitability analysis</div>
        </div>
      `);

      selectedPinLayerRef.current.addLayer(marker);
    }
  }, [selectedLocation]);

  // Center on Selected Tree or Selected Location if requested
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    const target = selectedLocation
      ? [selectedLocation.lat, selectedLocation.lng]
      : selectedTree
      ? [selectedTree.latitude, selectedTree.longitude]
      : center;
    isInternalMoveRef.current = true;
    mapInstanceRef.current.flyTo(target, 14, { duration: 1 });
    setTimeout(() => {
      isInternalMoveRef.current = false;
    }, 1200);
  };

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950">
      {/* The Leaflet map DOM node */}
      <div
        id="leaflet-map"
        data-testid="leaflet-map"
        ref={mapContainerRef}
        className="w-full h-full"
      />

      {/* Floating Map Controls Overlay */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
        <button
          type="button"
          onClick={handleRecenter}
          title="Recenter Map"
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-emerald-400 border border-slate-700/80 shadow-lg backdrop-blur transition-colors"
        >
          <Compass className="w-5 h-5" />
        </button>
      </div>

      {/* Map Information Bar Overlay */}
      <div className="absolute bottom-3 left-3 z-[400] px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800/90 shadow-md backdrop-blur text-xs flex items-center gap-3 text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            <strong className="text-white">{trees.length}</strong> verified {trees.length === 1 ? 'tree' : 'trees'} in view
          </span>
        </div>
        {selectedLocation && (
          <div className="hidden sm:flex items-center gap-1 text-slate-400 border-l border-slate-700 pl-3">
            <span>Point:</span>
            <span className="font-mono text-blue-400">
              {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
