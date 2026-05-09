import { useCallback, useEffect, useMemo, useState } from 'react';
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

const formatApplicationStage = (stage) => {
  switch (stage) {
    case 'applied':
      return 'Pelamar masuk';
    case 'screening':
      return 'Screening';
    case 'shortlisted':
      return 'Shortlist';
    case 'interview':
      return 'Interview';
    case 'offering':
      return 'Offering';
    case 'hired':
      return 'Hired';
    case 'rejected':
      return 'Tidak lanjut';
    case 'withdrawn':
      return 'Dibatalkan kandidat';
    default:
      return stage || '-';
  }
};

const formatJobStatus = (job) => {
  switch (job?.workflow_status || job?.status) {
    case 'active':
      return 'Aktif';
    case 'draft':
      return 'Draft';
    case 'paused':
      return 'Dijeda';
    case 'closed':
      return 'Ditutup';
    case 'filled':
      return 'Hiring selesai';
    default:
      return job?.status === 'inactive' ? 'Nonaktif' : job?.workflow_status || job?.status || '-';
  }
};

const formatAccountStatus = (status) => {
  switch (status) {
    case 'active':
      return 'Aktif';
    case 'suspended':
      return 'Dinonaktifkan';
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

const getToneClass = (tone) => `workspace-status-pill workspace-status-pill-${tone}`;

const getAccountStatusTone = (status) => (status === 'active' ? 'success' : 'danger');
const getProfileTone = (isReady) => (isReady ? 'success' : 'warning');

const getJobTone = (job) => {
  switch (job?.workflow_status || job?.status) {
    case 'active':
      return 'success';
    case 'draft':
      return 'muted';
    case 'paused':
      return 'warning';
    case 'closed':
    case 'filled':
      return 'danger';
    default:
      return 'muted';
  }
};

const getApplicationTone = (application) => {
  switch (application?.stage || application?.status) {
    case 'hired':
      return 'success';
    case 'interview':
    case 'offering':
    case 'shortlisted':
      return 'primary';
    case 'screening':
      return 'warning';
    case 'rejected':
    case 'withdrawn':
      return 'danger';
    default:
      return 'muted';
  }
};

const AdminDashboardPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState(resolveAdminSectionFromHash(location.hash));
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userStatusActionInFlightId, setUserStatusActionInFlightId] = useState(null);
  const [userResetActionInFlightId, setUserResetActionInFlightId] = useState(null);
  const [jobActionInFlightId, setJobActionInFlightId] = useState(null);
  const [jobReassignments, setJobReassignments] = useState({});

  useEffect(() => {
    setActiveSection(resolveAdminSectionFromHash(location.hash));
  }, [location.hash]);

  const loadDashboard = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setError('');

    try {
      const response = await AdminService.getDashboard();
      setDashboard(response);
      setJobReassignments((current) => {
        const next = { ...current };

        (response.jobs || []).forEach((job) => {
          const key = String(job.id);

          if (!next[key]) {
            next[key] = job.recruiter?.id ? String(job.recruiter.id) : '';
          }
        });

        return next;
      });
    } catch (loadError) {
      setError(loadError?.message || 'Gagal memuat dashboard superadmin.');
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const totals = dashboard?.totals ?? {};
  const growth = dashboard?.growth ?? {};
  const candidateTable = dashboard?.candidate_table ?? [];
  const recruiterTable = dashboard?.recruiter_table ?? [];
  const recruiterOptions = dashboard?.recruiter_options ?? [];
  const jobs = dashboard?.jobs ?? [];
  const applications = dashboard?.applications ?? [];
  const suspendedCandidates = candidateTable.filter(
    (candidate) => candidate.account_status === 'suspended'
  ).length;
  const suspendedRecruiters = recruiterTable.filter(
    (recruiter) => recruiter.account_status === 'suspended'
  ).length;

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
        detail: `${suspendedRecruiters} recruiter sedang dinonaktifkan`,
      },
      {
        label: 'Lowongan Aktif',
        value: totals.active_jobs ?? 0,
        detail: `${totals.inactive_jobs ?? 0} lowongan publik sedang nonaktif`,
      },
      {
        label: 'Lamaran Masuk',
        value: totals.total_applications ?? 0,
        detail: `${totals.pending_applications ?? 0} masih menunggu review`,
      },
    ],
    [growth, suspendedRecruiters, totals]
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
      `${suspendedCandidates} pelamar dan ${suspendedRecruiters} recruiter sedang dinonaktifkan.`,
      `${growth.new_jobs_last_7_days ?? 0} lowongan baru dibuat dalam 7 hari terakhir.`,
    ],
    [growth, suspendedCandidates, suspendedRecruiters, totals]
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
        label: 'Pelamar dinonaktifkan',
        value: numberFormatter.format(suspendedCandidates),
      },
      {
        label: 'Recruiter dinonaktifkan',
        value: numberFormatter.format(suspendedRecruiters),
      },
      {
        label: 'Akun superadmin',
        value: numberFormatter.format(totals.superadmins ?? 0),
      },
    ];
  }, [suspendedCandidates, suspendedRecruiters, totals]);

  const moderationItems = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.workflow_status !== 'active' ||
          job.status !== 'active' ||
          Number(job.applications_count) === 0
      ),
    [jobs]
  );

  const pendingApplications = useMemo(
    () => applications.filter((application) => application.status === 'pending'),
    [applications]
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

  const handleUserStatusToggle = async (account) => {
    const targetStatus = account.account_status === 'active' ? 'suspended' : 'active';

    setUserStatusActionInFlightId(account.id);

    try {
      await AdminService.updateUser(account.id, {
        account_status: targetStatus,
        account_status_reason:
          targetStatus === 'suspended'
            ? 'Akun dinonaktifkan sementara oleh superadmin KerjaNusa.'
            : '',
      });
      await loadDashboard(false);
      setFeedback({
        type: 'success',
        message: `${account.name} sekarang berstatus ${formatAccountStatus(targetStatus).toLowerCase()}.`,
      });
    } catch (actionError) {
      setFeedback({
        type: 'error',
        message: actionError?.message || 'Status akun belum berhasil diperbarui.',
      });
    } finally {
      setUserStatusActionInFlightId(null);
    }
  };

  const handleSendResetLink = async (account) => {
    setUserResetActionInFlightId(account.id);

    try {
      await AdminService.sendResetLink(account.id);
      setFeedback({
        type: 'success',
        message: `Link reset password berhasil dikirim ke ${account.email}.`,
      });
    } catch (actionError) {
      setFeedback({
        type: 'error',
        message: actionError?.message || 'Link reset password belum berhasil dikirim.',
      });
    } finally {
      setUserResetActionInFlightId(null);
    }
  };

  const handleReassignJob = async (job) => {
    const selectedRecruiterId = jobReassignments[String(job.id)] || '';

    if (!selectedRecruiterId) {
      setFeedback({
        type: 'error',
        message: 'Pilih recruiter tujuan terlebih dahulu.',
      });
      return;
    }

    setJobActionInFlightId(job.id);

    try {
      await AdminService.reassignJob(job.id, Number(selectedRecruiterId));
      await loadDashboard(false);
      setFeedback({
        type: 'success',
        message: `${job.title} berhasil dipindahkan ke recruiter baru.`,
      });
    } catch (actionError) {
      setFeedback({
        type: 'error',
        message: actionError?.message || 'Lowongan belum berhasil dipindahkan.',
      });
    } finally {
      setJobActionInFlightId(null);
    }
  };

  const renderUserActions = (account) => (
    <div className="workspace-action-row">
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => handleUserStatusToggle(account)}
        disabled={userStatusActionInFlightId === account.id}
      >
        {userStatusActionInFlightId === account.id
          ? 'Memproses...'
          : account.account_status === 'active'
            ? 'Suspend'
            : 'Aktifkan'}
      </button>
      <button
        type="button"
        className="btn btn-outline"
        onClick={() => handleSendResetLink(account)}
        disabled={userResetActionInFlightId === account.id}
      >
        {userResetActionInFlightId === account.id ? 'Mengirim...' : 'Kirim Reset Password'}
      </button>
    </div>
  );

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
        <button type="button" className="btn btn-primary" onClick={() => loadDashboard()}>
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
            <h1>Pusat kontrol candidate, recruiter, dan lowongan</h1>
            <p>
              Panel ini sekarang bukan hanya monitoring. Superadmin bisa memantau, menonaktifkan
              akun, mengirim reset password, dan memindahkan lowongan antar recruiter aktif.
            </p>
            <div className="workspace-action-row">
              <button type="button" className="btn btn-primary" onClick={() => loadDashboard(false)}>
                Refresh Data
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

        {feedback && (
          <div className={`${feedback.type === 'error' ? 'error' : 'success'} workspace-feedback`}>
            {feedback.message}
          </div>
        )}

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
                  Semua angka di bawah ini diambil langsung dari user, lowongan, dan lamaran yang
                  tersimpan di backend.
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
            <article className="workspace-panel" data-reveal>
              <div className="workspace-panel-heading">
                <div>
                  <span className="workspace-section-label">Kontrol Pelamar</span>
                  <h2>Profil, status akun, dan reset password</h2>
                </div>
                <p>
                  Superadmin bisa melihat kesiapan profil kandidat, stage lamaran terakhir, lalu
                  menonaktifkan atau memulihkan akun bila diperlukan.
                </p>
              </div>

              <div className="workspace-table">
                <div className="workspace-table-row workspace-table-row-head">
                  <span>Pelamar</span>
                  <span>Profil</span>
                  <span>Status akun</span>
                  <span>Lamaran</span>
                  <span>Stage terakhir</span>
                  <span>Aksi</span>
                </div>
                {candidateTable.length === 0 ? (
                  <div className="workspace-table-row">
                    <span>Belum ada data pelamar.</span>
                  </div>
                ) : (
                  candidateTable.map((candidate) => (
                    <div key={candidate.id} className="workspace-table-row">
                      <span>
                        <strong>{candidate.name}</strong>
                        <br />
                        {candidate.email}
                      </span>
                      <span>
                        <span className={getToneClass(getProfileTone(candidate.profile_ready))}>
                          {candidate.profile_ready ? 'Siap melamar' : 'Belum siap'}
                        </span>
                      </span>
                      <span>
                        <span className={getToneClass(getAccountStatusTone(candidate.account_status))}>
                          {formatAccountStatus(candidate.account_status)}
                        </span>
                        {candidate.account_status_reason && (
                          <>
                            <br />
                            <small>{candidate.account_status_reason}</small>
                          </>
                        )}
                      </span>
                      <span>{numberFormatter.format(candidate.applications_count ?? 0)}</span>
                      <span>{formatApplicationStage(candidate.latest_application_stage)}</span>
                      <span>{renderUserActions(candidate)}</span>
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
                        <span className={getToneClass(getApplicationTone(application))}>
                          {formatApplicationStage(application.stage)}
                        </span>
                      </div>
                      <p>
                        Melamar ke <strong>{application.job?.title || '-'}</strong> milik{' '}
                        <strong>{application.recruiter?.name || '-'}</strong>.
                      </p>
                      <small>
                        {formatApplicationStatus(application.status)} • {formatDateTime(application.applied_at)}
                      </small>
                    </article>
                  ))
                )}
              </div>
            </article>
          </section>
        )}

        {!isLoading && !error && activeSection === 'recruiter' && (
          <section className="workspace-section-stack">
            <article className="workspace-panel" data-reveal>
              <div className="workspace-panel-heading">
                <div>
                  <span className="workspace-section-label">Kontrol Recruiter</span>
                  <h2>Profil company, status akun, dan lowongan</h2>
                </div>
                <p>
                  Area ini membantu superadmin memeriksa recruiter yang belum siap publish,
                  menonaktifkan akun bermasalah, dan mengirim reset password tanpa keluar dari panel.
                </p>
              </div>

              <div className="workspace-table">
                <div className="workspace-table-row workspace-table-row-head">
                  <span>Recruiter</span>
                  <span>Company</span>
                  <span>Profil</span>
                  <span>Status akun</span>
                  <span>Lowongan</span>
                  <span>Aksi</span>
                </div>
                {recruiterTable.length === 0 ? (
                  <div className="workspace-table-row">
                    <span>Belum ada recruiter yang terdaftar.</span>
                  </div>
                ) : (
                  recruiterTable.map((recruiter) => (
                    <div key={recruiter.id} className="workspace-table-row">
                      <span>
                        <strong>{recruiter.name}</strong>
                        <br />
                        {recruiter.email}
                      </span>
                      <span>{recruiter.company_name || '-'}</span>
                      <span>
                        <span className={getToneClass(getProfileTone(recruiter.profile_ready))}>
                          {recruiter.profile_ready ? 'Siap publish' : 'Belum siap'}
                        </span>
                      </span>
                      <span>
                        <span className={getToneClass(getAccountStatusTone(recruiter.account_status))}>
                          {formatAccountStatus(recruiter.account_status)}
                        </span>
                        {recruiter.account_status_reason && (
                          <>
                            <br />
                            <small>{recruiter.account_status_reason}</small>
                          </>
                        )}
                      </span>
                      <span>
                        {numberFormatter.format(recruiter.active_jobs_count ?? 0)} aktif dari{' '}
                        {numberFormatter.format(recruiter.jobs_count ?? 0)}
                      </span>
                      <span>{renderUserActions(recruiter)}</span>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>
        )}

        {!isLoading && !error && activeSection === 'lowongan' && (
          <section className="workspace-section-stack">
            <article className="workspace-panel" data-reveal>
              <div className="workspace-panel-heading">
                <div>
                  <span className="workspace-section-label">Kontrol Lowongan</span>
                  <h2>Status workflow dan pemindahan recruiter</h2>
                </div>
                <p>
                  Lowongan yang sudah tayang bisa dipantau statusnya, lalu dialihkan ke recruiter
                  aktif lain bila recruiter asal sedang dinonaktifkan atau berpindah tugas.
                </p>
              </div>

              <div className="workspace-table">
                <div className="workspace-table-row workspace-table-row-head">
                  <span>Judul</span>
                  <span>Recruiter sekarang</span>
                  <span>Status</span>
                  <span>Lamaran</span>
                  <span>Alihkan ke</span>
                  <span>Aksi</span>
                </div>
                {jobs.length === 0 ? (
                  <div className="workspace-table-row">
                    <span>Belum ada lowongan.</span>
                  </div>
                ) : (
                  jobs.map((job) => {
                    const selectedRecruiterId = jobReassignments[String(job.id)] || '';
                    const hasSelectedRecruiter = recruiterOptions.some(
                      (recruiter) => String(recruiter.id) === selectedRecruiterId
                    );

                    return (
                      <div key={job.id} className="workspace-table-row">
                        <span>
                          <strong>{job.title}</strong>
                          <br />
                          {job.location || '-'}
                        </span>
                        <span>{job.recruiter?.name || '-'}</span>
                        <span>
                          <span className={getToneClass(getJobTone(job))}>{formatJobStatus(job)}</span>
                        </span>
                        <span>{numberFormatter.format(job.applications_count ?? 0)}</span>
                        <span>
                          <select
                            className="recruiter-flow-select"
                            value={selectedRecruiterId}
                            onChange={(event) =>
                              setJobReassignments((current) => ({
                                ...current,
                                [String(job.id)]: event.target.value,
                              }))
                            }
                          >
                            {!hasSelectedRecruiter && job.recruiter?.id && (
                              <option value={String(job.recruiter.id)}>
                                {job.recruiter?.name || 'Recruiter saat ini'}
                              </option>
                            )}
                            <option value="">Pilih recruiter aktif</option>
                            {recruiterOptions.map((recruiter) => (
                              <option key={recruiter.id} value={String(recruiter.id)}>
                                {recruiter.company_name || recruiter.name} ({recruiter.email})
                              </option>
                            ))}
                          </select>
                        </span>
                        <span>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleReassignJob(job)}
                            disabled={jobActionInFlightId === job.id}
                          >
                            {jobActionInFlightId === job.id ? 'Memindahkan...' : 'Alihkan'}
                          </button>
                        </span>
                      </div>
                    );
                  })
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
                <h2>Rasio paling relevan untuk superadmin</h2>
              </div>
              <p>
                Fokus awal analytics tetap ke volume user, lowongan, dan outcome lamaran yang
                benar-benar ada di database saat ini.
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
                  <span className="workspace-section-label">Lowongan Perlu Perhatian</span>
                  <h2>Draft, nonaktif, atau belum ada pelamar</h2>
                </div>
                <p>
                  Area ini membantu superadmin menemukan lowongan yang macet, belum tersentuh, atau
                  perlu segera dialihkan ke recruiter lain.
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
                        <span className={getToneClass(getJobTone(job))}>{formatJobStatus(job)}</span>
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
                  <span className="workspace-section-label">Lamaran Pending</span>
                  <h2>Yang belum disentuh recruiter</h2>
                </div>
              </div>

              <div className="workspace-card-list">
                {pendingApplications.length === 0 ? (
                  <article className="workspace-subcard">
                    <p>Tidak ada lamaran pending untuk dimonitor saat ini.</p>
                  </article>
                ) : (
                  pendingApplications.map((application) => (
                    <article key={application.id} className="workspace-subcard">
                      <div className="workspace-subcard-heading">
                        <strong>{application.candidate?.name || 'Kandidat'}</strong>
                        <span className={getToneClass(getApplicationTone(application))}>
                          {formatApplicationStage(application.stage)}
                        </span>
                      </div>
                      <p>
                        <strong>{application.job?.title || '-'}</strong> • recruiter{' '}
                        <strong>{application.recruiter?.name || '-'}</strong>
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
