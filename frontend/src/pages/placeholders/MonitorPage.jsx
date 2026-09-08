import { QrCode } from 'lucide-react';

export default function MonitorPage() {
  return (
    <div className="space-y-6">
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-400/20 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
          <QrCode className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-white">Caretaker Health Monitoring</h1>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Scan QR codes attached to verified trees, record growth observations, and submit photographic health updates.
        </p>
        <div className="inline-block px-3.5 py-1.5 rounded-full bg-amber-950/60 border border-amber-500/30 text-amber-400 text-xs font-semibold">
          Scheduled for Milestone 15 (QR Scanner & Health Monitoring UI)
        </div>
      </div>
    </div>
  );
}
