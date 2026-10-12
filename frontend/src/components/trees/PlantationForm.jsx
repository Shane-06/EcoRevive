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
    <div data-testid="plantation-form-container" className="p-6 sm:p-8 rounded-3xl bg-white border border-warm-400 shadow-card space-y-5">
      <div className="flex items-center gap-3 border-b border-warm-300 pb-4">
        <div className="w-10 h-10 rounded-xl bg-forest-50 border border-forest-200 text-forest-800 flex items-center justify-center">
          <Sprout className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold font-serif text-charcoal-900">Register New Plantation</h2>
          <p className="text-xs text-charcoal-600">
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
        <div className="p-4 rounded-xl bg-forest-50 border border-forest-200 text-forest-800 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-forest-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Plantation Submitted</div>
            <div className="text-forest-700 text-[11px] mt-0.5">{successMessage}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Species Selection */}
        <div>
          <label htmlFor="plantation-species" className="block text-xs font-semibold text-charcoal-700 mb-1.5 uppercase tracking-wider">
            Tree Species <span className="text-forest-700">*</span>
          </label>
          {speciesLoading ? (
            <div className="py-2">
              <LoadingSpinner size="sm" message="Loading species catalog..." inline />
            </div>
          ) : (
            <select
              id="plantation-species"
              data-testid="plantation-species-select"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-warm-50 border border-warm-400 text-sm text-charcoal-900 font-medium focus:outline-none focus:border-forest-700"
            >
              {speciesList.map((sp) => (
                <option key={sp.name} value={sp.name} className="bg-white text-charcoal-900">
                  {sp.name} {sp.climateRegion ? `(${sp.climateRegion})` : ''}
                </option>
              ))}
            </select>
          )}
          {validationErrors.species && (
            <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {validationErrors.species}
            </p>
          )}
        </div>

        {/* Geographic Coordinates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="plantation-lat" className="block text-xs font-semibold text-charcoal-700 mb-1.5 uppercase tracking-wider">
              Latitude (°N) <span className="text-forest-700">*</span>
            </label>
            <div className="relative">
              <input
                id="plantation-lat"
                data-testid="plantation-lat-input"
                type="text"
                placeholder="e.g. 30.6543"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-warm-50 border border-warm-400 text-sm text-charcoal-900 font-mono focus:outline-none focus:border-forest-700"
              />
              <MapPin className="w-4 h-4 text-charcoal-400 absolute right-3 top-3 pointer-events-none" />
            </div>
            {validationErrors.latitude && (
              <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {validationErrors.latitude}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="plantation-lng" className="block text-xs font-semibold text-charcoal-700 mb-1.5 uppercase tracking-wider">
              Longitude (°E) <span className="text-forest-700">*</span>
            </label>
            <div className="relative">
              <input
                id="plantation-lng"
                data-testid="plantation-lng-input"
                type="text"
                placeholder="e.g. 76.7821"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-warm-50 border border-warm-400 text-sm text-charcoal-900 font-mono focus:outline-none focus:border-forest-700"
              />
              <MapPin className="w-4 h-4 text-charcoal-400 absolute right-3 top-3 pointer-events-none" />
            </div>
            {validationErrors.longitude && (
              <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {validationErrors.longitude}
              </p>
            )}
          </div>
        </div>

        {/* Plantation Date */}
        <div>
          <label htmlFor="plantation-date" className="block text-xs font-semibold text-charcoal-700 mb-1.5 uppercase tracking-wider">
            Plantation Date <span className="text-forest-700">*</span>
          </label>
          <div className="relative">
            <input
              id="plantation-date"
              data-testid="plantation-date-input"
              type="date"
              value={plantedOn}
              onChange={(e) => setPlantedOn(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-warm-50 border border-warm-400 text-sm text-charcoal-900 focus:outline-none focus:border-forest-700"
            />
            <Calendar className="w-4 h-4 text-charcoal-400 absolute right-3 top-3 pointer-events-none" />
          </div>
          {validationErrors.plantedOn && (
            <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {validationErrors.plantedOn}
            </p>
          )}
        </div>

        {/* Photo Evidence (Reference URL or File Upload) */}
        <div>
          <label htmlFor="plantation-photo" className="block text-xs font-semibold text-charcoal-700 mb-1.5 uppercase tracking-wider">
            Photo Evidence (File Upload or Reference URL)
          </label>
          <div className="space-y-2">
            <input
              id="plantation-photo"
              data-testid="plantation-photo-input"
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-charcoal-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-warm-200 file:text-charcoal-800 hover:file:bg-warm-300 cursor-pointer"
            />
            <div className="relative">
              <input
                type="text"
                placeholder="Or paste photo reference URL (e.g. uploads/tree-sample.jpg)"
                value={photoReference}
                onChange={(e) => setPhotoReference(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-warm-50 border border-warm-400 text-xs text-charcoal-900 focus:outline-none focus:border-forest-700"
              />
              <Camera className="w-3.5 h-3.5 text-charcoal-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          data-testid="submit-plantation-button"
          disabled={submitting}
          className="w-full py-3 px-4 rounded-xl bg-forest-900 hover:bg-forest-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-subtle transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <LoadingSpinner size="sm" inline message="Submitting..." />
          ) : (
            <>
              <Sprout className="w-4 h-4 text-forest-200" />
              <span>Submit Plantation Record</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
