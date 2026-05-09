import { useState } from 'react';
import { Link } from 'react-router-dom';
import LandingRegisterForm from '../components/LandingRegisterForm.jsx';
import useAuth from '../hooks/useAuth.js';
import '../styles/home.css';

const brandList = [
  {
    name: 'Vismaya',
    src: '/partner-logos/vismaya.png',
  },
  {
    name: 'Dkriuk Fried Chicken',
    src: '/partner-logos/dkriuk-fried-chicken.png',
  },
  {
    name: 'GMP',
    src: '/partner-logos/gmp.png',
  },
  {
    name: 'Kawan Lama Group',
    src: '/partner-logos/kawan-lama-group.png',
  },
  {
    name: 'CP Food Division',
    src: '/partner-logos/cp-food-division.png',
  },
  {
    name: 'Mixue',
    src: '/partner-logos/mixue.png',
  },
  {
    name: 'J.Chicken',
    src: '/partner-logos/j-chicken.png',
  },
];

const faqItems = [
  {
    question: 'Apa itu KerjaNusa?',
    answer:
      'KerjaNusa adalah platform rekrutmen untuk perusahaan yang ingin memasang lowongan, menjaring kandidat, dan mengelola proses hiring dalam satu dashboard.',
  },
  {
    question: 'Ada berapa jenis layanan di KerjaNusa?',
    answer:
      'Saat ini tersedia layanan pemasangan lowongan, distribusi lowongan ke partner, pengelolaan kandidat, dan form pendaftaran recruiter untuk mulai hiring lebih cepat.',
  },
  {
    question: 'Apakah pemasangan lowongan kerja di KerjaNusa dipungut biaya?',
    answer:
      'Untuk campaign dasar, perusahaan dapat mulai memasang lowongan tanpa biaya. Opsi lanjutan bisa disesuaikan dengan kebutuhan rekrutmen tim Anda.',
  },
  {
    question: 'Berapa lama proses pemasangan lowongan kerja di KerjaNusa?',
    answer:
      'Setelah akun recruiter dibuat, lowongan bisa dipasang dalam hitungan menit. Tim cukup melengkapi informasi posisi, lokasi, dan kriteria kandidat.',
  },
];

const comparisonRows = [
  {
    feature: 'Jumlah lowongan aktif gratis',
    kerjaNusa: 'Unlimited',
    otherPlatforms: 'Max. 1-5',
  },
  {
    feature: 'Jumlah pelamar yang dapat diproses secara gratis',
    kerjaNusa: 'Unlimited',
    otherPlatforms: 'Terbatas',
  },
  {
    feature: 'Auto-fill template undangan wawancara via WhatsApp',
    kerjaNusa: true,
    otherPlatforms: false,
  },
  {
    feature: 'Fitur Premium: Fleksibel, bayar sesuai penggunaan',
    kerjaNusa: true,
    otherPlatforms: false,
  },
  {
    feature: 'Talent Search: Langsung hubungi kandidat yang sesuai',
    kerjaNusa: 'Rp 20K per buka CV',
    otherPlatforms: 'Mulai dari Rp 70K per buka CV',
  },
];

const aboutMetrics = [
  {
    value: '80.000+',
    label: 'perusahaan telah mempercayai KerjaNusa untuk kebutuhan hiring mereka',
  },
  {
    value: '10 juta+',
    label: 'jangkauan kandidat aktif dari distribusi lowongan dan talent search',
  },
  {
    value: '< 24 jam',
    label: 'waktu tercepat untuk mulai menerima kandidat yang relevan',
  },
];

