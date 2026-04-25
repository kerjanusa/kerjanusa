import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm.jsx';
import useAuth from '../hooks/useAuth';
import '../styles/auth.css';

const loginSlides = [
  {
    src: '/hero-slides/review-1.jpeg',
    alt: 'Dashboard kandidat dengan video interview dan score total 65 dari 100.',
  },
  {
    src: '/hero-slides/review-2.jpeg',
    alt: 'Dashboard kandidat dengan video interview dan score total 74 dari 100.',
  },
  {
    src: '/hero-slides/review-3.jpeg',
    alt: 'Dashboard kandidat dengan video interview dan score total 82 dari 100.',
  },
];

const LoginPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleLoginSuccess = (authData) => {
    if (authData?.user?.role === 'recruiter') {
      navigate('/recruiter');
      return;
    }

    navigate('/');
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentSlide((currentIndex) => (currentIndex + 1) % loginSlides.length);
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    navigate(user.role === 'recruiter' ? '/recruiter' : '/', { replace: true });
  }, [navigate, user]);

  return (
    <div className="auth-page auth-page-login">
      <div className="auth-login-layout">
        <section className="auth-showcase" aria-hidden="true" data-reveal>
          <div className="auth-showcase-copy">
            <div className="auth-showcase-kicker">Video Interview Review</div>
            <p>
              HR dapat menilai <span>rekaman video pelamar</span>, memberi catatan, dan
              memutuskan shortlist lebih cepat dalam satu tampilan.
            </p>
            <div className="auth-showcase-points">
              <span>Replay jawaban</span>
              <span>Nilai soft skill</span>
              <span>Review tim HR</span>
            </div>
          </div>

          <div className="auth-showcase-stage">
            <div className="auth-showcase-carousel">
              <div className="auth-showcase-carousel-shell">
                <div
                  className="auth-showcase-carousel-track"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {loginSlides.map((slide) => (
                    <figure key={slide.src} className="auth-showcase-slide">
                      <img
                        src={slide.src}
                        alt={slide.alt}
                        className="auth-showcase-slide-image"
                      />
                    </figure>
                  ))}
                </div>

                <div className="auth-showcase-carousel-overlay">
                  <span className="auth-showcase-carousel-pill">Review Kandidat</span>
                  <div className="auth-showcase-carousel-caption">
                    <strong>Video screening aktif</strong>
                    <span>Slide otomatis setiap 3 detik</span>
                  </div>
                </div>
              </div>

              <div className="auth-showcase-carousel-dots">
                {loginSlides.map((slide, index) => (
                  <button
                    key={slide.src}
                    type="button"
                    className={`auth-showcase-carousel-dot${
                      currentSlide === index ? ' active' : ''
                    }`}
                    aria-label={`Tampilkan slide ${index + 1}`}
                    aria-pressed={currentSlide === index}
                    onClick={() => setCurrentSlide(index)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="auth-panel" data-reveal data-reveal-delay="120ms">
          <div className="auth-panel-inner">
            <div className="auth-panel-brand">
              <img
                className="auth-panel-brand-image"
                src="/kerjanusa-logo.png"
                alt="KerjaNusa Recruitment Platform"
              />
            </div>

            <div className="auth-panel-copy">
              <h1>Masuk ke akun Anda</h1>
              <p>Gunakan email dan password untuk membuka dashboard recruiter.</p>
            </div>

            <div className="auth-panel-form">
              <LoginForm onSuccess={handleLoginSuccess} />
              <p className="auth-link">
                Belum punya akun? <Link to="/register">Daftar di sini</Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
