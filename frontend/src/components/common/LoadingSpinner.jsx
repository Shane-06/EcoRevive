import { Loader2 } from 'lucide-react';

/**
 * Reusable Loading Spinner Component
 * @param {object} props
 * @param {string} [props.message='Loading...']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.fullScreen=false]
 * @param {boolean} [props.inline=false]
 */
export default function LoadingSpinner({
  message = 'Loading...',
  size = 'md',
  fullScreen = false,
  inline = false,
}) {
  const sizeClasses = {
    sm: 'w-4 h-4 text-forest-700',
    md: 'w-7 h-7 text-forest-800',
    lg: 'w-10 h-10 text-forest-900',
  };

  if (inline) {
    return (
      <span className="inline-flex items-center gap-2" data-testid="loading-spinner">
        <Loader2 className={`animate-spin ${sizeClasses[size] || sizeClasses.sm}`} />
        {message && <span className="text-xs font-medium">{message}</span>}
      </span>
    );
  }

  const containerClasses = fullScreen
    ? 'fixed inset-0 bg-warm-100/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center'
    : 'flex flex-col items-center justify-center p-6 space-y-2.5';

  return (
    <div className={containerClasses} data-testid="loading-spinner">
      <Loader2 className={`animate-spin ${sizeClasses[size] || sizeClasses.md}`} />
      {message && <p className="text-xs sm:text-sm font-medium text-charcoal-600">{message}</p>}
    </div>
  );
}
