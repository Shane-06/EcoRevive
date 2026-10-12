import { TreeDeciduous, MapPin, X, CheckCircle, Navigation } from 'lucide-react';

/**
 * Public verified tree detail preview card.
 */
export default function TreeDetailCard({ tree, onClose, onAssessLocation }) {
  if (!tree) return null;

  return (
    <div
      data-testid="tree-detail-card"
      className="p-5 rounded-2xl bg-white border border-forest-300 shadow-elevated space-y-4 animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-forest-50 border border-forest-200 text-forest-800 flex items-center justify-center">
            <TreeDeciduous className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold font-serif text-charcoal-900 text-base">{tree.species || 'Verified Tree'}</h3>
            <p className="text-xs font-mono font-semibold text-forest-700">{tree.treeId || 'ID Pending'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-charcoal-500 hover:text-charcoal-900 hover:bg-warm-200 transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-warm-50 border border-warm-300 space-y-1">
          <div className="text-charcoal-500 flex items-center gap-1 text-[11px]">
            <CheckCircle className="w-3.5 h-3.5 text-forest-600" />
            <span>Status</span>
          </div>
          <div className="font-semibold text-forest-800">{tree.status || 'Verified'}</div>
        </div>

        <div className="p-3 rounded-xl bg-warm-50 border border-warm-300 space-y-1">
          <div className="text-charcoal-500 flex items-center gap-1 text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-slate-700" />
            <span>Coordinates</span>
          </div>
          <div className="font-mono text-charcoal-800 text-[11px]">
            {tree.latitude?.toFixed(4)}, {tree.longitude?.toFixed(4)}
          </div>
        </div>
      </div>

      {onAssessLocation && (
        <button
          type="button"
          onClick={() => onAssessLocation({ lat: tree.latitude, lng: tree.longitude })}
          className="w-full py-2.5 px-3 rounded-xl bg-forest-50 hover:bg-forest-100 border border-forest-200 text-forest-900 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <Navigation className="w-3.5 h-3.5 text-forest-700" />
          <span>Assess Environment at this Tree</span>
        </button>
      )}
    </div>
  );
}
