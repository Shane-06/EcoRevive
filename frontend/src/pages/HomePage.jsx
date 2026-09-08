import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Sprout, MapPin, CheckCircle2, QrCode, Award, ArrowRight, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  const lifecycleSteps = [
    { label: 'Discover', desc: 'Find suitable plantation sites', icon: MapPin },
    { label: 'Assess', desc: 'Deterministic soil & climate rules', icon: Sprout },
    { label: 'Verify', desc: 'Manual coordinator audit', icon: CheckCircle2 },
    { label: 'Identify', desc: 'Unique Tree ID & QR code', icon: QrCode },
    { label: 'Reward', desc: 'Earn points for verified impact', icon: Award },
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950/60 to-slate-900 border border-emerald-500/20 p-8 sm:p-12 shadow-2xl">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" /> V1 Verified Plantation Platform
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Transparent Lifecycle Management for{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              Every Planted Tree
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            EcoRevive bridges the gap between plantation drives and long-term tree survival. From GIS-based suitability
            and coordinator audit to QR-linked public identities and caretaker monitoring.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              to="/map"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <MapPin className="w-4 h-4" /> Explore Map
            </Link>

            {!isAuthenticated ? (
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-semibold transition-colors"
              >
                Join as Contributor <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-semibold transition-colors"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Lifecycle Steps */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">The 8-Stage Plantation Lifecycle</h2>
          <p className="text-sm text-slate-400">
            A deterministic digital audit trail ensuring genuine environmental impact.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {lifecycleSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.label}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/30 transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">0{idx + 1}</span>
                </div>
                <h3 className="font-semibold text-slate-200 mb-1">{step.label}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
