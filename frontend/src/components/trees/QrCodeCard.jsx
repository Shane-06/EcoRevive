import { useState } from 'react';
import { QrCode, Copy, Check, Download, ExternalLink } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';

/**
 * Public Tree QR Code & Shareable Link Component (M10/M15).
 */
export default function QrCodeCard({
  qrData = null,
  loading = false,
  error = null,
  onRefresh,
}) {
  const [copied, setCopied] = useState(false);

  if (loading) {
    return (
      <div className="p-8 rounded-3xl bg-white border border-warm-400 flex flex-col items-center justify-center min-h-[250px] shadow-card">
        <LoadingSpinner size="md" message="Loading authoritative QR code..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-3xl bg-white border border-warm-400 shadow-card">
        <ErrorAlert
          title="QR Retrieval Error"
          message={error.message || 'Unable to retrieve QR identity for this tree.'}
          onRetry={onRefresh}
        />
      </div>
    );
  }

  if (!qrData) return null;

  const { treeId, profileUrl, qrDataUrl } = qrData;

  const handleCopyLink = async () => {
    if (profileUrl) {
      try {
        await navigator.clipboard.writeText(profileUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback if clipboard API not available
      }
    }
  };

  return (
    <div data-testid="qr-code-card" className="p-6 sm:p-8 rounded-3xl bg-white border border-warm-400 shadow-card space-y-4 text-center">
      <div className="flex items-center justify-center gap-2 text-charcoal-900 font-bold font-serif text-base">
        <QrCode className="w-5 h-5 text-forest-700" />
        <span>Tree Physical Identity QR</span>
      </div>
      <p className="text-xs text-charcoal-600 max-w-sm mx-auto leading-relaxed">
        Scan this QR code in the field to open the public verified tree identity.
      </p>

      {/* QR Image Container */}
      <div className="inline-block p-4 rounded-2xl bg-white border border-warm-300 shadow-subtle mx-auto">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`QR code for ${treeId}`}
            data-testid="qr-code-image"
            className="w-48 h-48 sm:w-56 sm:h-56 mx-auto object-contain"
          />
        ) : (
          <div className="w-48 h-48 flex items-center justify-center text-charcoal-400 text-xs">
            QR unavailable
          </div>
        )}
      </div>

      {/* Tree ID Display */}
      <div>
        <span className="text-xs text-charcoal-500 font-mono">Tree ID: </span>
        <strong className="text-forest-900 font-mono text-sm">{treeId}</strong>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
        <button
          type="button"
          data-testid="copy-link-button"
          onClick={handleCopyLink}
          className="py-2 px-3.5 rounded-xl bg-warm-100 hover:bg-warm-200 border border-warm-400 text-charcoal-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-forest-700" /> : <Copy className="w-3.5 h-3.5 text-charcoal-500" />}
          <span>{copied ? 'Copied to Clipboard!' : 'Copy Profile Link'}</span>
        </button>

        {qrDataUrl && (
          <a
            href={qrDataUrl}
            download={`ecorevive-${treeId}-qr.png`}
            data-testid="download-qr-link"
            className="py-2 px-3.5 rounded-xl bg-forest-900 hover:bg-forest-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-subtle transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-forest-200" />
            <span>Download PNG</span>
          </a>
        )}
      </div>

      {profileUrl && (
        <div className="pt-2">
          <a
            href={profileUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-charcoal-500 hover:text-forest-900 underline inline-flex items-center gap-1 transition-colors"
          >
            <span>{profileUrl}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}
