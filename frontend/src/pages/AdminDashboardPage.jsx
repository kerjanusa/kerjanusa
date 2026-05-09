import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import AdminService from '../services/adminService.js';
import { APP_ROUTES } from '../utils/routeHelpers.js';
import '../styles/workspace.css';

const ADMIN_SECTION_OPTIONS = [
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'pelamar', label: 'Pelamar' },
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'lowongan', label: 'Lowongan' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'moderation', label: 'Moderasi' },
];

const numberFormatter = new Intl.NumberFormat('id-ID');

const resolveAdminSectionFromHash = (hash) => {
  if (hash === '#pelamar') {
    return 'pelamar';
  }

  if (hash === '#moderasi' || hash === '#moderation') {
    return 'moderation';
  }

  const normalizedHash = hash.replace(/^#/, '');

  if (ADMIN_SECTION_OPTIONS.some((section) => section.value === normalizedHash)) {
    return normalizedHash;
  }

  return 'monitoring';
};

const getAdminSectionHash = (section) => (section === 'moderation' ? 'moderasi' : section);

const getAdminSectionRoute = (section) =>
  section === 'monitoring'
    ? APP_ROUTES.adminDashboard
    : `${APP_ROUTES.adminDashboard}#${getAdminSectionHash(section)}`;

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }

  try {
    return new Date(value).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
};

const formatApplicationStatus = (status) => {
  switch (status) {
    case 'pending':
      return 'Menunggu review';
    case 'accepted':
      return 'Diterima';
    case 'rejected':
      return 'Ditolak';
    case 'withdrawn':
      return 'Dibatalkan kandidat';
    default:
      return status || '-';
  }
};

const formatJobStatus = (status) => {
  switch (status) {
    case 'active':
      return 'Aktif';
    case 'inactive':
      return 'Nonaktif';
    default:
      return status || '-';
  }
};

const getProgressValue = (numerator, denominator) => {
  if (!denominator) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)));
};

const AdminDashboardPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState(resolveAdminSectionFromHash(location.hash));
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setActiveSection(resolveAdminSectionFromHash(location.hash));
  }, [location.hash]);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await AdminService.getDashboard();

        if (!isMounted) {
          return;
        }

        setDashboard(response);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(loadError?.message || 'Gagal memuat dashboard superadmin.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const totals = dashboard?.totals ?? {};
  const growth = dashboard?.growth ?? {};
  const candidateTable = dashboard?.candidate_table ?? [];
  const recruiterTable = dashboard?.recruiter_table ?? [];
  const jobs = dashboard?.jobs ?? [];
  const applications = dashboard?.applications ?? [];

  const overviewCards = useMemo(
    () => [
      {
        label: 'Pelamar Aktif',
        value: totals.candidates ?? 0,
        detail: `+${growth.new_candidates_last_7_days ?? 0} akun baru dalam 7 hari`,
      },
      {
        label: 'Recruiter Aktif',
        value: totals.recruiters ?? 0,
        detail: `+${growth.new_recruiters_last_7_days ?? 0} recruiter baru dalam 7 hari`,
      },
      {
        label: 'Lowongan Aktif',
        value: totals.active_jobs ?? 0,
        detail: `${totals.inactive_jobs ?? 0} lowongan sedang nonaktif`,
      },
      {
        label: 'Lamaran Masuk',
        value: totals.total_applications ?? 0,
        detail: `${totals.pending_applications ?? 0} masih menunggu review`,
      },
    ],
    [growth, totals]
  );

  const performanceBars = useMemo(
    () => [
      {
        label: 'Aktivasi lowongan',
        value: getProgressValue(totals.active_jobs ?? 0, totals.total_jobs ?? 0),
        summary: `${totals.active_jobs ?? 0} dari ${totals.total_jobs ?? 0} lowongan sedang aktif.`,
      },
      {
        label: 'Lamaran diterima',
        value: getProgressValue(
          totals.accepted_applications ?? 0,
          totals.total_applications ?? 0
        ),
        summary: `${totals.accepted_applications ?? 0} lamaran sudah diterima recruiter.`,
      },
      {
        label: 'Lamaran menunggu review',
        value: getProgressValue(
          totals.pending_applications ?? 0,
          totals.total_applications ?? 0
        ),
        summary: `${totals.pending_applications ?? 0} lamaran belum diproses.`,
      },
    ],
    [totals]
  );

  const activityAlerts = useMemo(
    () => [
      `${totals.pending_applications ?? 0} lamaran masih menunggu review recruiter.`,
      `${totals.inactive_jobs ?? 0} lowongan nonaktif dapat ditinjau untuk reaktivasi atau moderasi.`,
      `${growth.new_jobs_last_7_days ?? 0} lowongan baru dibuat dalam 7 hari terakhir.`,
    ],
    [growth, totals]
  );

  const analyticsCards = useMemo(() => {
    const totalJobs = totals.total_jobs ?? 0;
    const totalApplications = totals.total_applications ?? 0;
    const acceptedApplications = totals.accepted_applications ?? 0;
    const rejectedApplications = totals.rejected_applications ?? 0;

    return [
      {
        label: 'Rata-rata lamaran per lowongan',
        value: totalJobs > 0 ? (totalApplications / totalJobs).toFixed(1) : '0.0',
      },
      {
        label: 'Acceptance rate',
        value: `${getProgressValue(acceptedApplications, totalApplications)}%`,
      },
      {
        label: 'Rejection rate',
        value: `${getProgressValue(rejectedApplications, totalApplications)}%`,
      },
      {
        label: 'Pertumbuhan lowongan 7 hari',
        value: numberFormatter.format(growth.new_jobs_last_7_days ?? 0),
      },
      {
        label: 'Pertumbuhan lamaran 7 hari',
        value: numberFormatter.format(growth.new_applications_last_7_days ?? 0),
      },
      {
        label: 'Akun superadmin',
        value: numberFormatter.format(totals.superadmins ?? 0),
      },
    ];
  }, [growth, totals]);

  const moderationItems = useMemo(
    () =>
      jobs.filter((job) => job.status !== 'active' || job.applications_count === 0).slice(0, 6),
    [jobs]
  );

  const handleSectionChange = (section) => {
    setActiveSection(section);
    navigate(getAdminSectionRoute(section));
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    navigate(APP_ROUTES.landing, { replace: true });
  };

  const renderLoadingState = () => (
    <article className="workspace-panel">
      <div className="workspace-panel-heading">
        <div>
          <span className="workspace-section-label">Memuat Data</span>
          <h2>Dashboard superadmin sedang disiapkan</h2>
        </div>
      </div>
      <p>Mohon tunggu, data recruiter, pelamar, lowongan, dan lamaran sedang dimuat.</p>
    </article>
  );

  const renderErrorState = () => (
    <article className="workspace-panel">
      <div className="workspace-panel-heading">
        <div>
          <span className="workspace-section-label">Gagal Memuat</span>
          <h2>Dashboard superadmin belum bisa ditampilkan</h2>
        </div>
      </div>
      <p>{error}</p>
      <div className="workspace-action-row">
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Muat ulang
        </button>
      </div>
    </article>
  );

  return (
    <div className="workspace-page workspace-page-admin">
      <header className="workspace-topbar">
        <div className="workspace-shell workspace-topbar-shell">
          <Link
            to={APP_ROUTES.landing}
            className="workspace-brand"
            aria-label="Website awal KerjaNusa"
          >
            <img src="/kerjanusa-logo-cutout.png" alt="KerjaNusa Recruitment Platform" />
          </Link>

          <nav className="workspace-nav workspace-nav-wide" aria-label="Navigasi superadmin">
            {ADMIN_SECTION_OPTIONS.map((section) => (
              <button
                key={section.value}
                type="button"
                className={`workspace-nav-button${
                  activeSection === section.value ? ' active' : ''
                }`}
                onClick={() => handleSectionChange(section.value)}
              >
                {section.label}
              </button>
            ))}
          </nav>

          <div className="workspace-actions">
            <div className="workspace-user-chip">
              <strong>{user?.name || 'Superadmin KerjaNusa'}</strong>
              <span>Superadmin</span>
            </div>
            <button
              type="button"
              className="btn btn-secondary workspace-logout"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Logout...' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      <main className="workspace-shell workspace-main">
        <section className="workspace-overview-grid" data-reveal>
          <article className="workspace-hero-card">
            <span className="workspace-kicker">Superadmin KerjaNusa</span>
            <h1>Dashboard Monitoring Utama</h1>
            <p>
              Pusat kontrol untuk memantau pelamar, recruiter, lowongan, dan kesehatan operasional
              platform dari satu tampilan yang terhubung ke backend.
            </p>
            <div className="workspace-action-row">
              <button type="button" className="btn btn-primary" disabled>
                Export Data Segera Hadir
              </button>
              <Link to={APP_ROUTES.platform} className="btn btn-outline">
                Lihat Profil KerjaNusa
              </Link>
            </div>
          </article>

          <div className="workspace-kpi-grid">
            {overviewCards.map((item) => (
              <article key={item.label} className="workspace-kpi-card">
                <span>{item.label}</span>
                <strong>{numberFormatter.format(item.value)}</strong>
                <small>{item.detail}</small>
              </article>
            ))}
          </div>
        </section>

        {isLoading && renderLoadingState()}
        {!isLoading && error && renderErrorState()}

        {!isLoading && !error && activeSection === 'monitoring' && (
          <section className="workspace-section-stack" data-reveal>
            <article className="workspace-panel">
              <div className="workspace-panel-heading">
                <div>
                  <span className="workspace-section-label">Ringkasan Platform</span>
                  <h2>Recruiter, pelamar, lowongan, dan lamaran</h2>
                </div>
                <p>
                  Semua angka di bawah ini diambil langsung dari data user, lowongan, dan lamaran
                  yang sudah tersimpan di backend.
                </p>
              </div>

              <div className="workspace-kpi-grid">
                {overviewCards.map((item) => (
                  <article key={item.label} className="workspace-kpi-card">
                    <span>{item.label}</span>
                    <strong>{numberFormatter.format(item.value)}</strong>
                    <small>{item.detail}</small>
                  </article>
                ))}
              </div>
            </article>

            <section className="workspace-two-column-grid">
              <article className="workspace-panel" data-reveal data-reveal-delay="60ms">
                <div className="workspace-panel-heading">
                  <div>
                    <span className="workspace-section-label">Kinerja Utama</span>
                    <h2>Rasio operasional inti</h2>
                  </div>
                </div>

                <div className="workspace-progress-list">
                  {performanceBars.map((bar) => (
                    <article key={bar.label} className="workspace-progress-card">
                      <div className="workspace-progress-head">
                        <strong>{bar.label}</strong>
                        <span>{bar.value}%</span>
                      </div>
                      <div className="workspace-progress-track">
                        <span style={{ width: `${bar.value}%` }} />
                      </div>
                      <p>{bar.summary}</p>
                    </article>
                  ))}
                </div>
              </article>

              <article className="workspace-panel" data-reveal data-reveal-delay="90ms">
                <div className="workspace-panel-heading">
                  <div>
                    <span className="workspace-section-label">Perhatian Cepat</span>
                    <h2>Alert operasional</h2>
                  </div>
                </div>

                <div className="workspace-card-list">
                  {activityAlerts.map((alert) => (
                    <article key={alert} className="workspace-subcard">
                      <p>{alert}</p>
                    </article>
                  ))}
                </div>
              </article>
            </section>
          </section>
        )}

        {!isLoading && !error && activeSection === 'pelamar' && (
          <section id="pelamar" className="workspace-section-stack">
            <section className="workspace-two-column-grid">
              <article className="workspace-panel" data-reveal>
                <div className="workspace-panel-heading">
                  <div>
                    <span className="workspace-section-label">Database Pelamar</span>
                    <h2>Pelamar terbaru dan status terakhir</h2>
                  </div>
                </div>

                <div className="workspace-table">
                  <div className="workspace-table-row workspace-table-row-head">
                    <span>Nama</span>
                    <span>Email</span>
                    <span>Lamaran</span>
                    <span>Status terakhir</span>
                    <span>Lowongan terakhir</span>
                  </div>
                  {candidateTable.length === 0 ? (
                    <div className="workspace-table-row">
                      <span>Belum ada data pelamar.</span>
                    </div>
                  ) : (
                    candidateTable.map((candidate) => (
                      <div key={candidate.id} className="workspace-table-row">
                        <span>{candidate.name}</span>
                        <span>{candidate.email}</span>
                        <span>{numberFormatter.format(candidate.applications_count ?? 0)}</span>
                        <span>{formatApplicationStatus(candidate.latest_application_status)}</span>
                        <span>{candidate.latest_job_title || '-'}</span>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="workspace-panel" data-reveal data-reveal-delay="70ms">
                <div className="workspace-panel-heading">
                  <div>
                    <span className="workspace-section-label">Lamaran Terbaru</span>
                    <h2>Aktivitas kandidat paling baru</h2>
                  </div>
                </div>

                <div className="workspace-card-list">
                  {applications.length === 0 ? (
                    <article className="workspace-subcard">
                      <p>Belum ada lamaran terbaru.</p>
                    </article>
                  ) : (
                    applications.map((application) => (
                      <article key={application.id} className="workspace-subcard">
                        <div className="workspace-subcard-heading">
                          <strong>{application.candidate?.name || 'Kandidat'}</strong>
                          <span>{formatApplicationStatus(application.status)}</span>
                        </div>
                        <p>
                          Melamar ke <strong>{application.job?.title || '-'}</strong> milik{' '}
                          <strong>{application.recruiter?.name || '-'}</strong>.
                        </p>
                        <small>{formatDateTime(application.applied_at)}</small>
                      </article>
                    ))
                  )}
                </div>
              </article>
            </section>
          </section>
        )}

        {!isLoading && !error && activeSection === 'recruiter' && (
          <section className="workspace-two-column-grid">
            <article className="workspace-panel" data-reveal>
              <div className="workspace-panel-heading">
                <div>
                  <span className="workspace-section-label">Recruiter & Company</span>
                  <h2>Recruiter terbaru dan aktivitas lowongan</h2>
                </div>
              </div>

              <div className="workspace-card-list">
                {recruiterTable.length === 0 ? (
                  <article className="workspace-subcard">
                    <p>Belum ada recruiter yang terdaftar.</p>
                  </article>
                ) : (
                  recruiterTable.map((recruiter) => (
                    <article key={recruiter.id} className="workspace-subcard">
                      <div className="workspace-subcard-heading">
                        <strong>{recruiter.name}</strong>
                        <span>{recruiter.email}</span>
                      </div>
                      <p>
                        {numberFormatter.format(recruiter.active_jobs_count ?? 0)} lowongan aktif dari{' '}
                        {numberFormatter.format(recruiter.jobs_count ?? 0)} total lowongan.
                      </p>
                      <small>
                        Lowongan terakhir: {recruiter.latest_job_title || '-'} pada{' '}
                        {formatDateTime(recruiter.latest_job_created_at)}
                      </small>
                    </article>
                  ))
                )}
              </div>
            </article>

            <article className="workspace-panel" data-reveal data-reveal-delay="70ms">
              <div className="workspace-panel-heading">
                <div>
                  <span className="workspace-section-label">Kontrol Akses</span>
                  <h2>Role yang aktif di sistem</h2>
                </div>
                <p>
                  Model akses saat ini dipisahkan tegas antara candidate, recruiter, dan
                  superadmin agar otorisasi tetap jelas.
                </p>
              </div>

              <div className="workspace-chip-wrap">
                <span className="workspace-chip">Candidate</span>
                <span className="workspace-chip">Recruiter</span>
                <span className="workspace-chip">Superadmin</span>
              </div>
            </article>
          </section>
        )}

        {!isLoading && !error && activeSection === 'lowongan' && (
          <section className="workspace-section-stack">
            <article className="workspace-panel" data-reveal>
              <div className="workspace-panel-heading">
                <div>
                  <span className="workspace-section-label">Lowongan Terbaru</span>
                  <h2>Status lowongan dan performa lamaran</h2>
                </div>
              </div>

              <div className="workspace-kpi-grid">
                <article className="workspace-kpi-card">
                  <span>Total lowongan</span>
                  <strong>{numberFormatter.format(totals.total_jobs ?? 0)}</strong>
                  <small>Seluruh lowongan yang tersimpan di sistem</small>
                </article>
                <article className="workspace-kpi-card">
                  <span>Lowongan aktif</span>
                  <strong>{numberFormatter.format(totals.active_jobs ?? 0)}</strong>
                  <small>Lowongan yang tampil untuk kandidat</small>
                </article>
                <article className="workspace-kpi-card">
                  <span>Lowongan nonaktif</span>
                  <strong>{numberFormatter.format(totals.inactive_jobs ?? 0)}</strong>
                  <small>Dapat dimoderasi atau diaktifkan kembali</small>
                </article>
                <article className="workspace-kpi-card">
                  <span>Total lamaran</span>
                  <strong>{numberFormatter.format(totals.total_applications ?? 0)}</strong>
                  <small>Akumulasi seluruh job application</small>
                </article>
              </div>
            </article>

            <article className="workspace-panel" data-reveal data-reveal-delay="60ms">
              <div className="workspace-table">
                <div className="workspace-table-row workspace-table-row-head">
                  <span>Judul</span>
                  <span>Recruiter</span>
                  <span>Lokasi</span>
                  <span>Status</span>
                  <span>Lamaran</span>
                </div>
                {jobs.length === 0 ? (
                  <div className="workspace-table-row">
                    <span>Belum ada lowongan.</span>
                  </div>
                ) : (
                  jobs.map((job) => (
                    <div key={job.id} className="workspace-table-row">
                      <span>{job.title}</span>
                      <span>{job.recruiter?.name || '-'}</span>
                      <span>{job.location || '-'}</span>
                      <span>{formatJobStatus(job.status)}</span>
                      <span>{numberFormatter.format(job.applications_count ?? 0)}</span>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>
        )}

        {!isLoading && !error && activeSection === 'analytics' && (
          <section className="workspace-panel" data-reveal>
            <div className="workspace-panel-heading">
              <div>
                <span className="workspace-section-label">Analytics Ringkas</span>
                <h2>Rasio yang paling relevan untuk superadmin</h2>
              </div>
              <p>
                Fokus awal dashboard analytics adalah volume user, volume lowongan, dan outcome
                lamaran yang benar-benar ada di database saat ini.
              </p>
            </div>

            <div className="workspace-kpi-grid">
              {analyticsCards.map((item) => (
                <article key={item.label} className="workspace-kpi-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </section>
        )}

        {!isLoading && !error && activeSection === 'moderation' && (
          <section id="moderasi" className="workspace-two-column-grid">
            <article className="workspace-panel" data-reveal>
              <div className="workspace-panel-heading">
                <div>
                  <span className="workspace-section-label">Moderasi Lowongan</span>
                  <h2>Lowongan yang perlu perhatian</h2>
                </div>
                <p>
                  Prioritas awal moderasi difokuskan pada lowongan nonaktif atau lowongan yang
                  belum menerima lamaran sama sekali.
                </p>
              </div>

              <div className="workspace-card-list">
                {moderationItems.length === 0 ? (
                  <article className="workspace-subcard">
                    <p>Tidak ada lowongan yang membutuhkan perhatian khusus saat ini.</p>
                  </article>
                ) : (
                  moderationItems.map((job) => (
                    <article key={job.id} className="workspace-subcard">
                      <div className="workspace-subcard-heading">
                        <strong>{job.title}</strong>
                        <span>{formatJobStatus(job.status)}</span>
                      </div>
                      <p>
                        Recruiter: <strong>{job.recruiter?.name || '-'}</strong> | Lokasi:{' '}
                        <strong>{job.location || '-'}</strong>
                      </p>
                      <small>
                        {numberFormatter.format(job.applications_count ?? 0)} lamaran masuk.
                      </small>
                    </article>
                  ))
                )}
              </div>
            </article>

            <article className="workspace-panel" data-reveal data-reveal-delay="70ms">
              <div className="workspace-panel-heading">
                <div>
                  <span className="workspace-section-label">Review Lamaran</span>
                  <h2>Lamaran yang masih pending</h2>
                </div>
              </div>

              <div className="workspace-card-list">
                {applications.filter((application) => application.status === 'pending').length === 0 ? (
                  <article className="workspace-subcard">
                    <p>Tidak ada lamaran pending untuk dimonitor saat ini.</p>
                  </article>
                ) : (
                  applications
                    .filter((application) => application.status === 'pending')
                    .map((application) => (
                      <article key={application.id} className="workspace-subcard">
                        <div className="workspace-subcard-heading">
                          <strong>{application.candidate?.name || 'Kandidat'}</strong>
                          <span>{application.job?.title || '-'}</span>
                        </div>
                        <p>
                          Recruiter tujuan: <strong>{application.recruiter?.name || '-'}</strong>
                        </p>
                        <small>{formatDateTime(application.applied_at)}</small>
                      </article>
                    ))
                )}
              </div>
            </article>
          </section>
        )}
      </main>
    </div>
  );
};

export default AdminDashboardPage;
