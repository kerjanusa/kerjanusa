import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import AdminService from '../services/adminService.js';
import { APP_ROUTES } from '../utils/routeHelpers.js';
import '../styles/workspace.css';
import '../styles/adminDashboard.css';

const ADMIN_SECTION_OPTIONS = [
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'pelamar', label: 'Pelamar' },
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'lowongan', label: 'Lowongan' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'moderation', label: 'Moderasi' },
];

const ADMIN_TOP_NAV_OPTIONS = ADMIN_SECTION_OPTIONS.filter(({ value }) =>
  ['monitoring', 'pelamar', 'recruiter', 'lowongan'].includes(value)
);

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

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'SA';

const getSyncState = (isLoading, error, applications, jobs) => {
  if (isLoading) {
    return {
      tone: 'loading',
      eyebrow: 'Sinkronisasi data',
      title: 'Dashboard superadmin sedang disiapkan',
      description:
        'Data kandidat, recruiter, lowongan, dan lamaran sedang ditarik dari backend.',
      actionLabel: null,
    };
  }

  if (error) {
    return {
      tone: 'error',
      eyebrow: 'Gagal memuat',
      title: 'Dashboard superadmin belum bisa ditampilkan',
      description:
        'Maaf, kami mengalami kendala teknis saat menyinkronkan data terbaru. Mohon coba segarkan halaman.',
      actionLabel: 'Muat ulang',
    };
  }

  return {
    tone: 'success',
    eyebrow: 'Sinkronisasi aktif',
    title: 'Data superadmin sudah terhubung real-time',
    description: `${applications.length} aktivitas lamaran dan ${jobs.length} lowongan terbaru siap dipantau dari panel ini.`,
    actionLabel: 'Refresh Data',
  };
};

