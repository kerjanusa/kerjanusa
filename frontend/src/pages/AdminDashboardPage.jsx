import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import AdminService from '../services/adminService.js';
import { APP_ROUTES } from '../utils/routeHelpers.js';
import '../styles/adminDashboard.css';

const SECTION_OPTIONS = [
  { value: 'monitoring', label: 'Monitoring', title: 'Pusat Kontrol KerjaNusa', shortTitle: 'Monitoring' },
  { value: 'pelamar', label: 'Pelamar', title: 'Manajemen Pelamar', shortTitle: 'Pelamar' },
  { value: 'recruiter', label: 'Recruiter', title: 'Recruiter Directory', shortTitle: 'Recruiter' },
  { value: 'lowongan', label: 'Lowongan', title: 'Manajemen Lowongan', shortTitle: 'Lowongan' },
  { value: 'analytics', label: 'Analytics', title: 'Analytics & Reporting', shortTitle: 'Analytics' },
  { value: 'moderation', label: 'Moderasi', title: 'Moderasi Konten', shortTitle: 'Moderasi' },
];

const MODERATION_TABS = [
  { value: 'all', label: 'Semua Laporan' },
  { value: 'job', label: 'Lowongan' },
  { value: 'profile', label: 'Profil' },
];

const ANALYTICS_MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP'];
const ANALYTICS_PERIOD_LABEL = 'Periode: Jan 2024 - Jun 2024';

const numberFormatter = new Intl.NumberFormat('id-ID');

const resolveSectionFromHash = (hash) => {
  const normalizedHash = hash.replace(/^#/, '');
  const normalizedValue = normalizedHash === 'moderasi' ? 'moderation' : normalizedHash;

  if (SECTION_OPTIONS.some((section) => section.value === normalizedValue)) {
    return normalizedValue;
  }

  return 'monitoring';
};

const getSectionRoute = (section) =>
  section === 'monitoring'
    ? APP_ROUTES.adminDashboard
    : `${APP_ROUTES.adminDashboard}#${section === 'moderation' ? 'moderasi' : section}`;

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

const formatDateShort = (value) => {
  if (!value) {
    return '-';
  }

  try {
    return new Date(value).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
};

const formatCompactNumber = (value = 0) => {
  const numericValue = Number(value || 0);

  if (numericValue >= 1000000) {
    return `${(numericValue / 1000000).toFixed(1)}jt`;
  }

  if (numericValue >= 1000) {
    return `${(numericValue / 1000).toFixed(1)}k`;
  }

  return numberFormatter.format(numericValue);
};

const formatPercentage = (value = 0) => `${Number(value || 0).toFixed(1)}%`;

const getInitials = (value = '') =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'SA';

const downloadCsv = (filename, rows) => {
  if (typeof window === 'undefined' || !Array.isArray(rows) || rows.length === 0) {
    return;
  }

  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

const normalizeText = (value = '') => String(value || '').trim().toLowerCase();

const createTrendPoints = (baseValue, monthlyGain, stepOffset = 0) => {
  const safeBase = Math.max(20, Number(baseValue || 0));
  const normalizedGain = Math.max(2, Number(monthlyGain || 0));
  const startingValue = safeBase * 0.52;

  return ANALYTICS_MONTH_LABELS.map((_, index) =>
    Math.max(
      10,
      Math.round(
        startingValue +
          index * normalizedGain * 1.7 +
          Math.sin((index + stepOffset) / 1.2) * normalizedGain * 0.8
      )
    )
  );
};

const createLinePath = (points, width = 640, height = 260, padding = 18) => {
  if (!points.length) {
    return '';
  }

  const maxValue = Math.max(...points, 1);
  const minValue = Math.min(...points, 0);
  const xStep = (width - padding * 2) / Math.max(points.length - 1, 1);
  const yScale = (height - padding * 2) / Math.max(maxValue - minValue || 1, 1);

  return points
    .map((point, index) => {
      const x = padding + index * xStep;
      const y = height - padding - (point - minValue) * yScale;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
};

const getGrowthBadge = (value, positivePrefix = '+') => {
  const numericValue = Number(value || 0);
  const isPositive = numericValue >= 0;

  return {
    label: `${isPositive ? positivePrefix : ''}${numericValue.toFixed(1)}%`,
    tone: isPositive ? 'positive' : 'negative',
  };
};

const getProgressValue = (value = 0, total = 0) => {
  const safeTotal = Number(total || 0);

  if (safeTotal <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Number(((Number(value || 0) / safeTotal) * 100).toFixed(1))));
};

const formatAccountStatus = (status) => {
  switch (status) {
    case 'suspended':
      return 'Nonaktif';
    case 'active':
    default:
      return 'Aktif';
  }
};

const formatApplicationStage = (stage) => {
  switch (stage) {
    case 'reviewing':
      return 'Sedang Direview';
    case 'shortlisted':
      return 'Shortlist';
    case 'interview':
      return 'Interview';
    case 'offered':
      return 'Offer';
    case 'hired':
      return 'Diterima';
    case 'rejected':
      return 'Ditolak';
    case 'withdrawn':
      return 'Dibatalkan';
    case 'applied':
    default:
      return 'Baru Masuk';
  }
};

const formatJobStatus = (job) => {
  if (job?.workflow_status === 'active' && job?.status === 'active') {
    return 'Aktif';
  }

  if (job?.workflow_status === 'closed' || job?.status === 'inactive') {
    return 'Closed (Filled)';
  }

  if (job?.workflow_status === 'flagged') {
    return 'Closed (Flagged)';
  }

  return 'Review';
};

const getFooterMeta = (section) => {
  if (section === 'moderation') {
    return {
      copy: '© 2024 KERJANUSA MODERATION SYSTEM • VERSION 4.2.0-STABLE',
      links: ['MODERATION GUIDELINES', 'ADMIN LOGS', 'PRIVACY POLICY'],
    };
  }

  return {
    copy: '© 2024 KerjaNusa. Hak Cipta Dilindungi.',
    links: ['Kebijakan Privasi', 'Syarat & Ketentuan', 'Bantuan'],
  };
};

const getSectionMeta = (section) => {
  switch (section) {
    case 'pelamar':
      return {
        eyebrow: 'Database pelamar',
        title: 'Manajemen pelamar aktif dan berisiko',
        description:
          'Pantau pelamar yang baru masuk, akun yang dinonaktifkan, dan lakukan tindakan admin cepat dari satu tabel kerja.',
      };
    case 'recruiter':
      return {
        eyebrow: 'Recruiter directory',
        title: 'Verifikasi recruiter dan aktivitas perusahaan',
        description:
          'Seluruh recruiter aktif, kandidat verifikasi, dan akun yang bermasalah dikelola melalui direktori yang sama.',
      };
    case 'lowongan':
      return {
        eyebrow: 'Manajemen lowongan',
        title: 'Pantau performa lowongan dan pelanggaran aturan',
        description:
          'Superadmin dapat meninjau lowongan paling aktif, lowongan bermasalah, serta memindahkan tanggung jawab recruiter bila diperlukan.',
      };
    case 'analytics':
      return {
        eyebrow: 'Analytics platform',
        title: 'Analytics & Reporting',
        description:
          'Ringkasan volume user, distribusi kategori, performa lowongan populer, dan insight prioritas untuk keputusan cepat.',
      };
    case 'moderation':
      return {
        eyebrow: 'Moderasi operasional',
        title: 'Moderasi konten dan laporan prioritas',
        description:
          'Gunakan panel ini untuk meninjau laporan, menandai konten bermasalah, dan mengarahkan tindakan admin selanjutnya.',
      };
    case 'monitoring':
    default:
      return {
        eyebrow: 'Superadmin KerjaNusa',
        title: 'Pusat kontrol candidate, recruiter, dan lowongan',
        description:
          'Panel ini memusatkan angka inti, sinkronisasi status sistem, serta log aktivitas terbaru yang wajib dipantau setiap hari.',
      };
  }
};

const AdminIcon = ({ name, className = '' }) => {
  const props = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: `superadmin-icon ${className}`.trim(),
    'aria-hidden': 'true',
  };

  switch (name) {
    case 'monitor':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case 'candidate':
      return (
        <svg {...props}>
          <circle cx="9" cy="8" r="3.25" />
          <path d="M3.5 19c1.2-3 3.5-4.5 6-4.5S14.4 16 15.5 19" />
          <path d="M16.5 8.5h4M18.5 6.5v4" />
        </svg>
      );
    case 'recruiter':
      return (
        <svg {...props}>
          <rect x="4" y="7" width="16" height="11" rx="2" />
          <path d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7" />
          <path d="M4 11h16" />
        </svg>
      );
    case 'job':
      return (
        <svg {...props}>
          <path d="M7 4.5h10l1.5 2.5v12H5.5v-12L7 4.5Z" />
          <path d="M9 9.5h6M9 13.5h6M9 17.5h4" />
        </svg>
      );
    case 'analytics':
      return (
        <svg {...props}>
          <path d="M4 19h16" />
          <path d="M7 15V9" />
          <path d="M12 15V5" />
          <path d="M17 15v-3" />
        </svg>
      );
    case 'moderation':
      return (
        <svg {...props}>
          <path d="M4 20h16" />
          <path d="m6 15 4-4 3 3 5-6" />
          <path d="m7 8 2 2M15 18l2 2" />
        </svg>
      );
    case 'search':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
      );
    case 'filter':
      return (
        <svg {...props}>
          <path d="M4 6h16" />
          <path d="M7 12h10" />
          <path d="M10 18h4" />
        </svg>
      );
    case 'download':
      return (
        <svg {...props}>
          <path d="M12 4v10" />
          <path d="m8.5 10.5 3.5 3.5 3.5-3.5" />
          <path d="M5 19h14" />
        </svg>
      );
    case 'reset':
      return (
        <svg {...props}>
          <path d="M20 7v5h-5" />
          <path d="M4 17v-5h5" />
          <path d="M7.8 9.4A6.5 6.5 0 0 1 18 8.6L20 12" />
          <path d="M16.2 14.6A6.5 6.5 0 0 1 6 15.4L4 12" />
        </svg>
      );
    case 'logout':
      return (
        <svg {...props}>
          <path d="M15 5h3a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 18 19h-3" />
          <path d="M10 16l-4-4 4-4" />
          <path d="M6 12h10" />
        </svg>
      );
    case 'eye':
      return (
        <svg {...props}>
          <path d="M2.8 12s3.2-5.5 9.2-5.5S21.2 12 21.2 12 18 17.5 12 17.5 2.8 12 2.8 12Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case 'ban':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
          <path d="m8.5 8.5 7 7" />
        </svg>
      );
    case 'check':
      return (
        <svg {...props}>
          <path d="m5 12.5 4.2 4.2L19 7" />
        </svg>
      );
    case 'switch':
      return (
        <svg {...props}>
          <path d="M7 7h10" />
          <path d="m13 3 4 4-4 4" />
          <path d="M17 17H7" />
          <path d="m11 21-4-4 4-4" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...props}>
          <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
          <path d="M7 3.8v3.4M17 3.8v3.4M3.5 10h17" />
        </svg>
      );
    case 'trend':
      return (
        <svg {...props}>
          <path d="m4 16 5-5 3.5 3.5L20 7" />
          <path d="M14 7h6v6" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l2.5 2.5" />
        </svg>
      );
    case 'alert':
      return (
        <svg {...props}>
          <path d="M12 3.8 20.2 18H3.8L12 3.8Z" />
          <path d="M12 9v4.5M12 16h.01" />
        </svg>
      );
    case 'spark':
      return (
        <svg {...props}>
          <path d="M12 3.5 13.6 8l4.9 1.1-3.7 3 1.1 5-3.9-2.4L8.1 17l1.1-5-3.7-3L10.4 8Z" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...props}>
          <path d="M4.5 7.5h15" />
          <path d="M9 4.5h6" />
          <path d="M7 7.5v11a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5v-11" />
          <path d="M10 11v5M14 11v5" />
        </svg>
      );
    default:
      return null;
  }
};

