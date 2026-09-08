import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import TreeProfileCard from '../components/trees/TreeProfileCard';
import QrCodeCard from '../components/trees/QrCodeCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';
import identityService from '../services/identity.service';

/**
 * Public Verified Tree Profile & QR Code Page (M10/M15).
 * Completely public and unauthenticated.
 */
export default function PublicTreeProfilePage() {
  const { treeId } = useParams();

  const [tree, setTree] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTreeIdentity = useCallback(async () => {
    if (!treeId) return;
    setLoading(true);
    setError(null);
    try {
      const [profileRes, qrRes] = await Promise.all([
        identityService.getPublicProfile(treeId),
        identityService.getPublicQr(treeId),
      ]);
      setTree(profileRes?.tree || null);
      setQrData(qrRes || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [treeId]);

  useEffect(() => {
    loadTreeIdentity();
  }, [loadTreeIdentity]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" message={`Retrieving public tree identity for ${treeId}...`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-12 space-y-4">
        <ErrorAlert
          title="Tree Identity Not Available"
          message={
            error.statusCode === 404
              ? `Tree record '${treeId}' was not found or has not been verified yet.`
              : error.message || 'Unable to retrieve public tree profile.'
          }
          onRetry={loadTreeIdentity}
        />
        <div className="text-center pt-2">
          <Link
            to="/map"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Interactive Map</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/map"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Map View</span>
        </Link>
        <span className="text-xs font-mono text-slate-500">Public Registry View</span>
      </div>

      {/* Main Grid: Profile (Left) + QR Code (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <TreeProfileCard tree={tree} />
        </div>

        <div className="lg:col-span-5">
          <QrCodeCard
            qrData={qrData}
            loading={false}
            error={null}
            onRefresh={loadTreeIdentity}
          />
        </div>
      </div>
    </div>
  );
}