const aboutPillars = [
  {
    title: 'Publikasi yang Luas',
    description:
      'Lowongan dapat dipasang cepat dan didistribusikan ke channel yang membantu tim recruitment menjangkau kandidat lebih banyak.',
  },
  {
    title: 'Screening yang Rapi',
    description:
      'Tim HR dapat menyaring kandidat, membaca kecocokan, dan meninjau hasil video interview dari alur kerja yang lebih terstruktur.',
  },
  {
    title: 'Keputusan yang Lebih Yakin',
    description:
      'Dari shortlist sampai evaluasi kandidat, seluruh proses dibuat agar recruiter bisa bergerak cepat tanpa kehilangan kualitas penilaian.',
  },
];

const entryPortalCards = [
  {
    title: 'Login Rekruter',
    description: 'Masuk sebagai recruiter atau company untuk membuka dashboard dan mengelola lowongan.',
    to: '/login?role=recruiter',
    action: 'Masuk sebagai Rekruter',
  },
  {
    title: 'Login Pelamar',
    description: 'Masuk sebagai kandidat untuk memantau proses lamaran dan aktivitas pencarian kerja.',
    to: '/login?role=candidate',
    action: 'Masuk sebagai Pelamar',
  },
  {
    title: 'Login Superadmin KerjaNusa',
    description: 'Akses superadmin untuk memantau recruiter, pelamar, lowongan, dan data platform.',
    to: '/login?role=superadmin',
    action: 'Masuk sebagai Superadmin',
  },
];

