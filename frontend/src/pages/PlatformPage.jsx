import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/platform.css';

const PLATFORM_HIGHLIGHTS = [
  {
    label: 'Tanggal Berdiri',
    value: '16 April 2026',
  },
  {
    label: 'Lokasi Awal',
    value: 'Bogor, Jawa Barat',
  },
  {
    label: 'Founder & CEO',
    value: 'Danny Ekananda Dhia Farras',
  },
  {
    label: 'Fokus Utama',
    value: 'Rekrutmen digital yang efisien dan inklusif',
  },
];

const PLATFORM_VALUES = [
  {
    title: 'Profesionalisme',
    description:
      'Menjaga standar layanan yang rapi, jelas, dan dapat diandalkan untuk setiap proses rekrutmen.',
  },
  {
    title: 'Integritas',
    description:
      'Mendorong proses seleksi yang transparan agar perusahaan dan kandidat sama-sama percaya.',
  },
  {
    title: 'Inovasi',
    description:
      'Menghadirkan fitur yang relevan dengan dinamika pasar kerja yang terus bergerak.',
  },
  {
    title: 'Kolaborasi',
    description:
      'Membangun hubungan yang kuat dengan perusahaan, pencari kerja, dan mitra ekosistem.',
  },
];

const PLATFORM_SOLUTIONS = [
  {
    title: 'Digital Job Posting Tertarget',
    description: 'Membantu lowongan tampil lebih tepat sasaran untuk kandidat yang relevan.',
  },
  {
    title: 'Smart Candidate Search',
    description:
      'Mempermudah recruiter menemukan kandidat potensial dengan alur pencarian yang lebih fokus.',
  },
  {
    title: 'Adaptive Filtering System',
    description:
      'Menyaring kandidat lebih cepat lewat kriteria yang menyesuaikan kebutuhan posisi.',
  },
  {
    title: 'Dashboard Monitoring Efisiensi',
    description:
      'Memberi gambaran proses rekrutmen secara ringkas agar tim bisa mengambil keputusan lebih cepat.',
  },
];

const PLATFORM_MARKETS = [
  {
    title: 'Startup',
    description: 'Mendukung perusahaan rintisan menemukan talenta yang gesit dan siap bertumbuh.',
  },
  {
    title: 'UKM',
    description:
      'Memberikan solusi rekrutmen profesional bagi pengusaha lokal dengan proses yang lebih praktis.',
  },
  {
    title: 'Korporasi',
    description:
      'Menyediakan sistem skala besar untuk kebutuhan perekrutan lintas fungsi dan sektor industri.',
  },
];

const PLATFORM_SHOWCASE_SLIDES = [
  {
    id: 'workspace',
    label: 'Recruiter Workspace',
    title: 'Adaptive hiring flow',
  },
  {
    id: 'mockup',
    label: 'App UI/UX Mockup',
    title: 'Showcase',
  },
];

const PLATFORM_APPLE_HOME_APPS = [
  { label: 'Mail', mark: 'M', tone: 'sky' },
  { label: 'Camera', mark: 'C', tone: 'peach' },
  { label: 'Notes', mark: 'N', tone: 'sand' },
  { label: 'Music', mark: 'Mu', tone: 'pink' },
  { label: 'Maps', mark: 'Ma', tone: 'mint' },
  { label: 'Files', mark: 'F', tone: 'ice' },
  { label: 'Wallet', mark: 'W', tone: 'violet' },
  { label: 'Health', mark: 'H', tone: 'rose' },
];

const PLATFORM_APPLE_DOCK_APPS = [
  { label: 'Phone', mark: 'P', tone: 'mint' },
  { label: 'Chat', mark: 'C', tone: 'sky' },
  { label: 'Web', mark: 'W', tone: 'sand' },
  { label: 'Settings', mark: 'S', tone: 'violet' },
];

