import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-slate-800/80 backdrop-blur border border-emerald-500/30 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-2xl">
            🌿
          </div>
          <div>
            <h1 className="text-2xl font-bold text-emerald-400">EcoRevive</h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Plantation Lifecycle Platform</p>
          </div>
        </div>

        <div className="p-4 bg-emerald-950/40 border border-emerald-500/20 rounded-xl mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-300">Milestone 1 Active</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              Foundation Ready
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-2">
            Repository and project architecture successfully initialized. Ready for Express backend foundation (Milestone 2).
          </p>
        </div>

        <div className="space-y-3 text-sm text-slate-300">
          <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-700/50">
            <span>Frontend Stack</span>
            <span className="text-emerald-400 font-mono text-xs">React 18 + Vite + Tailwind CSS</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-700/50">
            <span>Backend Stack</span>
            <span className="text-emerald-400 font-mono text-xs">Node.js + Express (Modular Monolith)</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-700/50">
            <span>Database Target</span>
            <span className="text-emerald-400 font-mono text-xs">PostgreSQL + PostGIS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
