import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ErrorAlert from '../components/common/ErrorAlert';
import { LogIn, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1.5">
        <h1 className="text-2xl font-bold font-serif text-charcoal-900 tracking-tight">Sign In to EcoRevive</h1>
        <p className="text-xs sm:text-sm text-charcoal-600">Access your plantation dashboard and verification records</p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-charcoal-700 uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contributor@ecorevive.org"
            className="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-400 rounded-xl text-sm text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:border-forest-700 transition-colors"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-charcoal-700 uppercase tracking-wider mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-400 rounded-xl text-sm text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:border-forest-700 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-forest-900 hover:bg-forest-800 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-subtle transition-all active:scale-[0.99] disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-forest-200" />
              <span>Signing In...</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4 text-forest-200" />
              <span>Sign In</span>
            </>
          )}
        </button>
      </form>

      <div className="pt-4 border-t border-warm-300 text-center text-xs text-charcoal-600">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-semibold text-forest-800 hover:text-forest-900 transition-colors underline">
          Register here
        </Link>
      </div>
    </div>
  );
}
