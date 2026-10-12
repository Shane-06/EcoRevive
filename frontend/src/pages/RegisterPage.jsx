import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ErrorAlert from '../components/common/ErrorAlert';
import { UserPlus, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1.5">
        <h1 className="text-2xl font-bold font-serif text-charcoal-900 tracking-tight">Create an Account</h1>
        <p className="text-xs sm:text-sm text-charcoal-600">Join the verified tree plantation movement</p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-xs font-semibold text-charcoal-700 uppercase tracking-wider mb-1.5">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            className="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-400 rounded-xl text-sm text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:border-forest-700 transition-colors"
          />
        </div>

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
            placeholder="jane@example.com"
            className="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-400 rounded-xl text-sm text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:border-forest-700 transition-colors"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-charcoal-700 uppercase tracking-wider mb-1.5">
            Password (min 6 characters)
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-400 rounded-xl text-sm text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:border-forest-700 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-charcoal-700 uppercase tracking-wider mb-1.5">
            Platform Role
          </label>
          <div className="w-full px-3.5 py-2.5 bg-warm-100 border border-warm-300 rounded-xl text-xs sm:text-sm text-charcoal-800">
            Contributor <span className="text-xs text-charcoal-500">(Register plantations & earn points)</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-forest-900 hover:bg-forest-800 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-subtle transition-all active:scale-[0.99] disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-forest-200" />
              <span>Registering...</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 text-forest-200" />
              <span>Create Account</span>
            </>
          )}
        </button>
      </form>

      <div className="pt-4 border-t border-warm-300 text-center text-xs text-charcoal-600">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-forest-800 hover:text-forest-900 transition-colors underline">
          Sign in here
        </Link>
      </div>
    </div>
  );
}
