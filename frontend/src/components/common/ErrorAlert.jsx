import { AlertCircle, X } from 'lucide-react';

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
      className="p-4 rounded-xl bg-[#fdf2f2] border border-[#f5c6c6] text-[#7a1f1f] flex items-start gap-3 my-3 shadow-subtle"
    >
      <AlertCircle className="w-5 h-5 text-[#b91c1c] shrink-0 mt-0.5" />
      <div className="flex-1 text-xs sm:text-sm">
        {title && <h4 className="font-semibold text-[#991b1b] mb-0.5">{title}</h4>}
        <p className="text-[#7f1d1d] leading-relaxed">{message}</p>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2.5 px-3 py-1 bg-white hover:bg-[#fae6e6] border border-[#e5a8a8] rounded-lg text-xs font-semibold text-[#991b1b] transition-colors shadow-subtle"
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
          className="text-[#991b1b] hover:text-[#7f1d1d] transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
