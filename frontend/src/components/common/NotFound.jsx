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
      <div className="w-16 h-16 bg-slate-800/80 border border-slate-700 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 shadow-xl">
        <Compass className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold text-slate-100 tracking-tight mb-2">{title}</h1>
      <p className="text-slate-400 max-w-md mb-8 text-sm leading-relaxed">{message}</p>
      <Link
        to={returnPath}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-950/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        <ArrowLeft className="w-4 h-4" />
        {returnLabel}
      </Link>
    </div>
  );
}
