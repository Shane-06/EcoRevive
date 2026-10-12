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
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warm-200 border border-warm-400 text-charcoal-700 text-xs font-semibold"
        >
          <AlertCircle className="w-3.5 h-3.5 text-charcoal-500" />
          No health record yet
        </span>
      );
    }

    switch (healthStatus) {
      case 'Healthy':
        return (
          <span
            data-testid={`${prefix}-health-healthy`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#edf7ee] border border-[#b4dbbe] text-[#194c25] text-xs font-bold"
          >
            <HeartPulse className="w-3.5 h-3.5 text-forest-700" />
            Healthy
          </span>
        );
      case 'Good':
        return (
          <span
            data-testid={`${prefix}-health-good`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eff6ff] border border-[#bfdbfe] text-[#1e40af] text-xs font-bold"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
            Good
          </span>
        );
      case 'Needs Attention':
        return (
          <span
            data-testid={`${prefix}-health-attention`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fef9ed] border border-[#f0dda2] text-[#855b11] text-xs font-bold"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Needs Attention
          </span>
        );
      case 'Dead':
        return (
          <span
            data-testid={`${prefix}-health-dead`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fdf2f2] border border-[#f6c6c6] text-[#992222] text-xs font-bold"
          >
            <Skull className="w-3.5 h-3.5 text-rose-600" />
            Dead
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warm-200 border border-warm-300 text-charcoal-700 text-xs font-semibold">
            <Activity className="w-3.5 h-3.5 text-charcoal-500" />
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
    <div data-testid="public-tree-profile-card" className="p-6 sm:p-8 rounded-3xl bg-white border border-warm-400 shadow-card space-y-6">
      {/* Header with Species & Status */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-warm-300 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-forest-50 border border-forest-200 text-forest-800 flex items-center justify-center">
            <Trees className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-serif text-charcoal-900">{tree.species}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono font-bold text-forest-900 px-2.5 py-0.5 rounded-md bg-forest-50 border border-forest-200">
                {tree.treeId}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest-50 border border-forest-200 text-forest-800 text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-forest-600" />
            {tree.status || 'Verified'}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-charcoal-500 font-semibold uppercase">Current Health:</span>
            {getHealthBadge(tree.currentHealth)}
          </div>
        </div>
      </div>

      {/* Metadata Attributes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
        <div className="p-4 rounded-2xl bg-warm-50 border border-warm-300 space-y-1">
          <div className="text-charcoal-500 flex items-center gap-1.5">
            <User className="w-4 h-4 text-forest-700" />
            <span>Planted by Contributor</span>
          </div>
          <div className="text-sm font-semibold text-charcoal-900">
            {tree.contributor?.displayName || 'EcoRevive Contributor'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-warm-50 border border-warm-300 space-y-1">
          <div className="text-charcoal-500 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-forest-700" />
            <span>Date of Plantation</span>
          </div>
          <div className="text-sm font-semibold font-mono text-charcoal-900">{tree.plantedOn}</div>
        </div>

        <div className="col-span-1 sm:col-span-2 p-4 rounded-2xl bg-warm-50 border border-warm-300 space-y-1">
          <div className="text-charcoal-500 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-slate-700" />
            <span>Geographic Coordinates</span>
          </div>
          <div className="font-mono text-charcoal-900 text-xs">
            Latitude: {tree.latitude?.toFixed(6)}° N | Longitude: {tree.longitude?.toFixed(6)}° E
          </div>
        </div>
      </div>

      {/* Public Health History Section */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-2 text-xs font-bold text-charcoal-700 uppercase tracking-wider">
          <Activity className="w-4 h-4 text-forest-700" />
          <span>Health Monitoring History</span>
        </div>

        {!tree.healthHistory || tree.healthHistory.length === 0 ? (
          <div
            data-testid="public-no-health-history"
            className="p-4 rounded-2xl bg-warm-50 border border-warm-300 text-xs text-charcoal-600 flex items-center gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-charcoal-400 shrink-0" />
            <span>No physical health observations recorded yet for this tree.</span>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {tree.healthHistory.map((log) => (
              <div
                key={log.id}
                data-testid={`public-health-entry-${log.id}`}
                className="p-3.5 rounded-xl bg-warm-50 border border-warm-300 flex items-center justify-between text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getHealthBadge(log.healthStatus, 'public-history')}
                    <span className="text-[11px] text-charcoal-500 font-mono">
                      {formatRecordedAt(log.recordedAt)}
                    </span>
                  </div>
                  {log.notes && (
                    <div className="text-charcoal-700 text-[11px] flex items-start gap-1 pt-0.5">
                      <FileText className="w-3 h-3 text-charcoal-400 shrink-0 mt-0.5" />
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
      <div className="p-4 rounded-2xl bg-forest-50 border border-forest-200 text-xs text-forest-900 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
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
