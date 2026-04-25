import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import RecruiterTopbar from '../components/RecruiterTopbar.jsx';
import useAuth from '../hooks/useAuth';
import useJobs from '../hooks/useJobs';
import { formatExperienceLevel } from '../utils/jobFormatters.js';
import '../styles/recruiterDashboard.css';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua Status' },
  { value: 'active', label: 'Aktif' },
  { value: 'draft', label: 'Draft' },
  { value: 'inactive', label: 'Nonaktif' },
  { value: 'review', label: 'In Review' },
  { value: 'closed', label: 'Ditutup' },
  { value: 'rejected', label: 'Ditolak' },
];

const RECRUITER_SECTION_OPTIONS = [
  { value: 'jobs', label: 'Lowongan' },
  { value: 'candidates', label: 'Kandidat' },
  { value: 'chat', label: 'Chat' },
  { value: 'talent-search', label: 'Talent Search' },
];

const CANDIDATE_STAGE_OPTIONS = [
  { value: 'applied', label: 'Melamar' },
  { value: 'shortlisted', label: 'Terseleksi' },
  { value: 'interviewInvite', label: 'Undang Wawancara' },
  { value: 'interview', label: 'Wawancara' },
  { value: 'offerSent', label: 'Tawaran Terkirim' },
  { value: 'accepted', label: 'Diterima' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'closed', label: 'Ditutup' },
];

const CANDIDATE_DETAIL_TAB_OPTIONS = [
  { value: 'profile', label: 'Profil' },
  { value: 'cv', label: 'Lihat CV' },
  { value: 'qualification', label: 'Hasil Kualifikasi' },
];

const RECRUITER_DASHBOARD_STORAGE_KEY = 'recruiter_dashboard_ui_state';

const APPLIED_CANDIDATE_DEMO_PROFILES = [
  {
    id: 'applied-demo-1',
    name: 'SUJIROH',
    location: 'Kab. Pemalang',
    age: '38 tahun',
    matchScore: '9/11 memenuhi syarat',
    education: {
      school: 'Universitas Yotabakti Yogyakarta',
      period: '2016 - 2019',
    },
    experience: {
      company: 'Belum Isi Pengalaman',
      role: '',
      duration: '',
    },
    salary: 'Belum Isi Penghasilan',
    appliedDate: '26 March 2026',
    email: 'sujiroh@gmail.com',
    phone: '081234567801',
    badgeLabel: 'Baru',
    avatarTone: 'teal',
    locationDetail: 'Kab. Pemalang, Jawa Tengah',
    about:
      'Credit Marketing Officer / CMO, pinjaman dana tunai dengan jaminan BPKB motor baru dan bekas, serta field collection dan sales officer.',
    lastSalary: 'Belum isi penghasilan',
    skills: [
      'Target Oriented',
      'Melayani Pelanggan',
      'Komunikasi Interpersonal',
      'Siap Kerja Weekend',
      'Kerjasama Tim',
      'Siap Shift Malam',
      'Manajemen Inventori',
      'Komunikatif',
    ],
    documents: [
      'CV',
      'SIM B2 Umum',
      'Surat Pelatihan',
      'Cover Letter',
      'Fotocopy SKCK',
      'KTP',
      'NPWP',
      'Sertifikat Vaksin Covid-19',
      'Ijazah/Sertifikat Profesi',
      'SMA',
      'KK',
      'Surat Rekomendasi Kerja',
      'SKBN',
      'DRH',
    ],
    socialMedia: [
      { platform: 'Instagram', handle: '@jjiro', accent: 'instagram' },
      { platform: 'X / Twitter', handle: '@jjirooeh', accent: 'twitter' },
      { platform: 'TikTok', handle: '@jjiroeh', accent: 'tiktok' },
      { platform: 'YouTube', handle: '@jjiroh', accent: 'youtube' },
    ],
    qualificationOverview: '9/11',
    qualificationCriteriaOverview: '5/6',
    qualificationCriteria: [
      { label: 'Usia', value: '38 Y', ideal: '20-55 tahun', met: true },
      { label: 'Pendidikan', value: 'Diploma', ideal: 'Diploma', met: true },
      { label: 'Jenis Kelamin', value: 'Pria', ideal: 'Pria/Wanita', met: true },
      { label: 'Lokasi', value: 'Kab. Pemalang', ideal: 'Kab. Pemalang', met: true },
      {
        label: 'Pengalaman',
        value: 'Tidak memiliki pengalaman bekerja',
        ideal: 'Berpengalaman',
        met: false,
      },
      { label: 'Foto', value: 'Kandidat memiliki foto profil', ideal: 'Wajib memiliki foto', met: true },
    ],
    qualificationQuizOverview: '5/5',
    qualificationQuiz: [
      {
        question: 'Apakah Anda bersedia segera bekerja, jika terpilih?',
        answer: 'Ya',
        ideal: 'Ya',
        met: true,
      },
      {
        question: 'Apakah anda memiliki pengalaman kerja sebagai QC di RPA minimal 2 tahun?',
        answer: 'Ya',
        ideal: 'Ya',
        met: true,
      },
      {
        question: 'Apakah anda memiliki sertifikasi COA / HACCP / ISO Industri Pangan ?',
        answer: 'Ya',
        ideal: 'Ya',
        met: true,
      },
      {
        question: 'Apakah anda menguasai 7 Tools QC ?',
        answer: 'Ya',
        ideal: 'Ya',
        met: true,
      },
      {
        question: 'Apakah anda menguasai MS. Word, MS. Excel, MS. Power Point ?',
        answer: 'Ya',
        ideal: 'Ya',
        met: true,
      },
    ],
    qualificationResults: [
      { label: 'Domisili sesuai area penempatan', met: true },
      { label: 'Pendidikan sesuai kebutuhan', met: true },
      { label: 'Usia masuk rentang kebutuhan lowongan', met: true },
      { label: 'Pengalaman kerja belum dilengkapi', met: false },
    ],
  },
  {
    id: 'applied-demo-2',
    name: 'Sandi Kurniawan',
    location: 'Kab. Pemalang',
    age: '29 tahun',
    matchScore: '10/11 memenuhi syarat',
    education: {
      school: 'SMKN 1 Petarukan',
      period: '2013 - 2016',
    },
    experience: {
      company: 'PT DHARMA POLIMETAL',
      role: 'Operator Produksi',
      duration: '3 tahun 2 bulan',
    },
    salary: 'Rp 3.600.000',
    appliedDate: '25 March 2026',
    email: 'sandikurniawan@gmail.com',
    phone: '081234567802',
    badgeLabel: 'Terverifikasi',
    avatarTone: 'red',
    locationDetail: 'Kab. Pemalang, Jawa Tengah',
    about:
      'Operator produksi dengan pengalaman di manufaktur, terbiasa bekerja dengan target harian, shift, dan standar kualitas operasional.',
    lastSalary: 'Rp 3.600.000',
    skills: [
      'Operator Produksi',
      'Quality Control',
      'Kerja Shift',
      'Disiplin',
      'Kerjasama Tim',
      'Problem Solving',
      'Administrasi Dasar',
    ],
    documents: [
      'CV',
      'KTP',
      'KK',
      'SKCK',
      'Ijazah SMK',
      'Sertifikat Operator Produksi',
      'NPWP',
      'Sertifikat Vaksin',
    ],
    socialMedia: [
      { platform: 'Instagram', handle: '@sandikurniawan', accent: 'instagram' },
      { platform: 'LinkedIn', handle: '/in/sandikurniawan', accent: 'linkedin' },
      { platform: 'TikTok', handle: '@sandikurniawan', accent: 'tiktok' },
    ],
    qualificationOverview: '10/11',
    qualificationCriteriaOverview: '6/6',
    qualificationCriteria: [
      { label: 'Usia', value: '29 Y', ideal: '20-35 tahun', met: true },
      { label: 'Pendidikan', value: 'SMK', ideal: 'SMA/SMK', met: true },
      { label: 'Jenis Kelamin', value: 'Pria', ideal: 'Pria/Wanita', met: true },
      { label: 'Lokasi', value: 'Kab. Pemalang', ideal: 'Kab. Pemalang', met: true },
      { label: 'Pengalaman', value: '3 tahun 2 bulan', ideal: 'Minimal 2 tahun', met: true },
      { label: 'Foto', value: 'Kandidat memiliki foto profil', ideal: 'Wajib memiliki foto', met: true },
    ],
    qualificationQuizOverview: '4/5',
    qualificationQuiz: [
      {
        question: 'Apakah bersedia bekerja dalam sistem shift?',
        answer: 'Ya',
        ideal: 'Ya',
        met: true,
      },
      {
        question: 'Apakah terbiasa bekerja dengan target harian?',
        answer: 'Ya',
        ideal: 'Ya',
        met: true,
      },
      {
        question: 'Apakah memiliki pengalaman di area quality control?',
        answer: 'Ya',
        ideal: 'Ya',
        met: true,
      },
      {
        question: 'Apakah siap ditempatkan segera setelah lolos seleksi?',
        answer: 'Ya',
        ideal: 'Ya',
        met: true,
      },
      {
        question: 'Apakah memiliki sertifikasi HACCP / ISO?',
        answer: 'Belum',
        ideal: 'Ya',
        met: false,
      },
    ],
    qualificationResults: [
      { label: 'Domisili sesuai area penempatan', met: true },
      { label: 'Pendidikan sesuai kebutuhan', met: true },
      { label: 'Pengalaman manufaktur relevan', met: true },
      { label: 'Gaji masuk rentang yang dibutuhkan', met: true },
    ],
  },
];

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('id-ID');

