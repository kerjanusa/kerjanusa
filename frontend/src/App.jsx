import { Suspense, lazy, useEffect, useLayoutEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import useScrollReveal from './hooks/useScrollReveal.js';

const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const AboutPage = lazy(() => import('./pages/AboutPage.jsx'));
const PlatformPage = lazy(() => import('./pages/PlatformPage.jsx'));
const JobListPage = lazy(() => import('./pages/JobListPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const RecruiterDashboardPage = lazy(() => import('./pages/RecruiterDashboardPage.jsx'));
const RecruiterJobCreatePage = lazy(() => import('./pages/RecruiterJobCreatePage.jsx'));

const FORCE_SCROLL_TOP_PATHS = new Set(['/', '/about', '/platform']);

const scrollWindowToTop = () => {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
};

const AppRouteFallback = () => (
  <main className="app-container">
    <div className="loading">Memuat halaman...</div>
  </main>
);

function AppLayout() {
  const location = useLocation();
  const shouldForceScrollTop = FORCE_SCROLL_TOP_PATHS.has(location.pathname);
  useScrollReveal(location.pathname);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    if (location.hash) {
      const targetElement = document.getElementById(location.hash.slice(1));

      if (targetElement) {
        const frameId = window.requestAnimationFrame(() => {
          targetElement.scrollIntoView({ block: 'start' });
        });

        return () => {
          window.cancelAnimationFrame(frameId);
        };
      }
    }

    scrollWindowToTop();
    return undefined;
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (typeof window === 'undefined' || location.hash || !shouldForceScrollTop) {
      return undefined;
    }

    const supportsManualScrollRestoration =
      typeof window.history !== 'undefined' && 'scrollRestoration' in window.history;
    const previousScrollRestoration = supportsManualScrollRestoration
      ? window.history.scrollRestoration
      : null;

    if (supportsManualScrollRestoration) {
      window.history.scrollRestoration = 'manual';
    }

    const restoreScrollTop = () => {
      scrollWindowToTop();
      window.requestAnimationFrame(scrollWindowToTop);
    };

    const timeoutId = window.setTimeout(restoreScrollTop, 120);
    const handlePageShow = () => {
      restoreScrollTop();
    };
    const handleBeforeUnload = () => {
      scrollWindowToTop();
    };

    restoreScrollTop();
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      if (supportsManualScrollRestoration && previousScrollRestoration !== null) {
        window.history.scrollRestoration = previousScrollRestoration;
      }
    };
  }, [location.hash, location.pathname, shouldForceScrollTop]);

  const hideNavbar =
    location.pathname === '/register' || location.pathname.startsWith('/recruiter');
  const loginShellClassName =
    location.pathname === '/login' ? 'auth-shell auth-shell-with-navbar' : 'auth-shell';

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Suspense fallback={<AppRouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/platform" element={<PlatformPage />} />
          <Route
            path="/jobs"
            element={
              <main className="app-container app-container-jobs">
                <JobListPage />
              </main>
            }
          />
          <Route
            path="/login"
            element={
              <main className={loginShellClassName}>
                <LoginPage />
              </main>
            }
          />
          <Route
            path="/register"
            element={
              <main className="auth-shell">
                <RegisterPage />
              </main>
            }
          />
          <Route path="/recruiter/jobs/create" element={<RecruiterJobCreatePage />} />
          <Route path="/recruiter" element={<RecruiterDashboardPage />} />
        </Routes>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
