import { Shield } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-400/20 text-purple-400 flex items-center justify-center mx-auto shadow-lg">
          <Shield className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-white">Coordinator Verification & Administration</h1>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Review pending plantation submissions, verify photographic evidence, and manage system-wide audits.
        </p>
        <div className="inline-block px-3.5 py-1.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-400 text-xs font-semibold">
          Scheduled for Milestone 15 (Verification Flow & Admin Portal)
        </div>
      </div>
    </div>
  );
}
