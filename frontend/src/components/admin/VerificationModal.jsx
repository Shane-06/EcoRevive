import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, CheckCircle2, AlertOctagon, Clock, Eye, Shield, Calendar, MapPin, User, QrCode, AlertCircle } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';
import verificationService from '../../services/verification.service';

/**
 * Admin Verification Inspection & Action Modal (M9/M10/M15).
 */
export default function VerificationModal({ tree, onClose, onStatusUpdated }) {
  const [currentTree, setCurrentTree] = useState(tree);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [validationError, setValidationError] = useState(null);
  const [approvedIdentity, setApprovedIdentity] = useState(null);

  if (!currentTree) return null;

  const handleStartReview = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const result = await verificationService.startReview(currentTree.id);
      const updated = { ...currentTree, status: result.tree?.status || 'Under Review' };
      setCurrentTree(updated);
      if (onStatusUpdated) onStatusUpdated(updated);
    } catch (err) {
      setActionError(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const result = await verificationService.approveVerification(currentTree.id);
      const treeId = result.identity?.treeId || result.tree?.treeId;
      setApprovedIdentity(treeId);
      const updated = {
        ...currentTree,
        status: result.tree?.status || 'Verified',
        treeId,
      };
      setCurrentTree(updated);
      if (onStatusUpdated) onStatusUpdated(updated);
    } catch (err) {
      setActionError(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason || rejectionReason.trim() === '') {
      setValidationError('Rejection reason is mandatory and cannot be blank.');
      return;
    }
    setValidationError(null);
    setActionLoading(true);
    setActionError(null);

    try {
      const result = await verificationService.rejectVerification(currentTree.id, {
        reason: rejectionReason.trim(),
      });
      const updated = {
        ...currentTree,
        status: result.tree?.status || 'Rejected',
        rejectionReason: result.tree?.reason || rejectionReason.trim(),
      };
      setCurrentTree(updated);
      if (onStatusUpdated) onStatusUpdated(updated);
    } catch (err) {
      setActionError(err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div
      data-testid="verification-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl rounded-3xl bg-white border border-warm-400 shadow-modal overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-warm-300 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-charcoal-900 text-base">Verification Inspection</h3>
              <p className="text-[11px] font-mono text-charcoal-500">UUID: {currentTree.id}</p>
            </div>
          </div>
          <button
            type="button"
            data-testid="close-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-charcoal-500 hover:text-charcoal-900 hover:bg-warm-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {actionError && (
            <ErrorAlert
              title="Verification Action Error"
              message={actionError.message || 'Operation failed. If conflict occurred, status may have changed.'}
            />
          )}

          {/* Plantation Details Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-warm-50 border border-warm-300 space-y-1">
              <span className="text-charcoal-500">Species</span>
              <div className="font-serif font-bold text-charcoal-900 text-sm">{currentTree.species}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-warm-50 border border-warm-300 space-y-1">
              <span className="text-charcoal-500">Status</span>
              <div className="font-bold text-sm flex items-center gap-1.5">
                {currentTree.status === 'Verified' && <CheckCircle2 className="w-4 h-4 text-forest-700" />}
                {currentTree.status === 'Under Review' && <Eye className="w-4 h-4 text-blue-700" />}
                {currentTree.status === 'Pending' && <Clock className="w-4 h-4 text-amber-700" />}
                {currentTree.status === 'Rejected' && <AlertOctagon className="w-4 h-4 text-rose-700" />}
                <span className="text-charcoal-900">{currentTree.status}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-warm-50 border border-warm-300 space-y-1">
              <span className="text-charcoal-500 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-charcoal-400" /> Contributor
              </span>
              <div className="font-medium text-charcoal-800">{currentTree.contributor?.name || 'Contributor User'}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-warm-50 border border-warm-300 space-y-1">
              <span className="text-charcoal-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-charcoal-400" /> Planted Date
              </span>
              <div className="font-mono text-charcoal-800">{currentTree.plantedOn}</div>
            </div>

            <div className="col-span-1 sm:col-span-2 p-3.5 rounded-xl bg-warm-50 border border-warm-300 space-y-1">
              <span className="text-charcoal-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-700" /> Geographic Coordinates
              </span>
              <div className="font-mono text-charcoal-800 text-xs">
                Latitude: {currentTree.latitude?.toFixed(6)}°N | Longitude: {currentTree.longitude?.toFixed(6)}°E
              </div>
            </div>
          </div>

          {/* Photo Evidence Preview */}
          <div className="p-4 rounded-xl bg-warm-50 border border-warm-300 space-y-2">
            <h4 className="font-semibold text-charcoal-700 text-xs uppercase tracking-wider">Photo Evidence</h4>
            {currentTree.photoReference ? (
              <div className="p-3 rounded-lg bg-white border border-warm-300 text-xs text-charcoal-800 break-all font-mono">
                {currentTree.photoReference}
              </div>
            ) : (
              <p className="text-xs text-charcoal-500 italic">No external photo reference provided.</p>
            )}
          </div>

          {/* STATE-BASED ACTIONS */}

          {/* 1. If Pending -> Action: Start Review */}
          {currentTree.status === 'Pending' && (
            <div className="p-4 rounded-2xl bg-[#fef9ed] border border-[#f0dda2] space-y-3">
              <div className="flex items-center gap-2 text-[#855b11] text-xs font-semibold">
                <Clock className="w-4 h-4 text-[#855b11]" />
                <span>This submission is Pending review by coordinator.</span>
              </div>
              <button
                type="button"
                data-testid="start-review-button"
                disabled={actionLoading}
                onClick={handleStartReview}
                className="w-full py-2.5 px-4 rounded-xl bg-forest-900 hover:bg-forest-800 text-white text-xs font-semibold shadow-subtle transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? <LoadingSpinner size="sm" inline message="Locking..." /> : <><Eye className="w-4 h-4 text-forest-200" /><span>Start Review (Lock for Verification)</span></>}
              </button>
            </div>
          )}

          {/* 2. If Under Review -> Actions: Approve OR Reject */}
          {currentTree.status === 'Under Review' && (
            <div className="space-y-4">
              {/* Approval Box */}
              <div className="p-4 rounded-2xl bg-[#edf7ee] border border-[#b4dbbe] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#194c25] text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-[#194c25]" />
                    <span>Approve Verification & Issue Tree ID</span>
                  </div>
                </div>
                <p className="text-[11px] text-charcoal-600">
                  Approving will atomically lock the record, assign a permanent authoritative Tree ID, and mark the tree as Verified.
                </p>
                <button
                  type="button"
                  data-testid="approve-verification-button"
                  disabled={actionLoading}
                  onClick={handleApprove}
                  className="w-full py-2.5 px-4 rounded-xl bg-forest-900 hover:bg-forest-800 text-white text-xs font-semibold shadow-subtle transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? <LoadingSpinner size="sm" inline message="Approving..." /> : <><CheckCircle2 className="w-4 h-4 text-forest-200" /><span>Confirm Approval</span></>}
                </button>
              </div>

              {/* Rejection Form */}
              <form onSubmit={handleReject} className="p-4 rounded-2xl bg-[#fdf2f2] border border-[#f6c6c6] space-y-3">
                <div className="flex items-center gap-2 text-[#992222] text-xs font-bold">
                  <AlertOctagon className="w-4 h-4 text-[#b91c1c]" />
                  <span>Reject Verification</span>
                </div>
                <div>
                  <label htmlFor="rejection-reason" className="block text-[11px] font-semibold text-charcoal-700 mb-1">
                    Mandatory Rejection Reason <span className="text-rose-700">*</span>
                  </label>
                  <textarea
                    id="rejection-reason"
                    data-testid="rejection-reason-textarea"
                    rows={2}
                    placeholder="Provide specific feedback (e.g. Photo evidence is too blurry to identify species)."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#e5a8a8] text-xs text-charcoal-900 focus:outline-none focus:border-rose-600"
                  />
                  {validationError && (
                    <p className="text-[11px] text-rose-700 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {validationError}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  data-testid="reject-verification-button"
                  disabled={actionLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold shadow-subtle transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? <LoadingSpinner size="sm" inline message="Rejecting..." /> : <><AlertOctagon className="w-4 h-4 text-rose-200" /><span>Confirm Rejection</span></>}
                </button>
              </form>
            </div>
          )}

          {/* 3. If Verified -> Display Authoritative Tree ID */}
          {currentTree.status === 'Verified' && (
            <div data-testid="verified-success-box" className="p-5 rounded-2xl bg-[#edf7ee] border border-[#b4dbbe] space-y-3">
              <div className="flex items-center gap-2 text-[#194c25] font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-forest-700" />
                <span>Authoritative Tree Identity Issued!</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-[#b4dbbe] flex items-center justify-between">
                <span className="text-xs text-charcoal-600 font-sans">Permanent Tree ID:</span>
                <span data-testid="authoritative-tree-id-display" className="text-base font-bold font-mono text-forest-900">
                  {currentTree.treeId || approvedIdentity || 'ER-PLT-VERIFIED'}
                </span>
              </div>
              {(currentTree.treeId || approvedIdentity) && (
                <div className="pt-1">
                  <Link
                    to={`/tree/${encodeURIComponent(currentTree.treeId || approvedIdentity)}`}
                    className="w-full py-2 px-3 rounded-xl bg-forest-900 hover:bg-forest-800 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-subtle transition-colors"
                  >
                    <QrCode className="w-4 h-4 text-forest-200" />
                    <span>Open Public Profile & QR Identity</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* 4. If Rejected -> Display Reason */}
          {currentTree.status === 'Rejected' && (
            <div className="p-4 rounded-2xl bg-[#fdf2f2] border border-[#f6c6c6] space-y-2">
              <div className="flex items-center gap-2 text-[#992222] font-bold text-xs">
                <AlertOctagon className="w-4 h-4 text-[#b91c1c]" />
                <span>Verification Rejected</span>
              </div>
              <p className="text-xs text-[#7f1d1d] leading-relaxed pl-6">
                Reason: {currentTree.rejectionReason || currentTree.reason || 'Plantation verification was rejected.'}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-warm-300 bg-warm-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-warm-400 hover:bg-warm-100 text-charcoal-700 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
