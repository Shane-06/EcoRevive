import { useState } from 'react';
import { FROZEN_HEALTH_STATUSES } from '../../utils/constants';
import healthService from '../../services/health.service';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';
import { Activity, Camera, FileText, CheckCircle2, AlertTriangle, Skull, HeartPulse } from 'lucide-react';

/**
 * Caretaker Health Log Submission Form Component (M11/M16).
 * Strictly restricts status to 4 frozen values and guarantees server-authoritative timestamps.
 */
export default function HealthLogForm({ defaultTreeId = '', onSuccess, onTreeChange }) {
  const [treeId, setTreeId] = useState(defaultTreeId);
  const [healthStatus, setHealthStatus] = useState('Healthy');
  const [notes, setNotes] = useState('');
  const [photoReference, setPhotoReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState(null);

  const handleTreeIdChange = (e) => {
    const val = e.target.value.trim().toUpperCase();
    setTreeId(val);
    setValidationErrors((prev) => ({ ...prev, treeId: null }));
    if (onTreeChange) onTreeChange(val);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Healthy':
        return <HeartPulse className="w-4 h-4 text-forest-700" />;
      case 'Good':
        return <CheckCircle2 className="w-4 h-4 text-blue-700" />;
      case 'Needs Attention':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'Dead':
        return <Skull className="w-4 h-4 text-rose-600" />;
      default:
        return <Activity className="w-4 h-4 text-charcoal-500" />;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const errors = {};
    if (!treeId || treeId.trim() === '') {
      errors.treeId = 'Tree ID is required (e.g. ER-PLT-00001)';
    }

    if (!healthStatus || !FROZEN_HEALTH_STATUSES.includes(healthStatus)) {
      errors.healthStatus = `Health status must be one of: ${FROZEN_HEALTH_STATUSES.join(', ')}`;
    }

    if (notes && notes.length > 1000) {
      errors.notes = 'Notes must not exceed 1000 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);
    try {
      // NOTE: We strictly do NOT send recorded_at, created_at, or submitted_by.
      // Server determines timestamps and caretaker identity from JWT.
      const payload = {
        healthStatus,
        notes: notes.trim() || undefined,
        photoReference: photoReference.trim() || undefined,
      };

      const result = await healthService.createHealthLog(treeId.trim(), payload);
      setSuccessMessage(`Health observation successfully recorded for tree ${treeId}!`);
      setNotes('');
      setPhotoReference('');
      if (onSuccess) {
        onSuccess(result?.healthLog);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      data-testid="health-log-form"
      onSubmit={handleSubmit}
      className="p-6 sm:p-7 rounded-3xl bg-white border border-warm-400 shadow-card space-y-5"
    >
      <div className="flex items-center gap-3 border-b border-warm-300 pb-4">
        <div className="w-10 h-10 rounded-xl bg-forest-50 border border-forest-200 text-forest-800 flex items-center justify-center">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold font-serif text-charcoal-900">Record Health Observation</h3>
          <p className="text-xs text-charcoal-600">
            Submit an on-site health inspection for a verified tree.
          </p>
        </div>
      </div>

      {error && (
        <ErrorAlert
          title="Health Log Submission Failed"
          message={
            error.statusCode === 409
              ? 'Cannot submit health log: the specified tree is unverified or has no permanent Tree ID.'
              : error.statusCode === 404
              ? `Tree record '${treeId}' was not found.`
              : error.message || 'Failed to submit health observation log.'
          }
        />
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-forest-50 border border-forest-200 text-forest-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-forest-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tree ID Input */}
      <div className="space-y-1.5">
        <label htmlFor="health-tree-id" className="block text-xs font-semibold text-charcoal-700 uppercase tracking-wider">
          Authoritative Tree ID <span className="text-rose-600">*</span>
        </label>
        <input
          id="health-tree-id"
          data-testid="health-tree-id-input"
          type="text"
          value={treeId}
          onChange={handleTreeIdChange}
          placeholder="e.g. ER-PLT-00001"
          disabled={loading}
          className="w-full px-4 py-2.5 rounded-xl bg-warm-50 border border-warm-400 text-charcoal-900 placeholder-charcoal-400 font-mono text-sm focus:outline-none focus:border-forest-700 disabled:opacity-50"
        />
        {validationErrors.treeId && (
          <p className="text-xs text-rose-600">{validationErrors.treeId}</p>
        )}
      </div>

      {/* Health Status Selector (4 Frozen Statuses) */}
      <div className="space-y-1.5">
        <label htmlFor="health-status-select" className="block text-xs font-semibold text-charcoal-700 uppercase tracking-wider">
          Observed Health Status <span className="text-rose-600">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FROZEN_HEALTH_STATUSES.map((status) => {
            const isSelected = healthStatus === status;
            return (
              <button
                key={status}
                type="button"
                data-testid={`health-status-option-${status.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => {
                  setHealthStatus(status);
                  setValidationErrors((prev) => ({ ...prev, healthStatus: null }));
                }}
                disabled={loading}
                className={`flex items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  isSelected
                    ? status === 'Healthy'
                      ? 'bg-[#edf7ee] border-[#b4dbbe] text-[#194c25] ring-2 ring-[#b4dbbe]/50'
                      : status === 'Good'
                      ? 'bg-[#eff6ff] border-[#bfdbfe] text-[#1e40af] ring-2 ring-[#bfdbfe]/50'
                      : status === 'Needs Attention'
                      ? 'bg-[#fef9ed] border-[#f0dda2] text-[#855b11] ring-2 ring-[#f0dda2]/50'
                      : 'bg-[#fdf2f2] border-[#f6c6c6] text-[#992222] ring-2 ring-[#f6c6c6]/50'
                    : 'bg-warm-50 border-warm-300 text-charcoal-600 hover:text-charcoal-900 hover:border-warm-400'
                }`}
              >
                {getStatusIcon(status)}
                <span>{status}</span>
              </button>
            );
          })}
        </div>
        {validationErrors.healthStatus && (
          <p className="text-xs text-rose-600">{validationErrors.healthStatus}</p>
        )}
      </div>

      {/* Notes Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="health-notes" className="block text-xs font-semibold text-charcoal-700 uppercase tracking-wider">
            Observation Notes <span className="text-charcoal-500 lowercase font-normal">(optional)</span>
          </label>
          <span className="text-[10px] text-charcoal-400 font-mono">{notes.length}/1000</span>
        </div>
        <div className="relative">
          <textarea
            id="health-notes"
            data-testid="health-notes-input"
            rows={3}
            value={notes}
            maxLength={1000}
            onChange={(e) => {
              setNotes(e.target.value);
              setValidationErrors((prev) => ({ ...prev, notes: null }));
            }}
            placeholder="Document canopy condition, leaf discoloration, moisture, or insect signs..."
            disabled={loading}
            className="w-full px-4 py-2.5 rounded-xl bg-warm-50 border border-warm-400 text-charcoal-900 placeholder-charcoal-400 text-xs sm:text-sm focus:outline-none focus:border-forest-700 disabled:opacity-50 resize-none"
          />
        </div>
        {validationErrors.notes && (
          <p className="text-xs text-rose-600">{validationErrors.notes}</p>
        )}
      </div>

      {/* Photo Reference Input */}
      <div className="space-y-1.5">
        <label htmlFor="health-photo-ref" className="block text-xs font-semibold text-charcoal-700 uppercase tracking-wider">
          Inspection Photo Reference <span className="text-charcoal-500 lowercase font-normal">(optional)</span>
        </label>
        <div className="relative">
          <Camera className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-3" />
          <input
            id="health-photo-ref"
            data-testid="health-photo-ref-input"
            type="text"
            value={photoReference}
            onChange={(e) => setPhotoReference(e.target.value)}
            placeholder="e.g. uploads/inspection-canopy-2026.jpg or image URL"
            disabled={loading}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-warm-50 border border-warm-400 text-charcoal-900 placeholder-charcoal-400 text-xs sm:text-sm focus:outline-none focus:border-forest-700 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          data-testid="submit-health-log-btn"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-forest-900 hover:bg-forest-800 text-white font-semibold text-sm shadow-subtle flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? (
            <LoadingSpinner size="sm" message="Submitting observation..." inline />
          ) : (
            <>
              <FileText className="w-4 h-4 text-forest-200" />
              <span>Submit Health Observation</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
