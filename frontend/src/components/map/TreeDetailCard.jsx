import { TreeDeciduous, MapPin, X, CheckCircle, Navigation } from 'lucide-react';

/**
 * Public verified tree detail preview card.
 */
export default function TreeDetailCard({ tree, onClose, onAssessLocation }) {
  if (!tree) return null;

  return (
    <div
      data-testid="tree-detail-card"
      className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/30 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <TreeDeciduous className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">{tree.species || 'Verified Tree'}</h3>
            <p className="text-xs font-mono text-emerald-400/90">{tree.treeId || 'ID Pending'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
          <div className="text-slate-400 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Status</span>
          </div>
          <div className="font-semibold text-emerald-400">{tree.status || 'Verified'}</div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
          <div className="text-slate-400 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            <span>Coordinates</span>
          </div>
          <div className="font-mono text-slate-200 text-[11px]">
            {tree.latitude?.toFixed(4)}, {tree.longitude?.toFixed(4)}
          </div>
        </div>
      </div>

      {onAssessLocation && (
        <button
          type="button"
          onClick={() => onAssessLocation({ lat: tree.latitude, lng: tree.longitude })}
          className="w-full py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Assess Environment at this Tree</span>
        </button>
      )}
    </div>
  );
}
