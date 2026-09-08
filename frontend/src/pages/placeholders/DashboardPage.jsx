import { LayoutDashboard } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
          <LayoutDashboard className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-white">Contributor Dashboard</h1>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          View your verified plantation counts, accumulated reward points, and tree monitoring status.
        </p>
        <div className="inline-block px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          Scheduled for Milestone 15 (Dashboard UI & Visualizations)
        </div>
      </div>
    </div>
  );
}
