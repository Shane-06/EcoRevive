import { Outlet, Link } from 'react-router-dom';
import { Sprout } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-warm-100 text-charcoal-900 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="mb-6 text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-forest-900 text-white flex items-center justify-center shadow-subtle group-hover:bg-forest-800 transition-colors">
            <Sprout className="w-5 h-5 text-forest-200" />
          </div>
          <div className="text-left">
            <span className="text-xl font-bold tracking-tight text-forest-900 font-serif block leading-none">
              EcoRevive
            </span>
            <span className="text-[10px] uppercase tracking-wider text-charcoal-500 font-semibold font-sans">
              Verification Platform
            </span>
          </div>
        </Link>
      </div>

      <div className="w-full max-w-md bg-white border border-warm-400 rounded-2xl p-6 sm:p-8 shadow-card">
        <Outlet />
      </div>

      <div className="mt-6 text-center text-xs text-charcoal-500">
        <Link to="/" className="hover:text-forest-800 transition-colors font-medium">
          &larr; Back to EcoRevive Platform
        </Link>
      </div>
    </div>
  );
}
