import { Outlet, Link } from 'react-router-dom';
import { Sprout } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-emerald-500 selection:text-slate-950">
      <div className="mb-6 text-center">
        <Link to="/" className="inline-flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shadow-lg shadow-emerald-950/40">
            <Sprout className="w-7 h-7" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
            EcoRevive
          </span>
        </Link>
      </div>

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-950/80">
        <Outlet />
      </div>

      <div className="mt-8 text-center text-xs text-slate-500">
        <Link to="/" className="hover:text-emerald-400 transition-colors">
          &larr; Back to EcoRevive Platform
        </Link>
      </div>
    </div>
  );
}