const HomePage = () => {
  const { user } = useAuth();
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const userRole = user?.role;
  const heroQuickLinks = user
    ? userRole === 'recruiter'
      ? [
          { label: 'Pasang Loker Sekarang', to: '/recruiter/jobs/create', primary: true },
          { label: 'Dashboard Company', to: '/recruiter' },
          { label: 'Cari Pekerjaan', to: '/jobs' },
          { label: 'Tentang Kami', to: '/platform' },
        ]
      : userRole === 'candidate'
        ? [
            { label: 'Info Data Diri', to: '/candidate', primary: true },
            { label: 'Cari Pekerjaan', to: '/jobs' },
            { label: 'Chat', to: '/candidate#chat' },
            { label: 'Tentang Kami', to: '/platform' },
          ]
        : [
            { label: 'Dashboard Admin', to: '/admin', primary: true },
            { label: 'Monitoring Pelamar', to: '/admin#pelamar' },
            { label: 'Moderasi Lowongan', to: '/admin#moderasi' },
            { label: 'Tentang Kami', to: '/platform' },
          ]
    : [
        { label: 'Login', to: '/login', primary: true },
        { label: 'Daftar Sekarang', to: '/register' },
        { label: 'Dashboard Company', to: '/login?role=recruiter' },
        { label: 'Tentang Kami', to: '/platform' },
      ];

  const toggleFaq = (index) => {
    setOpenFaqIndex((currentIndex) => (currentIndex === index ? null : index));
  };

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-shell home-hero-grid">
          <div className="hero-copy" data-reveal data-reveal-delay="40ms">
            <span className="hero-kicker">Beranda Ringkas</span>
            <h1>Dashboard Awal</h1>
            <p className="hero-description">
              Saat pertama masuk website, user langsung melihat fitur inti tanpa perlu mencari
              menu yang tidak relevan di tahap awal.
            </p>
            <div className="hero-feature-brief">
              <span className="hero-feature-heading">Fitur</span>
              <p className="hero-feature-summary">
                Masuk website awal langsung muncul hanya fitur <strong>Login</strong>,{' '}
                <strong>Daftar Sekarang</strong>, <strong>Dashboard Company</strong>, dan{' '}
                <strong>Tentang Kami</strong>.
              </p>
              <ul className="hero-feature-list">
                <li>
                  <strong>Login</strong> untuk Rekruter, Pelamar, dan Superadmin KerjaNusa.
                </li>
                <li>
                  <strong>Daftar Sekarang</strong> untuk Rekruter dan Pelamar.
                </li>
              </ul>
            </div>

            <div className="hero-actions">
              {heroQuickLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className={`btn btn-hero${link.primary ? ' btn-primary' : ' btn-ghost btn-hero-secondary'}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="hero-visual" data-reveal data-reveal-delay="140ms">
            <div className="hero-visual-stack">
              <Link
                to="/platform"
                className="hero-greeting-card"
                aria-label="Buka halaman Tentang Kami"
              >
                <img src="/kerjanusa-badge-final-v4.png" alt="" className="hero-greeting-logo" />
              </Link>

              <div className="hero-carousel">
                <div className="hero-carousel-shell hero-carousel-shell-concept">
                  <div className="hero-concept-board">
                    <span className="hero-concept-kicker">Akses Cepat</span>
                    <div className="hero-concept-grid">
                      <article className="hero-concept-card">
                        <strong>Login</strong>
                        <span>Rekruter, Pelamar, Superadmin KerjaNusa</span>
                      </article>
                      <article className="hero-concept-card">
                        <strong>Daftar Sekarang</strong>
                        <span>Rekruter dan Pelamar</span>
                      </article>
                      <article className="hero-concept-card">
                        <strong>Dashboard Company</strong>
                        <span>Pintu masuk recruiter eksternal</span>
                      </article>
                      <article className="hero-concept-card">
                        <strong>Tentang Kami</strong>
                        <span>Profil dan informasi platform</span>
                      </article>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hero-visual-note">
                <strong>Alur masuk dibuat lebih jelas</strong>
                <span>
                  Recruiter, pelamar, dan superadmin KerjaNusa sekarang punya jalur akses yang lebih
                  mudah dipahami dari beranda awal.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-entry-hub-section" aria-label="Portal masuk utama">
        <div className="home-shell">
          <div className="entry-hub-flow" data-reveal>
            <div className="entry-hub-root">
              <span className="entry-hub-root-kicker">Dashboard Awal</span>
              <strong>Pilih jalur login sesuai peran Anda</strong>
            </div>

            <div className="entry-hub-rail" aria-hidden="true">
              <span className="entry-hub-stem" />
              <span className="entry-hub-branch" />
            </div>

            <div className="entry-hub-grid">
              {entryPortalCards.map((portal, index) => (
                <Link
                  key={portal.title}
                  to={portal.to}
                  className="entry-hub-card"
                  data-reveal
                  data-reveal-delay={`${index * 80}ms`}
                >
                  <span className="entry-hub-card-label">{portal.title}</span>
                  <p>{portal.description}</p>
                  <strong>{portal.action}</strong>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="home-trust-section" aria-label="Kepercayaan perusahaan">
        <div className="home-shell">
          <div className="about-trust about-trust-standalone" data-reveal>
            <p className="about-trust-copy">
              Dipercaya oleh 80.000+ perusahaan ternama yang telah mempercayai KerjaNusa
            </p>
            <div className="brand-marquee" aria-label="Partner logos">
              <div className="brand-track">
                {[...brandList, ...brandList].map((brand, index) => (
                  <div key={`${brand.name}-${index}`} className="brand-logo-item">
                    <img
                      src={brand.src}
                      alt={brand.name}
                      className="brand-logo-image"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="about-section" id="tentang">
        <div className="home-shell">
          <div className="about-card" data-reveal>
            <div className="about-copy">
              <span className="about-kicker">Tentang Kami</span>
              <h2>Platform rekrutmen modern untuk perusahaan yang ingin hiring lebih cepat tanpa proses yang berantakan.</h2>
              <p>
                KerjaNusa dibangun untuk membantu HR dan recruiter mempublikasikan
                lowongan, menjangkau kandidat yang relevan, meninjau pelamar, dan mengambil
                keputusan dengan lebih percaya diri dari satu alur kerja yang rapi.
              </p>

              <div className="about-metrics">
                {aboutMetrics.map((metric) => (
                  <article key={metric.label} className="about-metric-card">
                    <strong>{metric.value}</strong>
                    <span>{metric.label}</span>
                  </article>
                ))}
              </div>
            </div>

            <div className="about-stage" aria-hidden="true">
              <div className="about-stage-panel">
                <div className="about-stage-chip">Hiring Command Center</div>
                <div className="about-stage-header">
                  <strong>Lebih cepat menyaring kandidat yang tepat</strong>
                  <span>Satu alur kerja untuk publish, review, dan shortlist</span>
                </div>

                <div className="about-stage-grid">
                  <div className="about-stage-stat">
                    <b>3x</b>
                    <span>screening lebih efisien</span>
                  </div>
                  <div className="about-stage-stat">
                    <b>1</b>
                    <span>dashboard terpadu</span>
                  </div>
                  <div className="about-stage-stat">
                    <b>CV + Video</b>
                    <span>review lebih lengkap</span>
                  </div>
                  <div className="about-stage-stat">
                    <b>Real-time</b>
                    <span>monitoring kandidat aktif</span>
                  </div>
                </div>

                <div className="about-stage-bars">
                  <span className="about-stage-bar about-stage-bar-primary" />
                  <span className="about-stage-bar about-stage-bar-secondary" />
                  <span className="about-stage-bar about-stage-bar-accent" />
                </div>
              </div>

              <div className="about-stage-note">
                <strong>Dirancang untuk tim recruiter yang butuh gerak cepat.</strong>
                <span>Lebih sedikit pekerjaan manual, lebih banyak keputusan yang tepat.</span>
              </div>
            </div>
          </div>

          <div className="about-pillars">
            {aboutPillars.map((pillar, index) => (
              <article
                key={pillar.title}
                className="about-pillar-card"
                data-reveal
                data-reveal-delay={`${index * 80}ms`}
              >
                <h3>{pillar.title}</h3>
                <p>{pillar.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-register-section">
        <div className="home-shell">
          <div className="comparison-card" data-reveal>
            <div className="comparison-heading">
              <span className="comparison-kicker">Keunggulan Platform</span>
              <h2>Solusi Rekrutmen yang Paling Berbeda</h2>
              <p>Bandingkan langsung manfaat utama KerjaNusa dengan platform lainnya.</p>
            </div>

            <div className="comparison-table" role="table" aria-label="Perbandingan platform rekrutmen">
              <div className="comparison-table-head" role="rowgroup">
                <div className="comparison-table-row comparison-table-row-head" role="row">
                  <div className="comparison-cell comparison-cell-feature" role="columnheader">
                    Yang dibandingkan
                  </div>
                  <div className="comparison-cell comparison-cell-brand comparison-cell-brand-primary" role="columnheader">
                    KerjaNusa
                  </div>
                  <div className="comparison-cell comparison-cell-brand" role="columnheader">
                    Platform Lainnya
                  </div>
                </div>
              </div>

              <div className="comparison-table-body" role="rowgroup">
                {comparisonRows.map((row) => (
                  <div key={row.feature} className="comparison-table-row" role="row">
                    <div
                      className="comparison-cell comparison-cell-feature"
                      role="cell"
                      data-label="Yang dibandingkan"
                    >
                      {row.feature}
                    </div>
                    <div
                      className="comparison-cell comparison-cell-value comparison-cell-value-primary"
                      role="cell"
                      data-label="KerjaNusa"
                    >
                      {typeof row.kerjaNusa === 'boolean' ? (
                        <span
                          className={`comparison-status${
                            row.kerjaNusa ? ' comparison-status-positive' : ' comparison-status-negative'
                          }`}
                          aria-label={row.kerjaNusa ? 'Tersedia' : 'Tidak tersedia'}
                        >
                          {row.kerjaNusa ? '✓' : '×'}
                        </span>
                      ) : (
                        row.kerjaNusa
                      )}
                    </div>
                    <div
                      className="comparison-cell comparison-cell-value"
                      role="cell"
                      data-label="Platform Lainnya"
                    >
                      {typeof row.otherPlatforms === 'boolean' ? (
                        <span
                          className={`comparison-status${
                            row.otherPlatforms
                              ? ' comparison-status-positive'
                              : ' comparison-status-negative'
                          }`}
                          aria-label={row.otherPlatforms ? 'Tersedia' : 'Tidak tersedia'}
                        >
                          {row.otherPlatforms ? '✓' : '×'}
                        </span>
                      ) : (
                        row.otherPlatforms
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="home-register-card" id="daftar" data-reveal data-reveal-delay="80ms">
            <LandingRegisterForm />
          </div>
        </div>
      </section>

      <section className="home-faq-section" id="faq">
        <div className="home-shell faq-layout" data-reveal>
          <div className="faq-visual" aria-hidden="true">
            <div className="faq-brand-card">
              <span className="faq-brand-logo" />
            </div>
            <div className="faq-blob faq-blob-soft" />
            <div className="faq-scribble">
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className="faq-content">
            <div className="faq-heading">
              <h2>Paling Sering Ditanyakan</h2>
            </div>

            <div className="faq-list">
              {faqItems.map((item, index) => {
                const isOpen = openFaqIndex === index;

                return (
                  <article
                    key={item.question}
                    className={`faq-item${isOpen ? ' faq-item-open' : ''}`}
                  >
                    <button
                      type="button"
                      className="faq-question"
                      onClick={() => toggleFaq(index)}
                      aria-expanded={isOpen}
                    >
                      <span>{item.question}</span>
                      <span className="faq-toggle">{isOpen ? '−' : '⌄'}</span>
                    </button>
                    {isOpen && <p className="faq-answer">{item.answer}</p>}
                  </article>
                );
              })}
            </div>

            <a href="#daftar" className="faq-more-link">
              tunggu apalagi, daftar akun sekarang...
              <span>→</span>
            </a>
          </div>
        </div>
      </section>

      <section className="home-article-section">
        <div className="home-shell article-shell">
          <article className="article-content" data-reveal>
            <h3>Cara Mencari Pekerja di KerjaNusa</h3>
            <p>
              KerjaNusa merupakan platform rekrutmen online yang membantu perusahaan memasang
              lowongan kerja dan mendapatkan calon karyawan dengan proses yang lebih cepat dan
              praktis. Perusahaan dapat membuat lowongan, menerima lamaran, lalu menyaring
              kandidat dari satu tempat.
            </p>
            <p>
              Dengan memasang lowongan kerja di KerjaNusa, lowongan dapat dijangkau oleh lebih
              banyak pencari kerja aktif. Anda cukup melengkapi informasi posisi, lokasi, dan
              kebutuhan kandidat, lalu tim rekrutmen bisa segera mulai menerima pelamar yang masuk.
            </p>

            <h3>Kelebihan pasang lowongan kerja di KerjaNusa</h3>
            <p>
              Yang membedakan KerjaNusa dari platform pasang loker lain adalah fokusnya pada proses
              rekrutmen yang ringan, cepat, dan mudah dijalankan tim perusahaan. Berikut beberapa
              keunggulan utamanya.
            </p>

            <h4>1. Lowongan kerja mudah ditemukan</h4>
            <p>
              Dengan posting lowongan kerja di KerjaNusa, posisi yang Anda buka dapat terlihat oleh
              lebih banyak kandidat potensial. Hal ini membantu perusahaan mendapatkan lamaran yang
              lebih relevan untuk kebutuhan posisi yang sedang dibuka.
            </p>

            <h4>2. Kualitas pelamar yang bermutu</h4>
            <p>
              Proses rekrutmen menjadi lebih terarah karena perusahaan bisa fokus pada kandidat yang
              paling sesuai dengan kriteria. Dengan begitu, waktu seleksi bisa dipangkas dan tim
              dapat bergerak lebih cepat ke tahap interview.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
