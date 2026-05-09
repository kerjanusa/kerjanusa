import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import { readCandidateApplyIntent } from '../utils/candidateApplyIntent.js';
import {
  APP_ROUTES,
  getDefaultRouteForRole,
  getLoginRouteForRole,
  normalizeUserRole,
} from '../utils/routeHelpers.js';

const GuestRoute = ({ children }) => {
  const { user } = useAuth();
  const pendingApplyIntent = readCandidateApplyIntent();

  if (user) {
    if (pendingApplyIntent && normalizeUserRole(user.role) === 'candidate') {
      return <Navigate to={APP_ROUTES.jobs} replace />;
    }

    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }

  return children;
};

const ProtectedRoute = ({ children, allowedRoles = [], loginRole }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to={getLoginRouteForRole(loginRole)} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }

  return children;
};

export { GuestRoute, ProtectedRoute };
