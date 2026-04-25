import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const RecruiterTopbar = ({
  sections,
  activeSection,
  onSectionSelect,
  onBrandClick,
  onLogout,
  isLoggingOut,
  user,
}) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const scrollToTop = () => {
    if (typeof window === 'undefined') {
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  const handleBrandClick = () => {
    closeMobileMenu();
    scrollToTop();
    onBrandClick?.();
  };

  const handleSectionClick = (section) => {
    closeMobileMenu();
    scrollToTop();
    onSectionSelect?.(section);
  };

  const handleLogoutClick = () => {
    closeMobileMenu();
    onLogout?.();
  };

  return (
    <>
      <header
        className={`recruiter-topbar${isMobileMenuOpen ? ' recruiter-topbar-menu-open' : ''}`}
      >
        <div className="recruiter-topbar-shell">
          <Link
            to="/recruiter"
            className="recruiter-topbar-brand"
            aria-label="Dashboard recruiter"
            onClick={handleBrandClick}
          >
            <img src="/kerjanusa-logo.png" alt="KerjaNusa Recruitment Platform" />
          </Link>

          <button
            type="button"
            className="recruiter-topbar-toggle"
            aria-expanded={isMobileMenuOpen}
            aria-controls="recruiter-topbar-panel"
            aria-label={isMobileMenuOpen ? 'Tutup menu recruiter' : 'Buka menu recruiter'}
            onClick={() => setIsMobileMenuOpen((currentValue) => !currentValue)}
          >
            <span className="recruiter-topbar-toggle-line" />
            <span className="recruiter-topbar-toggle-line" />
            <span className="recruiter-topbar-toggle-line" />
          </button>

          <div
            id="recruiter-topbar-panel"
            className={`recruiter-topbar-panel${isMobileMenuOpen ? ' is-open' : ''}`}
          >
            <nav className="recruiter-topbar-nav" aria-label="Navigasi recruiter">
              {sections.map((section) => (
                <button
                  key={section.value}
                  type="button"
                  className={`recruiter-topbar-link${
                    activeSection === section.value ? ' active' : ''
                  }`}
                  onClick={() => handleSectionClick(section.value)}
                >
                  {section.label}
                </button>
              ))}
            </nav>

            <div className="recruiter-topbar-actions">
              <button type="button" className="recruiter-premium-button">
                Fitur Premium
              </button>
              <div className="recruiter-credit-chip" aria-label="KerjaNusa Credit">
                <span>KN Credit</span>
                <strong>0</strong>
              </div>
              <div className="recruiter-profile-chip">
                <span className="recruiter-profile-avatar" aria-hidden="true">
                  {user?.name?.charAt(0)?.toUpperCase() || 'R'}
                </span>
                <div className="recruiter-profile-copy">
                  <strong>{user?.name || 'Recruiter'}</strong>
                  <span>{user?.company_name || 'Recruiter'}</span>
                </div>
              </div>
              <button
                type="button"
                className="recruiter-logout-button"
                onClick={handleLogoutClick}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Keluar...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <button
        type="button"
        className={`recruiter-topbar-backdrop${isMobileMenuOpen ? ' is-open' : ''}`}
        aria-hidden={!isMobileMenuOpen}
        tabIndex={isMobileMenuOpen ? 0 : -1}
        onClick={closeMobileMenu}
      />
    </>
  );
};

export default RecruiterTopbar;
