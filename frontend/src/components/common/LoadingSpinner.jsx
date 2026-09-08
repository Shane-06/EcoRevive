import { Loader2 } from 'lucide-react';

/**
 * Reusable Loading Spinner Component
 * @param {object} props
 * @param {string} [props.message='Loading...']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.fullScreen=false]
 */
export default function LoadingSpinner({
  message = 'Loading...',
  size = 'md',
  fullScreen = false,
}) {
  const sizeClasses = {
    sm: 'w-5 h-5 text-emerald-500',
    md: 'w-8 h-8 text-emerald-500',
    lg: 'w-12 h-12 text-emerald-400',
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center'
    : 'flex flex-col items-center justify-center p-6 space-y-3';

  return (
    <div className={containerClasses} data-testid="loading-spinner">
      <Loader2 className={`animate-spin ${sizeClasses[size] || sizeClasses.md}`} />
      {message && <p className="text-sm font-medium text-slate-300">{message}</p>}
    </div>
  );
}
