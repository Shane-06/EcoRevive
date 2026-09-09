import {
  Trees,
  Calendar,
  MapPin,
  CheckCircle2,
  User,
  ShieldCheck,
  Activity,
  HeartPulse,
  AlertTriangle,
  Skull,
  AlertCircle,
  FileText,
} from 'lucide-react';

/**
 * Privacy-Safe Public Tree Profile Component (M10/M11/M15/M16).
 * Critical Rule: Missing health status strictly displays "No health record yet" (NEVER Dead).
 * Strictly excludes caretaker private credentials or internal database attributes.
 */
export default function TreeProfileCard({ tree }) {
  if (!tree) return null;

  const getHealthBadge = (healthStatus, prefix = 'public-current') => {
    if (!healthStatus) {
      return (
        <span
          data-testid={`${prefix}-health-none`}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-slate-300 text-xs font-semibold"
        >
          <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
          No health record yet
        </span>
      );
    }

    switch (healthStatus) {
      case 'Healthy':
        return (
          <span
            data-testid={`${prefix}-health-healthy`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-bold"
          >
            <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
            Healthy
          </span>
        );
      case 'Good':
        return (
          <span
            data-testid={`${prefix}-health-good`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-950 border border-teal-500/40 text-teal-300 text-xs font-bold"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            Good
          </span>
        );
      case 'Needs Attention':
        return (
          <span
            data-testid={`${prefix}-health-attention`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950 border border-amber-500/40 text-amber-300 text-xs font-bold"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Needs Attention
          </span>
        );
      case 'Dead':
        return (
          <span
            data-testid={`${prefix}-health-dead`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950 border border-rose-500/40 text-rose-300 text-xs font-bold"
          >
            <Skull className="w-3.5 h-3.5 text-rose-400" />
            Dead
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            {healthStatus}
          </span>
        );
    }
  };

  const formatRecordedAt = (ts) => {
    if (!ts) return 'Recorded observation';
    try {
      return new Date(ts).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (_e) {
      return String(ts);
    }
  };

  return (
    <div data-testid="public-tree-profile-card" className="p-6 rounded-3xl bg-slate-900 border border-emerald-500/30 shadow-xl space-y-6">
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

        <div className="flex flex-col items-end gap-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {tree.status || 'Verified'}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Current Health:</span>
            {getHealthBadge(tree.currentHealth)}
          </div>
        </div>
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

      {/* Public Health History Section */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <Activity className="w-4 h-4 text-teal-400" />
          <span>Health Monitoring History</span>
        </div>

        {!tree.healthHistory || tree.healthHistory.length === 0 ? (
          <div
            data-testid="public-no-health-history"
            className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
            <span>No physical health observations recorded yet for this tree.</span>
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {tree.healthHistory.map((log) => (
              <div
                key={log.id}
                data-testid={`public-health-entry-${log.id}`}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getHealthBadge(log.healthStatus, 'public-history')}
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatRecordedAt(log.recordedAt)}
                    </span>
                  </div>
                  {log.notes && (
                    <div className="text-slate-300 text-[11px] flex items-start gap-1 pt-0.5">
                      <FileText className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{log.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
