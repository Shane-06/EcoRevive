import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../utils/constants';
import { Sprout, Menu, X, LogOut, User, Shield, Trees, MapPin, QrCode } from 'lucide-react';

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
        ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/20'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
    }`;

  const mobileNavLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-500/30'
        : 'text-slate-300 hover:text-white hover:bg-slate-800'
    }`;

  const getRoleBadge = (role) => {
    switch (role) {
      case ROLES.ADMIN:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-400/30">
            <Shield className="w-3 h-3" /> Admin
          </span>
        );
      case ROLES.CARETAKER:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
            <QrCode className="w-3 h-3" /> Caretaker
          </span>
        );
      case ROLES.CONTRIBUTOR:
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            <User className="w-3 h-3" /> Contributor
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand / Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/30 group-hover:scale-105 transition-all">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                EcoRevive
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
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
                <MapPin className="w-4 h-4" /> Map
              </span>
            </NavLink>

            {isAuthenticated && (
              <>
                {user?.role === ROLES.CONTRIBUTOR && (
                  <>
                    <NavLink to="/trees" className={navLinkClass}>
                      <span className="flex items-center gap-1.5">
                        <Trees className="w-4 h-4" /> My Plantations
                      </span>
                    </NavLink>
                    <NavLink to="/dashboard" className={navLinkClass}>
                      Dashboard
                    </NavLink>
                  </>
                )}

                {user?.role === ROLES.CARETAKER && (
                  <NavLink to="/monitor" className={navLinkClass}>
                    <span className="flex items-center gap-1.5">
                      <QrCode className="w-4 h-4" /> Monitor
                    </span>
                  </NavLink>
                )}

                {user?.role === ROLES.ADMIN && (
                  <>
                    <NavLink to="/admin" className={navLinkClass} end>
                      <span className="flex items-center gap-1.5">
                        <Shield className="w-4 h-4" /> Verifications
                      </span>
                    </NavLink>
                    <NavLink to="/admin/dashboard" className={navLinkClass}>
                      Admin Dashboard
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
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/80 border border-slate-700 rounded-lg">
                  <span className="text-sm font-medium text-slate-200">{user?.name}</span>
                  {getRoleBadge(user?.role)}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-red-300 hover:bg-red-950/30 border border-slate-700 hover:border-red-500/30 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md shadow-emerald-950/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
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
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900/95 px-4 pt-2 pb-4 space-y-2">
          <NavLink to="/" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)} end>
            Home
          </NavLink>
          <NavLink to="/map" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
            <MapPin className="w-4 h-4" /> Map
          </NavLink>

          {isAuthenticated && (
            <>
              {user?.role === ROLES.CONTRIBUTOR && (
                <>
                  <NavLink to="/trees" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
                    <Trees className="w-4 h-4" /> My Plantations
                  </NavLink>
                  <NavLink to="/dashboard" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
                    Dashboard
                  </NavLink>
                </>
              )}

              {user?.role === ROLES.CARETAKER && (
                <NavLink to="/monitor" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
                  <QrCode className="w-4 h-4" /> Monitor
                </NavLink>
              )}

              {user?.role === ROLES.ADMIN && (
                <>
                  <NavLink to="/admin" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)} end>
                    <Shield className="w-4 h-4" /> Verifications
                  </NavLink>
                  <NavLink to="/admin/dashboard" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
                    Admin Dashboard
                  </NavLink>
                </>
              )}
            </>
          )}

          <div className="pt-3 border-t border-slate-800">
            {isAuthenticated ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-sm font-medium text-slate-200">{user?.name}</span>
                  {getRoleBadge(user?.role)}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-950/40 text-red-300 border border-red-500/30 rounded-lg text-sm font-medium"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-lg"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg"
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
