import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div
      data-testid="unauthorized-state"
      className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6"
    >
      <div className="w-16 h-16 bg-purple-950/50 border border-purple-500/30 rounded-2xl flex items-center justify-center text-purple-400 mb-6 shadow-xl">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Access Restricted</h1>
      <p className="text-slate-400 max-w-md mb-8 text-sm leading-relaxed">
        You do not have the required role permissions to view this resource. If you believe this is in error, please
        contact your coordinator.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Return to Home
      </Link>
    </div>
  );
}