const normalizeDashboardStatus = (status) => {
  const normalizedStatus = String(status || '').trim().toLowerCase();

  switch (normalizedStatus) {
    case 'draft':
      return 'draft';
    case 'inactive':
      return 'inactive';
    case 'review':
    case 'in_review':
    case 'in-review':
    case 'in review':
      return 'review';
    case 'closed':
    case 'ditutup':
      return 'closed';
    case 'rejected':
    case 'ditolak':
      return 'rejected';
    case 'active':
    default:
      return 'active';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'inactive':
      return 'Nonaktif';
    case 'review':
      return 'In Review';
    case 'closed':
      return 'Ditutup';
    case 'rejected':
      return 'Ditolak';
    case 'active':
    default:
      return 'Aktif';
  }
};

const formatJobType = (value = '') =>
  String(value)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getSalaryLabel = (job) => {
  const minimumSalary = Number(job.salary_min) || 0;
  const maximumSalary = Number(job.salary_max) || 0;

  if (!minimumSalary && !maximumSalary) {
    return 'Gaji mengikuti kualifikasi';
  }

  if (minimumSalary && maximumSalary) {
    return `${currencyFormatter.format(minimumSalary)} - ${currencyFormatter.format(maximumSalary)}`;
  }

  return currencyFormatter.format(Math.max(minimumSalary, maximumSalary));
};

const getPublishedLabel = (jobId) => `Dipublikasikan ${((jobId % 4) || 1) + 1} hari lalu`;

const getUpdatedLabel = (jobId) => `Terakhir diubah ${(jobId % 3) + 1} hari lalu`;