const PlatformPage = () => {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveSlideIndex((currentIndex) => (currentIndex + 1) % PLATFORM_SHOWCASE_SLIDES.length);
    }, 4500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const showPreviousSlide = () => {
    setActiveSlideIndex((currentIndex) =>
      currentIndex === 0 ? PLATFORM_SHOWCASE_SLIDES.length - 1 : currentIndex - 1
    );
  };

  const showNextSlide = () => {
    setActiveSlideIndex((currentIndex) => (currentIndex + 1) % PLATFORM_SHOWCASE_SLIDES.length);
  };

  return (
    <main className="platform-page" aria-label="Platform KerjaNusa">
      <div className="platform-shell">
        <section className="platform-hero platform-section" data-reveal data-reveal-delay="40ms">
          <div className="platform-hero-copy">
            <span className="platform-eyebrow">Platform Rekrutmen Digital</span>
            <h1>KerjaNusa</h1>
            <p className="platform-hero-tagline">
              Menjembatani Talenta, Membangun
              <br className="platform-desktop-break" />
              Negeri.
            </p>
            <p className="platform-hero-description">
              Didirikan pada 16 April 2026 di Bogor oleh Danny Ekananda Dhia Farras, KerjaNusa
              hadir sebagai solusi modern atas dinamika dunia kerja yang semakin kompleks.
            </p>
            <p className="platform-hero-description platform-hero-description-muted">
              Kami berkomitmen meningkatkan kualitas rekrutmen di Indonesia dengan menjembatani
              pencari kerja dan perusahaan melalui teknologi digital yang efisien dan inklusif.
            </p>
            <div className="platform-hero-audience" aria-label="Fokus pengguna platform">
              <Link to="/register?role=recruiter">Untuk perusahaan</Link>
              <Link to="/register?role=candidate">Untuk kandidat</Link>
            </div>
            <p className="platform-hero-note">
              Halaman ini menjelaskan KerjaNusa dari sisi brand dan ekosistem. Alur recruiter
              dipakai perusahaan untuk memasang lowongan dan menyaring kandidat, sedangkan pelamar
              tetap dapat melihat lowongan publik dari sisi mereka.
            </p>

            <div className="platform-hero-actions">
              <Link to="/jobs" className="btn btn-primary">
                Lihat Lowongan
              </Link>
              <a href="mailto:kontak@kerjanusa.com" className="btn btn-outline">
                Hubungi Kami
              </a>
            </div>
          </div>

          <div className="platform-hero-panel">
            <div className="platform-hero-card platform-hero-card-primary">
              <strong>
                KerjaNusa membangun proses rekrutmen yang lebih cepat, relevan, dan terpercaya.
              </strong>
              <p>
                Fokus kami adalah menghubungkan talenta berkualitas dengan peluang kerja terbaik
                di tingkat nasional maupun internasional.
              </p>
            </div>

            <div className="platform-highlight-grid">
              {PLATFORM_HIGHLIGHTS.map((item) => (
                <article key={item.label} className="platform-highlight-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="platform-vision platform-section" data-reveal data-reveal-delay="70ms">
          <div className="platform-section-heading">
            <div className="platform-section-rail">
              <span className="platform-section-label">Visi & Misi</span>
            </div>
            <h2>Kerangka strategis yang mengarahkan produk dan layanan kami.</h2>
          </div>

          <div className="platform-vision-grid">
            <article className="platform-glass-card">
              <span className="platform-glass-kicker">Visi</span>
              <p>
                Menjadi platform rekrutmen terpercaya yang menghubungkan talenta berkualitas
                dengan peluang kerja terbaik di tingkat nasional maupun internasional.
              </p>
            </article>

            <article className="platform-glass-card">
              <span className="platform-glass-kicker">Misi</span>
              <p>
                Menyediakan layanan rekrutmen yang cepat, transparan, dan efektif melalui inovasi
                fitur yang relevan dengan kebutuhan pasar global.
              </p>
            </article>
          </div>
        </section>

        <section className="platform-values platform-section" data-reveal data-reveal-delay="70ms">
          <div className="platform-section-heading">
            <div className="platform-section-rail">
              <span className="platform-section-label">Nilai-Nilai Utama</span>
            </div>
            <h2>Landasan kami dalam membangun hubungan yang kuat dengan pengguna.</h2>
          </div>

          <div className="platform-values-grid">
            {PLATFORM_VALUES.map((item, index) => (
              <article key={item.title} className="platform-value-card">
                <span className="platform-value-badge">{`0${index + 1}`}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="platform-solutions platform-section"
          data-reveal
          data-reveal-delay="80ms"
        >
          <div className="platform-section-heading">
            <div className="platform-section-rail">
              <span className="platform-section-label">Solusi Digital</span>
            </div>
            <h2>Fitur yang kami rancang kini hadir dalam pengalaman platform.</h2>
          </div>

          <div className="platform-solutions-grid">
            <div className="platform-solution-list">
              {PLATFORM_SOLUTIONS.map((item) => (
                <article key={item.title} className="platform-solution-item">
                  <div className="platform-solution-bullet" aria-hidden="true" />
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="platform-showcase-card">
              <span className="platform-showcase-kicker">Showcase</span>
              <div className="platform-showcase-screen">
                <div className="platform-showcase-top">
                  <span>Recruiter Workspace</span>
                  <strong>Adaptive hiring flow</strong>
                </div>
                <div className="platform-showcase-panels">
                  <article>
                    <span>Posting</span>
                    <strong>Tertarget</strong>
                  </article>
                  <article>
                    <span>Search</span>
                    <strong>Smart Match</strong>
                  </article>
                  <article>
                    <span>Filtering</span>
                    <strong>Adaptif</strong>
                  </article>
                  <article>
                    <span>Monitoring</span>
                    <strong>Efisien</strong>
                  </article>
                </div>
              </div>

              <div className="platform-showcase-carousel">
                <div className="platform-showcase-carousel-stage">
                  {PLATFORM_SHOWCASE_SLIDES.map((slide, index) => {
                    const isActive = index === activeSlideIndex;

                    return (
                      <article
                        key={slide.id}
                        className={`platform-showcase-slide${
                          isActive ? ' is-active' : ''
                        } platform-showcase-slide-${slide.id}`}
                        aria-hidden={!isActive}
                      >
                        {slide.id === 'workspace' ? (
                          <div className="platform-showcase-slide-workspace">
                            <span className="platform-showcase-slide-pill">Recruiter Workspace</span>
                            <strong>Adaptive hiring flow</strong>
                            <div className="platform-showcase-slide-workspace-grid">
                              <article>
                                <span>Posting</span>
                                <strong>Tertarget</strong>
                              </article>
                              <article>
                                <span>Search</span>
                                <strong>Smart Match</strong>
                              </article>
                              <article>
                                <span>Filtering</span>
                                <strong>Adaptif</strong>
                              </article>
                              <article>
                                <span>Monitoring</span>
                                <strong>Efisien</strong>
                              </article>
                            </div>
                          </div>
                        ) : (
                          <div className="platform-showcase-slide-mockup">
                            <div className="platform-showcase-apple-home">
                              <div className="platform-showcase-apple-home-glow platform-showcase-apple-home-glow-left" />
                              <div className="platform-showcase-apple-home-glow platform-showcase-apple-home-glow-right" />

                              <div className="platform-showcase-apple-status">
                                <span>9:41</span>
                                <div className="platform-showcase-apple-status-icons" aria-hidden="true">
                                  <i className="platform-showcase-apple-signal" />
                                  <i className="platform-showcase-apple-wifi" />
                                  <i className="platform-showcase-apple-battery">
                                    <b />
                                  </i>
                                </div>
                              </div>

                              <div className="platform-showcase-apple-widgets">
                                <article className="platform-showcase-apple-widget platform-showcase-apple-widget-primary">
                                  <small>Tuesday</small>
                                  <strong>09:41</strong>
                                  <span>Sunny 21 C</span>
                                </article>
                                <article className="platform-showcase-apple-widget">
                                  <small>Battery</small>
                                  <strong>86%</strong>
                                  <span>All-day mode</span>
                                </article>
                              </div>

                              <div className="platform-showcase-apple-app-grid">
                                {PLATFORM_APPLE_HOME_APPS.map((app) => (
                                  <article key={app.label} className="platform-showcase-apple-app">
                                    <div
                                      className={`platform-showcase-apple-app-icon platform-showcase-apple-app-icon-${app.tone}`}
                                      aria-hidden="true"
                                    >
                                      <span>{app.mark}</span>
                                    </div>
                                    <span className="platform-showcase-apple-app-label">
                                      {app.label}
                                    </span>
                                  </article>
                                ))}
                              </div>

                              <div className="platform-showcase-apple-dock">
                                {PLATFORM_APPLE_DOCK_APPS.map((app) => (
                                  <article
                                    key={app.label}
                                    className="platform-showcase-apple-dock-app"
                                  >
                                    <div
                                      className={`platform-showcase-apple-app-icon platform-showcase-apple-app-icon-${app.tone}`}
                                      aria-hidden="true"
                                    >
                                      <span>{app.mark}</span>
                                    </div>
                                  </article>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>

                <div className="platform-showcase-carousel-controls">
                  <button
                    type="button"
                    className="platform-showcase-carousel-arrow"
                    aria-label="Slide sebelumnya"
                    onClick={showPreviousSlide}
                  >
                    ‹
                  </button>

                  <div
                    className="platform-showcase-carousel-dots"
                    role="tablist"
                    aria-label="Showcase slide"
                  >
                    {PLATFORM_SHOWCASE_SLIDES.map((slide, index) => (
                      <button
                        key={slide.id}
                        type="button"
                        role="tab"
                        aria-selected={index === activeSlideIndex}
                        className={`platform-showcase-carousel-dot${
                          index === activeSlideIndex ? ' is-active' : ''
                        }`}
                        onClick={() => setActiveSlideIndex(index)}
                      >
                        <span className="platform-sr-only">{slide.label}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="platform-showcase-carousel-arrow"
                    aria-label="Slide berikutnya"
                    onClick={showNextSlide}
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="platform-efficiency platform-section"
          data-reveal
          data-reveal-delay="70ms"
        >
          <div className="platform-section-heading">
            <div className="platform-section-rail">
              <span className="platform-section-label">Efisiensi Proses Seleksi</span>
            </div>
            <h2>Sistem penyaringan kami meningkatkan efisiensi seleksi hingga dua kali lipat.</h2>
          </div>

          <div className="platform-efficiency-card">
            <div className="platform-efficiency-row">
              <span>KerjaNusa (Digital)</span>
              <div className="platform-efficiency-track">
                <div className="platform-efficiency-fill platform-efficiency-fill-primary">
                  <strong>95% Efisiensi</strong>
                </div>
              </div>
            </div>

            <div className="platform-efficiency-row">
              <span>Metode Konvensional</span>
              <div className="platform-efficiency-track">
                <div className="platform-efficiency-fill platform-efficiency-fill-secondary">
                  <strong>40% Efisiensi</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="platform-market platform-section" data-reveal data-reveal-delay="70ms">
          <div className="platform-section-heading">
            <div className="platform-section-rail">
              <span className="platform-section-label">Target Pasar</span>
            </div>
            <h2>
              KerjaNusa dirancang untuk kebutuhan rekrutmen dari bisnis berkembang hingga skala
              besar.
            </h2>
          </div>

          <div className="platform-market-grid">
            {PLATFORM_MARKETS.map((item) => (
              <article key={item.title} className="platform-market-card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="platform-quote platform-section" data-reveal data-reveal-delay="50ms">
          <blockquote className="platform-quote-card">
            <span className="platform-quote-mark">"</span>
            <p>
              Teknologi bukan hanya soal kemudahan, tapi soal memberikan akses bagi setiap talenta
              Indonesia untuk menemukan tempat terbaik bagi mereka bertumbuh.
            </p>
            <footer>
              <strong>Danny Ekananda Dhia Farras</strong>
              <span>Founder & CEO KerjaNusa</span>
            </footer>
          </blockquote>
        </section>

        <section
          className="platform-contact platform-section"
          data-reveal
          data-reveal-delay="70ms"
        >
          <div className="platform-contact-card">
            <div>
              <div className="platform-section-rail">
                <span className="platform-section-label">Mari Berkolaborasi</span>
              </div>
              <h2>Bersama KerjaNusa, proses rekrutmen bisa bergerak lebih terarah.</h2>
              <p>
                Jika Anda ingin menjalin kerja sama atau mengenal platform ini lebih jauh, hubungi
                tim kami melalui kanal resmi berikut.
              </p>
            </div>

            <div className="platform-contact-list">
              <a href="https://www.kerjanusa.com" target="_blank" rel="noreferrer">
                www.kerjanusa.com
              </a>
              <a href="mailto:kontak@kerjanusa.com">kontak@kerjanusa.com</a>
              <span>Bogor, Jawa Barat</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default PlatformPage;
