export const APP_ROUTES = {
  home: '/',
  landing: '/dashboard-awal',
  about: '/about',
  platform: '/platform',
  jobs: '/jobs',
  login: '/login',
  forgotPassword: '/forgot-password',
  register: '/register',
  recruiterDashboard: '/recruiter',
  recruiterCreateJob: '/recruiter/jobs/create',
  candidateDashboard: '/candidate',
  adminDashboard: '/admin',
};

export const normalizeUserRole = (role) => (role === 'internal' ? 'superadmin' : role);

const ROLE_HOME_ROUTES = {
  recruiter: APP_ROUTES.recruiterDashboard,
  candidate: APP_ROUTES.candidateDashboard,
  superadmin: APP_ROUTES.adminDashboard,
  internal: APP_ROUTES.adminDashboard,
};

const ROLE_LOGIN_ROUTES = {
  recruiter: `${APP_ROUTES.login}?role=recruiter`,
  candidate: `${APP_ROUTES.login}?role=candidate`,
  superadmin: `${APP_ROUTES.login}?role=superadmin`,
  internal: `${APP_ROUTES.login}?role=superadmin`,
};

export const getDefaultRouteForRole = (role) =>
  ROLE_HOME_ROUTES[normalizeUserRole(role)] || APP_ROUTES.home;

export const getLoginRouteForRole = (role) =>
  ROLE_LOGIN_ROUTES[normalizeUserRole(role)] || APP_ROUTES.login;
