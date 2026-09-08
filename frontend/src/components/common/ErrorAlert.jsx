import { AlertCircle, XCircle } from 'lucide-react';

/**
 * Reusable Error Alert Component
 * @param {object} props
 * @param {string} props.message - Error message string
 * @param {string} [props.title='An error occurred']
 * @param {Function} [props.onRetry] - Optional retry handler
 * @param {Function} [props.onDismiss] - Optional dismiss handler
 */
export default function ErrorAlert({
  message,
  title = 'An error occurred',
  onRetry,
  onDismiss,
}) {
  if (!message) return null;

  return (
    <div
      role="alert"
      data-testid="error-alert"
      className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 flex items-start gap-3 shadow-md my-3"
    >
      <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        {title && <h4 className="font-semibold text-red-300 mb-0.5">{title}</h4>}
        <p className="text-red-200/90 leading-relaxed">{message}</p>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2.5 px-3 py-1 bg-red-800/50 hover:bg-red-700/60 border border-red-500/40 rounded-lg text-xs font-semibold text-red-100 transition-colors"
          >
            Try again
          </button>
        )}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="text-red-400 hover:text-red-200 transition-colors p-1"
        >
          <XCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
