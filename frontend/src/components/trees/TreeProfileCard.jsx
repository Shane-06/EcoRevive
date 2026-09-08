import { Trees, Calendar, MapPin, CheckCircle2, User, ShieldCheck } from 'lucide-react';

/**
 * Privacy-Safe Public Tree Profile Component (M10/M15).
 */
export default function TreeProfileCard({ tree }) {
  if (!tree) return null;

  return (
    <div data-testid="public-tree-profile-card" className="p-6 rounded-3xl bg-slate-900 border border-emerald-500/30 shadow-xl space-y-5">
      {/* Header with Species & Status */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <Trees className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{tree.species}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40">
                {tree.treeId}
              </span>
            </div>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {tree.status || 'Verified'}
        </span>
      </div>

      {/* Metadata Attributes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center gap-1.5">
            <User className="w-4 h-4 text-emerald-400" />
            <span>Planted by Contributor</span>
          </div>
          <div className="text-sm font-semibold text-white">
            {tree.contributor?.displayName || 'EcoRevive Contributor'}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Date of Plantation</span>
          </div>
          <div className="text-sm font-semibold text-white">{tree.plantedOn}</div>
        </div>

        <div className="col-span-1 sm:col-span-2 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-blue-400" />
            <span>Geographic Coordinates</span>
          </div>
          <div className="font-mono text-slate-200 text-xs">
            Latitude: {tree.latitude?.toFixed(6)}° N | Longitude: {tree.longitude?.toFixed(6)}° E
          </div>
        </div>
      </div>

      {/* Verification Integrity Notice */}
      <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Verified Environmental Record: </span>
          <span>
            This tree identity was authoritatively reviewed and verified by an EcoRevive coordinator and permanently registered on the public registry.
          </span>
        </div>
      </div>
    </div>
  );
}