const getExpiryLabel = (jobId) => {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 12 + (jobId % 5) * 5);

  return `Tayang hingga ${expiryDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;
};

const getJobInsights = (job) => {
  const totalApplicants = Number(job.applications_count) || 0;
  const totalViews = totalApplicants * 19 + job.id * 17 + 48;
  const shortlistedCount = Math.min(totalApplicants, Math.round(totalApplicants * 0.36));
  const selectedCount = Math.min(totalApplicants, Math.round(totalApplicants * 0.14));
  const interviewCount = Math.min(selectedCount, Math.max(0, Math.round(totalApplicants * 0.08)));
  const unreadCount = Math.max(0, totalApplicants - shortlistedCount);

  return {
    totalApplicants,
    totalViews,
    shortlistedCount,
    selectedCount,
    interviewCount,
    unreadCount,
  };
};

const getCandidateStageLabel = (stage) =>
  CANDIDATE_STAGE_OPTIONS.find((option) => option.value === stage)?.label || stage;

const readStoredRecruiterDashboardState = () => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const storedState = window.localStorage.getItem(RECRUITER_DASHBOARD_STORAGE_KEY);
    return storedState ? JSON.parse(storedState) : {};
  } catch (error) {
    return {};
  }
};

const getStoredRecruiterDashboardValue = (key, fallbackValue) => {
  const storedState = readStoredRecruiterDashboardState();
  return storedState[key] ?? fallbackValue;
};

const getInitialRecruiterSection = () => {
  const storedSection = getStoredRecruiterDashboardValue('activeSection', 'jobs');
  return RECRUITER_SECTION_OPTIONS.some((section) => section.value === storedSection)
    ? storedSection
    : 'jobs';
};

const getInitialCandidateStage = () => {
  const storedStage = getStoredRecruiterDashboardValue('activeCandidateStage', 'applied');
  return CANDIDATE_STAGE_OPTIONS.some((stage) => stage.value === storedStage)
    ? storedStage
    : 'applied';
};

const buildAppliedCandidateEntries = (job) =>
  APPLIED_CANDIDATE_DEMO_PROFILES.map((candidate, index) => {
    const emailHandle =
      candidate.email || `${candidate.name.toLowerCase().replace(/\s+/g, '.') || 'candidate'}@example.com`;

    return {
      ...candidate,
      id: `${candidate.id}-${job?.id ?? 'default'}`,
      email: emailHandle,
      location: candidate.location || job?.location || 'Indonesia',
      phone: candidate.phone || `08${String(8123456780 + index).slice(0, 10)}`,
      stage: 'applied',
      updatedLabel: `${index + 1} hari lalu`,
    };
  });

const getCandidatePipelineCounts = () => ({
  applied: 2,
  shortlisted: 0,
  interviewInvite: 0,
  interview: 0,
  offerSent: 0,
  accepted: 0,
  rejected: 12,
  closed: 0,
});

const RecruiterDashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { jobs, pagination, isLoading, error, getMyJobs, deleteJob } = useJobs();
  const [activeSection, setActiveSection] = useState(getInitialRecruiterSection);
  const [searchQuery, setSearchQuery] = useState(() =>
    getStoredRecruiterDashboardValue('searchQuery', '')
  );
  const [activeStatus, setActiveStatus] = useState(() =>
    getStoredRecruiterDashboardValue('activeStatus', 'all')
  );
  const [candidateSearchQuery, setCandidateSearchQuery] = useState(() =>
    getStoredRecruiterDashboardValue('candidateSearchQuery', '')
  );
  const [selectedCandidateJobId, setSelectedCandidateJobId] = useState(() =>
    getStoredRecruiterDashboardValue('selectedCandidateJobId', null)
  );
  const [activeCandidateStage, setActiveCandidateStage] = useState(getInitialCandidateStage);
  const [isCandidateNoticeVisible, setIsCandidateNoticeVisible] = useState(() =>
    getStoredRecruiterDashboardValue('isCandidateNoticeVisible', true)
  );
  const [selectedCandidateDetailId, setSelectedCandidateDetailId] = useState(null);
  const [activeCandidateDetailTab, setActiveCandidateDetailTab] = useState('profile');
  const [copiedCandidatePhoneId, setCopiedCandidatePhoneId] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [jobPendingDelete, setJobPendingDelete] = useState(null);
  const [isDeletingJob, setIsDeletingJob] = useState(false);

  useEffect(() => {
    if (user?.role === 'recruiter') {
      getMyJobs(1, 12);
    }
  }, [getMyJobs, user]);

  const dashboardJobs = useMemo(
    () =>
      jobs.map((job) => {
        const status = normalizeDashboardStatus(job.status);
        return {
          ...job,
          dashboardStatus: status,
          statusLabel: getStatusLabel(status),
          insights: getJobInsights(job),
          salaryLabel: getSalaryLabel(job),
          publishedLabel: getPublishedLabel(job.id),
          updatedLabel: getUpdatedLabel(job.id),
          expiryLabel: getExpiryLabel(job.id),
        };
      }),
    [jobs]
  );

  const filteredJobs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return dashboardJobs.filter((job) => {
      const matchesStatus =
        activeStatus === 'all' ? true : job.dashboardStatus === activeStatus;

      const matchesSearch =
        !normalizedQuery ||
        [job.title, job.location, job.category, job.recruiter?.name, job.description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesStatus && matchesSearch;
    });
  }, [activeStatus, dashboardJobs, searchQuery]);

  useEffect(() => {
    if (!dashboardJobs.length) {
      return;
    }

    const hasSelectedJob = dashboardJobs.some((job) => job.id === selectedCandidateJobId);

    if (hasSelectedJob) {
      return;
    }

    const defaultJob =
      dashboardJobs.find((job) => job.dashboardStatus === 'active') || dashboardJobs[0];

    setSelectedCandidateJobId(defaultJob.id);
  }, [dashboardJobs, selectedCandidateJobId]);

  const selectedCandidateJob = useMemo(
    () => dashboardJobs.find((job) => job.id === selectedCandidateJobId) || null,
    [dashboardJobs, selectedCandidateJobId]
  );

  const candidatePipelineCounts = useMemo(() => getCandidatePipelineCounts(), []);

  const candidateEntriesByStage = useMemo(
    () => ({
      applied: buildAppliedCandidateEntries(selectedCandidateJob),
      shortlisted: [],
      interviewInvite: [],
      interview: [],
      offerSent: [],
      accepted: [],
      rejected: [],
      closed: [],
    }),
    [selectedCandidateJob]
  );
  const activeCandidateEntries = candidateEntriesByStage[activeCandidateStage] || [];

  const filteredCandidateEntries = useMemo(() => {
    const normalizedQuery = candidateSearchQuery.trim().toLowerCase();

    return activeCandidateEntries.filter((candidate) => {
      const matchesSearch =
        !normalizedQuery ||
        [
          candidate.name,
          candidate.email,
          candidate.phone,
          candidate.location,
          candidate.education?.school,
          candidate.experience?.company,
          candidate.experience?.role,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesSearch;
    });
  }, [activeCandidateEntries, candidateSearchQuery]);

  const selectedCandidateDetail = useMemo(
    () => activeCandidateEntries.find((candidate) => candidate.id === selectedCandidateDetailId) || null,
    [activeCandidateEntries, selectedCandidateDetailId]
  );

  const activeCandidateStageLabel = getCandidateStageLabel(activeCandidateStage);
  const activeSectionLabel =
    RECRUITER_SECTION_OPTIONS.find((section) => section.value === activeSection)?.label ||
    'Recruiter';

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      RECRUITER_DASHBOARD_STORAGE_KEY,
      JSON.stringify({
        activeSection,
        searchQuery,
        activeStatus,
        candidateSearchQuery,
        selectedCandidateJobId,
        activeCandidateStage,
        isCandidateNoticeVisible,
      })
    );
  }, [
    activeCandidateStage,
    activeSection,
    activeStatus,
    candidateSearchQuery,
    isCandidateNoticeVisible,
    searchQuery,
    selectedCandidateJobId,
  ]);

  useEffect(() => {
    if (!selectedCandidateDetailId || selectedCandidateDetail) {
      return;
    }

    setSelectedCandidateDetailId(null);
    setActiveCandidateDetailTab('profile');
    setCopiedCandidatePhoneId(null);
  }, [selectedCandidateDetail, selectedCandidateDetailId]);

  useEffect(() => {
    if (typeof document === 'undefined' || !selectedCandidateDetail) {
      return undefined;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      setSelectedCandidateDetailId(null);
      setActiveCandidateDetailTab('profile');
      setCopiedCandidatePhoneId(null);
    };

    body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedCandidateDetail]);

  useEffect(() => {
    if (typeof document === 'undefined' || !jobPendingDelete) {
      return undefined;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || isDeletingJob) {
        return;
      }

      setJobPendingDelete(null);
    };

    body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDeletingJob, jobPendingDelete]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    navigate('/', { replace: true });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setActiveStatus('all');
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setSelectedCandidateDetailId(null);
    setActiveCandidateDetailTab('profile');
    setCopiedCandidatePhoneId(null);
    setJobPendingDelete(null);
  };

  const handleCandidateJobChange = (event) => {
    setSelectedCandidateJobId(Number(event.target.value));
    setCandidateSearchQuery('');
    setActiveCandidateStage('applied');
    setIsCandidateNoticeVisible(true);
    setSelectedCandidateDetailId(null);
    setActiveCandidateDetailTab('profile');
    setCopiedCandidatePhoneId(null);
  };

  const handleCandidateDetailOpen = (candidateId) => {
    setSelectedCandidateDetailId(candidateId);
    setActiveCandidateDetailTab('profile');
    setCopiedCandidatePhoneId(null);
  };

  const handleCandidateDetailClose = () => {
    setSelectedCandidateDetailId(null);
    setActiveCandidateDetailTab('profile');
    setCopiedCandidatePhoneId(null);
  };

  const handleCandidatePhoneCopy = async (candidate) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(candidate.phone);
      setCopiedCandidatePhoneId(candidate.id);
    } catch (error) {
      setCopiedCandidatePhoneId(null);
    }
  };

  const handleDeleteDialogOpen = (job) => {
    setJobPendingDelete(job);
  };

  const handleDeleteDialogClose = () => {
    if (isDeletingJob) {
      return;
    }

    setJobPendingDelete(null);
  };

  const handleDeleteJobConfirm = async () => {
    if (!jobPendingDelete?.id || isDeletingJob) {
      return;
    }

    setIsDeletingJob(true);

    try {
      await deleteJob(jobPendingDelete.id);
      setJobPendingDelete(null);
      await getMyJobs(1, 12);
    } catch {
      // Error banner is handled by useJobs state.
    } finally {
      setIsDeletingJob(false);
    }
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'recruiter') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="recruiter-dashboard-page">
      <RecruiterTopbar
        sections={RECRUITER_SECTION_OPTIONS}
        activeSection={activeSection}
        onSectionSelect={handleSectionChange}
        onBrandClick={() => setActiveSection('jobs')}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        user={user}
      />

      <main className="recruiter-dashboard-shell">
        {activeSection === 'jobs' ? (
          <>
            <div className="recruiter-page-actions">
              <button
                type="button"
                className="recruiter-create-job-button"
                onClick={() => navigate('/recruiter/jobs/create')}
              >
                + Pasang Loker
              </button>
            </div>

            <section className="recruiter-content-surface">
              <section className="recruiter-banner">
                <div className="recruiter-banner-visual" aria-hidden="true">
                  <div className="recruiter-banner-card-float">
                    <span>Admin</span>
                    <strong>Perusahaan Anda</strong>
                  </div>
                  <div className="recruiter-banner-portrait">
                    <div className="recruiter-banner-head" />
                    <div className="recruiter-banner-body" />
                    <div className="recruiter-banner-laptop" />
                  </div>
                  <span className="recruiter-banner-ring recruiter-banner-ring-one" />
                  <span className="recruiter-banner-ring recruiter-banner-ring-two" />
                  <span className="recruiter-banner-bubble recruiter-banner-bubble-one" />
                  <span className="recruiter-banner-bubble recruiter-banner-bubble-two" />
                  <span className="recruiter-banner-bubble recruiter-banner-bubble-three" />
                </div>

                <div className="recruiter-banner-copy">
                  <h1>
                    Jangkau kandidat <span>lebih luas</span>
                  </h1>
                  <p>
                    Sebar loker ke lebih dari 100+ media partner Pintarnya dan pantau proses hiring
                    dalam satu tampilan yang rapi.
                  </p>

                  <div className="recruiter-banner-actions">
                    <button type="button" className="recruiter-banner-primary">
                      Aktifkan Social Media Booster
                    </button>
                  </div>
                </div>
              </section>

              <section className="recruiter-dashboard-layout">
                <button type="button" className="recruiter-service-rail">
                  Customer Service
                </button>

                <aside className="recruiter-filter-panel">
                  <div className="recruiter-filter-header">
                    <div>
                      <h2>Filter</h2>
                    </div>
                    <button type="button" onClick={handleResetFilters}>
                      Reset
                    </button>
                  </div>

                  <div className="recruiter-filter-group">
                    <span className="recruiter-filter-label">Status</span>
                    <div className="recruiter-status-list">
                      {STATUS_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`recruiter-status-option${
                            activeStatus === option.value ? ' active' : ''
                          }`}
                          onClick={() => setActiveStatus(option.value)}
                        >
                          <span className="recruiter-status-marker" aria-hidden="true" />
                          <span className="recruiter-status-copy">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </aside>

                <div className="recruiter-dashboard-main">
                  <div className="recruiter-toolbar">
                    <label className="recruiter-search-field">
                      <span className="recruiter-search-icon" aria-hidden="true">
                        ⌕
                      </span>
                      <input
                        type="search"
                        placeholder="Cari judul loker"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                      />
                    </label>

                    <p className="recruiter-toolbar-meta">
                      Menampilkan {numberFormatter.format(filteredJobs.length)} dari{' '}
                      {numberFormatter.format(pagination?.total ?? dashboardJobs.length)} lowongan
                      kerja
                    </p>

                    <button type="button" className="recruiter-toolbar-contact">
                      Contact Subscription
                    </button>
                  </div>

                  <div className="recruiter-info-banner">
                    Informasi penting: untuk menjaga performa sistem, data kandidat pada dashboard
                    recruiter ini diringkas agar tim Anda bisa meninjau lowongan lebih cepat.
                  </div>

                  <div className="recruiter-dashboard-results">
                    {error && <div className="recruiter-dashboard-error">{error}</div>}

                    {isLoading ? (
                      <div className="recruiter-dashboard-state">Memuat dashboard recruiter...</div>
                    ) : filteredJobs.length === 0 ? (
                      <div className="recruiter-dashboard-state">
                        Tidak ada lowongan yang cocok dengan filter saat ini.
                      </div>
                    ) : (
                      <div className="recruiter-job-list">
                        {filteredJobs.map((job) => (
                          <article key={job.id} className="recruiter-job-card">
                            <div className="recruiter-job-main">
                              <div className="recruiter-job-heading">
                                <div>
                                  <h3>{job.title}</h3>
                                  <p>
                                    {job.location} | {job.expiryLabel}
                                  </p>
                                </div>
                              </div>

                              <div className="recruiter-job-actions">
                                <span
                                  className={`recruiter-job-status recruiter-job-status-${job.dashboardStatus}`}
                                >
                                  {job.statusLabel}
                                </span>
                                <button type="button">Preview</button>
                                <button type="button">Duplicate</button>
                                <button type="button">Share</button>
                                <button
                                  type="button"
                                  className="recruiter-job-action-delete"
                                  aria-haspopup="dialog"
                                  onClick={() => handleDeleteDialogOpen(job)}
                                >
                                  Hapus
                                </button>
                              </div>

                              <div className="recruiter-job-summary">
                                <span>{formatJobType(job.job_type)}</span>
                                <span>{formatExperienceLevel(job.experience_level)}</span>
                                <span>{job.category}</span>
                                <span>{job.salaryLabel}</span>
                              </div>

                              <div className="recruiter-job-footnote">
                                <span>{job.publishedLabel}</span>
                                <span>{job.updatedLabel}</span>
                              </div>
                            </div>

                            <div className="recruiter-job-reach">
                              <strong>{numberFormatter.format(job.insights.totalViews)}</strong>
                              <span>Dilihat</span>
                              <p>Jangkau lebih banyak kandidat.</p>
                              <button type="button" className="recruiter-highlight-button">
                                Highlight
                              </button>
                            </div>

                            <div className="recruiter-job-mini-stats">
                              <div className="recruiter-job-mini-card recruiter-job-mini-card-accent">
                                <strong>{numberFormatter.format(job.insights.totalApplicants)}</strong>
                                <span>Kandidat</span>
                                <small className="recruiter-job-mini-pill recruiter-job-mini-pill-alert">
                                  {numberFormatter.format(job.insights.unreadCount)} belum dicek
                                </small>
                              </div>
                              <div className="recruiter-job-mini-card">
                                <strong>{numberFormatter.format(job.insights.shortlistedCount)}</strong>
                                <span>Terseleksi</span>
                                <small className="recruiter-job-mini-pill">Lihat</small>
                              </div>
                              <div className="recruiter-job-mini-card">
                                <strong>{numberFormatter.format(job.insights.interviewCount)}</strong>
                                <span>Wawancara</span>
                                <small className="recruiter-job-mini-pill">Lihat</small>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </section>
          </>
        ) : activeSection === 'candidates' ? (
          <section className="recruiter-candidates-surface">
            <button type="button" className="recruiter-service-rail recruiter-service-rail-candidates">
              Customer Service
            </button>

            <div className="recruiter-candidate-heading-bar">
              <label className="recruiter-candidate-job-picker">
                <span className="recruiter-candidate-job-label">
                  {selectedCandidateJob
                    ? `${selectedCandidateJob.title} • ${selectedCandidateJob.location}`
                    : 'Pilih lowongan recruiter'}
                </span>
                <select
                  value={selectedCandidateJobId ?? ''}
                  onChange={handleCandidateJobChange}
                  aria-label="Pilih lowongan untuk melihat kandidat"
                >
                  {dashboardJobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} • {job.location}
                    </option>
                  ))}
                </select>
                <span className="recruiter-candidate-job-chevron" aria-hidden="true">
                  ▾
                </span>
              </label>

              <div className="recruiter-candidate-header-actions">
                <button type="button" className="recruiter-candidate-action-button">
                  Talent Search
                </button>
                <button type="button" className="recruiter-candidate-action-button">
                  Highlight Lowongan
                </button>
              </div>
            </div>

            {isCandidateNoticeVisible && (
              <div className="recruiter-candidate-notice">
                <strong>
                  {numberFormatter.format(selectedCandidateJob?.insights?.unreadCount ?? 0)} kandidat
                  baru belum dicek
                </strong>{' '}
                <span>(Data Tahun ini)</span>
                <button
                  type="button"
                  aria-label="Tutup notifikasi kandidat"
                  onClick={() => setIsCandidateNoticeVisible(false)}
                >
                  ×
                </button>
              </div>
            )}

            <section className="recruiter-candidate-board">
              <div className="recruiter-candidate-searchbar">
                <label className="recruiter-search-field recruiter-candidate-search-field">
                  <span className="recruiter-search-icon" aria-hidden="true">
                    ⌕
                  </span>
                  <input
                    type="search"
                    placeholder="Cari nama dan kata kunci"
                    value={candidateSearchQuery}
                    onChange={(event) => setCandidateSearchQuery(event.target.value)}
                  />
                </label>

                <div className="recruiter-candidate-search-actions">
                  <button type="button" className="recruiter-candidate-search-action">
                    Direkomendasikan ▾
                  </button>
                  <button type="button" className="recruiter-candidate-search-action">
                    Filter ▾
                  </button>
                </div>
              </div>

              <p className="recruiter-candidate-meta">
                Menampilkan {numberFormatter.format(filteredCandidateEntries.length)} dari{' '}
                {numberFormatter.format(candidatePipelineCounts[activeCandidateStage] ?? 0)} Kandidat
                Tahun ini
              </p>

              <div className="recruiter-candidate-stage-tabs" role="tablist" aria-label="Tahap kandidat">
                {CANDIDATE_STAGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={activeCandidateStage === option.value}
                    className={`recruiter-candidate-stage-button${
                      activeCandidateStage === option.value ? ' active' : ''
                    }`}
                    onClick={() => setActiveCandidateStage(option.value)}
                  >
                    <span>{option.label}</span>
                    <span className="recruiter-candidate-stage-count">
                      {numberFormatter.format(candidatePipelineCounts[option.value] ?? 0)}
                    </span>
                  </button>
                ))}
              </div>

              <div className="recruiter-candidate-results">
                {!selectedCandidateJob ? (
                  <div className="recruiter-dashboard-state">
                    Belum ada lowongan untuk menampilkan menu kandidat.
                  </div>
                ) : filteredCandidateEntries.length === 0 ? (
                  <div className="recruiter-candidate-empty">
                    <div className="recruiter-candidate-empty-visual" aria-hidden="true" />
                    <p>
                      Belum ada kandidat pada status <strong>{activeCandidateStageLabel}</strong>
                    </p>
                  </div>
                ) : activeCandidateStage === 'applied' ? (
                  <div className="recruiter-candidate-table">
                    <div className="recruiter-candidate-table-header">
                      <div className="recruiter-candidate-col recruiter-candidate-col-check">
                        <input type="checkbox" aria-label="Pilih semua kandidat melamar" />
                      </div>
                      <div className="recruiter-candidate-col recruiter-candidate-col-profile">
                        Profil Kandidat
                      </div>
                      <div className="recruiter-candidate-col recruiter-candidate-col-favorite" />
                      <div className="recruiter-candidate-col recruiter-candidate-col-education">
                        Pendidikan
                      </div>
                      <div className="recruiter-candidate-col recruiter-candidate-col-experience">
                        Pengalaman
                      </div>
                      <div className="recruiter-candidate-col recruiter-candidate-col-salary">
                        Gaji Kandidat
                      </div>
                      <div className="recruiter-candidate-col recruiter-candidate-col-extra">
                        Info Tambahan
                      </div>
                      <div className="recruiter-candidate-col recruiter-candidate-col-status">
                        Status
                      </div>
                    </div>

                    <div className="recruiter-candidate-table-body">
                      {filteredCandidateEntries.map((candidate, index) => (
                        <article
                          key={candidate.id}
                          className={`recruiter-candidate-table-row${
                            index === 0 ? ' featured' : ''
                          }${selectedCandidateDetailId === candidate.id ? ' selected' : ''}`}
                        >
                          <div className="recruiter-candidate-col recruiter-candidate-col-check">
                            <input
                              type="checkbox"
                              aria-label={`Pilih kandidat ${candidate.name}`}
                            />
                          </div>

                          <div className="recruiter-candidate-col recruiter-candidate-col-profile">
                            <button
                              type="button"
                              className="recruiter-candidate-profile recruiter-candidate-profile-trigger"
                              onClick={() => handleCandidateDetailOpen(candidate.id)}
                              aria-label={`Lihat detail kandidat ${candidate.name}`}
                            >
                              <span
                                className={`recruiter-candidate-avatar recruiter-candidate-avatar-${candidate.avatarTone}`}
                                aria-hidden="true"
                              >
                                {candidate.name.charAt(0)}
                              </span>
                              <div className="recruiter-candidate-profile-copy">
                                <strong>{candidate.name}</strong>
                                <span>{candidate.location}</span>
                                <span>{candidate.age}</span>
                                <small>{candidate.matchScore}</small>
                                <span className="recruiter-candidate-profile-link">Hubungi Kandidat</span>
                              </div>
                            </button>
                          </div>

                          <div className="recruiter-candidate-col recruiter-candidate-col-favorite">
                            <button
                              type="button"
                              className="recruiter-candidate-favorite-button"
                              aria-label={`Simpan kandidat ${candidate.name}`}
                            >
                              ☆
                            </button>
                          </div>

                          <div className="recruiter-candidate-col recruiter-candidate-col-education">
                            <div className="recruiter-candidate-table-copy">
                              <strong>{candidate.education.school}</strong>
                              <span>{candidate.education.period}</span>
                            </div>
                          </div>

                          <div className="recruiter-candidate-col recruiter-candidate-col-experience">
                            <div className="recruiter-candidate-table-copy">
                              <strong>{candidate.experience.company}</strong>
                              {candidate.experience.role && <span>{candidate.experience.role}</span>}
                              {candidate.experience.duration && (
                                <small>{candidate.experience.duration}</small>
                              )}
                            </div>
                          </div>

                          <div className="recruiter-candidate-col recruiter-candidate-col-salary">
                            <div className="recruiter-candidate-table-copy">
                              <strong>{candidate.salary}</strong>
                            </div>
                          </div>

                          <div className="recruiter-candidate-col recruiter-candidate-col-extra">
                            <div className="recruiter-candidate-table-copy">
                              <span>Melamar pada:</span>
                              <strong>{candidate.appliedDate}</strong>
                              <button type="button">Download CV</button>
                            </div>
                          </div>

                          <div className="recruiter-candidate-col recruiter-candidate-col-status">
                            <select defaultValue="applied" aria-label={`Status kandidat ${candidate.name}`}>
                              <option value="applied">Melamar</option>
                              <option value="shortlisted">Terseleksi</option>
                              <option value="rejected">Ditolak</option>
                            </select>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="recruiter-candidate-list">
                    {filteredCandidateEntries.map((candidate) => (
                      <article key={candidate.id} className="recruiter-candidate-card">
                        <div className="recruiter-candidate-card-main">
                          <div className="recruiter-candidate-card-copy">
                            <strong>{candidate.name}</strong>
                            <span>{candidate.email}</span>
                          </div>
                          <div className="recruiter-candidate-card-meta">
                            <span>{candidate.location}</span>
                            <span>{candidate.phone}</span>
                          </div>
                        </div>

                        <div className="recruiter-candidate-card-side">
                          <span className="recruiter-candidate-card-stage">
                            {getCandidateStageLabel(candidate.stage)}
                          </span>
                          <span className="recruiter-candidate-card-badge">{candidate.badgeLabel}</span>
                          <small>{candidate.updatedLabel}</small>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </section>
        ) : (
          <section className="recruiter-placeholder-surface">
            <h2>Menu {activeSectionLabel} sedang disiapkan</h2>
            <p>
              Fokus utama dashboard recruiter saat ini ada di menu Lowongan dan Kandidat. Menu ini
              akan mengikuti visual yang sama setelah fitur utamanya selesai.
            </p>
          </section>
        )}
      </main>

      {jobPendingDelete && (
        <>
          <button
            type="button"
            className="recruiter-delete-modal-backdrop"
            aria-label="Tutup dialog hapus lowongan"
            onClick={handleDeleteDialogClose}
          />

          <section
            className="recruiter-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recruiter-delete-modal-title"
            aria-describedby="recruiter-delete-modal-description"
          >
            <div className="recruiter-delete-modal-header">
              <h2 id="recruiter-delete-modal-title">Hapus Lowongan Kerja</h2>
              <button
                type="button"
                className="recruiter-delete-modal-close"
                aria-label="Tutup dialog hapus lowongan"
                onClick={handleDeleteDialogClose}
                disabled={isDeletingJob}
              >
                ×
              </button>
            </div>

            <div className="recruiter-delete-modal-body">
              <p id="recruiter-delete-modal-description">
                Apakah Anda yakin untuk menghapus lowongan kerja?
              </p>
              <strong>{jobPendingDelete.title}</strong>
            </div>

            <div className="recruiter-delete-modal-actions">
              <button
                type="button"
                className="recruiter-delete-modal-button recruiter-delete-modal-button-cancel"
                onClick={handleDeleteDialogClose}
                disabled={isDeletingJob}
              >
                Batal
              </button>
              <button
                type="button"
                className="recruiter-delete-modal-button recruiter-delete-modal-button-confirm"
                onClick={handleDeleteJobConfirm}
                disabled={isDeletingJob}
              >
                {isDeletingJob ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </section>
        </>
      )}

      {selectedCandidateDetail && (
        <>
          <button
            type="button"
            className="recruiter-candidate-drawer-backdrop"
            aria-label="Tutup detail kandidat"
            onClick={handleCandidateDetailClose}
          />

          <aside
            className="recruiter-candidate-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recruiter-candidate-drawer-title"
          >
            <div className="recruiter-candidate-drawer-scroll">
              <button
                type="button"
                className="recruiter-candidate-drawer-close"
                aria-label="Tutup detail kandidat"
                onClick={handleCandidateDetailClose}
              >
                ×
              </button>

              <label className="recruiter-candidate-drawer-status-field">
                <span className="recruiter-sr-only">Status kandidat</span>
                <select defaultValue={selectedCandidateDetail.stage}>
                  {CANDIDATE_STAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      Status Kandidat: {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <section className="recruiter-candidate-drawer-summary">
                <span
                  className={`recruiter-candidate-avatar recruiter-candidate-avatar-${selectedCandidateDetail.avatarTone} recruiter-candidate-avatar-large`}
                  aria-hidden="true"
                >
                  {selectedCandidateDetail.name.charAt(0)}
                </span>

                <div className="recruiter-candidate-drawer-summary-copy">
                  <div className="recruiter-candidate-drawer-summary-top">
                    <div>
                      <h2 id="recruiter-candidate-drawer-title">{selectedCandidateDetail.name}</h2>
                      <p>
                        {selectedCandidateDetail.age} •{' '}
                        {selectedCandidateDetail.locationDetail || selectedCandidateDetail.location}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="recruiter-candidate-favorite-button recruiter-candidate-drawer-favorite"
                      aria-label={`Simpan kandidat ${selectedCandidateDetail.name}`}
                    >
                      ☆
                    </button>
                  </div>

                  <div className="recruiter-candidate-drawer-contact">
                    <a href={`mailto:${selectedCandidateDetail.email}`}>{selectedCandidateDetail.email}</a>
                    <span>{selectedCandidateDetail.phone}</span>
                    <button
                      type="button"
                      onClick={() => handleCandidatePhoneCopy(selectedCandidateDetail)}
                    >
                      {copiedCandidatePhoneId === selectedCandidateDetail.id
                        ? 'Nomor Tersalin'
                        : 'Salin Nomor'}
                    </button>
                  </div>

                  <small>{selectedCandidateDetail.matchScore}</small>
                </div>
              </section>

              <div className="recruiter-candidate-drawer-actions">
                <button type="button" className="recruiter-candidate-drawer-action">
                  Chat
                </button>
                <button type="button" className="recruiter-candidate-drawer-action">
                  Download Profil
                </button>
              </div>

              <p className="recruiter-candidate-drawer-application">
                Melamar {selectedCandidateJob?.title || 'lowongan ini'} pada{' '}
                {selectedCandidateDetail.appliedDate}
              </p>

              <div className="recruiter-candidate-drawer-tabs" role="tablist" aria-label="Detail kandidat">
                {CANDIDATE_DETAIL_TAB_OPTIONS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    aria-selected={activeCandidateDetailTab === tab.value}
                    className={`recruiter-candidate-drawer-tab${
                      activeCandidateDetailTab === tab.value ? ' active' : ''
                    }`}
                    onClick={() => setActiveCandidateDetailTab(tab.value)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="recruiter-candidate-drawer-panel">
                {activeCandidateDetailTab === 'profile' ? (
                  <>
                    <section className="recruiter-candidate-drawer-section">
                      <h3>Tentang Saya</h3>
                      <p>{selectedCandidateDetail.about}</p>
                    </section>

                    <section className="recruiter-candidate-drawer-section">
                      <h3>Gaji terakhir</h3>
                      <p>{selectedCandidateDetail.lastSalary}</p>
                    </section>

                    <section className="recruiter-candidate-drawer-section">
                      <h3>Pendidikan</h3>
                      <div className="recruiter-candidate-drawer-education">
                        <strong>{selectedCandidateDetail.education.school}</strong>
                        <span>{selectedCandidateDetail.education.period}</span>
                      </div>
                    </section>

                    <section className="recruiter-candidate-drawer-section">
                      <h3>Keahlian</h3>
                      <p className="recruiter-candidate-drawer-caption">
                        Keahlian terverifikasi oleh KerjaNusa
                      </p>
                      <div className="recruiter-candidate-skill-chips">
                        {selectedCandidateDetail.skills.map((skill) => (
                          <span key={skill} className="recruiter-candidate-skill-chip">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </section>

                    <section className="recruiter-candidate-drawer-section">
                      <h3>Dokumen dan Sertifikat</h3>
                      <div className="recruiter-candidate-document-chips">
                        {selectedCandidateDetail.documents.map((documentName) => (
                          <span key={documentName} className="recruiter-candidate-document-chip">
                            {documentName}
                          </span>
                        ))}
                      </div>
                    </section>

                    <section className="recruiter-candidate-drawer-section">
                      <h3>Media Sosial</h3>
                      <div className="recruiter-candidate-social-list">
                        {selectedCandidateDetail.socialMedia.map((social) => (
                          <div key={`${social.platform}-${social.handle}`} className="recruiter-candidate-social-item">
                            <span
                              className={`recruiter-candidate-social-icon recruiter-candidate-social-icon-${social.accent}`}
                              aria-hidden="true"
                            >
                              {social.platform.charAt(0)}
                            </span>
                            <span className="recruiter-candidate-social-platform">{social.platform}</span>
                            <a href="/" onClick={(event) => event.preventDefault()}>
                              {social.handle}
                            </a>
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                ) : activeCandidateDetailTab === 'cv' ? (
                  <section
                    className="recruiter-candidate-cv-viewer"
                    aria-label={`Pratinjau CV ${selectedCandidateDetail.name}`}
                  >
                    <div className="recruiter-candidate-cv-stage">
                      <div className="recruiter-candidate-cv-frame">
                        <article className="recruiter-candidate-cv-paper">
                          <div className="recruiter-candidate-cv-sidebar">
                            <span>Curriculum Vitae</span>
                            <strong>{selectedCandidateDetail.name}</strong>
                            <small>
                              {selectedCandidateDetail.locationDetail || selectedCandidateDetail.location}
                            </small>
                          </div>

                          <div className="recruiter-candidate-cv-content">
                            <header className="recruiter-candidate-cv-header">
                              <div className="recruiter-candidate-cv-heading">
                                <p>Curriculum Vitae</p>
                                <h3>{selectedCandidateDetail.name}</h3>
                                <span>{selectedCandidateJob?.title || 'Kandidat recruiter'}</span>
                              </div>

                              <div className="recruiter-candidate-cv-contact">
                                <span>{selectedCandidateDetail.email}</span>
                                <span>{selectedCandidateDetail.phone}</span>
                                <span>
                                  {selectedCandidateDetail.locationDetail || selectedCandidateDetail.location}
                                </span>
                              </div>
                            </header>

                            <div className="recruiter-candidate-cv-columns">
                              <section className="recruiter-candidate-cv-section">
                                <h4>Profil</h4>
                                <p>{selectedCandidateDetail.about}</p>
                              </section>

                              <section className="recruiter-candidate-cv-section">
                                <h4>Pendidikan</h4>
                                <strong>{selectedCandidateDetail.education.school}</strong>
                                <span>{selectedCandidateDetail.education.period}</span>
                              </section>

                              <section className="recruiter-candidate-cv-section">
                                <h4>Pengalaman</h4>
                                <strong>{selectedCandidateDetail.experience.company}</strong>
                                {selectedCandidateDetail.experience.role && (
                                  <span>{selectedCandidateDetail.experience.role}</span>
                                )}
                                {selectedCandidateDetail.experience.duration && (
                                  <small>{selectedCandidateDetail.experience.duration}</small>
                                )}
                                {!selectedCandidateDetail.experience.role &&
                                  !selectedCandidateDetail.experience.duration && (
                                    <small>Belum ada pengalaman yang diisi</small>
                                  )}
                              </section>

                              <section className="recruiter-candidate-cv-section">
                                <h4>Detail Tambahan</h4>
                                <span>Usia: {selectedCandidateDetail.age}</span>
                                <span>Gaji terakhir: {selectedCandidateDetail.lastSalary}</span>
                                <span>Status: {getCandidateStageLabel(selectedCandidateDetail.stage)}</span>
                              </section>

                              <section className="recruiter-candidate-cv-section recruiter-candidate-cv-section-skills">
                                <h4>Keahlian</h4>
                                <ul>
                                  {selectedCandidateDetail.skills.slice(0, 8).map((skill) => (
                                    <li key={skill}>{skill}</li>
                                  ))}
                                </ul>
                              </section>
                            </div>
                          </div>
                        </article>
                      </div>

                      <button
                        type="button"
                        className="recruiter-candidate-cv-nav"
                        aria-label="Halaman CV berikutnya"
                      >
                        ›
                      </button>
                    </div>
                  </section>
                ) : (
                  <>
                    <section className="recruiter-candidate-drawer-section">
                      <h3>
                        Syarat yang dipenuhi Kandidat ({selectedCandidateDetail.qualificationOverview})
                      </h3>
                      <p className="recruiter-candidate-drawer-caption recruiter-candidate-qualification-meta">
                        Hasil Kualifikasi Kandidat ({selectedCandidateDetail.qualificationCriteriaOverview}) ⓘ
                      </p>
                      <div className="recruiter-candidate-qualification-list">
                        {selectedCandidateDetail.qualificationCriteria.map((item, index) => (
                          <article key={item.label} className="recruiter-candidate-qualification-item">
                            <div className="recruiter-candidate-qualification-title">
                              <strong>
                                {index + 1}. {item.label}
                              </strong>
                              <span className={item.met ? 'passed' : 'failed'}>
                                {item.met ? '✓' : '✕'}
                              </span>
                            </div>
                            <p>{item.value}</p>
                            <small>Kriteria ideal: {item.ideal}</small>
                          </article>
                        ))}
                      </div>
                    </section>

                    <section className="recruiter-candidate-drawer-section">
                      <h3>Hasil Kuis Kandidat ({selectedCandidateDetail.qualificationQuizOverview})</h3>
                      <div className="recruiter-candidate-qualification-quiz-list">
                        {selectedCandidateDetail.qualificationQuiz.map((item, index) => (
                          <article key={item.question} className="recruiter-candidate-qualification-quiz-item">
                            <div className="recruiter-candidate-qualification-title">
                              <strong>
                                {index + 1}. {item.question}
                              </strong>
                              <span className={item.met ? 'passed' : 'failed'}>
                                {item.met ? '✓' : '✕'}
                              </span>
                            </div>
                            <p>{item.answer}</p>
                            <small>Pertanyaan wajib • Jawaban ideal: {item.ideal}</small>
                          </article>
                        ))}
                      </div>
                    </section>
                  </>
                )}
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
};

export default RecruiterDashboardPage;
