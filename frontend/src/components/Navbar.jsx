import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import '../styles/navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isLoginPage = location.pathname === '/login';
  const isPlatformPage = location.pathname === '/platform';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    closeMobileMenu();
    logout();
  };

  return (
    <nav
      className={`navbar ${isHomePage ? 'navbar-home' : ''}${
        isLoginPage ? ' navbar-login' : ''
      }${
        isPlatformPage ? ' navbar-platform' : ''
      }${
        isMobileMenuOpen ? ' navbar-menu-open' : ''
      }`}
    >
      <div className="navbar-container">
        <Link
          to="/"
          className="navbar-logo"
          aria-label="Beranda KerjaNusa"
          onClick={closeMobileMenu}
        >
          <img
            className="navbar-brand-image"
            src="/kerjanusa-logo.png"
            alt="KerjaNusa Recruitment Platform"
          />
        </Link>

        <button
          type="button"
          className="navbar-toggle"
          aria-expanded={isMobileMenuOpen}
          aria-controls="navbar-panel"
          aria-label={isMobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
          onClick={() => setIsMobileMenuOpen((currentValue) => !currentValue)}
        >
          <span className="navbar-toggle-line" />
          <span className="navbar-toggle-line" />
          <span className="navbar-toggle-line" />
        </button>

        <div id="navbar-panel" className={`navbar-panel${isMobileMenuOpen ? ' is-open' : ''}`}>
          <div className="navbar-menu">
            <NavLink
              to="/"
              className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
              onClick={closeMobileMenu}
            >
              Beranda
            </NavLink>
            <NavLink
              to="/jobs"
              className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
              onClick={closeMobileMenu}
            >
              Cari Pekerjaan
            </NavLink>
            {!user && (
              <NavLink
                to="/platform"
                className={({ isActive }) =>
                  `navbar-link navbar-link-muted${isActive ? ' active' : ''}`
                }
                onClick={closeMobileMenu}
              >
                Tentang Kami
              </NavLink>
            )}
          </div>

          <div className="navbar-auth">
            {user ? (
              <>
                <span className="user-name">{user.name}</span>
                <button className="btn btn-secondary" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-outline" onClick={closeMobileMenu}>
                  Login
                </Link>
                <a
                  href={isHomePage ? '#daftar' : '/#daftar'}
                  className="btn btn-primary"
                  onClick={closeMobileMenu}
                >
                  Daftar Sekarang
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        className={`navbar-backdrop${isMobileMenuOpen ? ' is-open' : ''}`}
        aria-hidden={!isMobileMenuOpen}
        tabIndex={isMobileMenuOpen ? 0 : -1}
        onClick={closeMobileMenu}
      />
    </nav>
  );
};

export default Navbar;