const SectionMetrics = ({ cards }) => (
  <div className="superadmin-metric-grid">
    {cards.map((card) => (
      <article
        key={card.label}
        className={`superadmin-metric-card${
          card.dark ? ' is-dark' : ''
        }${card.alert ? ' is-alert' : ''}`}
      >
        <div className="superadmin-metric-head">
          <span className="superadmin-metric-label">{card.label}</span>
          {card.badge && (
            <span className={`superadmin-inline-badge is-${card.badge.tone}`}>
              {card.badge.label}
            </span>
          )}
        </div>
        <strong className="superadmin-metric-value">{card.value}</strong>
        {card.progress ? (
          <div className="superadmin-progress-block">
            <div className="superadmin-progress-meta">
              <span>{card.progress.label}</span>
              {card.progress.goal && <strong>{card.progress.goal}</strong>}
            </div>
            <div className="superadmin-progress-track">
              <span style={{ width: `${card.progress.value}%` }} />
            </div>
          </div>
        ) : (
          <p className={`superadmin-metric-detail${card.detailTone ? ` is-${card.detailTone}` : ''}`}>
            {card.detail}
          </p>
        )}
      </article>
    ))}
  </div>
);

const Pagination = ({ label }) => (
  <div className="superadmin-pagination-row">
    <span>{label}</span>
    <div className="superadmin-pagination">
      <button type="button" className="superadmin-page-arrow">
        ‹
      </button>
      <button type="button" className="superadmin-page-button is-active">
        1
      </button>
      <button type="button" className="superadmin-page-button">
        2
      </button>
      <button type="button" className="superadmin-page-button">
        3
      </button>
      <button type="button" className="superadmin-page-more">
        ...
      </button>
      <button type="button" className="superadmin-page-button superadmin-page-button-wide">
        245
      </button>
      <button type="button" className="superadmin-page-arrow">
        ›
      </button>
    </div>
  </div>
);

const SectionOverview = ({ eyebrow, title, description, stats }) => (
  <article className="superadmin-panel superadmin-section-overview">
    <div className="superadmin-section-overview-copy">
      <span className="superadmin-panel-eyebrow">{eyebrow}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>

    <div className="superadmin-section-overview-stats">
      {stats.map((item) => (
        <article key={item.label} className="superadmin-section-overview-stat">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <small>{item.detail}</small>
        </article>
      ))}
    </div>
  </article>
);

const AdminDashboardPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState(resolveSectionFromHash(location.hash));
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [userStatusActionInFlightId, setUserStatusActionInFlightId] = useState(null);
  const [userResetActionInFlightId, setUserResetActionInFlightId] = useState(null);
  const [jobActionInFlightId, setJobActionInFlightId] = useState(null);
  const [jobReassignments, setJobReassignments] = useState({});
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [candidateStatusFilter, setCandidateStatusFilter] = useState('all');
  const [recruiterSearchQuery, setRecruiterSearchQuery] = useState('');
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [jobSortOrder, setJobSortOrder] = useState('latest');
  const [moderationSearchQuery, setModerationSearchQuery] = useState('');
  const [moderationTab, setModerationTab] = useState('all');
  const [selectedOptimizationJobId, setSelectedOptimizationJobId] = useState(null);

  useEffect(() => {
    setActiveSection(resolveSectionFromHash(location.hash));
  }, [location.hash]);

  const loadDashboard = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }

    setError('');

    try {
      const response = await AdminService.getDashboard();
      setDashboard(response);
      setLastSyncedAt(new Date().toISOString());
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

  const activeCandidatesCount = candidateTable.filter(
    (candidate) => candidate.account_status === 'active'
  ).length;
  const suspendedCandidatesCount = candidateTable.filter(
    (candidate) => candidate.account_status === 'suspended'
  ).length;
  const activeRecruitersCount = recruiterTable.filter(
    (recruiter) => recruiter.account_status === 'active'
  ).length;
  const suspendedRecruitersCount = recruiterTable.filter(
    (recruiter) => recruiter.account_status === 'suspended'
  ).length;
  const candidateReviewCount = candidateTable.filter(
    (candidate) => !candidate.profile_ready || candidate.account_status === 'suspended'
  ).length;
  const recruiterReviewCount = recruiterTable.filter(
    (recruiter) => !recruiter.profile_ready || recruiter.account_status === 'suspended'
  ).length;

  const candidateRows = useMemo(
    () =>
      candidateTable.map((candidate) => ({
        ...candidate,
        initials: getInitials(candidate.name),
        position: candidate.latest_job_title || 'Belum ada posisi dilamar',
        dateLabel: formatDateTime(candidate.created_at),
      })),
    [candidateTable]
  );

  const recruiterRows = useMemo(
    () =>
      recruiterTable.map((recruiter) => ({
        ...recruiter,
        initials: getInitials(recruiter.company_name || recruiter.name),
        locationLabel: recruiter.company_location || 'Lokasi belum diisi',
      })),
    [recruiterTable]
  );

  const jobRows = useMemo(
    () =>
      jobs.map((job) => ({
        ...job,
        companyLabel: job.recruiter?.company_name || job.recruiter?.name || 'Recruiter',
        postedAtLabel: formatDateShort(job.created_at),
        isFlagged:
          job.workflow_status !== 'active' ||
          job.status !== 'active' ||
          Number(job.applications_count) === 0,
      })),
    [jobs]
  );

  const filteredCandidateRows = useMemo(() => {
    const normalizedQuery = normalizeText(candidateSearchQuery);

    return candidateRows.filter((candidate) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          candidate.name,
          candidate.email,
          candidate.position,
          candidate.latest_application_stage,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesStatus =
        candidateStatusFilter === 'all' || candidate.account_status === candidateStatusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [candidateRows, candidateSearchQuery, candidateStatusFilter]);

  const filteredRecruiterRows = useMemo(() => {
    const normalizedQuery = normalizeText(recruiterSearchQuery);

    return recruiterRows.filter((recruiter) => {
      if (!normalizedQuery) {
        return true;
      }

      return [
        recruiter.name,
        recruiter.email,
        recruiter.company_name,
        recruiter.locationLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [recruiterRows, recruiterSearchQuery]);

  const sortedJobRows = useMemo(() => {
    const normalizedQuery = normalizeText(jobSearchQuery);
    const filteredJobs = jobRows.filter((job) => {
      if (!normalizedQuery) {
        return true;
      }

      return [job.title, job.companyLabel, job.location, job.category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });

    const nextJobs = [...filteredJobs];

    if (jobSortOrder === 'applications') {
      nextJobs.sort(
        (firstJob, secondJob) =>
          Number(secondJob.applications_count || 0) - Number(firstJob.applications_count || 0)
      );
    } else {
      nextJobs.sort(
        (firstJob, secondJob) =>
          new Date(secondJob.created_at || 0).getTime() -
          new Date(firstJob.created_at || 0).getTime()
      );
    }

    return nextJobs;
  }, [jobRows, jobSearchQuery, jobSortOrder]);

  const moderationReports = useMemo(() => {
    const flaggedJobReports = jobRows
      .filter((job) => job.isFlagged)
      .map((job, index) => ({
        key: `job-${job.id}`,
        type: 'job',
        targetId: job.id,
        title: `Lowongan: ${job.title}`,
        ownerLabel: `${job.companyLabel} • ID: JOB-${String(job.id).padStart(5, '0')}`,
        severityLabel:
          job.workflow_status !== 'active' || job.status !== 'active'
            ? 'Informasi Palsu'
            : 'Spam / Iklan',
        reason:
          job.workflow_status !== 'active' || job.status !== 'active'
            ? 'Lowongan sudah tidak aktif di publik, tetapi masih terdeteksi masuk ke antrian atau memicu laporan kandidat.'
            : 'Rasio pelamar sangat rendah dan pola distribusi konten terlihat tidak wajar dibanding lowongan aktif lain.',
        timestamp: formatDateTime(job.created_at),
        badgeTone:
          job.workflow_status !== 'active' || job.status !== 'active' ? 'muted' : 'danger',
        evidenceCount: 2,
        accountAction: null,
      }));

    const profileReports = candidateRows
      .filter((candidate) => !candidate.profile_ready || candidate.account_status === 'suspended')
      .map((candidate) => ({
        key: `candidate-${candidate.id}`,
        type: 'profile',
        targetId: candidate.id,
        title: `Profil: ${candidate.name}`,
        ownerLabel: `Jobseeker • ID: USR-${String(candidate.id).padStart(5, '0')}`,
        severityLabel:
          candidate.account_status === 'suspended' ? 'Pelanggaran Syarat' : 'Butuh Review',
        reason:
          candidate.account_status === 'suspended'
            ? candidate.account_status_reason ||
              'Akun pernah dinonaktifkan karena pelanggaran dan perlu peninjauan lanjutan.'
            : 'Profil kandidat belum lengkap atau memiliki indikasi data lamaran yang belum konsisten.',
        timestamp: formatDateTime(candidate.created_at),
        badgeTone: candidate.account_status === 'suspended' ? 'danger' : 'warning',
        evidenceCount: 2,
        accountAction: candidate,
      }));

    return [...flaggedJobReports, ...profileReports].sort((firstItem, secondItem) => {
      const firstTime = new Date(firstItem.timestamp || 0).getTime();
      const secondTime = new Date(secondItem.timestamp || 0).getTime();
      return secondTime - firstTime;
    });
  }, [candidateRows, jobRows]);

  const filteredModerationReports = useMemo(() => {
    const normalizedQuery = normalizeText(moderationSearchQuery);

    return moderationReports.filter((report) => {
      const matchesTab = moderationTab === 'all' || report.type === moderationTab;
      const matchesQuery =
        !normalizedQuery ||
        [report.title, report.ownerLabel, report.severityLabel, report.reason]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesTab && matchesQuery;
    });
  }, [moderationReports, moderationSearchQuery, moderationTab]);

  const selectedOptimizationJob =
    jobRows.find((job) => Number(job.id) === Number(selectedOptimizationJobId)) ||
    jobRows.find((job) => job.isFlagged) ||
    jobRows[0] ||
    null;
  const flaggedJobsCount = jobRows.filter((job) => job.isFlagged).length;
  const syncTone = isLoading ? 'loading' : error ? 'error' : 'success';

  useEffect(() => {
    if (!selectedOptimizationJob && jobRows.length > 0) {
      setSelectedOptimizationJobId(jobRows[0].id);
      return;
    }

    if (
      selectedOptimizationJob &&
      jobReassignments[String(selectedOptimizationJob.id)] &&
      jobRows.some((job) => Number(job.id) === Number(selectedOptimizationJob.id))
    ) {
      return;
    }

    if (selectedOptimizationJob) {
      setJobReassignments((current) => ({
        ...current,
        [String(selectedOptimizationJob.id)]:
          current[String(selectedOptimizationJob.id)] ||
          (selectedOptimizationJob.recruiter?.id ? String(selectedOptimizationJob.recruiter.id) : ''),
      }));
    }
  }, [jobRows, jobReassignments, selectedOptimizationJob]);

  const popularJobs = useMemo(
    () =>
      [...jobRows]
        .sort(
          (firstJob, secondJob) =>
            Number(secondJob.applications_count || 0) - Number(firstJob.applications_count || 0)
        )
        .slice(0, 4),
    [jobRows]
  );

  const recruiterVerificationActivities = useMemo(
    () =>
      recruiterRows
        .slice(0, 4)
        .map((recruiter) => ({
          key: recruiter.id,
          title:
            recruiter.account_status === 'active'
              ? `Superadmin memverifikasi ${recruiter.company_name || recruiter.name}`
              : `Superadmin menonaktifkan akun ${recruiter.company_name || recruiter.name}`,
          detail:
            recruiter.account_status === 'active'
              ? 'Dokumen recruiter lengkap dan lowongan siap dipublikasikan.'
              : recruiter.account_status_reason || 'Akun dinonaktifkan sementara untuk peninjauan.',
          timestamp: formatDateTime(recruiter.created_at),
          tone: recruiter.account_status === 'active' ? 'success' : 'danger',
        })),
    [recruiterRows]
  );

  const lowonganActivityLogs = useMemo(
    () =>
      jobRows.slice(0, 4).map((job) => ({
        key: job.id,
        title:
          job.isFlagged
            ? `Lowongan ${job.title} masuk antrian moderasi`
            : `Lowongan ${job.title} dipindahkan ke recruiter lain`,
        detail:
          job.isFlagged
            ? `Perusahaan ${job.companyLabel} • status ${formatJobStatus(job)}`
            : `Sistem AI mendeteksi potensi optimisasi untuk ${job.companyLabel}`,
        timestamp: formatDateTime(job.created_at),
        tone: job.isFlagged ? 'danger' : 'neutral',
      })),
    [jobRows]
  );

  const monitoringActivityFeed = useMemo(
    () =>
      [
        ...applications.map((application) => ({
          key: `application-${application.id}`,
          icon: 'candidate',
          title: `${application.candidate?.name || 'Kandidat'} melamar ${application.job?.title || 'lowongan'}`,
          detail: `${formatApplicationStage(application.stage)} • ${application.recruiter?.company_name || application.recruiter?.name || 'Recruiter'}`,
          timestamp: application.applied_at || null,
        })),
        ...jobRows.map((job) => ({
          key: `job-${job.id}`,
          icon: 'job',
          title: `${job.title} dipublikasikan / dipantau`,
          detail: `${job.companyLabel} • ${formatJobStatus(job)}`,
          timestamp: job.created_at || null,
        })),
      ]
        .sort(
          (firstItem, secondItem) =>
            new Date(secondItem.timestamp || 0).getTime() -
            new Date(firstItem.timestamp || 0).getTime()
        )
        .slice(0, 6),
    [applications, jobRows]
  );

  const categoryDistribution = useMemo(() => {
    const counts = jobRows.reduce((categories, job) => {
      const nextCategory = job.category || 'Lainnya';
      categories[nextCategory] = (categories[nextCategory] || 0) + 1;
      return categories;
    }, {});

    const totalJobs = Math.max(jobRows.length, 1);
    const sortedCategories = Object.entries(counts)
      .sort((firstCategory, secondCategory) => secondCategory[1] - firstCategory[1])
      .slice(0, 5)
      .map(([label, count], index) => ({
        label,
        percentage: Math.max(8, Math.round((count / totalJobs) * 100)),
        tone: ['navy', 'orange', 'stone', 'forest', 'gray'][index] || 'gray',
      }));

    if (sortedCategories.length > 0) {
      return sortedCategories;
    }

    return [
      { label: 'Teknologi Informasi', percentage: 32, tone: 'navy' },
      { label: 'Keuangan & Perbankan', percentage: 24, tone: 'orange' },
      { label: 'Logistik & Distribusi', percentage: 18, tone: 'stone' },
      { label: 'Manufaktur', percentage: 15, tone: 'forest' },
      { label: 'Lainnya', percentage: 11, tone: 'gray' },
    ];
  }, [jobRows]);

  const candidateTrend = useMemo(
    () => createTrendPoints(totals.candidates || 120, growth.new_candidates_last_7_days || 8, 0),
    [growth.new_candidates_last_7_days, totals.candidates]
  );
  const recruiterTrend = useMemo(
    () => createTrendPoints(totals.recruiters || 64, growth.new_recruiters_last_7_days || 4, 2),
    [growth.new_recruiters_last_7_days, totals.recruiters]
  );

  const candidateTrendPath = useMemo(() => createLinePath(candidateTrend), [candidateTrend]);
  const recruiterTrendPath = useMemo(() => createLinePath(recruiterTrend), [recruiterTrend]);

  const demographicsData = [
    { label: 'Gen Z (18-24)', value: 65 },
    { label: 'Millennials (25-34)', value: 25 },
    { label: 'Lainnya', value: 10 },
  ];

  const placementRate = getProgressValue(
    totals.accepted_applications ?? 0,
    totals.total_applications ?? 0
  );

  const insightsSpecialText =
    categoryDistribution[0]?.label === 'Teknologi Informasi'
      ? 'Pencarian untuk “Artificial Intelligence” meningkat 300% dalam 2 bulan terakhir di sektor teknologi.'
      : `Permintaan tertinggi saat ini berada di kategori ${categoryDistribution[0]?.label || 'utama'} dan perlu diprioritaskan pada distribusi lowongan baru.`;

  const sectionMeta = getSectionMeta(activeSection);
  const monitoringCards = [
    {
      label: 'Pelamar Aktif',
      value: numberFormatter.format(activeCandidatesCount),
      detail: `${numberFormatter.format(totals.pending_applications ?? 0)} lamaran masih menunggu review`,
    },
    {
      label: 'Recruiter Aktif',
      value: numberFormatter.format(activeRecruitersCount),
      detail: `${numberFormatter.format(recruiterReviewCount)} recruiter perlu verifikasi lanjutan`,
    },
    {
      label: 'Lowongan Aktif',
      value: numberFormatter.format(totals.active_jobs ?? 0),
      detail: `${numberFormatter.format(flaggedJobsCount)} lowongan butuh perhatian admin`,
    },
    {
      label: 'Lamaran Baru',
      value: numberFormatter.format(growth.new_applications_last_7_days ?? 0),
      detail: `${numberFormatter.format(totals.total_applications ?? 0)} total aplikasi di platform`,
    },
  ];

  const monitoringHealthCards = [
    {
      label: 'Dashboard API',
      status: syncTone === 'error' ? 'danger' : syncTone === 'loading' ? 'warning' : 'success',
      title:
        syncTone === 'error'
          ? 'Koneksi ke dashboard bermasalah'
          : syncTone === 'loading'
            ? 'Sinkronisasi data berjalan'
            : 'Feed operasional sedang sehat',
      detail:
        syncTone === 'error'
          ? error
          : syncTone === 'loading'
            ? 'Sedang mengambil data kandidat, recruiter, lowongan, dan lamaran.'
            : `Data live berhasil ditarik pada ${formatDateTime(lastSyncedAt)}.`,
    },
    {
      label: 'Review Pelamar',
      status: candidateReviewCount > 0 ? 'warning' : 'success',
      title:
        candidateReviewCount > 0
          ? `${numberFormatter.format(candidateReviewCount)} profil perlu ditinjau`
          : 'Tidak ada pelamar yang tertahan review',
      detail:
        candidateReviewCount > 0
          ? 'Profil belum lengkap atau akun sedang dinonaktifkan sementara.'
          : 'Semua profil pelamar utama berada pada status aman.',
    },
    {
      label: 'Verifikasi Recruiter',
      status: recruiterReviewCount > 0 ? 'warning' : 'success',
      title:
        recruiterReviewCount > 0
          ? `${numberFormatter.format(recruiterReviewCount)} recruiter butuh tindakan`
          : 'Verifikasi recruiter terkendali',
      detail:
        recruiterReviewCount > 0
          ? 'Ada recruiter yang profil company-nya belum lengkap atau butuh validasi.'
          : 'Direktori recruiter aktif berada pada status siap operasional.',
    },
    {
      label: 'Lowongan Flagged',
      status: flaggedJobsCount > 0 ? 'danger' : 'success',
      title:
        flaggedJobsCount > 0
          ? `${numberFormatter.format(flaggedJobsCount)} lowongan masuk radar`
          : 'Tidak ada lowongan yang ter-flag saat ini',
      detail:
        flaggedJobsCount > 0
          ? 'Status tidak aktif, flagged, atau rasio pelamar rendah membutuhkan pengecekan.'
          : 'Distribusi lowongan publik stabil dan siap dipantau berkala.',
    },
  ];

  const monitoringQuickActions = [
    {
      label: 'Pelamar',
      title: 'Buka pelamar review',
      detail: `${numberFormatter.format(candidateReviewCount)} akun perlu pengecekan cepat`,
      tone: candidateReviewCount > 0 ? 'warning' : 'neutral',
      action: () => handleSectionChange('pelamar'),
    },
    {
      label: 'Recruiter',
      title: 'Cek verifikasi recruiter',
      detail: `${numberFormatter.format(recruiterReviewCount)} profil company belum final`,
      tone: recruiterReviewCount > 0 ? 'warning' : 'neutral',
      action: () => handleSectionChange('recruiter'),
    },
    {
      label: 'Lowongan',
      title: 'Lihat lowongan flagged',
      detail: `${numberFormatter.format(flaggedJobsCount)} lowongan perlu intervensi`,
      tone: flaggedJobsCount > 0 ? 'danger' : 'neutral',
      action: () => handleSectionChange('lowongan'),
    },
    {
      label: 'Moderasi',
      title: 'Masuk antrian moderasi',
      detail: `${numberFormatter.format(filteredModerationReports.length)} laporan siap diproses`,
      tone: filteredModerationReports.length > 0 ? 'danger' : 'neutral',
      action: () => handleSectionChange('moderation'),
    },
  ];

  const monitoringPriorityItems = [
    {
      label: 'Akun kandidat perlu review',
      value: numberFormatter.format(candidateReviewCount),
      detail: `${numberFormatter.format(suspendedCandidatesCount)} akun sedang nonaktif`,
      tone: candidateReviewCount > 0 ? 'warning' : 'success',
    },
    {
      label: 'Recruiter butuh verifikasi',
      value: numberFormatter.format(recruiterReviewCount),
      detail: `${numberFormatter.format(suspendedRecruitersCount)} recruiter sedang dibatasi`,
      tone: recruiterReviewCount > 0 ? 'warning' : 'success',
    },
    {
      label: 'Lowongan masuk moderasi',
      value: numberFormatter.format(flaggedJobsCount),
      detail: `${numberFormatter.format(filteredModerationReports.length)} laporan aktif dalam sistem`,
      tone: flaggedJobsCount > 0 ? 'danger' : 'success',
    },
  ];

  const candidateOverviewStats = [
    {
      label: 'Profile ready',
      value: numberFormatter.format(candidateRows.filter((candidate) => candidate.profile_ready).length),
      detail: 'profil siap melamar tanpa hambatan',
    },
    {
      label: 'Need review',
      value: numberFormatter.format(candidateReviewCount),
      detail: 'profil belum lengkap atau akun dibatasi',
    },
    {
      label: '7 hari terakhir',
      value: numberFormatter.format(growth.new_candidates_last_7_days ?? 0),
      detail: 'akun pelamar baru yang masuk',
    },
  ];

  const candidateReviewQueue = candidateRows
    .filter((candidate) => !candidate.profile_ready || candidate.account_status === 'suspended')
    .slice(0, 4);

  const recruiterOverviewStats = [
    {
      label: 'Company ready',
      value: numberFormatter.format(
        recruiterRows.filter((recruiter) => recruiter.profile_ready && recruiter.account_status === 'active').length
      ),
      detail: 'recruiter sudah siap tayang lowongan',
    },
    {
      label: 'Pending verify',
      value: numberFormatter.format(recruiterReviewCount),
      detail: 'akun perlu validasi dokumen company',
    },
    {
      label: 'Rata-rata job',
      value: `${(
        (totals.active_jobs ?? 0) / Math.max(activeRecruitersCount || 1, 1)
      ).toFixed(1)}`,
      detail: 'lowongan aktif per recruiter aktif',
    },
  ];

  const jobsOverviewStats = [
    {
      label: 'Flagged jobs',
      value: numberFormatter.format(flaggedJobsCount),
      detail: 'perlu review atau optimisasi cepat',
    },
    {
      label: 'Active ratio',
      value: `${getProgressValue(totals.active_jobs ?? 0, totals.total_jobs ?? 0)}%`,
      detail: 'persentase lowongan aktif dari total',
    },
    {
      label: 'Applications',
      value: formatCompactNumber(totals.total_applications ?? 0),
      detail: 'total aplikasi yang menempel ke lowongan',
    },
  ];

  const analyticsOverviewStats = [
    {
      label: 'Top category',
      value: categoryDistribution[0]?.label || 'Lainnya',
      detail: `${categoryDistribution[0]?.percentage || 0}% distribusi lowongan`,
    },
    {
      label: 'Placement rate',
      value: formatPercentage(placementRate),
      detail: 'rasio accepted terhadap total aplikasi',
    },
    {
      label: 'Growth pulse',
      value: `+${Number((growth.new_candidates_last_7_days ?? 0) * 1.8).toFixed(1)}%`,
      detail: 'indikasi kenaikan pelamar mingguan',
    },
  ];

  const moderationOverviewStats = [
    {
      label: 'Queue total',
      value: numberFormatter.format(filteredModerationReports.length),
      detail: 'laporan aktif siap ditangani',
    },
    {
      label: 'Job reports',
      value: numberFormatter.format(moderationReports.filter((report) => report.type === 'job').length),
      detail: 'laporan terkait lowongan',
    },
    {
      label: 'Profile reports',
      value: numberFormatter.format(moderationReports.filter((report) => report.type === 'profile').length),
      detail: 'laporan terkait kandidat',
    },
  ];

  const analyticsCards = [
    {
      label: 'Total Pelamar',
      value: numberFormatter.format(totals.candidates ?? 0),
      detail: 'Pengguna terdaftar aktif',
      badge: getGrowthBadge((growth.new_candidates_last_7_days ?? 0) * 1.8),
    },
    {
      label: 'Total Recruiter',
      value: numberFormatter.format(totals.recruiters ?? 0),
      detail: 'Perusahaan terverifikasi',
      badge: getGrowthBadge((growth.new_recruiters_last_7_days ?? 0) * 2),
    },
    {
      label: 'Lowongan Aktif',
      value: numberFormatter.format(totals.active_jobs ?? 0),
      detail: 'Sisa slot tayang terbuka',
      badge: getGrowthBadge(-2.3, ''),
    },
    {
      label: 'Laju Penempatan',
      value: formatPercentage(placementRate),
      progress: {
        label: 'Goal 85%',
        goal: 'Goal 85%',
        value: placementRate,
      },
      dark: true,
    },
  ];

  const pelamarCards = [
    {
      label: 'Total Pelamar',
      value: numberFormatter.format(totals.candidates ?? 0),
      detail: `↗ +${Math.max(growth.new_candidates_last_7_days ?? 0, 0)} akun dalam 7 hari`,
      detailTone: 'accent',
    },
    {
      label: 'Pelamar Aktif',
      value: numberFormatter.format(activeCandidatesCount),
      detail: `${getProgressValue(activeCandidatesCount, totals.candidates ?? 0)}% dari total`,
    },
    {
      label: 'Lamaran Baru',
      value: numberFormatter.format(growth.new_applications_last_7_days ?? 0),
      detail: 'Butuh review',
      detailTone: 'warning',
    },
    {
      label: 'Akun Dinonaktifkan',
      value: numberFormatter.format(suspendedCandidatesCount),
      detail: 'Pelanggaran syarat',
      alert: true,
      detailTone: 'danger',
    },
  ];

  const recruiterCards = [
    {
      label: 'Total Recruiters',
      value: numberFormatter.format(totals.recruiters ?? 0),
      detail: `↗ +${Math.max(growth.new_recruiters_last_7_days ?? 0, 0)} bulan ini`,
      detailTone: 'positive',
    },
    {
      label: 'Pending Verifikasi',
      value: numberFormatter.format(
        recruiterRows.filter((recruiter) => !recruiter.profile_ready).length
      ),
      detail: 'Butuh tindakan segera',
      detailTone: 'warning',
    },
    {
      label: 'Lowongan Aktif',
      value: numberFormatter.format(totals.active_jobs ?? 0),
      detail: `Rata-rata ${(
        (totals.active_jobs ?? 0) / Math.max(activeRecruitersCount || 1, 1)
      ).toFixed(1)} per perusahaan`,
    },
    {
      label: 'Akun Nonaktif',
      value: numberFormatter.format(suspendedRecruitersCount),
      detail: 'Pelanggaran kebijakan',
      alert: true,
      detailTone: 'danger',
    },
  ];

  const lowonganCards = [
    {
      label: 'Total Lowongan',
      value: numberFormatter.format(totals.total_jobs ?? 0),
      detail: `↗ +${Math.max(growth.new_jobs_last_7_days ?? 0, 0)} bulan ini`,
      detailTone: 'accent',
    },
    {
      label: 'Lowongan Aktif',
      value: numberFormatter.format(totals.active_jobs ?? 0),
      detail: `${getProgressValue(totals.active_jobs ?? 0, totals.total_jobs ?? 0)}% dari total`,
    },
    {
      label: 'Total Pelamar',
      value: formatCompactNumber(totals.total_applications ?? 0),
      detail: `↗ +${formatCompactNumber(growth.new_applications_last_7_days ?? 0)} baru`,
      detailTone: 'accent',
    },
    {
      label: 'Pelanggaran Aturan',
      value: numberFormatter.format(moderationReports.length),
      detail: 'Perlu moderasi segera',
      alert: true,
      detailTone: 'danger',
    },
  ];

  const moderationCards = [
    {
      label: 'Total Laporan',
      value: numberFormatter.format(moderationReports.length),
      detail: '↗ +12% minggu ini',
      detailTone: 'danger',
    },
    {
      label: 'Menunggu Antrian',
      value: numberFormatter.format(filteredModerationReports.length),
      detail: `Prioritas: ${
        filteredModerationReports.length > 8 ? 'Sangat Tinggi' : 'Tinggi'
      }`,
      detailTone: 'warning',
    },
    {
      label: 'Berhasil Ditangani',
      value: `${Math.max(84, 100 - filteredModerationReports.length * 1.4).toFixed(1)}%`,
      detail: `SLA: ${Math.max(2.4, filteredModerationReports.length / 10).toFixed(1)} jam`,
    },
    {
      label: 'Produktivitas Tim',
      value: 'Efisiensi Maksimal',
      detail:
        'Sistem otomatis mendeteksi 85% spam sebelum peninjauan manual.',
      dark: true,
    },
  ];

  const currentSection = SECTION_OPTIONS.find((section) => section.value === activeSection) || SECTION_OPTIONS[0];
  const titleBadge =
    activeSection === 'moderation' ? `${filteredModerationReports.length} PERLU TINJAUAN` : '';
  const footerMeta = getFooterMeta(activeSection);

  const handleSectionChange = (section) => {
    setActiveSection(section);
    navigate(getSectionRoute(section));
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

  const handleExport = (section) => {
    switch (section) {
      case 'pelamar':
        downloadCsv('kerjanusa-pelamar.csv', [
          ['Nama', 'Email', 'Posisi Dilamar', 'Status', 'Tanggal Daftar'],
          ...filteredCandidateRows.map((candidate) => [
            candidate.name,
            candidate.email,
            candidate.position,
            formatAccountStatus(candidate.account_status),
            candidate.dateLabel,
          ]),
        ]);
        break;
      case 'recruiter':
        downloadCsv('kerjanusa-recruiter.csv', [
          ['Perusahaan', 'Email', 'Lokasi', 'Lowongan', 'Status'],
          ...filteredRecruiterRows.map((recruiter) => [
            recruiter.company_name || recruiter.name,
            recruiter.email,
            recruiter.locationLabel,
            recruiter.active_jobs_count ?? 0,
            formatAccountStatus(recruiter.account_status),
          ]),
        ]);
        break;
      case 'analytics':
        downloadCsv('kerjanusa-analytics.csv', [
          ['Metric', 'Value'],
          ...analyticsCards.map((card) => [card.label, card.value]),
        ]);
        break;
      default:
        downloadCsv('kerjanusa-lowongan.csv', [
          ['Judul', 'Perusahaan', 'Lamaran', 'Status'],
          ...sortedJobRows.map((job) => [
            job.title,
            job.companyLabel,
            job.applications_count ?? 0,
            formatJobStatus(job),
          ]),
        ]);
        break;
    }
  };

  const handleModerationAction = async (report, action) => {
    if (action === 'ignore') {
      setFeedback({
        type: 'success',
        message: `${report.title} ditandai sebagai tidak prioritas untuk saat ini.`,
      });
      return;
    }

    if (action === 'review') {
      if (report.type === 'job') {
        handleSectionChange('lowongan');
        setSelectedOptimizationJobId(report.targetId);
      } else {
        handleSectionChange('pelamar');
      }

      setFeedback({
        type: 'success',
        message: `${report.title} dibuka untuk tindak lanjut admin.`,
      });
      return;
    }

    if (action === 'suspend' && report.accountAction) {
      await handleUserStatusToggle(report.accountAction);
      return;
    }

    setFeedback({
      type: 'error',
      message: 'Aksi ini belum bisa dijalankan langsung dari panel moderasi.',
    });
  };

  const renderFeedback = () =>
    feedback ? (
      <div className={`superadmin-feedback is-${feedback.type}`}>{feedback.message}</div>
    ) : null;

  const renderHeaderAside = () => {
    if (activeSection === 'analytics') {
      return (
        <div className="superadmin-header-actions">
          <button type="button" className="superadmin-chip-button">
            {ANALYTICS_PERIOD_LABEL}
          </button>
          <button
            type="button"
            className="superadmin-primary-button is-dark"
            onClick={() => handleExport('analytics')}
          >
            <AdminIcon name="download" />
            Export Report
          </button>
        </div>
      );
    }

    if (activeSection === 'moderation') {
      return (
        <div className="superadmin-header-actions">
          <label className="superadmin-search-chip">
            <AdminIcon name="search" />
            <input
              type="search"
              placeholder="Cari ID Konten atau Pelapor..."
              value={moderationSearchQuery}
              onChange={(event) => setModerationSearchQuery(event.target.value)}
            />
          </label>
          <button type="button" className="superadmin-icon-chip">
            <AdminIcon name="filter" />
          </button>
        </div>
      );
    }

    return (
      <div className="superadmin-header-user">
        <div className="superadmin-header-user-meta">
          <strong>{user?.name || 'Nama Superadmin'}</strong>
          <span>
            {activeSection === 'recruiter'
              ? 'Administrator Level 1'
              : activeSection === 'pelamar'
                ? 'Administrator Utama'
                : 'Superadmin'}
          </span>
        </div>
        {(activeSection === 'pelamar' || activeSection === 'lowongan') && (
          <div className="superadmin-avatar-badge">{getInitials(user?.name)}</div>
        )}
        <button type="button" className="superadmin-header-logout" onClick={handleLogout}>
          {isLoggingOut ? 'Logout...' : 'Logout'}
        </button>
      </div>
    );
  };

  const renderMonitoring = () => {
    return (
      <section className="superadmin-monitoring-layout">
        <article className="superadmin-panel superadmin-monitoring-overview">
          <div className="superadmin-monitoring-overview-head">
            <div className="superadmin-monitoring-overview-copy">
              <span className="superadmin-panel-eyebrow">Platform Pulse</span>
              <h2>Monitoring operasional platform dalam satu layar.</h2>
              <p>
                Fokus utama dashboard ini adalah memantau kesehatan feed admin, beban review akun,
                dan antrian prioritas sebelum Anda masuk ke menu detail.
              </p>
            </div>

            <div className="superadmin-monitoring-overview-actions">
              <div className="superadmin-monitoring-sync-chip">
                <span>Last sync</span>
                <strong>{lastSyncedAt ? formatDateTime(lastSyncedAt) : 'Belum tersinkron'}</strong>
              </div>
              <div className="superadmin-monitoring-action-row">
                <button
                  type="button"
                  className="superadmin-primary-button"
                  onClick={() => loadDashboard()}
                >
                  Refresh Data
                </button>
                <Link to={APP_ROUTES.platform} className="superadmin-secondary-button">
                  Profil KerjaNusa
                </Link>
              </div>
            </div>
          </div>

          <div className="superadmin-monitoring-overview-meta">
            <article className="superadmin-monitoring-meta-card">
              <span className="superadmin-monitoring-meta-label">Status umum</span>
              <strong>
                {syncTone === 'error'
                  ? 'Perlu perhatian'
                  : syncTone === 'loading'
                    ? 'Sedang sinkron'
                    : 'Stabil'}
              </strong>
              <p>
                {syncTone === 'error'
                  ? 'Ada kegagalan saat menarik feed dashboard.'
                  : syncTone === 'loading'
                    ? 'Backend sedang menarik data live terbaru.'
                    : 'Panel utama bisa dipakai untuk pengambilan keputusan cepat.'}
              </p>
            </article>

            <article className="superadmin-monitoring-meta-card">
              <span className="superadmin-monitoring-meta-label">Antrian hari ini</span>
              <strong>{numberFormatter.format(filteredModerationReports.length)}</strong>
              <p>Item moderasi, review profil, dan lowongan flagged menunggu tindak lanjut.</p>
            </article>

            <article className="superadmin-monitoring-meta-card">
              <span className="superadmin-monitoring-meta-label">Fokus pertama</span>
              <strong>
                {flaggedJobsCount > 0
                  ? 'Lowongan flagged'
                  : recruiterReviewCount > 0
                    ? 'Verifikasi recruiter'
                    : 'Feed stabil'}
              </strong>
              <p>
                {flaggedJobsCount > 0
                  ? 'Periksa lowongan yang tidak aktif atau berisiko lebih dulu.'
                  : recruiterReviewCount > 0
                    ? 'Lanjutkan validasi recruiter yang masih tertahan.'
                    : 'Tidak ada prioritas kritis yang menumpuk saat ini.'}
              </p>
            </article>
          </div>
        </article>

        <SectionMetrics cards={monitoringCards} />

        <div className="superadmin-monitoring-mainrow">
          <article className="superadmin-panel superadmin-monitoring-health-panel">
            <div className="superadmin-panel-head">
              <div>
                <h3>Health & Alerts</h3>
                <p>Empat sinyal utama yang perlu dibaca sebelum berpindah menu.</p>
              </div>
            </div>

            <div className="superadmin-monitoring-health-grid">
              {monitoringHealthCards.map((item) => (
                <article
                  key={item.label}
                  className={`superadmin-monitoring-health-card is-${item.status}`}
                >
                  <div className="superadmin-monitoring-health-top">
                    <span className="superadmin-monitoring-health-label">{item.label}</span>
                    <span className={`superadmin-monitoring-status-dot is-${item.status}`} />
                  </div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
          </article>

          <article className="superadmin-panel superadmin-monitoring-actions-panel">
            <div className="superadmin-panel-head">
              <div>
                <h3>Quick Actions</h3>
                <p>Shortcut ke area yang paling sering butuh respon cepat dari superadmin.</p>
              </div>
            </div>

            <div className="superadmin-monitoring-actions-grid">
              {monitoringQuickActions.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  className={`superadmin-monitoring-action-card is-${item.tone}`}
                  onClick={item.action}
                >
                  <span className="superadmin-monitoring-action-label">{item.label}</span>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </button>
              ))}
            </div>
          </article>
        </div>

        <div className="superadmin-monitoring-bottomrow">
          <article className="superadmin-panel superadmin-activity-panel">
            <div className="superadmin-panel-head">
              <div>
                <h3>Aktivitas Terbaru</h3>
                <p>Feed live dari aplikasi dan pergerakan lowongan yang baru masuk.</p>
              </div>
              <button
                type="button"
                className="superadmin-inline-link"
                onClick={() => handleSectionChange('moderation')}
              >
                Lihat Semua
              </button>
            </div>
            <div className="superadmin-activity-list">
              {monitoringActivityFeed.length === 0 ? (
                <div className="superadmin-empty-state">
                  <div className="superadmin-empty-icon">⌁</div>
                  <p>Belum ada aktivitas terbaru yang bisa ditampilkan.</p>
                </div>
              ) : (
                monitoringActivityFeed.map((entry) => (
                  <article key={entry.key} className="superadmin-activity-row">
                    <div className="superadmin-activity-badge">
                      <AdminIcon name={entry.icon} />
                    </div>
                    <div className="superadmin-activity-copy">
                      <strong>{entry.title}</strong>
                      <p>{entry.detail}</p>
                    </div>
                    <small>{formatDateTime(entry.timestamp)}</small>
                  </article>
                ))
              )}
            </div>
          </article>

          <article className="superadmin-panel superadmin-monitoring-priority-panel">
            <div className="superadmin-panel-head">
              <div>
                <h3>Ringkasan Prioritas</h3>
                <p>Tiga area yang paling menentukan ritme kerja admin hari ini.</p>
              </div>
            </div>

            <div className="superadmin-monitoring-priority-list">
              {monitoringPriorityItems.map((item) => (
                <article
                  key={item.label}
                  className={`superadmin-monitoring-priority-item is-${item.tone}`}
                >
                  <div>
                    <span className="superadmin-monitoring-priority-label">{item.label}</span>
                    <p>{item.detail}</p>
                  </div>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </article>
        </div>
      </section>
    );
  };

  const renderCandidateManagement = () => (
    <section className="superadmin-section-block">
      <SectionOverview
        eyebrow="Candidate Ops"
        title="Manajemen pelamar yang lebih tenang dan cepat dipindai."
        description="Gunakan ringkasan ini untuk memisahkan pelamar yang siap lanjut dari akun yang masih butuh review, suspend, atau follow-up profil."
        stats={candidateOverviewStats}
      />

      <SectionMetrics cards={pelamarCards} />

      <article className="superadmin-panel superadmin-table-panel">
        <div className="superadmin-toolbar">
          <label className="superadmin-search-input">
            <AdminIcon name="search" />
            <input
              type="search"
              placeholder="Cari nama pelamar atau posisi..."
              value={candidateSearchQuery}
              onChange={(event) => setCandidateSearchQuery(event.target.value)}
            />
          </label>

          <div className="superadmin-toolbar-actions">
            <select
              className="superadmin-filter-select"
              value={candidateStatusFilter}
              onChange={(event) => setCandidateStatusFilter(event.target.value)}
            >
              <option value="all">Filter Status</option>
              <option value="active">Aktif</option>
              <option value="suspended">Nonaktif</option>
            </select>
            <button
              type="button"
              className="superadmin-secondary-button"
              onClick={() => handleExport('pelamar')}
            >
              <AdminIcon name="download" />
              Ekspor CSV
            </button>
          </div>
        </div>

        <div className="superadmin-table-wrap">
          <table className="superadmin-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Posisi Dilamar</th>
                <th>Status</th>
                <th>Tanggal Daftar</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidateRows.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="superadmin-table-empty">Belum ada data pelamar yang cocok.</div>
                  </td>
                </tr>
              ) : (
                filteredCandidateRows.map((candidate) => (
                  <tr key={candidate.id}>
                    <td>
                      <div className="superadmin-person-cell">
                        <div className="superadmin-person-avatar">{candidate.initials}</div>
                        <div>
                          <strong>{candidate.name}</strong>
                          <span>{candidate.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{candidate.position}</td>
                    <td>
                      <span
                        className={`superadmin-status-tag is-${
                          candidate.account_status === 'active' ? 'success' : 'muted'
                        }`}
                      >
                        {formatAccountStatus(candidate.account_status)}
                      </span>
                    </td>
                    <td>{candidate.dateLabel}</td>
                    <td>
                      <div className="superadmin-icon-actions">
                        <button
                          type="button"
                          className="superadmin-icon-button"
                          title="Kirim reset password"
                          onClick={() => handleSendResetLink(candidate)}
                          disabled={userResetActionInFlightId === candidate.id}
                        >
                          <AdminIcon name="reset" />
                        </button>
                        <button
                          type="button"
                          className="superadmin-icon-button"
                          title={
                            candidate.account_status === 'active'
                              ? 'Suspend akun'
                              : 'Aktifkan akun'
                          }
                          onClick={() => handleUserStatusToggle(candidate)}
                          disabled={userStatusActionInFlightId === candidate.id}
                        >
                          <AdminIcon
                            name={candidate.account_status === 'active' ? 'ban' : 'check'}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          label={`Menampilkan 1-${Math.min(filteredCandidateRows.length, 10)} dari ${numberFormatter.format(
            totals.candidates ?? 0
          )} pelamar`}
        />
      </article>

      <div className="superadmin-two-column">
        <article className="superadmin-panel superadmin-support-panel">
          <div className="superadmin-panel-head">
            <div>
              <h3>Pelamar Prioritas Review</h3>
              <p>Daftar singkat akun yang paling perlu disentuh setelah membaca tabel utama.</p>
            </div>
          </div>
          <div className="superadmin-list-stack">
            {candidateReviewQueue.length === 0 ? (
              <div className="superadmin-empty-state is-panel">
                <div className="superadmin-empty-icon">⌁</div>
                <p>Tidak ada pelamar prioritas review saat ini.</p>
              </div>
            ) : (
              candidateReviewQueue.map((candidate) => (
                <article key={candidate.id} className="superadmin-list-item">
                  <div className={`superadmin-list-icon is-${candidate.account_status === 'suspended' ? 'danger' : 'success'}`}>
                    <AdminIcon name={candidate.account_status === 'suspended' ? 'ban' : 'candidate'} />
                  </div>
                  <div>
                    <strong>{candidate.name}</strong>
                    <p>{candidate.position}</p>
                    <small>
                      {candidate.account_status === 'suspended'
                        ? candidate.account_status_reason || 'Akun sedang dibatasi sementara.'
                        : 'Profil belum lengkap untuk masuk ke proses berikutnya.'}
                    </small>
                  </div>
                </article>
              ))
            )}
          </div>
        </article>

        <article className="superadmin-panel superadmin-support-panel">
          <div className="superadmin-panel-head">
            <div>
              <h3>Checklist Admin</h3>
              <p>Tiga aksi cepat yang biasanya paling membantu menjaga funnel kandidat tetap sehat.</p>
            </div>
          </div>
          <div className="superadmin-monitoring-priority-list">
            <article className="superadmin-monitoring-priority-item is-warning">
              <div>
                <span className="superadmin-monitoring-priority-label">Lengkapi profil</span>
                <p>Filter kandidat yang profilnya belum lengkap sebelum mengirim reset atau follow-up.</p>
              </div>
              <strong>{numberFormatter.format(candidateReviewCount)}</strong>
            </article>
            <article className="superadmin-monitoring-priority-item is-success">
              <div>
                <span className="superadmin-monitoring-priority-label">Baru masuk</span>
                <p>Pantau lonjakan akun baru dalam 7 hari terakhir untuk melihat beban review.</p>
              </div>
              <strong>{numberFormatter.format(growth.new_candidates_last_7_days ?? 0)}</strong>
            </article>
            <article className="superadmin-monitoring-priority-item is-danger">
              <div>
                <span className="superadmin-monitoring-priority-label">Suspend aktif</span>
                <p>Pastikan akun yang dibatasi memang sudah punya alasan yang jelas dan terdokumentasi.</p>
              </div>
              <strong>{numberFormatter.format(suspendedCandidatesCount)}</strong>
            </article>
          </div>
        </article>
      </div>
    </section>
  );

  const renderRecruiterManagement = () => (
    <section className="superadmin-section-block">
      <SectionOverview
        eyebrow="Recruiter Ops"
        title="Direktori recruiter yang fokus pada status, kesiapan, dan verifikasi."
        description="Bagian ini dipakai untuk membaca kesehatan supply-side: siapa yang siap tayang, siapa yang masih menunggu verifikasi, dan siapa yang perlu dibatasi."
        stats={recruiterOverviewStats}
      />

      <SectionMetrics cards={recruiterCards} />

      <article className="superadmin-panel superadmin-table-panel">
        <div className="superadmin-toolbar">
          <label className="superadmin-search-input">
            <AdminIcon name="search" />
            <input
              type="search"
              placeholder="Cari nama perusahaan atau lokasi..."
              value={recruiterSearchQuery}
              onChange={(event) => setRecruiterSearchQuery(event.target.value)}
            />
          </label>

          <div className="superadmin-toolbar-actions">
            <button type="button" className="superadmin-secondary-button">
              <AdminIcon name="filter" />
              Filter
            </button>
            <button
              type="button"
              className="superadmin-primary-button is-dark"
              onClick={() => handleExport('recruiter')}
            >
              <AdminIcon name="download" />
              Ekspor Data
            </button>
          </div>
        </div>

        <div className="superadmin-table-wrap">
          <table className="superadmin-table">
            <thead>
              <tr>
                <th>Perusahaan</th>
                <th>Lokasi</th>
                <th>Lowongan</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecruiterRows.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="superadmin-table-empty">Belum ada recruiter yang cocok.</div>
                  </td>
                </tr>
              ) : (
                filteredRecruiterRows.map((recruiter) => (
                  <tr key={recruiter.id}>
                    <td>
                      <div className="superadmin-company-cell">
                        <div className="superadmin-company-logo">{recruiter.initials}</div>
                        <div>
                          <strong>{recruiter.company_name || recruiter.name}</strong>
                          <span>{recruiter.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{recruiter.locationLabel}</td>
                    <td>{numberFormatter.format(recruiter.active_jobs_count ?? 0)}</td>
                    <td>
                      <span
                        className={`superadmin-status-tag is-${
                          recruiter.account_status === 'active'
                            ? recruiter.profile_ready
                              ? 'verified'
                              : 'pending'
                            : 'danger'
                        }`}
                      >
                        {recruiter.account_status === 'active'
                          ? recruiter.profile_ready
                            ? 'Terverifikasi'
                            : 'Menunggu'
                          : 'Ditolak'}
                      </span>
                    </td>
                    <td>
                      <div className="superadmin-icon-actions">
                        <button
                          type="button"
                          className="superadmin-icon-button"
                          title="Kirim reset password"
                          onClick={() => handleSendResetLink(recruiter)}
                          disabled={userResetActionInFlightId === recruiter.id}
                        >
                          <AdminIcon name="reset" />
                        </button>
                        <button
                          type="button"
                          className="superadmin-icon-button"
                          title={
                            recruiter.account_status === 'active'
                              ? 'Suspend akun recruiter'
                              : 'Aktifkan akun recruiter'
                          }
                          onClick={() => handleUserStatusToggle(recruiter)}
                          disabled={userStatusActionInFlightId === recruiter.id}
                        >
                          <AdminIcon
                            name={recruiter.account_status === 'active' ? 'ban' : 'check'}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          label={`Menampilkan 1-${Math.min(filteredRecruiterRows.length, 4)} dari ${numberFormatter.format(
            totals.recruiters ?? 0
          )} recruiter`}
        />
      </article>

      <div className="superadmin-two-column">
        <article className="superadmin-panel">
          <div className="superadmin-panel-head">
            <div>
              <h3>Aktivitas Verifikasi Terakhir</h3>
            </div>
            <button type="button" className="superadmin-inline-link">
              Lihat Semua
            </button>
          </div>
          <div className="superadmin-list-stack">
            {recruiterVerificationActivities.map((item) => (
              <article key={item.key} className="superadmin-list-item">
                <div className={`superadmin-list-icon is-${item.tone}`}>
                  <AdminIcon name={item.tone === 'success' ? 'check' : 'ban'} />
                </div>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                  <small>{item.timestamp}</small>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="superadmin-panel superadmin-dark-help">
          <h3>Bantuan Verifikasi</h3>
          <p>
            Butuh bantuan dalam melakukan validasi dokumen perusahaan? Baca panduan verifikasi sesuai
            standar internal KerjaNusa.
          </p>
          <button type="button" className="superadmin-primary-button">
            <AdminIcon name="job" />
            Buka Panduan
          </button>
        </article>
      </div>
    </section>
  );

  const renderJobManagement = () => (
    <section className="superadmin-section-block">
      <SectionOverview
        eyebrow="Job Inventory"
        title="Kontrol lowongan yang aktif, bermasalah, dan perlu dipindahkan."
        description="Fokus halaman ini adalah inventori lowongan: performa aplikasi, status publikasi, dan rekomendasi intervensi untuk lowongan yang tidak sehat."
        stats={jobsOverviewStats}
      />

      <SectionMetrics cards={lowonganCards} />

      <article className="superadmin-panel superadmin-table-panel">
        <div className="superadmin-toolbar superadmin-toolbar-wide">
          <div className="superadmin-toolbar-left">
            <label className="superadmin-search-input">
              <AdminIcon name="search" />
              <input
                type="search"
                placeholder="Cari judul lowongan atau perusahaan..."
                value={jobSearchQuery}
                onChange={(event) => setJobSearchQuery(event.target.value)}
              />
            </label>
            <button type="button" className="superadmin-secondary-button">
              <AdminIcon name="filter" />
              Filter
            </button>
          </div>

          <div className="superadmin-toolbar-right">
            <span>Urutkan:</span>
            <select
              className="superadmin-filter-select is-compact"
              value={jobSortOrder}
              onChange={(event) => setJobSortOrder(event.target.value)}
            >
              <option value="latest">Terbaru</option>
              <option value="applications">Pelamar terbanyak</option>
            </select>
          </div>
        </div>

        <div className="superadmin-table-wrap">
          <table className="superadmin-table">
            <thead>
              <tr>
                <th>Judul Lowongan</th>
                <th>Perusahaan</th>
                <th>Jumlah Pelamar</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sortedJobRows.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="superadmin-table-empty">Belum ada lowongan yang cocok.</div>
                  </td>
                </tr>
              ) : (
                sortedJobRows.map((job) => (
                  <tr key={job.id} className={job.isFlagged ? 'is-flagged' : ''}>
                    <td>
                      <div className="superadmin-job-title-cell">
                        <strong>{job.title}</strong>
                        <span>Post: {job.postedAtLabel}</span>
                        {job.isFlagged && <em>Melanggar aturan / butuh review</em>}
                      </div>
                    </td>
                    <td>
                      <div className="superadmin-company-inline">
                        <div className="superadmin-company-thumb">{getInitials(job.companyLabel)}</div>
                        <div>{job.companyLabel}</div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`superadmin-count-pill${
                          job.isFlagged ? ' is-danger' : ''
                        }`}
                      >
                        {numberFormatter.format(job.applications_count ?? 0)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`superadmin-status-inline${
                          job.workflow_status === 'active'
                            ? ' is-success'
                            : job.isFlagged
                              ? ' is-danger'
                              : ' is-muted'
                        }`}
                      >
                        <i />
                        {formatJobStatus(job)}
                      </span>
                    </td>
                    <td>
                      <div className="superadmin-job-actions">
                        <button
                          type="button"
                          className="superadmin-icon-button"
                          title="Pilih untuk rekomendasi reassign"
                          onClick={() => setSelectedOptimizationJobId(job.id)}
                        >
                          <AdminIcon name="switch" />
                        </button>

                        {job.isFlagged ? (
                          <button
                            type="button"
                            className="superadmin-danger-button"
                            onClick={() => {
                              handleSectionChange('moderation');
                              setFeedback({
                                type: 'success',
                                message: `${job.title} dibuka ke panel moderasi.`,
                              });
                            }}
                          >
                            Review Moderasi
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="superadmin-icon-button"
                            title="Tinjau detail lowongan"
                            onClick={() => {
                              setFeedback({
                                type: 'success',
                                message: `${job.title} dipilih untuk optimisasi penempatan.`,
                              });
                              setSelectedOptimizationJobId(job.id);
                            }}
                          >
                            <AdminIcon name="eye" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          label={`Menampilkan 1-${Math.min(sortedJobRows.length, 10)} dari ${numberFormatter.format(
            totals.total_jobs ?? 0
          )} lowongan`}
        />
      </article>

      <div className="superadmin-two-column superadmin-two-column-heavy">
        <article className="superadmin-panel superadmin-optimization-card">
          <span className="superadmin-panel-eyebrow">Optimisasi Penempatan Lowongan</span>
          <h3>Prioritaskan lowongan yang rasio pelamarnya rendah</h3>
          <p>
            Sistem mendeteksi lowongan yang memiliki rasio pelamar rendah. Pertimbangkan untuk
            memindahkan lowongan ini ke recruiter specialist yang lebih sesuai.
          </p>

          {selectedOptimizationJob ? (
            <div className="superadmin-optimization-form">
              <label className="superadmin-field-label">
                Lowongan prioritas
                <select
                  value={String(selectedOptimizationJob.id)}
                  onChange={(event) => setSelectedOptimizationJobId(Number(event.target.value))}
                >
                  {jobRows.map((job) => (
                    <option key={job.id} value={String(job.id)}>
                      {job.title} • {job.companyLabel}
                    </option>
                  ))}
                </select>
              </label>
              <label className="superadmin-field-label">
                Recruiter tujuan
                <select
                  value={jobReassignments[String(selectedOptimizationJob.id)] || ''}
                  onChange={(event) =>
                    setJobReassignments((current) => ({
                      ...current,
                      [String(selectedOptimizationJob.id)]: event.target.value,
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
              <button
                type="button"
                className="superadmin-primary-button"
                onClick={() => handleReassignJob(selectedOptimizationJob)}
                disabled={jobActionInFlightId === selectedOptimizationJob.id}
              >
                {jobActionInFlightId === selectedOptimizationJob.id
                  ? 'Memindahkan...'
                  : 'Lihat Rekomendasi'}
              </button>
            </div>
          ) : (
            <p className="superadmin-empty-copy">Belum ada lowongan untuk dioptimalkan.</p>
          )}
        </article>

        <article className="superadmin-panel">
          <div className="superadmin-panel-head">
            <div>
              <h3>Log Aktivitas Terbaru</h3>
            </div>
          </div>
          <div className="superadmin-list-stack">
            {lowonganActivityLogs.map((item) => (
              <article key={item.key} className="superadmin-list-item">
                <div className={`superadmin-list-dot is-${item.tone}`} />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                  <small>{item.timestamp}</small>
                </div>
              </article>
            ))}
          </div>
        </article>
      </div>
    </section>
  );

  const renderAnalytics = () => (
    <section className="superadmin-section-block">
      <SectionOverview
        eyebrow="Reporting Layer"
        title="Satu ringkasan visual untuk membaca pertumbuhan dan distribusi hiring."
        description="Analytics dipertahankan ringkas: cukup satu chart utama, kategori dominan, lowongan populer, dan insight yang bisa langsung dipakai untuk keputusan berikutnya."
        stats={analyticsOverviewStats}
      />

      <SectionMetrics cards={analyticsCards} />

      <div className="superadmin-analytics-grid">
        <article className="superadmin-panel superadmin-chart-panel">
          <div className="superadmin-panel-head">
            <div>
              <h3>Pertumbuhan Pengguna</h3>
              <p>Statistik perbandingan pendaftaran bulanan</p>
            </div>
            <div className="superadmin-chart-legend">
              <span>
                <i className="is-navy" /> Pelamar
              </span>
              <span>
                <i className="is-orange" /> Recruiter
              </span>
            </div>
          </div>

          <div className="superadmin-line-chart">
            <svg viewBox="0 0 640 260" aria-hidden="true">
              {[0, 1, 2, 3].map((lineIndex) => (
                <line
                  key={lineIndex}
                  x1="18"
                  y1={50 + lineIndex * 48}
                  x2="622"
                  y2={50 + lineIndex * 48}
                  className="superadmin-chart-gridline"
                />
              ))}
              <path d={candidateTrendPath} className="superadmin-chart-line is-navy" />
              <path d={recruiterTrendPath} className="superadmin-chart-line is-orange is-dashed" />
            </svg>
            <div className="superadmin-chart-months">
              {ANALYTICS_MONTH_LABELS.map((month) => (
                <span key={month}>{month}</span>
              ))}
            </div>
          </div>
        </article>

        <article className="superadmin-panel superadmin-category-panel">
          <div className="superadmin-panel-head">
            <div>
              <h3>Kategori Pekerjaan</h3>
              <p>Distribusi sektor terpopuler</p>
            </div>
          </div>
          <div className="superadmin-category-list">
            {categoryDistribution.map((category) => (
              <article key={category.label} className="superadmin-category-item">
                <div className="superadmin-category-head">
                  <strong>{category.label}</strong>
                  <span>{category.percentage}%</span>
                </div>
                <div className="superadmin-category-track">
                  <span
                    className={`is-${category.tone}`}
                    style={{ width: `${category.percentage}%` }}
                  />
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="superadmin-panel superadmin-popular-jobs-panel">
          <div className="superadmin-panel-head">
            <div>
              <h3>Lowongan Paling Populer</h3>
              <p>Berdasarkan jumlah klik dan lamaran masuk</p>
            </div>
            <button type="button" className="superadmin-inline-link" onClick={() => handleSectionChange('lowongan')}>
              Lihat Semua
            </button>
          </div>

          <div className="superadmin-table-wrap">
            <table className="superadmin-table is-compact">
              <thead>
                <tr>
                  <th>Nama Pekerjaan</th>
                  <th>Perusahaan</th>
                  <th>Lamaran</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {popularJobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <div className="superadmin-job-title-cell">
                        <strong>{job.title}</strong>
                        <span>
                          {job.location || 'Remote'} • {job.job_type || 'Full-time'}
                        </span>
                      </div>
                    </td>
                    <td>{job.companyLabel}</td>
                    <td>{numberFormatter.format(job.applications_count ?? 0)}</td>
                    <td>
                      <span
                        className={`superadmin-status-tag is-${
                          job.workflow_status === 'active' ? 'success' : 'warning'
                        }`}
                      >
                        {job.workflow_status === 'active' ? 'Aktif' : 'Review'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <div className="superadmin-analytics-side">
          <article className="superadmin-panel superadmin-demographic-panel">
            <div className="superadmin-panel-head">
              <div>
                <h3>Demografi Pelamar</h3>
              </div>
            </div>
            <div className="superadmin-demographic-wrap">
              <div
                className="superadmin-donut-chart"
                style={{
                  background: 'conic-gradient(#0f1937 0deg 234deg, #dde0e7 234deg 324deg, #f2f1f4 324deg 360deg)',
                }}
              >
                <div className="superadmin-donut-center">65%</div>
              </div>
              <div className="superadmin-demographic-list">
                {demographicsData.map((item) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}%</strong>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="superadmin-panel superadmin-dark-panel">
            <h3>Insights Khusus</h3>
            <p>{insightsSpecialText}</p>
            <button type="button" className="superadmin-primary-button">
              Lihat Rekomendasi
            </button>
          </article>

          <article className="superadmin-panel superadmin-kpi-target-panel">
            <div className="superadmin-kpi-target-icon">
              <AdminIcon name="spark" />
            </div>
            <div>
              <span>Target Kuartal III</span>
              <strong>85% Pencapaian KPI</strong>
              <div className="superadmin-kpi-track">
                <span style={{ width: '85%' }} />
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );

  const renderModeration = () => (
    <section className="superadmin-section-block">
      <SectionOverview
        eyebrow="Moderation Ops"
        title="Antrian moderasi dengan prioritas yang jelas dan tindakan yang langsung terlihat."
        description="Panel moderasi dipakai untuk memisahkan laporan kritis dari noise. Fokus utamanya adalah kejelasan alasan laporan dan aksi admin yang bisa dijalankan cepat."
        stats={moderationOverviewStats}
      />

      <SectionMetrics cards={moderationCards} />

      <article className="superadmin-panel superadmin-moderation-panel">
        <div className="superadmin-moderation-tabs">
          {MODERATION_TABS.map((tab) => {
            const count =
              tab.value === 'all'
                ? moderationReports.length
                : moderationReports.filter((report) => report.type === tab.value).length;

            return (
              <button
                key={tab.value}
                type="button"
                className={`superadmin-tab-button${
                  moderationTab === tab.value ? ' is-active' : ''
                }`}
                onClick={() => setModerationTab(tab.value)}
              >
                {tab.label} {tab.value === 'all' ? '' : `(${count})`}
              </button>
            );
          })}

          <span className="superadmin-moderation-caption">
            Menampilkan 1-{Math.min(filteredModerationReports.length, 10)} dari{' '}
            {filteredModerationReports.length} antrian
          </span>
        </div>

        <div className="superadmin-report-list">
          {filteredModerationReports.length === 0 ? (
            <div className="superadmin-empty-state is-panel">
              <div className="superadmin-empty-icon">⌁</div>
              <p>Tidak ada laporan yang cocok untuk ditampilkan saat ini.</p>
            </div>
          ) : (
            filteredModerationReports.slice(0, 3).map((report) => (
              <article key={report.key} className="superadmin-report-card">
                <div className={`superadmin-report-type is-${report.type}`}>
                  <AdminIcon name={report.type === 'job' ? 'job' : 'candidate'} />
                </div>

                <div className="superadmin-report-body">
                  <div className="superadmin-report-top">
                    <div>
                      <h3>{report.title}</h3>
                      <span>{report.ownerLabel}</span>
                    </div>
                    <div className="superadmin-report-meta">
                      <span className={`superadmin-inline-badge is-${report.badgeTone}`}>
                        {report.severityLabel}
                      </span>
                      <small>Dilaporkan {report.timestamp}</small>
                    </div>
                  </div>

                  <div className="superadmin-report-quote">
                    <strong>Alasan Pelaporan</strong>
                    <p>"{report.reason}"</p>
                  </div>

                  <div className="superadmin-report-evidence">
                    {Array.from({ length: report.evidenceCount }).map((_, index) => (
                      <div key={`${report.key}-evidence-${index}`} className="superadmin-report-proof">
                        <div className="superadmin-proof-skeleton" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="superadmin-report-actions">
                  <button
                    type="button"
                    className="superadmin-report-button is-dark"
                    onClick={() => handleModerationAction(report, 'review')}
                  >
                    {report.type === 'job' ? 'Hapus Konten' : 'Minta Verifikasi'}
                  </button>
                  <button
                    type="button"
                    className="superadmin-report-button is-danger"
                    onClick={() => handleModerationAction(report, 'suspend')}
                  >
                    Suspend Akun
                  </button>
                  <button
                    type="button"
                    className="superadmin-report-button is-light"
                    onClick={() => handleModerationAction(report, 'ignore')}
                  >
                    Abaikan
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="superadmin-moderation-footer">
          <button type="button" className="superadmin-inline-nav">
            ‹ Sebelumnya
          </button>
          <div className="superadmin-pagination">
            <button type="button" className="superadmin-page-button is-active">
              1
            </button>
            <button type="button" className="superadmin-page-button">
              2
            </button>
            <button type="button" className="superadmin-page-button">
              3
            </button>
          </div>
          <button type="button" className="superadmin-inline-nav">
            Selanjutnya ›
          </button>
        </div>
      </article>
    </section>
  );

  const renderSectionContent = () => {
    if (activeSection === 'monitoring') {
      return renderMonitoring();
    }

    if (activeSection === 'pelamar') {
      return renderCandidateManagement();
    }

    if (activeSection === 'recruiter') {
      return renderRecruiterManagement();
    }

    if (activeSection === 'lowongan') {
      return renderJobManagement();
    }

    if (activeSection === 'analytics') {
      return renderAnalytics();
    }

    return renderModeration();
  };

  return (
    <div className="superadmin-page">
      <div className="superadmin-stitch-banner">
        Konten ini dibuat oleh pengguna Stitch. Jangan masukkan informasi sensitif karena dapat
        dilihat oleh pemilik.
      </div>

      <div className="superadmin-shell">
        <aside className="superadmin-sidebar">
          <div className="superadmin-sidebar-brand">
            <strong>KerjaNusa</strong>
            <span>Superadmin Dashboard</span>
          </div>

          <nav className="superadmin-sidebar-nav" aria-label="Navigasi superadmin">
            {SECTION_OPTIONS.map((section) => (
              <button
                key={section.value}
                type="button"
                className={`superadmin-sidebar-link${
                  activeSection === section.value ? ' is-active' : ''
                }`}
                onClick={() => handleSectionChange(section.value)}
              >
                <AdminIcon name={section.value} />
                <span>{section.label}</span>
              </button>
            ))}
          </nav>

          <div className="superadmin-sidebar-footer">
            <button type="button" className="superadmin-sidebar-post-job">
              <span>+</span>
              Post Job
            </button>

            <div className="superadmin-sidebar-user">
              <div className="superadmin-sidebar-avatar">{getInitials(user?.name)}</div>
              <div>
                <strong>{user?.name || 'Nama Superadmin'}</strong>
                <span>
                  {activeSection === 'moderation'
                    ? 'Administrator Utama'
                    : activeSection === 'recruiter'
                      ? 'Administrator Level 1'
                      : 'Superadmin Profile'}
                </span>
              </div>
            </div>

            {activeSection === 'moderation' && (
              <button type="button" className="superadmin-sidebar-logout" onClick={handleLogout}>
                <AdminIcon name="logout" />
                Logout
              </button>
            )}
          </div>
        </aside>

        <main className="superadmin-main">
          <header className="superadmin-main-header">
            <div className="superadmin-main-title">
              <div className="superadmin-main-title-row">
                <h1>{currentSection.title}</h1>
                {titleBadge ? <span className="superadmin-title-badge">{titleBadge}</span> : null}
              </div>
            </div>
            {renderHeaderAside()}
          </header>

          <section className="superadmin-content">
            {renderFeedback()}
            {renderSectionContent()}
          </section>

          <footer className="superadmin-footer">
            <span>{footerMeta.copy}</span>
            <div className="superadmin-footer-links">
              {footerMeta.links.map((link) => (
                <a key={link} href="#admin-meta">
                  {link}
                </a>
              ))}
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
