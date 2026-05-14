import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import InboxWorkspace from '../components/InboxWorkspace.jsx';
import useApplications from '../hooks/useApplications.js';
import useAuth from '../hooks/useAuth.js';
import useChat from '../hooks/useChat.js';
import useJobs from '../hooks/useJobs.js';
import {
  formatCandidateApplicationStatus,
  formatCandidateCareerStage,
  getCandidateApplicationMeta,
  getCandidateApplicationTimeline,
  getCandidateProfileCompletion,
  getCandidateProfileStatusLabel,
  isCandidateApplicationActive,
  readCandidateProfile,
  saveCandidateProfile,
  sortCandidateRecommendedJobs,
} from '../utils/candidateFlow.js';
import { formatExperienceLevel, formatWorkMode } from '../utils/jobFormatters.js';
import { APP_ROUTES } from '../utils/routeHelpers.js';
import '../styles/workspace.css';

const CANDIDATE_SECTION_OPTIONS = [
  { value: 'overview', label: 'Dashboard', mobileLabel: 'Beranda' },
  { value: 'profile', label: 'Profil Siap Lamar', mobileLabel: 'Profil' },
  { value: 'jobs', label: 'Lowongan', mobileLabel: 'Lowongan' },
  { value: 'applications', label: 'Lamaran Saya', mobileLabel: 'Lamaran' },
  { value: 'messages', label: 'Chat', mobileLabel: 'Chat' },
];

const CONTACT_WHATSAPP_LINK =
  'https://api.whatsapp.com/send?phone=6281286402753&text=Halo%20KerjaNusa';

const CANDIDATE_EMPLOYMENT_TYPE_OPTIONS = [
  'Full-time / Tetap',
  'Part-time',
  'Kontrak',
  'Freelance',
  'Magang',
];

const CANDIDATE_EDUCATION_LEVEL_OPTIONS = [
  'SMA / SMK',
  'D1 / D2',
  'D3',
  'S1 - Sarjana',
  'S2 - Magister',
  'S3 - Doktor',
];

const resolveCandidateSectionFromHash = (hash) => {
  if (hash === '#profile') {
    return 'profile';
  }

  if (hash === '#jobs') {
    return 'jobs';
  }

  if (hash === '#applications') {
    return 'applications';
  }

  if (hash === '#messages') {
    return 'messages';
  }

  return 'overview';
};

const getCandidateSectionRoute = (section) =>
  section === 'overview'
    ? APP_ROUTES.candidateDashboard
    : `${APP_ROUTES.candidateDashboard}#${section}`;

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

const formatCurrency = (value) => {
  const numericValue = Number(value || 0);
  return `Rp ${numericValue.toLocaleString('id-ID')}`;
};

const firstFilledItem = (items = [], fallback = '-') =>
  items.find((item) => String(item || '').trim()) || fallback;

const createChecklistStatusItem = (label, isComplete, pendingAction = 'Lengkapi') => ({
  label,
  isComplete,
  actionLabel: isComplete ? 'Siap' : pendingAction,
});

const buildCandidateDashboardChecklistSections = (profile, completion) => {
  const checklistLookup = Object.fromEntries(
    completion.checklist.map((item) => [item.key, item])
  );
  const hasLatestEducation =
    Boolean(profile.education?.institution?.trim()) || Boolean(profile.education?.major?.trim());
  const hasLatestExperience = profile.experiences.some(
    (item) => item.company?.trim() || item.position?.trim()
  );

  return [
    {
      id: 'personal',
      title: 'Data Pribadi',
      description: 'Pastikan recruiter langsung menemukan identitas dan kontak utama Anda.',
      items: [
        createChecklistStatusItem('Nama Lengkap', checklistLookup.fullName?.isComplete),
        createChecklistStatusItem('Nomor Telepon', checklistLookup.phone?.isComplete),
        createChecklistStatusItem('Email Akun', checklistLookup.email?.isComplete),
        createChecklistStatusItem('Domisili', checklistLookup.currentAddress?.isComplete),
      ],
    },
    {
      id: 'professional',
      title: 'Profesional',
      description: 'Bagian ini dipakai untuk menilai kesiapan kerja dan arah pencarian Anda.',
      items: [
        createChecklistStatusItem(
          'Posisi yang Diminati',
          checklistLookup.preferredRoles?.isComplete
        ),
        createChecklistStatusItem(
          'Tipe Pekerjaan',
          checklistLookup.employmentType?.isComplete
        ),
        createChecklistStatusItem(
          'Industri Target',
          checklistLookup.targetIndustry?.isComplete
        ),
      ],
    },
    {
      id: 'documents',
      title: 'Dokumen',
      description: 'CV dan riwayat dasar membantu recruiter menilai kecocokan lebih cepat.',
      items: [
        createChecklistStatusItem('Pendidikan Terbaru', hasLatestEducation),
        createChecklistStatusItem('Pengalaman Terbaru', hasLatestExperience),
        createChecklistStatusItem('CV / Resume', checklistLookup.resumeFiles?.isComplete, 'Unggah'),
      ],
    },
  ].map((section) => ({
    ...section,
    completedItems: section.items.filter((item) => item.isComplete).length,
    totalItems: section.items.length,
  }));
};

const CandidateDashboardPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, updateProfile, getCurrentUser } = useAuth();
  const { jobs, isLoading: isLoadingJobs, error: jobsError, fetchJobs } = useJobs();
  const {
    applications,
    isLoading: isLoadingApplications,
    error: applicationsError,
    getMyApplications,
    withdrawApplication,
  } = useApplications();
  const {
    threads,
    contacts,
    messages,
    isLoadingThreads,
    isLoadingContacts,
    isLoadingMessages,
    isSendingMessage,
    loadThreads,
    loadContacts,
    loadConversation,
    sendMessage,
    error: chatError,
  } = useChat();
  const [activeSection, setActiveSection] = useState(resolveCandidateSectionFromHash(location.hash));
  const [profile, setProfile] = useState(() =>
    readCandidateProfile(user, { preferStoredDraft: false })
  );
  const [feedback, setFeedback] = useState(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [applicationBucket, setApplicationBucket] = useState('active');
  const [applicationActionInFlightId, setApplicationActionInFlightId] = useState(null);
  const [selectedChatContact, setSelectedChatContact] = useState(null);
  const [chatDraftMessage, setChatDraftMessage] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  useEffect(() => {
    setActiveSection(resolveCandidateSectionFromHash(location.hash));
    setIsMobileNavOpen(false);
  }, [location.hash]);

  useEffect(() => {
    setProfile(readCandidateProfile(user, { preferStoredDraft: false }));
  }, [user]);

  useEffect(() => {
    if (user?.role !== 'candidate') {
      return;
    }

    fetchJobs({}, 1, 24);
    getMyApplications(1, 30);
  }, [fetchJobs, getMyApplications, user?.id, user?.role]);

  useEffect(() => {
    if (user?.role !== 'candidate') {
      return;
    }

    let isMounted = true;

    getCurrentUser()
      .then((freshUser) => {
        if (!isMounted || !freshUser) {
          return;
        }

        setProfile(readCandidateProfile(freshUser, { preferStoredDraft: false }));
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [getCurrentUser, user?.id, user?.role]);

  useEffect(() => {
    if (!location.state?.candidateNotice) {
      return;
    }

    setFeedback({
      type: 'success',
      message: location.state.candidateNotice,
    });
    navigate(`${APP_ROUTES.candidateDashboard}${location.hash}`, { replace: true });
  }, [location.hash, location.state, navigate]);

  useEffect(() => {
    if (activeSection !== 'messages') {
      return;
    }

    setFeedback(null);
    loadThreads().catch(() => {});
    loadContacts(chatSearchQuery).catch(() => {});
  }, [activeSection, chatSearchQuery, loadContacts, loadThreads]);

  useEffect(() => {
    if (activeSection !== 'messages' || !chatError) {
      return;
    }

    setFeedback({
      type: 'error',
      message: chatError,
    });
  }, [activeSection, chatError]);

  const persistedProfile = useMemo(
    () => readCandidateProfile(user, { preferStoredDraft: false }),
    [user]
  );
  const completion = useMemo(
    () => getCandidateProfileCompletion(persistedProfile),
    [persistedProfile]
  );
  const activeApplications = useMemo(
    () => applications.filter((application) => isCandidateApplicationActive(application.status, application)),
    [applications]
  );
  const completedApplications = useMemo(
    () =>
      applications.filter((application) => !isCandidateApplicationActive(application.status, application)),
    [applications]
  );
  const recommendedJobs = useMemo(
    () =>
      sortCandidateRecommendedJobs(jobs, persistedProfile, applications).filter(
        (job) => !job.alreadyApplied
      ),
    [applications, jobs, persistedProfile]
  );
  const spotlightJobs = recommendedJobs.slice(0, 6);
  const checklistSections = useMemo(
    () => buildCandidateDashboardChecklistSections(persistedProfile, completion),
    [completion, persistedProfile]
  );
  const activeApplicationsPreview = useMemo(
    () => activeApplications.slice(0, 3),
    [activeApplications]
  );
  const recommendedJobsPreview = useMemo(() => recommendedJobs.slice(0, 3), [recommendedJobs]);
  const recommendedJobsCount = recommendedJobs.length;
  const overviewHero = useMemo(() => {
    if (!completion.isReady) {
      return {
        title: 'Optimalkan Profil Profesional Anda',
        description:
          'Lengkapi data diri Anda untuk meningkatkan peluang dilirik recruiter. Semua indikator di dashboard ini diambil dari profil kandidat, lowongan, dan lamaran aktif pada akun Anda saat ini.',
        secondaryLabel: 'Buka Profil',
        secondarySection: 'profile',
      };
    }

    if (activeApplications.length > 0) {
      return {
        title: 'Pantau Progres Lamaran Profesional Anda',
        description:
          'Lamaran aktif, status recruiter, dan peluang lowongan baru kini tersaji dari data akun Anda secara real-time agar tindak lanjut tidak terlewat.',
        secondaryLabel: 'Lihat Lamaran',
        secondarySection: 'applications',
      };
    }

    return {
      title: 'Profil Anda Siap Didorong Lebih Jauh',
      description:
        'Gunakan profil yang sudah lengkap untuk mulai melamar lowongan yang paling sesuai dengan minat, lokasi, dan keahlian Anda saat ini.',
      secondaryLabel: 'Buka Profil',
      secondarySection: 'profile',
    };
  }, [activeApplications.length, completion.isReady]);
  const primaryPreferredRole = firstFilledItem(persistedProfile.preferredRoles, 'Belum diisi');
  const primaryPreferredLocation = firstFilledItem(
    persistedProfile.preferredLocations,
    'Belum diisi'
  );
  const latestExperience = profile.experiences[0];
  const resumePreviewName = profile.resumeFiles[0] || 'CV belum diunggah';
  const completionRingRadius = 52;
  const completionRingCircumference = 2 * Math.PI * completionRingRadius;
  const completionRingOffset =
    completionRingCircumference -
    (completionRingCircumference * completion.completionPercent) / 100;
  const mobileBottomSections = CANDIDATE_SECTION_OPTIONS.filter((section) =>
    ['overview', 'jobs', 'applications', 'messages'].includes(section.value)
  );

  const applicationList = applicationBucket === 'active' ? activeApplications : completedApplications;

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setIsMobileNavOpen(false);
    navigate(getCandidateSectionRoute(section));
  };

  const handleLogout = async () => {
    setIsMobileNavOpen(false);
    await logout();
    navigate(APP_ROUTES.landing, { replace: true });
  };

  const handleProfileFieldChange = (field, value) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      [field]: value,
    }));
    setFeedback(null);
  };

  const handleEducationChange = (field, value) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      education: {
        ...currentProfile.education,
        [field]: value,
      },
    }));
    setFeedback(null);
  };

  const handleExperienceChange = (index, field, value) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      experiences: currentProfile.experiences.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      ),
    }));
    setFeedback(null);
  };

  const handleListFieldChange = (field, index, value) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      [field]: currentProfile[field].map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
    setFeedback(null);
  };

  const handleFileChange = (field, files, maxFiles) => {
    const fileNames = Array.from(files || [])
      .slice(0, maxFiles)
      .map((file) => file.name);

    setProfile((currentProfile) => ({
      ...currentProfile,
      [field]: fileNames,
    }));
    setFeedback(null);
  };

  const handleSaveProfile = async () => {
    if (!user) {
      return;
    }

    setIsSavingProfile(true);
    const normalizedProfile = {
      ...profile,
      preferredLocations: profile.preferredLocations.map((item, index) =>
        index === 0 && !String(item || '').trim()
          ? String(profile.currentAddress || '').trim()
          : item
      ),
      skills: profile.skills.map((item, index) =>
        index === 0 && !String(item || '').trim()
          ? String(profile.targetIndustry || '').trim()
          : item
      ),
    };
    const savedProfile = saveCandidateProfile(user, normalizedProfile);
    setProfile(savedProfile);

    try {
      const response = await updateProfile({
        name: savedProfile.fullName.trim(),
        phone: savedProfile.phone.trim(),
        candidate_profile: savedProfile,
      });
      const syncedProfile = readCandidateProfile(response?.user || user, {
        preferStoredDraft: false,
      });
      const syncedCompletion = getCandidateProfileCompletion(syncedProfile);
      setProfile(syncedProfile);

      setFeedback({
        type: 'success',
        message: syncedCompletion.isReady
          ? 'Profil kandidat berhasil disimpan dan sudah siap dipakai untuk melamar.'
          : 'Profil kandidat berhasil disimpan. Lengkapi checklist minimum agar siap melamar.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error?.message ||
          'Profil lokal tersimpan, tetapi sinkronisasi nama atau telepon ke akun belum berhasil.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleWithdrawApplication = async (application) => {
    setApplicationActionInFlightId(application.id);

    try {
      await withdrawApplication(application.id);
      await getMyApplications(1, 30);
      setFeedback({
        type: 'success',
        message: `Lamaran untuk ${application.job?.title || 'lowongan ini'} berhasil dibatalkan.`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error?.message || 'Lamaran belum berhasil dibatalkan.',
      });
    } finally {
      setApplicationActionInFlightId(null);
    }
  };

  const handleOpenConversation = async (contact) => {
    if (!contact?.id) {
      return;
    }

    setSelectedChatContact(contact);
    setChatDraftMessage('');

    try {
      await loadConversation(contact.id);
      handleSectionChange('messages');
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error?.message || 'Percakapan belum berhasil dibuka.',
      });
    }
  };

  const handleSendChatMessage = async () => {
    if (!selectedChatContact?.id || !chatDraftMessage.trim()) {
      return;
    }

    try {
      await sendMessage({
        recipient_id: selectedChatContact.id,
        body: chatDraftMessage.trim(),
      });
      setChatDraftMessage('');
      await loadThreads();
      await loadConversation(selectedChatContact.id);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error?.message || 'Pesan belum berhasil dikirim.',
      });
    }
  };

  const profileSummaryCards = [
    {
      label: 'Status profil',
      value: getCandidateProfileStatusLabel(completion),
      detail: `${completion.completedRequiredItems}/${completion.totalRequiredItems} syarat inti terpenuhi`,
    },
    {
      label: 'Progress profil',
      value: `${completion.completionPercent}%`,
      detail: `${completion.completedItems}/${completion.totalItems} komponen terisi`,
    },
    {
      label: 'Lamaran aktif',
      value: `${activeApplications.length}`,
      detail: activeApplications.length > 0 ? 'Sedang dipantau recruiter' : 'Belum ada proses aktif',
    },
    {
      label: 'Lowongan cocok',
      value: `${recommendedJobsCount}`,
      detail:
        recommendedJobsCount > 0
          ? 'Disusun dari minat role, lokasi, dan skill Anda'
          : 'Lengkapi minat kerja untuk rekomendasi yang lebih akurat',
    },
  ];

  return (
    <div className="workspace-page workspace-page-candidate">
      <header
        className={`workspace-topbar workspace-topbar-candidate${
          isMobileNavOpen ? ' workspace-topbar-nav-open' : ''
        }`}
      >
        <div className="workspace-shell workspace-topbar-shell">
          <Link
            to={APP_ROUTES.landing}
            className="workspace-brand"
            aria-label="Website awal KerjaNusa"
          >
            <img src="/kerjanusa-logo-cutout.png" alt="KerjaNusa Recruitment Platform" />
          </Link>

          <nav
            id="candidate-mobile-nav"
            className={`workspace-nav${isMobileNavOpen ? ' is-open' : ''}`}
            aria-label="Navigasi pelamar"
          >
            {CANDIDATE_SECTION_OPTIONS.map((section) => (
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

            <div className="workspace-mobile-menu-footer">
              <div className="workspace-user-chip workspace-mobile-menu-user">
                <strong>{profile.fullName || user?.name}</strong>
                <span>Pelamar</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary workspace-logout workspace-mobile-menu-logout"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </nav>

          <div className="workspace-actions">
            <button
              type="button"
              className="workspace-mobile-nav-toggle"
              aria-expanded={isMobileNavOpen}
              aria-controls="candidate-mobile-nav"
              aria-label={isMobileNavOpen ? 'Tutup menu pelamar' : 'Buka menu pelamar'}
              onClick={() => setIsMobileNavOpen((currentValue) => !currentValue)}
            >
              <span className="workspace-mobile-nav-toggle-line" />
              <span className="workspace-mobile-nav-toggle-line" />
              <span className="workspace-mobile-nav-toggle-line" />
            </button>
            <div className="workspace-user-chip">
              <strong>{profile.fullName || user?.name}</strong>
              <span>Pelamar</span>
            </div>
            <button
              type="button"
              className="btn btn-secondary workspace-logout"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="workspace-shell workspace-main">
        {feedback && (
          <div
            className={`${feedback.type === 'error' ? 'error' : 'success'} workspace-feedback`}
          >
            {feedback.message}
          </div>
        )}

        {activeSection === 'overview' && (
          <section className="workspace-section-stack workspace-candidate-dashboard-overview">
            <div className="candidate-dashboard-hero-layout">
              <article className="candidate-dashboard-hero-card" data-reveal>
                <span className="candidate-dashboard-eyebrow">Candidate Flow</span>
                <h1>{overviewHero.title}</h1>
                <p>{overviewHero.description}</p>

                <div className="candidate-dashboard-hero-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleSectionChange('jobs')}
                  >
                    Cari Lowongan
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleSectionChange(overviewHero.secondarySection)}
                  >
                    {overviewHero.secondaryLabel}
                  </button>
                </div>

                <div className="candidate-dashboard-hero-metadata">
                  <article className="candidate-dashboard-snapshot-card">
                    <div className="candidate-dashboard-snapshot-head">
                      <strong>Posisi utama</strong>
                      <span>{formatCandidateCareerStage(persistedProfile)}</span>
                    </div>
                    <p>
                      Fokus pencarian Anda saat ini dibaca dari minat role dan pengalaman yang
                      tersimpan.
                    </p>
                    <small>{primaryPreferredRole}</small>
                  </article>

                  <article className="candidate-dashboard-snapshot-card">
                    <div className="candidate-dashboard-snapshot-head">
                      <strong>Lokasi prioritas</strong>
                      <span>{primaryPreferredLocation}</span>
                    </div>
                    <p>
                      Lengkapi domisili dan lokasi minat agar rekomendasi lowongan makin relevan.
                    </p>
                    <small>
                      {persistedProfile.currentAddress?.trim() || 'Domisili belum diisi'}
                    </small>
                  </article>
                </div>
              </article>

              <div className="candidate-dashboard-summary-rail">
                <article
                  className="candidate-dashboard-mobile-progress-card"
                  data-reveal
                  data-reveal-delay="40ms"
                >
                  <div className="candidate-dashboard-progress-ring">
                    <svg
                      className="candidate-dashboard-progress-svg"
                      viewBox="0 0 132 132"
                      aria-hidden="true"
                    >
                      <circle
                        className="candidate-dashboard-progress-track"
                        cx="66"
                        cy="66"
                        r={completionRingRadius}
                      />
                      <circle
                        className="candidate-dashboard-progress-value"
                        cx="66"
                        cy="66"
                        r={completionRingRadius}
                        strokeDasharray={completionRingCircumference}
                        strokeDashoffset={completionRingOffset}
                      />
                    </svg>
                    <div className="candidate-dashboard-progress-copy">
                      <strong>{completion.completionPercent}%</strong>
                      <span>Selesai</span>
                    </div>
                  </div>

                  <strong className="candidate-dashboard-mobile-progress-title">
                    {getCandidateProfileStatusLabel(completion)}
                  </strong>
                  <p className="candidate-dashboard-mobile-progress-caption">
                    {completion.completedRequiredItems}/{completion.totalRequiredItems} syarat
                    terpenuhi
                  </p>

                  <div className="candidate-dashboard-mobile-progress-stats">
                    <article>
                      <strong>{activeApplications.length}</strong>
                      <span>Lamaran aktif</span>
                    </article>
                    <article>
                      <strong>{recommendedJobsCount}</strong>
                      <span>Lowongan cocok</span>
                    </article>
                  </div>
                </article>

                <div className="candidate-dashboard-summary-grid" data-reveal data-reveal-delay="40ms">
                  {profileSummaryCards.map((card) => (
                    <article key={card.label} className="candidate-dashboard-summary-card">
                      <span>{card.label}</span>
                      <strong>{card.value}</strong>
                      <small>{card.detail}</small>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <div className="candidate-dashboard-main-grid">
              <article className="candidate-dashboard-panel" data-reveal data-reveal-delay="80ms">
                <div className="candidate-dashboard-panel-head">
                  <div>
                    <span className="candidate-dashboard-eyebrow">Checklist Siap Lamar</span>
                    <h2>Minimum yang harus beres</h2>
                  </div>
                  <p>
                    Semua status di bawah dibangun dari profil kandidat yang tersimpan di akun Anda
                    saat ini, bukan data contoh.
                  </p>
                </div>

                <div className="candidate-dashboard-checklist-groups">
                  {checklistSections.map((section) => (
                    <section key={section.id} className="candidate-dashboard-checklist-group">
                      <div className="candidate-dashboard-checklist-head">
                        <div>
                          <h3>{section.title}</h3>
                          <p>{section.description}</p>
                        </div>
                        <strong>
                          {section.completedItems}/{section.totalItems}
                        </strong>
                      </div>

                      <div className="candidate-dashboard-status-list">
                        {section.items.map((item) => (
                          <article
                            key={`${section.id}-${item.label}`}
                            className={`candidate-dashboard-status-row${
                              item.isComplete ? ' is-complete' : ' is-missing'
                            }`}
                          >
                            <div>
                              <strong>{item.label}</strong>
                              <span>
                                {item.isComplete
                                  ? 'Komponen ini sudah aktif dan siap dipakai saat melamar.'
                                  : 'Lengkapi komponen ini agar recruiter mendapat profil yang utuh.'}
                              </span>
                            </div>
                            <small>{item.actionLabel}</small>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </article>

              <div className="candidate-dashboard-side-column">
                <article
                  className="candidate-dashboard-panel"
                  data-reveal
                  data-reveal-delay="120ms"
                >
                  <div className="candidate-dashboard-panel-head">
                    <div>
                      <span className="candidate-dashboard-eyebrow">Lamaran Aktif</span>
                      <h2>Yang sedang bergerak sekarang</h2>
                    </div>
                    <p>
                      Area ini menampilkan proses yang masih berjalan agar tindak lanjut recruiter
                      tidak terlewat.
                    </p>
                  </div>

                  <div className="candidate-dashboard-inline-list">
                    {activeApplicationsPreview.length === 0 ? (
                      <article className="candidate-dashboard-inline-card is-empty">
                        <div className="candidate-dashboard-inline-head">
                          <strong>Belum ada lamaran aktif</strong>
                          <span>Mulai dari lowongan teratas</span>
                        </div>
                        <p>
                          Profil siap lamar akan lebih berguna jika langsung dipakai untuk kirim
                          lamaran pertama.
                        </p>
                      </article>
                    ) : (
                      activeApplicationsPreview.map((application) => {
                        const statusMeta = getCandidateApplicationMeta(
                          application.status,
                          application
                        );

                        return (
                          <article
                            key={application.id}
                            className="candidate-dashboard-inline-card"
                          >
                            <div className="candidate-dashboard-inline-head">
                              <strong>{application.job?.title || 'Lowongan'}</strong>
                              <span>
                                {formatCandidateApplicationStatus(
                                  application.status,
                                  application
                                )}
                              </span>
                            </div>
                            <p>{statusMeta.nextAction}</p>
                            <small>
                              {application.job?.recruiter?.name || 'Recruiter'} •{' '}
                              {formatDateTime(application.applied_at)}
                            </small>
                          </article>
                        );
                      })
                    )}
                  </div>
                </article>

                <article
                  className="candidate-dashboard-panel"
                  data-reveal
                  data-reveal-delay="160ms"
                >
                  <div className="candidate-dashboard-panel-head">
                    <div>
                      <span className="candidate-dashboard-eyebrow">Lowongan Cocok</span>
                      <h2>Peluang terdekat untuk Anda</h2>
                    </div>
                    <p>
                      Rekomendasi ini dihitung dari role, lokasi, skill, dan histori lamaran yang
                      tersimpan sekarang.
                    </p>
                  </div>

                  <div className="candidate-dashboard-inline-list">
                    {recommendedJobsPreview.length === 0 ? (
                      <article className="candidate-dashboard-inline-card is-empty">
                        <div className="candidate-dashboard-inline-head">
                          <strong>Belum ada rekomendasi kuat</strong>
                          <span>Lengkapi minat kerja</span>
                        </div>
                        <p>
                          Tambahkan posisi yang dicari, lokasi prioritas, dan skill utama agar
                          mesin rekomendasi bisa menyaring lowongan yang lebih relevan.
                        </p>
                      </article>
                    ) : (
                      recommendedJobsPreview.map((job) => (
                        <article key={job.id} className="candidate-dashboard-inline-card">
                          <div className="candidate-dashboard-inline-head">
                            <strong>{job.title}</strong>
                            <span>{job.candidate_match.score} poin</span>
                          </div>
                          <p>
                            {job.recruiter?.name || 'Perusahaan'} • {job.location || '-'} •{' '}
                            {formatWorkMode(job.work_mode)}
                          </p>
                          <small>
                            {job.candidate_match.reasons[0] ||
                              'Rekomendasi ini diambil dari kecocokan profil Anda.'}
                          </small>
                        </article>
                      ))
                    )}
                  </div>

                  <div className="candidate-dashboard-panel-actions">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => handleSectionChange('jobs')}
                    >
                      Buka Semua Lowongan
                    </button>
                  </div>
                </article>

                <aside
                  className="candidate-dashboard-help-card"
                  data-reveal
                  data-reveal-delay="200ms"
                >
                  <span className="candidate-dashboard-help-kicker">Butuh bantuan?</span>
                  <h2>Butuh Bantuan?</h2>
                  <p>
                    Tim kami siap membantu menyempurnakan profil Anda untuk menarik perhatian
                    korporasi besar di Indonesia.
                  </p>
                  <a
                    className="candidate-dashboard-help-button"
                    href={CONTACT_WHATSAPP_LINK}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Hubungi Konsultan
                  </a>
                </aside>
              </div>
            </div>
          </section>
        )}

        {activeSection === 'profile' && (
          <section className="workspace-section-stack candidate-profile-layout">
            <div className="candidate-profile-shell">
              <header className="candidate-profile-hero" data-reveal>
                <span className="candidate-profile-kicker">Pengaturan Kandidat</span>
                <h1>Lengkapi Profil Profesional Anda</h1>
                <span className="candidate-profile-divider" />
              </header>

              <article className="candidate-profile-card" data-reveal data-reveal-delay="40ms">
                <div className="candidate-profile-card-head">
                  <div className="candidate-profile-card-title">
                    <span className="candidate-profile-card-mark" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 12a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM6.5 18.4a5.5 5.5 0 0 1 11 0"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <h2>Data Inti</h2>
                  </div>
                </div>

                <div className="candidate-profile-form-stack">
                  <label className="candidate-profile-field">
                    <span>Nama Lengkap</span>
                    <input
                      type="text"
                      placeholder="Masukkan nama sesuai KTP"
                      value={profile.fullName}
                      onChange={(event) => handleProfileFieldChange('fullName', event.target.value)}
                    />
                  </label>

                  <label className="candidate-profile-field">
                    <span>Email Aktif</span>
                    <input type="email" value={profile.email} readOnly />
                  </label>

                  <label className="candidate-profile-field">
                    <span>Nomor Telepon / WhatsApp</span>
                    <input
                      type="tel"
                      placeholder="+62 812 3456 7890"
                      value={profile.phone}
                      onChange={(event) => handleProfileFieldChange('phone', event.target.value)}
                    />
                  </label>

                  <label className="candidate-profile-field candidate-profile-field-with-icon">
                    <span>Lokasi Saat Ini</span>
                    <div className="candidate-profile-input-shell">
                      <input
                        type="text"
                        placeholder="Kota atau Kabupaten"
                        value={profile.currentAddress}
                        onChange={(event) =>
                          handleProfileFieldChange('currentAddress', event.target.value)
                        }
                      />
                      <span className="candidate-profile-trailing-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path
                            d="M12 21s6-5.3 6-10.2A6 6 0 1 0 6 10.8C6 15.7 12 21 12 21Z"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle cx="12" cy="10.5" r="2.1" stroke="currentColor" strokeWidth="1.7" />
                        </svg>
                      </span>
                    </div>
                  </label>
                </div>
              </article>

              <article className="candidate-profile-card" data-reveal data-reveal-delay="80ms">
                <div className="candidate-profile-card-head">
                  <div className="candidate-profile-card-title">
                    <span className="candidate-profile-card-mark" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path
                          d="M4.5 8.5h15M7.5 5.5h9M6 18.5h12M8.5 12.5h7"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <h2>Target Pekerjaan</h2>
                  </div>
                </div>

                <div className="candidate-profile-form-stack">
                  <label className="candidate-profile-field">
                    <span>Posisi yang Diminati</span>
                    <input
                      type="text"
                      placeholder="Contoh: Senior Business Analyst, Supervisor Operasional"
                      value={profile.preferredRoles[0]}
                      onChange={(event) =>
                        handleListFieldChange('preferredRoles', 0, event.target.value)
                      }
                    />
                  </label>

                  <label className="candidate-profile-field">
                    <span>Tipe Pekerjaan</span>
                    <select
                      value={profile.employmentType || ''}
                      onChange={(event) =>
                        handleProfileFieldChange('employmentType', event.target.value)
                      }
                    >
                      <option value="">Pilih tipe pekerjaan</option>
                      {CANDIDATE_EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="candidate-profile-field">
                    <span>Industri Target</span>
                    <input
                      type="text"
                      placeholder="Contoh: FinTech, E-commerce"
                      value={profile.targetIndustry || ''}
                      onChange={(event) =>
                        handleProfileFieldChange('targetIndustry', event.target.value)
                      }
                    />
                  </label>
                </div>
              </article>

              <article className="candidate-profile-card" data-reveal data-reveal-delay="120ms">
                <div className="candidate-profile-card-head">
                  <div className="candidate-profile-card-title">
                    <span className="candidate-profile-card-mark" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path
                          d="M4.5 8.5 12 5l7.5 3.5L12 12 4.5 8.5ZM6.5 11.5V16L12 19l5.5-3v-4.5"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <h2>Pendidikan & Pengalaman</h2>
                  </div>
                </div>

                <div className="candidate-profile-stack">
                  <section className="candidate-profile-detail-block">
                    <div className="candidate-profile-detail-head">
                      <span className="candidate-profile-detail-icon">PK</span>
                      <div className="candidate-profile-detail-copy">
                        <div>
                          <h3>Pengalaman Terakhir</h3>
                          <p>Tuliskan posisi dan perusahaan terakhir Anda.</p>
                        </div>
                        <span className="candidate-profile-detail-action">Tambah</span>
                      </div>
                    </div>

                    <div className="candidate-profile-form-stack">
                      <label className="candidate-profile-field">
                        <span>Jabatan Terakhir</span>
                        <input
                          type="text"
                          placeholder="Jabatan terakhir"
                          value={latestExperience.position}
                          onChange={(event) =>
                            handleExperienceChange(0, 'position', event.target.value)
                          }
                        />
                      </label>
                      <label className="candidate-profile-field">
                        <span>Nama Instansi</span>
                        <input
                          type="text"
                          placeholder="Nama instansi"
                          value={latestExperience.company}
                          onChange={(event) =>
                            handleExperienceChange(0, 'company', event.target.value)
                          }
                        />
                      </label>
                    </div>
                  </section>

                  <section className="candidate-profile-detail-block">
                    <div className="candidate-profile-detail-head">
                      <span className="candidate-profile-detail-icon">ED</span>
                      <div className="candidate-profile-detail-copy">
                        <div>
                          <h3>Pendidikan Terakhir</h3>
                          <p>Latar belakang akademis tertinggi Anda.</p>
                        </div>
                        <span className="candidate-profile-detail-action">Tambah</span>
                      </div>
                    </div>

                    <div className="candidate-profile-form-stack">
                      <label className="candidate-profile-field">
                        <span>Pendidikan Terakhir</span>
                        <select
                          value={profile.education.degree || ''}
                          onChange={(event) =>
                            handleEducationChange('degree', event.target.value)
                          }
                        >
                          <option value="">Pilih jenjang pendidikan</option>
                          {CANDIDATE_EDUCATION_LEVEL_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="candidate-profile-field">
                        <span>Universitas / Sekolah</span>
                        <input
                          type="text"
                          placeholder="Universitas / Sekolah"
                          value={profile.education.institution}
                          onChange={(event) =>
                            handleEducationChange('institution', event.target.value)
                          }
                        />
                      </label>
                    </div>
                  </section>
                </div>
              </article>

              <article className="candidate-profile-card" data-reveal data-reveal-delay="160ms">
                <div className="candidate-profile-card-head">
                  <div className="candidate-profile-card-title">
                    <span className="candidate-profile-card-mark" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path
                          d="M7 4.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V6A1.5 1.5 0 0 1 7.5 4.5Z"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path d="M14 4.5V9h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <h2>Dokumen & Ekspektasi</h2>
                  </div>
                </div>

                <div className="candidate-profile-form-stack">
                  <label className="candidate-profile-field">
                    <span>Ekspektasi Gaji (Bulanan)</span>
                    <div className="candidate-profile-salary-shell">
                      <span className="candidate-profile-salary-prefix">Rp</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Contoh: 15.000.000"
                        value={profile.salaryMin}
                        onChange={(event) => {
                          handleProfileFieldChange('salaryMin', event.target.value);
                          handleProfileFieldChange('salaryMax', event.target.value);
                        }}
                      />
                    </div>
                  </label>

                  <div className="candidate-profile-field">
                    <span>Unggah CV / Resume (PDF)</span>
                    <label
                      className="candidate-profile-upload-zone"
                      htmlFor="candidate-resume-upload"
                    >
                      <span className="candidate-profile-upload-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path
                            d="M12 16V6m0 0-3.5 3.5M12 6l3.5 3.5M5 17.5v1A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-1"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <strong>Pilih File CV</strong>
                      <small>Maks 5MB</small>
                    </label>
                    <input
                      id="candidate-resume-upload"
                      className="candidate-profile-upload-input"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      multiple
                      onChange={(event) => handleFileChange('resumeFiles', event.target.files, 3)}
                    />
                  </div>

                  <div className="candidate-profile-resume-preview">
                    <span className="candidate-profile-preview-label">
                      Preview resume sebelumnya
                    </span>
                    <div className="candidate-profile-preview-sheet">
                      <div className="candidate-profile-preview-sheet-header" />
                      <div className="candidate-profile-preview-sheet-line is-wide" />
                      <div className="candidate-profile-preview-sheet-line" />
                      <div className="candidate-profile-preview-sheet-line" />
                      <div className="candidate-profile-preview-sheet-line is-wide" />
                      <div className="candidate-profile-preview-sheet-grid">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                    <small>{resumePreviewName}</small>
                  </div>
                </div>
              </article>

              <div className="candidate-profile-actions">
                <button
                  type="button"
                  className="candidate-profile-primary-button"
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? 'Menyimpan...' : 'Simpan Profil'}
                </button>
                <button
                  type="button"
                  className="candidate-profile-secondary-button"
                  onClick={() => handleSectionChange('jobs')}
                >
                  Lanjut Cari Lowongan
                </button>
              </div>
            </div>
          </section>
        )}

        {activeSection === 'jobs' && (
          <section className="workspace-section-stack">
            <article className="workspace-panel" data-reveal>
              <div className="workspace-panel-heading">
                <div>
                  <span className="workspace-section-label">Lowongan Rekomendasi</span>
                  <h2>Prioritas lowongan untuk Anda</h2>
                </div>
                <p>
                  Rekomendasi disusun dari posisi incaran, lokasi minat, dan skill utama yang sudah
                  Anda simpan di profil.
                </p>
              </div>

              {jobsError && <div className="error">{jobsError}</div>}

              <div className="workspace-card-list">
                {isLoadingJobs ? (
                  <div className="loading">Memuat rekomendasi lowongan...</div>
                ) : spotlightJobs.length === 0 ? (
                  <article className="workspace-subcard">
                    <div className="workspace-subcard-heading">
                      <strong>Belum ada rekomendasi kuat</strong>
                      <span>Lengkapi minat kerja</span>
                    </div>
                    <p>
                      Tambahkan posisi yang dicari, lokasi prioritas, dan minimal satu skill utama
                      agar mesin rekomendasi bisa menyaring lowongan yang lebih relevan.
                    </p>
                  </article>
                ) : (
                  spotlightJobs.map((job) => (
                    <article key={job.id} className="workspace-subcard workspace-job-spotlight-card">
                      <div className="workspace-subcard-heading">
                        <div>
                          <strong>{job.title}</strong>
                          <span>{job.recruiter?.name || 'Perusahaan'}</span>
                        </div>
                        <span>{job.candidate_match.score} poin cocok</span>
                      </div>

                      <div className="workspace-inline-metadata">
                        <span>{job.location}</span>
                        <span>{formatExperienceLevel(job.experience_level)}</span>
                        <span>{formatWorkMode(job.work_mode)}</span>
                      </div>

                      <p>{job.description}</p>

                      <div className="workspace-tag-list">
                        {job.candidate_match.reasons.map((reason) => (
                          <span key={reason} className="workspace-chip">
                            {reason}
                          </span>
                        ))}
                      </div>

                      <div className="workspace-action-row">
                        <Link to={APP_ROUTES.jobs} className="btn btn-primary">
                          Buka dan Lamar
                        </Link>
                        <span className="workspace-muted-text">
                          {formatCurrency(job.salary_min)} - {formatCurrency(job.salary_max)}
                        </span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </article>
          </section>
        )}

        {activeSection === 'applications' && (
          <section className="workspace-section-stack">
            <article className="workspace-panel" data-reveal>
              <div className="workspace-panel-heading">
                <div>
                  <span className="workspace-section-label">Lamaran Saya</span>
                  <h2>Pusat aktivitas setelah apply</h2>
                </div>
                <p>
                  Di sini kandidat melihat proses yang masih aktif, hasil yang sudah selesai, dan
                  tindakan berikutnya untuk setiap lamaran.
                </p>
              </div>

              {applicationsError && <div className="error">{applicationsError}</div>}

              <div className="workspace-application-filter-row">
                <button
                  type="button"
                  className={`workspace-filter-chip${
                    applicationBucket === 'active' ? ' is-active' : ''
                  }`}
                  onClick={() => setApplicationBucket('active')}
                >
                  Aktif ({activeApplications.length})
                </button>
                <button
                  type="button"
                  className={`workspace-filter-chip${
                    applicationBucket === 'completed' ? ' is-active' : ''
                  }`}
                  onClick={() => setApplicationBucket('completed')}
                >
                  Selesai ({completedApplications.length})
                </button>
              </div>

              {isLoadingApplications ? (
                <div className="loading">Memuat lamaran...</div>
              ) : applicationList.length === 0 ? (
                <div className="workspace-card-list">
                  <article className="workspace-subcard">
                    <div className="workspace-subcard-heading">
                      <strong>Belum ada lamaran di kategori ini</strong>
                      <span>Fokus ke langkah berikutnya</span>
                    </div>
                    <p>
                      {applicationBucket === 'active'
                        ? 'Kirim lamaran ke lowongan yang paling cocok agar proses kandidat mulai bergerak.'
                        : 'Semua proses yang sudah selesai akan tampil di sini untuk jadi histori pribadi Anda.'}
                    </p>
                  </article>
                </div>
              ) : (
                <div className="workspace-card-list">
                  {applicationList.map((application) => {
                    const statusMeta = getCandidateApplicationMeta(application.status, application);
                    const timeline = getCandidateApplicationTimeline(application.status, application);

                    return (
                      <article key={application.id} className="workspace-subcard workspace-application-card">
                        <div className="workspace-subcard-heading">
                          <div>
                            <strong>{application.job?.title || 'Lowongan'}</strong>
                            <span>
                              {application.job?.recruiter?.name || 'Recruiter'} •{' '}
                              {application.job?.location || '-'}
                            </span>
                          </div>
                          <span
                            className={`workspace-status-pill workspace-status-pill-${statusMeta.tone}`}
                          >
                            {formatCandidateApplicationStatus(application.status, application)}
                          </span>
                        </div>

                        <p>{statusMeta.summary}</p>

                        <div className="workspace-application-timeline">
                          {timeline.map((step) => (
                            <div
                              key={step.key}
                              className={`workspace-timeline-step${
                                step.done ? ' is-done' : ''
                              }${step.current ? ' is-current' : ''}`}
                            >
                              <span className="workspace-timeline-dot" />
                              <small>{step.label}</small>
                            </div>
                          ))}
                        </div>

                        <div className="workspace-inline-metadata">
                          <span>Dikirim {formatDateTime(application.applied_at)}</span>
                          <span>
                            {formatCurrency(application.job?.salary_min)} -{' '}
                            {formatCurrency(application.job?.salary_max)}
                          </span>
                        </div>

                        {application.cover_letter && (
                          <div className="workspace-application-note">
                            <strong>Catatan lamaran</strong>
                            <p>{application.cover_letter}</p>
                          </div>
                        )}

                        {application.screening_summary?.total_questions > 0 && (
                          <div className="workspace-application-note">
                            <strong>Screening yang Anda kirim</strong>
                            <p>
                              {application.screening_summary.answered_questions}/
                              {application.screening_summary.total_questions} pertanyaan terjawab •{' '}
                              {application.screening_summary.completion_rate}% lengkap
                            </p>
                          </div>
                        )}

                        {Array.isArray(application.screening_answers) &&
                          application.screening_answers.length > 0 && (
                            <div className="workspace-application-note">
                              <strong>Jawaban screening</strong>
                              <div className="workspace-inline-metadata">
                                {application.screening_answers.map((answer) => (
                                  <span key={`${application.id}-${answer.question_id || answer.question}`}>
                                    {answer.question}: {answer.answer}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                        {application.video_intro_url && (
                          <div className="workspace-application-note">
                            <strong>Video screening</strong>
                            <p>
                              <a href={application.video_intro_url} target="_blank" rel="noreferrer">
                                Buka link video yang Anda kirim
                              </a>
                            </p>
                          </div>
                        )}

                        <div className="workspace-action-row">
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => handleSectionChange('jobs')}
                          >
                            Cari Lowongan Serupa
                          </button>
                          {application.job?.recruiter && (
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => handleOpenConversation(application.job.recruiter)}
                            >
                              Chat Recruiter
                            </button>
                          )}
                          {isCandidateApplicationActive(application.status, application) && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleWithdrawApplication(application)}
                              disabled={applicationActionInFlightId === application.id}
                            >
                              {applicationActionInFlightId === application.id
                                ? 'Membatalkan...'
                                : 'Batalkan Lamaran'}
                            </button>
                          )}
                          <span className="workspace-muted-text">{statusMeta.nextAction}</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </article>
          </section>
        )}

        {activeSection === 'messages' && (
          <InboxWorkspace
            title="Chat pelamar dengan recruiter dan superadmin"
            description="Gunakan chat ini untuk konfirmasi registrasi, pertanyaan screening, atau menindaklanjuti lamaran yang sedang berjalan."
            threads={threads}
            contacts={contacts}
            selectedContact={selectedChatContact}
            selectedContactId={selectedChatContact?.id}
            messages={messages}
            draftMessage={chatDraftMessage}
            onDraftMessageChange={setChatDraftMessage}
            contactSearchQuery={chatSearchQuery}
            onContactSearchQueryChange={setChatSearchQuery}
            onSelectContact={handleOpenConversation}
            onSendMessage={handleSendChatMessage}
            isLoadingThreads={isLoadingThreads}
            isLoadingContacts={isLoadingContacts}
            isLoadingMessages={isLoadingMessages}
            isSendingMessage={isSendingMessage}
            emptyMessage="Pilih recruiter atau superadmin yang ingin Anda hubungi."
          />
        )}
      </main>

      <nav className="candidate-dashboard-mobile-bottom-nav" aria-label="Navigasi cepat pelamar">
        {mobileBottomSections.map((section) => (
          <button
            key={section.value}
            type="button"
            className={`candidate-dashboard-mobile-bottom-link${
              activeSection === section.value ? ' is-active' : ''
            }`}
            onClick={() => handleSectionChange(section.value)}
          >
            <span>{section.mobileLabel || section.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default CandidateDashboardPage;
