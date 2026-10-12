import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../utils/constants';
import { Sprout, Menu, X, LogOut, User, Shield, Trees, MapPin, QrCode, Award, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
      isActive
        ? 'text-forest-900 bg-forest-50 border border-forest-200 font-semibold'
        : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-warm-200/80'
    }`;

  const mobileNavLinkClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'text-forest-900 bg-forest-50 border border-forest-200 font-semibold'
        : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-warm-200'
    }`;

  const getRoleBadge = (role) => {
    switch (role) {
      case ROLES.ADMIN:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
            <Shield className="w-3 h-3" /> Admin
          </span>
        );
      case ROLES.CARETAKER:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <QrCode className="w-3 h-3" /> Caretaker
          </span>
        );
      case ROLES.CONTRIBUTOR:
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-forest-50 text-forest-800 border border-forest-200">
            <User className="w-3 h-3" /> Contributor
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-warm-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand / Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-forest-900 text-white flex items-center justify-center shadow-subtle group-hover:bg-forest-800 transition-colors">
              <Sprout className="w-5 h-5 text-forest-200" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-forest-900 font-serif leading-none block">
                EcoRevive
              </span>
              <span className="hidden sm:inline-block text-[10px] text-charcoal-500 font-semibold tracking-wider uppercase font-sans">
                Plantation Lifecycle
              </span>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" className={navLinkClass} end>
              Home
            </NavLink>
            <NavLink to="/map" className={navLinkClass}>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-forest-700" /> Map
              </span>
            </NavLink>

            {isAuthenticated && (
              <>
                {user?.role === ROLES.CONTRIBUTOR && (
                  <>
                    <NavLink to="/trees" className={navLinkClass}>
                      <span className="flex items-center gap-1.5">
                        <Trees className="w-4 h-4 text-forest-700" /> My Plantations
                      </span>
                    </NavLink>
                    <NavLink to="/dashboard" className={navLinkClass}>
                      <span className="flex items-center gap-1.5">
                        <LayoutDashboard className="w-4 h-4 text-forest-700" /> Dashboard
                      </span>
                    </NavLink>
                    <NavLink to="/rewards" className={navLinkClass}>
                      <span className="flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-forest-700" /> Rewards
                      </span>
                    </NavLink>
                  </>
                )}

                {user?.role === ROLES.CARETAKER && (
                  <NavLink to="/monitor" className={navLinkClass}>
                    <span className="flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-amber-700" /> Monitor
                    </span>
                  </NavLink>
                )}

                {user?.role === ROLES.ADMIN && (
                  <>
                    <NavLink to="/admin" className={navLinkClass} end>
                      <span className="flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-purple-700" /> Verifications
                      </span>
                    </NavLink>
                    <NavLink to="/admin/dashboard" className={navLinkClass}>
                      <span className="flex items-center gap-1.5">
                        <LayoutDashboard className="w-4 h-4 text-purple-700" /> Admin Dashboard
                      </span>
                    </NavLink>
                  </>
                )}
              </>
            )}
          </nav>

          {/* Desktop Right / Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 bg-warm-200/80 border border-warm-300 rounded-lg">
                  <span className="text-xs font-semibold text-charcoal-800">{user?.name}</span>
                  {getRoleBadge(user?.role)}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-charcoal-600 hover:text-rose-700 hover:bg-rose-50 border border-warm-300 hover:border-rose-200 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-sm font-medium text-charcoal-700 hover:text-charcoal-900 hover:bg-warm-200 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-1.5 text-sm font-semibold text-white bg-forest-900 hover:bg-forest-800 rounded-lg shadow-subtle transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-charcoal-600 hover:text-charcoal-900 hover:bg-warm-200 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-warm-300 bg-white px-4 pt-2 pb-4 space-y-1 shadow-card">
          <NavLink to="/" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)} end>
            Home
          </NavLink>
          <NavLink to="/map" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
            <MapPin className="w-4 h-4 text-forest-700" /> Map
          </NavLink>

          {isAuthenticated && (
            <>
              {user?.role === ROLES.CONTRIBUTOR && (
                <>
                  <NavLink to="/trees" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
                    <Trees className="w-4 h-4 text-forest-700" /> My Plantations
                  </NavLink>
                  <NavLink to="/dashboard" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
                    <LayoutDashboard className="w-4 h-4 text-forest-700" /> Dashboard
                  </NavLink>
                  <NavLink to="/rewards" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
                    <Award className="w-4 h-4 text-forest-700" /> Rewards
                  </NavLink>
                </>
              )}

              {user?.role === ROLES.CARETAKER && (
                <NavLink to="/monitor" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
                  <QrCode className="w-4 h-4 text-amber-700" /> Monitor
                </NavLink>
              )}

              {user?.role === ROLES.ADMIN && (
                <>
                  <NavLink to="/admin" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)} end>
                    <Shield className="w-4 h-4 text-purple-700" /> Verifications
                  </NavLink>
                  <NavLink to="/admin/dashboard" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
                    <LayoutDashboard className="w-4 h-4 text-purple-700" /> Admin Dashboard
                  </NavLink>
                </>
              )}
            </>
          )}

          <div className="pt-3 border-t border-warm-300 mt-2">
            {isAuthenticated ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-xs font-semibold text-charcoal-800">{user?.name}</span>
                  {getRoleBadge(user?.role)}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center px-4 py-2 text-xs font-medium text-charcoal-800 bg-warm-200 rounded-lg"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-forest-900 rounded-lg"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
