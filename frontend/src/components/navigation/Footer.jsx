import { Sprout, Activity } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-slate-950 border-t border-slate-800 text-slate-400 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left / Brand Info */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Sprout className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold text-slate-200">EcoRevive</span>
          <span className="text-xs text-slate-500">• Environmental Lifecycle Platform</span>
        </div>

        {/* Center / System Status */}
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-xs">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-slate-300">V1 Modular Monolith Active</span>
        </div>

        {/* Right / Copyright */}
        <div className="text-xs text-slate-500">
          &copy; {currentYear} EcoRevive Team. Built for Sustainable Plantation Verification.
        </div>
      </div>
    </footer>
  );
}
