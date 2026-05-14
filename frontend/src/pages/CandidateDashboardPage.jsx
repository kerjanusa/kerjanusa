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
        createChecklistStatusItem('Ringkasan Profil', checklistLookup.profileSummary?.isComplete),
        createChecklistStatusItem('Posisi yang Dicari', checklistLookup.preferredRoles?.isComplete),
        createChecklistStatusItem(
          'Lokasi Kerja Diminati',
          checklistLookup.preferredLocations?.isComplete
        ),
        createChecklistStatusItem(
          'Minimal Satu Keahlian',
          checklistLookup.skills?.isComplete
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
  const draftCompletion = useMemo(() => getCandidateProfileCompletion(profile), [profile]);
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

  const handlePhotoChange = (files) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      photoFileName: files?.[0]?.name || '',
    }));
    setFeedback(null);
  };

  const handleSaveProfile = async () => {
    if (!user) {
      return;
    }

    setIsSavingProfile(true);
    const savedProfile = saveCandidateProfile(user, profile);
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
          <section className="workspace-section-stack">
            <article className="workspace-panel" data-reveal>
              <div className="workspace-panel-heading">
                <div>
                  <span className="workspace-section-label">Profil Minimum</span>
                  <h2>Siapkan profil sebelum melamar</h2>
                </div>
                <p>
                  Fokus ke data yang langsung dipakai recruiter untuk menilai kecocokan dan
                  menghubungi Anda. Sisanya bisa menyusul.
                </p>
              </div>

                <div className="workspace-profile-status-banner">
                  <div>
                    <strong>{getCandidateProfileStatusLabel(draftCompletion)}</strong>
                    <span>
                      {draftCompletion.completedRequiredItems}/{draftCompletion.totalRequiredItems}{' '}
                      syarat inti terpenuhi
                    </span>
                  </div>
                  <div>
                    <strong>{draftCompletion.readinessPercent}%</strong>
                    <span>Kesiapan lamaran</span>
                  </div>
                </div>
            </article>

            <article className="workspace-panel" data-reveal data-reveal-delay="50ms">
              <div className="workspace-panel-heading">
                <div>
                  <span className="workspace-section-label">Data Inti</span>
                  <h2>Kontak dan ringkasan pelamar</h2>
                </div>
                <p>
                  Gunakan informasi yang memang aktif dipakai sehari-hari. Recruiter akan melihat
                  blok ini lebih dulu.
                </p>
              </div>

              <div className="workspace-form-grid workspace-form-grid-two">
                <label className="workspace-field">
                  <span>Nama lengkap</span>
                  <input
                    type="text"
                    value={profile.fullName}
                    onChange={(event) => handleProfileFieldChange('fullName', event.target.value)}
                  />
                </label>
                <label className="workspace-field">
                  <span>Email akun</span>
                  <input type="email" value={profile.email} readOnly />
                </label>
                <label className="workspace-field">
                  <span>Nomor telepon aktif</span>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(event) => handleProfileFieldChange('phone', event.target.value)}
                  />
                </label>
                <label className="workspace-field">
                  <span>Nama kontak aktif</span>
                  <input
                    type="text"
                    value={profile.activeContactName}
                    onChange={(event) =>
                      handleProfileFieldChange('activeContactName', event.target.value)
                    }
                  />
                </label>
                <label className="workspace-field">
                  <span>Tempat lahir</span>
                  <input
                    type="text"
                    value={profile.placeOfBirth}
                    onChange={(event) =>
                      handleProfileFieldChange('placeOfBirth', event.target.value)
                    }
                  />
                </label>
                <label className="workspace-field">
                  <span>Tanggal lahir</span>
                  <input
                    type="date"
                    value={profile.dateOfBirth}
                    onChange={(event) =>
                      handleProfileFieldChange('dateOfBirth', event.target.value)
                    }
                  />
                </label>
                <label className="workspace-field workspace-field-span-two">
                  <span>Alamat / domisili saat ini</span>
                  <textarea
                    rows="3"
                    value={profile.currentAddress}
                    onChange={(event) =>
                      handleProfileFieldChange('currentAddress', event.target.value)
                    }
                  />
                </label>
                <label className="workspace-field workspace-field-span-two">
                  <span>Ringkasan profil</span>
                  <textarea
                    rows="5"
                    placeholder="Ceritakan singkat pengalaman, kekuatan utama, dan jenis pekerjaan yang Anda incar."
                    value={profile.profileSummary}
                    onChange={(event) =>
                      handleProfileFieldChange('profileSummary', event.target.value)
                    }
                  />
                </label>
              </div>
            </article>

            <div className="workspace-two-column-grid">
              <article className="workspace-panel" data-reveal data-reveal-delay="90ms">
                <div className="workspace-panel-heading">
                  <div>
                    <span className="workspace-section-label">Target Pekerjaan</span>
                    <h2>Role, lokasi, dan skill utama</h2>
                  </div>
                  <p>
                    Rekomendasi lowongan dibangun dari area ini. Isi ringkas dan fokus ke prioritas
                    Anda.
                  </p>
                </div>

                <div className="workspace-form-grid">
                  <div className="workspace-field">
                    <span>Posisi yang dicari</span>
                    <div className="workspace-list-inputs">
                      {profile.preferredRoles.slice(0, 3).map((value, index) => (
                        <input
                          key={`preferred-role-${index + 1}`}
                          type="text"
                          placeholder={`Contoh: Admin Operasional ${index + 1}`}
                          value={value}
                          onChange={(event) =>
                            handleListFieldChange('preferredRoles', index, event.target.value)
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <div className="workspace-field">
                    <span>Lokasi kerja yang diminati</span>
                    <div className="workspace-list-inputs">
                      {profile.preferredLocations.slice(0, 3).map((value, index) => (
                        <input
                          key={`preferred-location-${index + 1}`}
                          type="text"
                          placeholder={`Contoh: Bogor ${index + 1}`}
                          value={value}
                          onChange={(event) =>
                            handleListFieldChange('preferredLocations', index, event.target.value)
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <div className="workspace-field">
                    <span>Keahlian utama</span>
                    <div className="workspace-list-inputs">
                      {profile.skills.map((value, index) => (
                        <input
                          key={`skill-${index + 1}`}
                          type="text"
                          placeholder={`Skill ${index + 1}`}
                          value={value}
                          onChange={(event) =>
                            handleListFieldChange('skills', index, event.target.value)
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </article>

              <article className="workspace-panel" data-reveal data-reveal-delay="130ms">
                <div className="workspace-panel-heading">
                  <div>
                    <span className="workspace-section-label">Dokumen & Ekspektasi</span>
                    <h2>CV dan informasi pendukung</h2>
                  </div>
                  <p>
                    Apply flow sekarang mengambil CV dari profil Anda. Simpan di sini sekali, lalu
                    pakai berulang kali untuk lowongan berikutnya.
                  </p>
                </div>

                <div className="workspace-form-grid">
                  <label className="workspace-field">
                    <span>Foto profil</span>
                    <input type="file" accept="image/*" onChange={(event) => handlePhotoChange(event.target.files)} />
                  </label>
                  <label className="workspace-field">
                    <span>CV / resume</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      multiple
                      onChange={(event) => handleFileChange('resumeFiles', event.target.files, 3)}
                    />
                  </label>
                  <label className="workspace-field">
                    <span>Sertifikat / dokumen pendukung</span>
                    <input
                      type="file"
                      multiple
                      onChange={(event) =>
                        handleFileChange('certificateFiles', event.target.files, 5)
                      }
                    />
                  </label>

                  <div className="workspace-form-grid workspace-form-grid-two">
                    <label className="workspace-field">
                      <span>Ekspektasi gaji minimum</span>
                      <input
                        type="number"
                        min="0"
                        value={profile.salaryMin}
                        onChange={(event) =>
                          handleProfileFieldChange('salaryMin', event.target.value)
                        }
                      />
                    </label>
                    <label className="workspace-field">
                      <span>Ekspektasi gaji maksimum</span>
                      <input
                        type="number"
                        min="0"
                        value={profile.salaryMax}
                        onChange={(event) =>
                          handleProfileFieldChange('salaryMax', event.target.value)
                        }
                      />
                    </label>
                  </div>
                </div>

                <div className="workspace-profile-file-summary">
                  <span>CV tersimpan: {profile.resumeFiles.length}</span>
                  <span>Dokumen pendukung: {profile.certificateFiles.length}</span>
                  <span>Foto profil: {profile.photoFileName ? 'Sudah ada' : 'Belum ada'}</span>
                </div>
              </article>
            </div>

            <div className="workspace-two-column-grid">
              <article className="workspace-panel" data-reveal data-reveal-delay="170ms">
                <div className="workspace-panel-heading">
                  <div>
                    <span className="workspace-section-label">Pendidikan</span>
                    <h2>Data pendidikan terakhir</h2>
                  </div>
                  <p>Cukup isi pendidikan yang paling relevan dengan pekerjaan yang Anda cari.</p>
                </div>

                <div className="workspace-form-grid workspace-form-grid-two">
                  <label className="workspace-field">
                    <span>Institusi</span>
                    <input
                      type="text"
                      value={profile.education.institution}
                      onChange={(event) =>
                        handleEducationChange('institution', event.target.value)
                      }
                    />
                  </label>
                  <label className="workspace-field">
                    <span>Jurusan</span>
                    <input
                      type="text"
                      value={profile.education.major}
                      onChange={(event) => handleEducationChange('major', event.target.value)}
                    />
                  </label>
                  <label className="workspace-field">
                    <span>Tahun mulai</span>
                    <input
                      type="text"
                      value={profile.education.startYear}
                      onChange={(event) =>
                        handleEducationChange('startYear', event.target.value)
                      }
                    />
                  </label>
                  <label className="workspace-field">
                    <span>Tahun selesai</span>
                    <input
                      type="text"
                      value={profile.education.endYear}
                      onChange={(event) => handleEducationChange('endYear', event.target.value)}
                    />
                  </label>
                </div>
              </article>

              <article className="workspace-panel" data-reveal data-reveal-delay="210ms">
                <div className="workspace-panel-heading">
                  <div>
                    <span className="workspace-section-label">Pengalaman Terbaru</span>
                    <h2>Ambil yang paling relevan saja</h2>
                  </div>
                  <p>
                    Tidak perlu menuliskan semua pengalaman. Satu atau dua entri yang tepat sudah
                    cukup untuk fase MVP candidate ini.
                  </p>
                </div>

                <div className="workspace-card-list">
                  {profile.experiences.slice(0, 2).map((experience, index) => (
                    <article key={`experience-${index + 1}`} className="workspace-subcard">
                      <div className="workspace-subcard-heading">
                        <strong>Pengalaman {index + 1}</strong>
                        <span>{experience.company || 'Belum diisi'}</span>
                      </div>
                      <div className="workspace-form-grid workspace-form-grid-two">
                        <label className="workspace-field">
                          <span>Perusahaan</span>
                          <input
                            type="text"
                            value={experience.company}
                            onChange={(event) =>
                              handleExperienceChange(index, 'company', event.target.value)
                            }
                          />
                        </label>
                        <label className="workspace-field">
                          <span>Posisi</span>
                          <input
                            type="text"
                            value={experience.position}
                            onChange={(event) =>
                              handleExperienceChange(index, 'position', event.target.value)
                            }
                          />
                        </label>
                        <label className="workspace-field">
                          <span>Tahun / periode</span>
                          <input
                            type="text"
                            value={experience.year}
                            onChange={(event) =>
                              handleExperienceChange(index, 'year', event.target.value)
                            }
                          />
                        </label>
                        <label className="workspace-field">
                          <span>Alasan keluar</span>
                          <input
                            type="text"
                            value={experience.reasonForLeaving}
                            onChange={(event) =>
                              handleExperienceChange(index, 'reasonForLeaving', event.target.value)
                            }
                          />
                        </label>
                        <label className="workspace-field workspace-field-span-two">
                          <span>Tanggung jawab / pencapaian</span>
                          <textarea
                            rows="4"
                            value={experience.responsibilities}
                            onChange={(event) =>
                              handleExperienceChange(index, 'responsibilities', event.target.value)
                            }
                          />
                        </label>
                      </div>
                    </article>
                  ))}
                </div>
              </article>
            </div>

            <div className="workspace-action-row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? 'Menyimpan...' : 'Simpan Profil Candidate'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => handleSectionChange('jobs')}
              >
                Lanjut Cari Lowongan
              </button>
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
