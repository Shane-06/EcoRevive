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
        return <HeartPulse className="w-4 h-4 text-emerald-400" />;
      case 'Good':
        return <CheckCircle2 className="w-4 h-4 text-teal-400" />;
      case 'Needs Attention':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'Dead':
        return <Skull className="w-4 h-4 text-rose-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
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
      className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5"
    >
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Record Health Observation</h3>
          <p className="text-xs text-slate-400">
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
        <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tree ID Input */}
      <div className="space-y-1.5">
        <label htmlFor="health-tree-id" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Authoritative Tree ID <span className="text-rose-400">*</span>
        </label>
        <input
          id="health-tree-id"
          data-testid="health-tree-id-input"
          type="text"
          value={treeId}
          onChange={handleTreeIdChange}
          placeholder="e.g. ER-PLT-00001"
          disabled={loading}
          className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/50 disabled:opacity-50"
        />
        {validationErrors.treeId && (
          <p className="text-xs text-rose-400">{validationErrors.treeId}</p>
        )}
      </div>

      {/* Health Status Selector (4 Frozen Statuses) */}
      <div className="space-y-1.5">
        <label htmlFor="health-status-select" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Observed Health Status <span className="text-rose-400">*</span>
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
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  isSelected
                    ? status === 'Healthy'
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30'
                      : status === 'Good'
                      ? 'bg-teal-950/80 border-teal-500 text-teal-300 ring-2 ring-teal-500/30'
                      : status === 'Needs Attention'
                      ? 'bg-amber-950/80 border-amber-500 text-amber-300 ring-2 ring-amber-500/30'
                      : 'bg-rose-950/80 border-rose-500 text-rose-300 ring-2 ring-rose-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {getStatusIcon(status)}
                <span>{status}</span>
              </button>
            );
          })}
        </div>
        {validationErrors.healthStatus && (
          <p className="text-xs text-rose-400">{validationErrors.healthStatus}</p>
        )}
      </div>

      {/* Notes Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="health-notes" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Observation Notes <span className="text-slate-500 lowercase">(optional)</span>
          </label>
          <span className="text-[10px] text-slate-500">{notes.length}/1000</span>
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
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/50 disabled:opacity-50 resize-none"
          />
        </div>
        {validationErrors.notes && (
          <p className="text-xs text-rose-400">{validationErrors.notes}</p>
        )}
      </div>

      {/* Photo Reference Input */}
      <div className="space-y-1.5">
        <label htmlFor="health-photo-ref" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Inspection Photo Reference <span className="text-slate-500 lowercase">(optional)</span>
        </label>
        <div className="relative">
          <Camera className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            id="health-photo-ref"
            data-testid="health-photo-ref-input"
            type="text"
            value={photoReference}
            onChange={(e) => setPhotoReference(e.target.value)}
            placeholder="e.g. uploads/inspection-canopy-2026.jpg or image URL"
            disabled={loading}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/50 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          data-testid="submit-health-log-btn"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm shadow-lg shadow-teal-950/40 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? (
            <LoadingSpinner size="sm" message="Submitting observation..." inline />
          ) : (
            <>
              <FileText className="w-4 h-4" />
              <span>Submit Health Observation</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
