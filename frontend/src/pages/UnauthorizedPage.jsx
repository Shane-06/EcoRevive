import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div
      data-testid="unauthorized-state"
      className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6"
    >
      <div className="w-14 h-14 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-center text-purple-800 mb-5 shadow-subtle">
        <ShieldAlert className="w-7 h-7" />
      </div>
      <h1 className="text-3xl font-bold text-charcoal-900 font-serif tracking-tight mb-2">Access Restricted</h1>
      <p className="text-charcoal-600 max-w-md mb-6 text-sm leading-relaxed">
        You do not have the required role permissions to view this resource. If you believe this is in error, please
        contact your coordinator.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-forest-900 hover:bg-forest-800 text-white rounded-xl text-sm font-semibold shadow-subtle transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Return to Home
      </Link>
    </div>
  );
}
