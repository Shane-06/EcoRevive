import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';

/**
 * Reusable Not Found Component
 * @param {object} props
 * @param {string} [props.title='Page Not Found']
 * @param {string} [props.message='The page you are looking for does not exist or has been moved.']
 * @param {string} [props.returnPath='/']
 * @param {string} [props.returnLabel='Return to Home']
 */
export default function NotFound({
  title = 'Page Not Found',
  message = 'The page you are looking for does not exist or has been moved.',
  returnPath = '/',
  returnLabel = 'Return to Home',
}) {
  return (
    <div
      data-testid="not-found-state"
      className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6"
    >
      <div className="w-14 h-14 bg-warm-200 border border-warm-400 rounded-2xl flex items-center justify-center text-forest-800 mb-5 shadow-subtle">
        <Compass className="w-7 h-7" />
      </div>
      <h1 className="text-3xl font-bold text-charcoal-900 font-serif tracking-tight mb-2">{title}</h1>
      <p className="text-charcoal-600 max-w-md mb-6 text-sm leading-relaxed">{message}</p>
      <Link
        to={returnPath}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-forest-900 hover:bg-forest-800 text-white rounded-xl text-sm font-semibold shadow-subtle transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {returnLabel}
      </Link>
    </div>
  );
}
