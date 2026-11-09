import { ROLES } from './constants';

/**
 * Maps an authenticated user role to their canonical default landing route.
 * @param {string} role - Authenticated user role (contributor, caretaker, admin)
 * @returns {string} Default workspace route path
 */
export function getRoleLandingRoute(role) {
  switch (role) {
    case ROLES.ADMIN:
      return '/admin/dashboard';
    case ROLES.CARETAKER:
      return '/monitor';
    case ROLES.CONTRIBUTOR:
    default:
      return '/dashboard';
  }
}

/**
 * Checks whether a given path is an allowed destination for a specific role.
 * Used to validate post-login redirection targets (e.g. from location.state.from).
 * @param {string} pathname - Target path
 * @param {string} role - Authenticated user role
 * @returns {boolean} True if the role is permitted to access the route
 */
export function isRouteAllowedForRole(pathname, role) {
  if (!pathname || typeof pathname !== 'string' || !role) {
    return false;
  }

  // Strip query parameters and hashes, then remove trailing slashes (except root '/')
  const cleanPath = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';

  // Do not redirect back to authentication or system error routes
  if (['/', '/login', '/register', '/unauthorized'].includes(cleanPath)) {
    return false;
  }

  // Admin routes
  if (cleanPath.startsWith('/admin')) {
    return role === ROLES.ADMIN;
  }

  // Caretaker routes
  if (cleanPath.startsWith('/monitor')) {
    return role === ROLES.CARETAKER || role === ROLES.ADMIN;
  }

  // Contributor plantation management
  if (cleanPath.startsWith('/trees')) {
    return role === ROLES.CONTRIBUTOR || role === ROLES.ADMIN;
  }

  // Contributor dashboard (admins and caretakers have their own dedicated landing workspaces)
  if (cleanPath === '/dashboard') {
    return role === ROLES.CONTRIBUTOR;
  }

  // Common authenticated routes
  if (cleanPath.startsWith('/rewards') || cleanPath.startsWith('/ecoguide')) {
    return [ROLES.CONTRIBUTOR, ROLES.CARETAKER, ROLES.ADMIN].includes(role);
  }

  // Public authenticated-safe routes (e.g. browsing map or public tree profile)
  if (cleanPath.startsWith('/map') || cleanPath.startsWith('/tree')) {
    return true;
  }

  return false;
}

/**
 * Resolves the destination route following successful login.
 * Prefers the requested route if the authenticated role is authorized for it;
 * otherwise safely falls back to the role's default landing workspace.
 * @param {string} role - Authenticated user role
 * @param {string} [fromPathname] - Optional prior pathname from navigation state
 * @returns {string} Final target route
 */
export function resolvePostLoginRedirect(role, fromPathname) {
  if (fromPathname && isRouteAllowedForRole(fromPathname, role)) {
    return fromPathname;
  }
  return getRoleLandingRoute(role);
}

