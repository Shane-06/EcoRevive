import { Link } from 'react-router-dom';
import { Sprout, Activity } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-warm-200/60 border-t border-warm-300 text-charcoal-600 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-forest-900 text-white flex items-center justify-center">
                <Sprout className="w-4 h-4 text-forest-200" />
              </div>
              <span className="font-serif font-bold text-base text-forest-900">EcoRevive</span>
              <span className="text-xs text-charcoal-500">• Environmental Lifecycle Platform</span>
            </div>
            <p className="text-xs text-charcoal-500 leading-relaxed max-w-sm">
              Deterministic GIS suitability assessment, coordinator field verification, authoritative physical QR identities, and continuous caretaker tree monitoring.
            </p>
          </div>

          {/* Useful Navigation Links */}
          <div className="md:col-span-4 grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <span className="font-semibold text-charcoal-800 uppercase tracking-wider text-[11px] block">
                Platform
              </span>
              <ul className="space-y-1.5">
                <li>
                  <Link to="/map" className="hover:text-forest-900 transition-colors">
                    Environmental Map
                  </Link>
                </li>
                <li>
                  <Link to="/map" className="hover:text-forest-900 transition-colors">
                    Species Catalog
                  </Link>
                </li>
                <li>
                  <Link to="/trees" className="hover:text-forest-900 transition-colors">
                    Plantation Registry
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <span className="font-semibold text-charcoal-800 uppercase tracking-wider text-[11px] block">
                Workspaces
              </span>
              <ul className="space-y-1.5">
                <li>
                  <Link to="/dashboard" className="hover:text-forest-900 transition-colors">
                    Contributor Hub
                  </Link>
                </li>
                <li>
                  <Link to="/monitor" className="hover:text-forest-900 transition-colors">
                    Caretaker Logs
                  </Link>
                </li>
                <li>
                  <Link to="/rewards" className="hover:text-forest-900 transition-colors">
                    Impact Rewards
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* System Status & Integrity */}
          <div className="md:col-span-3 space-y-2">
            <span className="font-semibold text-charcoal-800 uppercase tracking-wider text-[11px] block">
              Integrity
            </span>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white border border-warm-400 rounded-lg text-xs text-charcoal-700 shadow-subtle">
              <Activity className="w-3.5 h-3.5 text-forest-600" />
              <span>V1 Modular Monolith Active</span>
            </div>
            <p className="text-[11px] text-charcoal-500 pt-1">
              Deterministic biological rules with ISRIC & Open-Meteo inputs.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-warm-300/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-charcoal-500">
          <div>
            &copy; {currentYear} EcoRevive. Built for transparent, verifiable environmental restoration.
          </div>
          <div className="text-[11px] text-charcoal-500">
            OpenStreetMap &bull; Open-Meteo &bull; ISRIC SoilGrids
          </div>
        </div>
      </div>
    </footer>
  );
}
