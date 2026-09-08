import { useState, useEffect } from 'react';
import { Sprout, MapPin, Calendar, Camera, AlertCircle, CheckCircle2 } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';
import speciesService from '../../services/species.service';
import treeService from '../../services/tree.service';

/**
 * Contributor Plantation Submission Form (M5/M15).
 * Strictly omits manual contributor ID or Tree ID generation.
 */
export default function PlantationForm({ initialCoords = null, onSuccess }) {
  const [speciesList, setSpeciesList] = useState([]);
  const [speciesLoading, setSpeciesLoading] = useState(false);

  // Form Fields
  const [species, setSpecies] = useState('Neem');
  const [latitude, setLatitude] = useState(initialCoords ? String(initialCoords.lat) : '30.6543');
  const [longitude, setLongitude] = useState(initialCoords ? String(initialCoords.lng) : '76.7821');
  const [plantedOn, setPlantedOn] = useState(new Date().toISOString().split('T')[0]);
  const [photoReference, setPhotoReference] = useState('');
  const [photoFile, setPhotoFile] = useState(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState(null);

  // Fetch species catalog on mount
  useEffect(() => {
    let mounted = true;
    const loadSpecies = async () => {
      setSpeciesLoading(true);
      try {
        const data = await speciesService.getSpeciesCatalog();
        if (mounted && data?.species?.length > 0) {
          setSpeciesList(data.species);
          setSpecies(data.species[0].name);
        }
      } catch {
        // Fallback to default canonical list if service error
        if (mounted) {
          setSpeciesList([
            { name: 'Neem' },
            { name: 'Peepal' },
            { name: 'Banyan' },
            { name: 'Arjun' },
            { name: 'Shisham' },
          ]);
        }
      } finally {
        if (mounted) setSpeciesLoading(false);
      }
    };
    loadSpecies();
    return () => {
      mounted = false;
    };
  }, []);

  // Update coordinates if initialCoords change
  useEffect(() => {
    if (initialCoords) {
      setLatitude(String(initialCoords.lat));
      setLongitude(String(initialCoords.lng));
    }
  }, [initialCoords]);

  const validateForm = () => {
    const errs = {};
    if (!species || species.trim() === '') {
      errs.species = 'Species selection is required';
    }

    const latNum = parseFloat(latitude);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      errs.latitude = 'Latitude must be a valid number between -90 and 90';
    }

    const lngNum = parseFloat(longitude);
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      errs.longitude = 'Longitude must be a valid number between -180 and 180';
    }

    if (!plantedOn || plantedOn.trim() === '') {
      errs.plantedOn = 'Planting date is required';
    } else {
      const dateObj = new Date(plantedOn);
      if (isNaN(dateObj.getTime())) {
        errs.plantedOn = 'Invalid planting date format';
      }
    }

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      let payload;
      if (photoFile) {
        payload = new FormData();
        payload.append('species', species.trim());
        payload.append('latitude', latitude.trim());
        payload.append('longitude', longitude.trim());
        payload.append('plantedOn', plantedOn.trim());
        payload.append('photo', photoFile);
      } else {
        payload = {
          species: species.trim(),
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          plantedOn: plantedOn.trim(),
          photoReference: photoReference.trim() || undefined,
        };
      }

      const result = await treeService.registerPlantation(payload);
      setSuccessMessage(`Plantation registered successfully in Pending status! Record ID: ${result.tree.id}`);

      // Reset optional inputs
      setPhotoReference('');
      setPhotoFile(null);

      if (onSuccess) {
        onSuccess(result.tree);
      }
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="plantation-form-container" className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <Sprout className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Register New Plantation</h2>
          <p className="text-xs text-slate-400">
            Submit your tree planting evidence for coordinator verification and identity issuance.
          </p>
        </div>
      </div>

      {error && (
        <ErrorAlert
          title="Submission Failed"
          message={error.message || 'Unable to register plantation. Please check the fields and try again.'}
        />
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Plantation Submitted</div>
            <div className="text-emerald-300/90 text-[11px] mt-0.5">{successMessage}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Species Selection */}
        <div>
          <label htmlFor="plantation-species" className="block text-xs font-semibold text-slate-300 mb-1.5">
            Tree Species <span className="text-emerald-400">*</span>
          </label>
          {speciesLoading ? (
            <div className="py-2">
              <LoadingSpinner size="sm" message="Loading species catalog..." />
            </div>
          ) : (
            <select
              id="plantation-species"
              data-testid="plantation-species-select"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {speciesList.map((sp) => (
                <option key={sp.name} value={sp.name} className="bg-slate-900 text-slate-100">
                  {sp.name} {sp.climateRegion ? `(${sp.climateRegion})` : ''}
                </option>
              ))}
            </select>
          )}
          {validationErrors.species && (
            <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {validationErrors.species}
            </p>
          )}
        </div>

        {/* Geographic Coordinates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="plantation-lat" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Latitude (°N) <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <input
                id="plantation-lat"
                data-testid="plantation-lat-input"
                type="text"
                placeholder="e.g. 30.6543"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <MapPin className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
            </div>
            {validationErrors.latitude && (
              <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {validationErrors.latitude}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="plantation-lng" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Longitude (°E) <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <input
                id="plantation-lng"
                data-testid="plantation-lng-input"
                type="text"
                placeholder="e.g. 76.7821"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <MapPin className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
            </div>
            {validationErrors.longitude && (
              <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {validationErrors.longitude}
              </p>
            )}
          </div>
        </div>

        {/* Plantation Date */}
        <div>
          <label htmlFor="plantation-date" className="block text-xs font-semibold text-slate-300 mb-1.5">
            Plantation Date <span className="text-emerald-400">*</span>
          </label>
          <div className="relative">
            <input
              id="plantation-date"
              data-testid="plantation-date-input"
              type="date"
              value={plantedOn}
              onChange={(e) => setPlantedOn(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <Calendar className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
          </div>
          {validationErrors.plantedOn && (
            <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {validationErrors.plantedOn}
            </p>
          )}
        </div>

        {/* Photo Evidence (Reference URL or File Upload) */}
        <div>
          <label htmlFor="plantation-photo" className="block text-xs font-semibold text-slate-300 mb-1.5">
            Photo Evidence (File Upload or Reference URL)
          </label>
          <div className="space-y-2">
            <input
              id="plantation-photo"
              data-testid="plantation-photo-input"
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
            />
            <div className="relative">
              <input
                type="text"
                placeholder="Or paste photo reference URL (e.g. uploads/tree-sample.jpg)"
                value={photoReference}
                onChange={(e) => setPhotoReference(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
              <Camera className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          data-testid="submit-plantation-button"
          disabled={submitting}
          className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2"
        >
          {submitting ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              <Sprout className="w-4 h-4" />
              <span>Submit Plantation Record</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
