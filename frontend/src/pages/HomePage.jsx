import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LandingRegisterForm from '../components/LandingRegisterForm.jsx';
import '../styles/home.css';

const brandList = [
  {
    name: 'Jiwa Group',
    src: 'https://jiwagroup.com/assets/img/Jiwa-Group-Logo_JJ-PURPLE.png',
  },
  {
    name: 'MNC Play',
    src: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/MNC%20Play%20by%20IOH%20%282023%29.png',
  },
  {
    name: 'ERHA Ultimate',
    src: 'https://d910052chok68.cloudfront.net/footers/erha-ultimate.png?format=auto',
  },
  {
    name: 'FOOM',
    src: 'https://foom.id/cdn/shop/files/logo_foom.jpg?v=1769418409&width=260',
  },
  {
    name: 'Home Credit',
    src: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Home%20Credit%20logo.svg',
  },
  {
    name: 'Indodana',
    src: 'https://prod-tmf.imgix.net/common-assets/logo-color.png?auto=compress&auto=format',
  },
  {
    name: 'Indomaret',
    src: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Logo%20Indomaret.png',
  },
  {
    name: 'Bank Jago',
    src: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Logo-jago.svg',
  },
];

const heroSlides = [
  {
    src: '/hero-slides/review-1.jpeg',
    alt: 'Dashboard kandidat dengan video interview, score total 65 dari 100, dan rekomendasi tolak kandidat.',
  },
  {
    src: '/hero-slides/review-2.jpeg',
    alt: 'Dashboard kandidat dengan video interview, penilaian soft skill, catatan HR, dan score total 74 dari 100.',
  },
  {
    src: '/hero-slides/review-3.jpeg',
    alt: 'Dashboard kandidat dengan video interview, daftar pertanyaan dan jawaban, serta score total 82 dari 100.',
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

const HomePage = () => {
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentHeroSlide((currentIndex) => (currentIndex + 1) % heroSlides.length);
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, []);

  const toggleFaq = (index) => {
    setOpenFaqIndex((currentIndex) => (currentIndex === index ? null : index));
  };

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-shell home-hero-grid">
          <div className="hero-copy" data-reveal data-reveal-delay="40ms">
            <span className="hero-kicker">KerjaNusa</span>
            <h1>
              Pasang lowongan kerja gratis <span className="hero-highlight">TANPA BATAS!</span>
            </h1>
            <p className="hero-description">
              Tanpa batas dan optimalkan proses rekrutmen Anda dengan solusi yang dirancang untuk
              efisiensi dan kemudahan penggunaan.
            </p>
            <p className="hero-description hero-description-secondary">
              Kelola seluruh proses hiring mulai dari publikasi lowongan hingga penyaringan
              kandidat dalam satu dashboard yang cepat, terstruktur, dan ramah bagi tim rekrutmen.
            </p>

            <div className="hero-benefits">
              <div className="hero-benefit-item">Publikasi lowongan aktif tanpa batas</div>
              <div className="hero-benefit-item">Proses skrining CV yang lebih cepat dan terarah</div>
              <div className="hero-benefit-item">
                Akses fitur Talent Search untuk menemukan kandidat potensial
              </div>
              <div className="hero-benefit-item">Jangkau lebih dari 10 juta kandidat berkualitas</div>
            </div>

            <div className="hero-actions">
              <a href="#daftar" className="btn btn-primary btn-hero">
                Pasang Loker Sekarang
              </a>
              <Link to="/jobs" className="btn btn-ghost btn-hero-secondary">
                Lihat Lowongan
              </Link>
            </div>
          </div>

          <div className="hero-visual" data-reveal data-reveal-delay="140ms">
            <div className="hero-visual-stack">
              <Link
                to="/platform"
                className="hero-greeting-card"
                aria-label="Buka halaman Tentang Kami"
              >
                <img src="/kerjanusa-logo.png" alt="" className="hero-greeting-logo" />
              </Link>

              <div className="hero-carousel">
                <div className="hero-carousel-shell">
                  <div
                    className="hero-carousel-track"
                    style={{ transform: `translateX(-${currentHeroSlide * 100}%)` }}
                  >
                    {heroSlides.map((slide) => (
                      <figure key={slide.src} className="hero-slide">
                        <img src={slide.src} alt={slide.alt} className="hero-slide-image" />
                      </figure>
                    ))}
                  </div>

                  <div className="hero-carousel-overlay">
                    <span className="hero-carousel-pill">Review Kandidat</span>
                    <div className="hero-carousel-caption">
                      <strong>Video screening aktif</strong>
                      <span>Shortlist, review, dan evaluasi dalam satu alur</span>
                    </div>
                  </div>
                </div>

                <div className="hero-carousel-controls" aria-label="Hero slide controls">
                  {heroSlides.map((slide, index) => (
                    <button
                      key={slide.src}
                      type="button"
                      className={`hero-carousel-dot${currentHeroSlide === index ? ' active' : ''}`}
                      aria-label={`Tampilkan slide ${index + 1}`}
                      aria-pressed={currentHeroSlide === index}
                      onClick={() => setCurrentHeroSlide(index)}
                    />
                  ))}
                </div>
              </div>

              <div className="hero-visual-note">
                <strong>Tingkatkan produktivitas tim rekrutmen Anda</strong>
                <span>dengan platform yang andal dan profesional.</span>
              </div>
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