const getSectionIntro = (section) => {
  switch (section) {
    case 'pelamar':
      return {
        eyebrow: 'Database pelamar',
        title: 'Kontrol kandidat secara langsung',
        description:
          'Pantau kesiapan profil, stage lamaran terakhir, lalu suspend atau kirim reset password tanpa keluar dari panel.',
      };
    case 'recruiter':
      return {
        eyebrow: 'Database recruiter',
        title: 'Pantau recruiter dan company profile',
        description:
          'Lihat recruiter yang belum siap publish, akun yang dinonaktifkan, dan kirim reset password saat diperlukan.',
      };
    case 'lowongan':
      return {
        eyebrow: 'Kontrol lowongan',
        title: 'Status lowongan dan alih recruiter',
        description:
          'Superadmin bisa meninjau lifecycle lowongan lalu memindahkan tanggung jawabnya ke recruiter aktif lain.',
      };
    case 'analytics':
      return {
        eyebrow: 'Analytics platform',
        title: 'Rasio utama yang perlu diawasi',
        description:
          'Fokus awal tetap ke volume user, lowongan aktif, acceptance rate, dan penurunan yang perlu ditindaklanjuti.',
      };
    case 'moderation':
      return {
        eyebrow: 'Moderasi operasional',
        title: 'Item yang perlu perhatian cepat',
        description:
          'Lihat lowongan yang macet dan lamaran yang masih pending agar operasi recruiter tetap bergerak.',
      };
    case 'monitoring':
    default:
      return {
        eyebrow: 'Superadmin KerjaNusa',
        title: 'Pusat kontrol candidate, recruiter, dan lowongan',
        description:
          'Panel ini sekarang bukan hanya monitoring. Superadmin bisa memantau, menonaktifkan akun, mengirim reset password, dan memindahkan lowongan antar recruiter aktif secara real-time.',
      };
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
          next[key] = next[key] || (job.recruiter?.id ? String(job.recruiter.id) : '');
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
        key: 'pelamar',
        label: 'Pelamar aktif',
        value: totals.candidates ?? 0,
        detail: `+${growth.new_candidates_last_7_days ?? 0} akun baru dalam 7 hari`,
      },
      {
        key: 'recruiter',
        label: 'Recruiter aktif',
        value: totals.recruiters ?? 0,
        detail: `${suspendedRecruiters} recruiter sedang dinonaktifkan`,
      },
      {
        key: 'lowongan',
        label: 'Lowongan aktif',
        value: totals.active_jobs ?? 0,
        detail: `${totals.inactive_jobs ?? 0} lowongan publik sedang nonaktif`,
      },
      {
        key: 'lamaran',
        label: 'Lamaran masuk',
        value: totals.total_applications ?? 0,
        detail: `${totals.pending_applications ?? 0} masih menunggu review`,
      },
    ],
    [growth, suspendedRecruiters, totals]
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

  const activityItems = useMemo(() => {
    const applicationActivities = applications.map((application) => ({
      key: `application-${application.id}`,
      title: `${application.candidate?.name || 'Kandidat'} melamar ${application.job?.title || 'lowongan'}`,
      detail: `${formatApplicationStage(application.stage)} • ${
        application.recruiter?.name || 'Recruiter'
      }`,
      timestamp: application.applied_at,
      type: 'application',
    }));

    const jobActivities = jobs.map((job) => ({
      key: `job-${job.id}`,
      title: `${job.title} dipantau oleh ${job.recruiter?.name || 'recruiter'}`,
      detail: `${formatJobStatus(job)} • ${job.location || 'Lokasi belum diisi'}`,
      timestamp: job.created_at,
      type: 'job',
    }));

    return [...applicationActivities, ...jobActivities]
      .sort((firstItem, secondItem) => {
        const firstTime = new Date(firstItem.timestamp || 0).getTime();
        const secondTime = new Date(secondItem.timestamp || 0).getTime();
        return secondTime - firstTime;
      })
      .slice(0, 6);
  }, [applications, jobs]);

  const syncState = useMemo(
    () => getSyncState(isLoading, error, applications, jobs),
    [applications, error, isLoading, jobs]
  );

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

  const sectionIntro = getSectionIntro(activeSection);

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
    <div className="admin-action-row admin-action-row-compact">
      <button
        type="button"
        className="admin-btn admin-btn-muted"
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
        className="admin-btn admin-btn-outline"
        onClick={() => handleSendResetLink(account)}
        disabled={userResetActionInFlightId === account.id}
      >
        {userResetActionInFlightId === account.id ? 'Mengirim...' : 'Reset Password'}
      </button>
    </div>
  );

  const renderStatusPill = (label, tone = 'neutral') => (
    <span className={`admin-status-pill admin-status-pill-${tone}`}>{label}</span>
  );

  const renderMonitoringSection = () => (
    <>
      <section className="admin-monitoring-grid">
        <article className="admin-hero-card admin-card">
          <span className="admin-card-eyebrow">{sectionIntro.eyebrow}</span>
          <h1>{sectionIntro.title}</h1>
          <p>{sectionIntro.description}</p>
          <div className="admin-action-row">
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => loadDashboard(false)}
            >
              Refresh Data
            </button>
            <Link to={APP_ROUTES.platform} className="admin-btn admin-btn-outline admin-link-button">
              Lihat Profil KerjaNusa
            </Link>
          </div>
        </article>

        {overviewCards.map((card, index) => (
          <article
            key={card.key}
            className={`admin-stat-card admin-card admin-stat-card-${index + 1}`}
          >
            <span className="admin-stat-label">{card.label}</span>
            <strong className="admin-stat-value">{numberFormatter.format(card.value)}</strong>
            <small className="admin-stat-detail">{card.detail}</small>
          </article>
        ))}

        <article className={`admin-sync-card admin-card admin-sync-card-${syncState.tone}`}>
          <div className="admin-sync-icon" aria-hidden="true">
            {syncState.tone === 'error' ? '!' : syncState.tone === 'loading' ? '…' : '✓'}
          </div>
          <div className="admin-sync-copy">
            <span className="admin-card-eyebrow">{syncState.eyebrow}</span>
            <h2>{syncState.title}</h2>
            <p>{syncState.description}</p>
            {syncState.actionLabel && (
              <button
                type="button"
                className={`admin-btn ${
                  syncState.tone === 'error' ? 'admin-btn-warning' : 'admin-btn-outline'
                }`}
                onClick={() => loadDashboard()}
              >
                {syncState.actionLabel}
              </button>
            )}
          </div>
        </article>
      </section>

      <section className="admin-card admin-log-panel">
        <div className="admin-panel-head">
          <div>
            <h2>Log Aktivitas Terbaru</h2>
          </div>
          <button
            type="button"
            className="admin-inline-link"
            onClick={() => handleSectionChange('moderation')}
          >
            Lihat Semua
          </button>
        </div>
        <div className="admin-log-list">
          {activityItems.length === 0 ? (
            <div className="admin-empty-state">
              <div className="admin-empty-icon" aria-hidden="true">
                ⌁
              </div>
              <p>Belum ada aktivitas terbaru yang bisa ditampilkan.</p>
            </div>
          ) : (
            activityItems.map((item) => (
              <article key={item.key} className="admin-log-item">
                <div className={`admin-log-badge admin-log-badge-${item.type}`} aria-hidden="true">
                  {item.type === 'application' ? 'A' : 'J'}
                </div>
                <div className="admin-log-copy">
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
                <small>{formatDateTime(item.timestamp)}</small>
              </article>
            ))
          )}
        </div>
      </section>
    </>
  );

  const renderCandidateSection = () => (
    <section className="admin-section-stack">
      <article className="admin-card admin-section-intro">
        <span className="admin-card-eyebrow">{sectionIntro.eyebrow}</span>
        <h1>{sectionIntro.title}</h1>
        <p>{sectionIntro.description}</p>
      </article>

      <div className="admin-card-grid admin-card-grid-two">
        {candidateTable.length === 0 ? (
          <article className="admin-card admin-empty-panel">
            <p>Belum ada data pelamar.</p>
          </article>
        ) : (
          candidateTable.map((candidate) => (
            <article key={candidate.id} className="admin-card admin-entity-card">
              <div className="admin-entity-head">
                <div>
                  <h3>{candidate.name}</h3>
                  <p>{candidate.email}</p>
                </div>
                {renderStatusPill(
                  formatAccountStatus(candidate.account_status),
                  candidate.account_status === 'active' ? 'success' : 'danger'
                )}
              </div>

              <div className="admin-entity-metadata">
                {renderStatusPill(
                  candidate.profile_ready ? 'Siap melamar' : 'Belum siap',
                  candidate.profile_ready ? 'success' : 'warning'
                )}
                {renderStatusPill(
                  formatApplicationStage(candidate.latest_application_stage),
                  candidate.latest_application_stage ? 'neutral' : 'muted'
                )}
              </div>

              <dl className="admin-entity-list">
                <div>
                  <dt>Lamaran</dt>
                  <dd>{numberFormatter.format(candidate.applications_count ?? 0)}</dd>
                </div>
                <div>
                  <dt>Lowongan terakhir</dt>
                  <dd>{candidate.latest_job_title || '-'}</dd>
                </div>
              </dl>

              <p className="admin-entity-note">
                {candidate.account_status_reason ||
                  `Terakhir aktif pada ${formatDateTime(candidate.latest_applied_at || candidate.created_at)}`}
              </p>

              {renderUserActions(candidate)}
            </article>
          ))
        )}
      </div>
    </section>
  );

  const renderRecruiterSection = () => (
    <section className="admin-section-stack">
      <article className="admin-card admin-section-intro">
        <span className="admin-card-eyebrow">{sectionIntro.eyebrow}</span>
        <h1>{sectionIntro.title}</h1>
        <p>{sectionIntro.description}</p>
      </article>

      <div className="admin-card-grid admin-card-grid-two">
        {recruiterTable.length === 0 ? (
          <article className="admin-card admin-empty-panel">
            <p>Belum ada recruiter yang terdaftar.</p>
          </article>
        ) : (
          recruiterTable.map((recruiter) => (
            <article key={recruiter.id} className="admin-card admin-entity-card">
              <div className="admin-entity-head">
                <div>
                  <h3>{recruiter.name}</h3>
                  <p>{recruiter.company_name || recruiter.email}</p>
                </div>
                {renderStatusPill(
                  formatAccountStatus(recruiter.account_status),
                  recruiter.account_status === 'active' ? 'success' : 'danger'
                )}
              </div>

              <div className="admin-entity-metadata">
                {renderStatusPill(
                  recruiter.profile_ready ? 'Siap publish' : 'Belum siap',
                  recruiter.profile_ready ? 'success' : 'warning'
                )}
                {renderStatusPill(
                  `${numberFormatter.format(recruiter.active_jobs_count ?? 0)} lowongan aktif`,
                  'neutral'
                )}
              </div>

              <dl className="admin-entity-list">
                <div>
                  <dt>Total lowongan</dt>
                  <dd>{numberFormatter.format(recruiter.jobs_count ?? 0)}</dd>
                </div>
                <div>
                  <dt>Terakhir publish</dt>
                  <dd>{recruiter.latest_job_title || '-'}</dd>
                </div>
              </dl>

              <p className="admin-entity-note">
                {recruiter.account_status_reason ||
                  `Update terakhir ${formatDateTime(recruiter.latest_job_created_at || recruiter.created_at)}`}
              </p>

              {renderUserActions(recruiter)}
            </article>
          ))
        )}
      </div>
    </section>
  );

  const renderJobsSection = () => (
    <section className="admin-section-stack">
      <article className="admin-card admin-section-intro">
        <span className="admin-card-eyebrow">{sectionIntro.eyebrow}</span>
        <h1>{sectionIntro.title}</h1>
        <p>{sectionIntro.description}</p>
      </article>

      <div className="admin-card-grid">
        {jobs.length === 0 ? (
          <article className="admin-card admin-empty-panel">
            <p>Belum ada lowongan yang tercatat.</p>
          </article>
        ) : (
          jobs.map((job) => {
            const selectedRecruiterId = jobReassignments[String(job.id)] || '';

            return (
              <article key={job.id} className="admin-card admin-job-card">
                <div className="admin-entity-head">
                  <div>
                    <h3>{job.title}</h3>
                    <p>{job.location || 'Lokasi belum diisi'}</p>
                  </div>
                  {renderStatusPill(formatJobStatus(job), job.workflow_status === 'active' ? 'success' : 'warning')}
                </div>

                <div className="admin-entity-metadata">
                  {renderStatusPill(`${numberFormatter.format(job.applications_count ?? 0)} lamaran`, 'neutral')}
                  {renderStatusPill(job.recruiter?.name || 'Recruiter belum terbaca', 'muted')}
                </div>

                <label className="admin-field">
                  <span>Alihkan ke recruiter aktif</span>
                  <select
                    value={selectedRecruiterId}
                    onChange={(event) =>
                      setJobReassignments((current) => ({
                        ...current,
                        [String(job.id)]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Pilih recruiter aktif</option>
                    {recruiterOptions.map((recruiter) => (
                      <option key={recruiter.id} value={String(recruiter.id)}>
                        {recruiter.company_name || recruiter.name} ({recruiter.email})
                      </option>
                    ))}
                  </select>
                </label>

                <div className="admin-action-row">
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={() => handleReassignJob(job)}
                    disabled={jobActionInFlightId === job.id}
                  >
                    {jobActionInFlightId === job.id ? 'Memindahkan...' : 'Alihkan'}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );

  const renderAnalyticsSection = () => (
    <section className="admin-section-stack">
      <article className="admin-card admin-section-intro">
        <span className="admin-card-eyebrow">{sectionIntro.eyebrow}</span>
        <h1>{sectionIntro.title}</h1>
        <p>{sectionIntro.description}</p>
      </article>

      <div className="admin-card-grid admin-card-grid-three">
        {analyticsCards.map((item) => (
          <article key={item.label} className="admin-card admin-stat-card admin-stat-card-inline">
            <span className="admin-stat-label">{item.label}</span>
            <strong className="admin-stat-value">{item.value}</strong>
          </article>
        ))}
      </div>

      <article className="admin-card admin-metrics-panel">
        <div className="admin-panel-head">
          <div>
            <h2>Rasio Operasional Inti</h2>
          </div>
        </div>

        <div className="admin-progress-list">
          {performanceBars.map((bar) => (
            <article key={bar.label} className="admin-progress-card">
              <div className="admin-progress-head">
                <strong>{bar.label}</strong>
                <span>{bar.value}%</span>
              </div>
              <div className="admin-progress-track">
                <span style={{ width: `${bar.value}%` }} />
              </div>
              <p>{bar.summary}</p>
            </article>
          ))}
        </div>
      </article>
    </section>
  );

  const renderModerationSection = () => (
    <section className="admin-section-stack">
      <article className="admin-card admin-section-intro">
        <span className="admin-card-eyebrow">{sectionIntro.eyebrow}</span>
        <h1>{sectionIntro.title}</h1>
        <p>{sectionIntro.description}</p>
      </article>

      <div className="admin-card-grid admin-card-grid-two">
        <article className="admin-card admin-list-panel">
          <div className="admin-panel-head">
            <div>
              <h2>Lowongan Perlu Perhatian</h2>
            </div>
          </div>
          <div className="admin-list-stack">
            {moderationItems.length === 0 ? (
              <p className="admin-empty-copy">Tidak ada lowongan yang membutuhkan perhatian khusus.</p>
            ) : (
              moderationItems.map((job) => (
                <article key={job.id} className="admin-list-row">
                  <div>
                    <strong>{job.title}</strong>
                    <p>{job.recruiter?.name || '-'} • {job.location || '-'}</p>
                  </div>
                  {renderStatusPill(formatJobStatus(job), job.workflow_status === 'active' ? 'success' : 'warning')}
                </article>
              ))
            )}
          </div>
        </article>

        <article className="admin-card admin-list-panel">
          <div className="admin-panel-head">
            <div>
              <h2>Lamaran Pending</h2>
            </div>
          </div>
          <div className="admin-list-stack">
            {pendingApplications.length === 0 ? (
              <p className="admin-empty-copy">Tidak ada lamaran pending untuk dimonitor saat ini.</p>
            ) : (
              pendingApplications.map((application) => (
                <article key={application.id} className="admin-list-row">
                  <div>
                    <strong>{application.candidate?.name || 'Kandidat'}</strong>
                    <p>{application.job?.title || '-'} • {application.recruiter?.name || '-'}</p>
                  </div>
                  {renderStatusPill(formatApplicationStatus(application.status), 'warning')}
                </article>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'pelamar':
        return renderCandidateSection();
      case 'recruiter':
        return renderRecruiterSection();
      case 'lowongan':
        return renderJobsSection();
      case 'analytics':
        return renderAnalyticsSection();
      case 'moderation':
        return renderModerationSection();
      case 'monitoring':
      default:
        return renderMonitoringSection();
    }
  };

  return (
    <div className="admin-dashboard-page">
      <div className="admin-dashboard-strip">
        Konten ini dibuat oleh pengguna Stitch. Jangan masukkan informasi sensitif karena dapat
        dilihat oleh pemilik.
      </div>

      <div className="admin-dashboard-shell">
        <aside className="admin-dashboard-sidebar">
          <div className="admin-sidebar-brand">
            <strong>KerjaNusa</strong>
            <span>Superadmin Dashboard</span>
          </div>

          <nav className="admin-sidebar-nav" aria-label="Navigasi superadmin">
            {ADMIN_SECTION_OPTIONS.map((section) => (
              <button
                key={section.value}
                type="button"
                className={`admin-sidebar-link${
                  activeSection === section.value ? ' is-active' : ''
                }`}
                onClick={() => handleSectionChange(section.value)}
              >
                <span className="admin-sidebar-link-icon" aria-hidden="true" />
                <span>{section.label}</span>
              </button>
            ))}
          </nav>

          <div className="admin-sidebar-footer">
            <button
              type="button"
              className="admin-sidebar-post-job"
              onClick={() => handleSectionChange('lowongan')}
            >
              Post Job
            </button>

            <div className="admin-sidebar-profile">
              <div className="admin-sidebar-avatar" aria-hidden="true">
                {getInitials(user?.name)}
              </div>
              <div>
                <strong>{user?.name || 'Superadmin KerjaNusa'}</strong>
                <span>Superadmin Profile</span>
              </div>
            </div>
          </div>
        </aside>

        <section className="admin-dashboard-main">
          <header className="admin-main-header">
            <div className="admin-main-brand">KerjaNusa</div>

            <nav className="admin-main-tabs" aria-label="Tab superadmin">
              {ADMIN_TOP_NAV_OPTIONS.map((section) => (
                <button
                  key={section.value}
                  type="button"
                  className={`admin-main-tab${
                    activeSection === section.value ? ' is-active' : ''
                  }`}
                  onClick={() => handleSectionChange(section.value)}
                >
                  {section.label}
                </button>
              ))}
            </nav>

            <div className="admin-main-user">
              <div className="admin-main-user-copy">
                <strong>{(user?.name || 'Nama Superadmin').toUpperCase()}</strong>
                <span>Superadmin</span>
              </div>
              <button
                type="button"
                className="admin-logout-pill"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Logout...' : 'Logout'}
              </button>
            </div>
          </header>

          <main className="admin-dashboard-content">
            {feedback && (
              <div className={`admin-feedback admin-feedback-${feedback.type}`}>
                {feedback.message}
              </div>
            )}
            {renderActiveSection()}
          </main>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
