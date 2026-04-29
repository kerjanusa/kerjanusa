import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import useJobs from '../hooks/useJobs.js';
import { APP_ROUTES } from '../utils/routeHelpers.js';
import {
  formatExperienceLevel,
  formatVideoScreeningRequirement,
  formatWorkMode,
} from '../utils/jobFormatters.js';
import '../styles/workspace.css';

const CANDIDATE_SECTION_OPTIONS = [
  { value: 'resume', label: 'Profile' },
  { value: 'profile', label: 'Info Data Diri' },
  { value: 'jobs', label: 'Cari Pekerjaan' },
  { value: 'chat', label: 'Chat' },
];

const CANDIDATE_PROFILE_STORAGE_PREFIX = 'candidate_dashboard_profile';

const createExperienceItem = () => ({
  company: '',
  position: '',
  year: '',
  responsibilities: '',
  achievement: '',
  reasonForLeaving: '',
  referenceName: '',
  referencePhone: '',
});

const createCandidateProfile = (user) => ({
  fullName: user?.name || '',
  email: user?.email || '',
  phone: user?.phone || '',
  activeContactName: '',
  placeOfBirth: '',
  dateOfBirth: '',
  currentAddress: '',
  profileSummary: '',
  photoFileName: '',
  linkedin: '',
  instagram: '',
  tiktok: '',
  otherSocial: '',
  education: {
    institution: '',
    major: '',
    startYear: '',
    endYear: '',
  },
  experiences: Array.from({ length: 5 }, createExperienceItem),
  skills: Array.from({ length: 5 }, () => ''),
  preferredLocations: Array.from({ length: 5 }, () => ''),
  preferredRoles: Array.from({ length: 5 }, () => ''),
  salaryMin: '',
  salaryMax: '',
  salaryPeriod: 'bulan',
  resumeFiles: [],
  certificateFiles: [],
});

const mergeCandidateProfile = (user, savedProfile) => {
  const baseProfile = createCandidateProfile(user);

  if (!savedProfile || typeof savedProfile !== 'object') {
    return baseProfile;
  }

  return {
    ...baseProfile,
    ...savedProfile,
    education: {
      ...baseProfile.education,
      ...(savedProfile.education || {}),
    },
    experiences: baseProfile.experiences.map((item, index) => ({
      ...item,
      ...(savedProfile.experiences?.[index] || {}),
    })),
    skills: baseProfile.skills.map((item, index) => savedProfile.skills?.[index] || item),
    preferredLocations: baseProfile.preferredLocations.map(
      (item, index) => savedProfile.preferredLocations?.[index] || item
    ),
    preferredRoles: baseProfile.preferredRoles.map(
      (item, index) => savedProfile.preferredRoles?.[index] || item
    ),
    resumeFiles: Array.isArray(savedProfile.resumeFiles) ? savedProfile.resumeFiles.slice(0, 3) : [],
    certificateFiles: Array.isArray(savedProfile.certificateFiles)
      ? savedProfile.certificateFiles.slice(0, 5)
      : [],
  };
};

const getCandidateProfileStorageKey = (userId) =>
  `${CANDIDATE_PROFILE_STORAGE_PREFIX}:${userId || 'guest'}`;

const readCandidateProfile = (user) => {
  if (typeof window === 'undefined') {
    return createCandidateProfile(user);
  }

  try {
    const storedProfile = localStorage.getItem(getCandidateProfileStorageKey(user?.id));

    if (!storedProfile) {
      return createCandidateProfile(user);
    }

    return mergeCandidateProfile(user, JSON.parse(storedProfile));
  } catch {
    return createCandidateProfile(user);
  }
};

const resolveCandidateSectionFromHash = (hash) => {
  if (hash === '#resume') {
    return 'resume';
  }

  if (hash === '#chat') {
    return 'chat';
  }

  if (hash === '#jobs') {
    return 'jobs';
  }

  return 'profile';
};

const getCandidateSectionRoute = (section) =>
  section === 'profile'
    ? APP_ROUTES.candidateDashboard
    : `${APP_ROUTES.candidateDashboard}#${section}`;

const countFilledItems = (items) => items.filter((item) => item?.trim()).length;

const formatDisplayLabel = (value = '') =>
  String(value)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());

const formatCurrency = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

const CANDIDATE_CHAT_THREADS = [
  {
    company: 'PT Nusantara Retail',
    role: 'Store Supervisor',
    message: 'Terima kasih. Profil Anda sudah kami review dan masuk shortlist awal.',
    status: 'Shortlist',
  },
  {
    company: 'Vismaya Group',
    role: 'Admin Operasional',
    message: 'Mohon pastikan ringkasan profil dan resume terbaru sudah lengkap.',
    status: 'Perlu update profil',
  },
  {
    company: 'CP Food Division',
    role: 'Quality Control',
    message: 'Jadwal interview akan dikirim setelah verifikasi dokumen selesai.',
    status: 'Menunggu jadwal',
  },
];

const CandidateDashboardPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { jobs, isLoading: isLoadingJobs, error: jobsError, fetchJobs } = useJobs();
  const [activeSection, setActiveSection] = useState(resolveCandidateSectionFromHash(location.hash));
  const [profile, setProfile] = useState(() => readCandidateProfile(user));
  const [saveMessage, setSaveMessage] = useState('');
  const [activeOverviewCard, setActiveOverviewCard] = useState(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const topbarRef = useRef(null);
  const overviewSectionRef = useRef(null);
  const profileSectionRef = useRef(null);

  useEffect(() => {
    setActiveSection(resolveCandidateSectionFromHash(location.hash));
    setIsMobileNavOpen(false);
  }, [location.hash]);

  useEffect(() => {
    setProfile(readCandidateProfile(user));
  }, [user]);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (activeSection === 'jobs') {
      fetchJobs({}, 1, 24);
    }
  }, [activeSection, fetchJobs]);

  useEffect(() => {
    if (activeSection !== 'profile' && activeOverviewCard) {
      setActiveOverviewCard(null);
    }
  }, [activeOverviewCard, activeSection]);

  useEffect(() => {
    if (activeSection !== 'profile' || !activeOverviewCard || typeof window === 'undefined') {
      return;
    }

    const detailSection = profileSectionRef.current;

    if (!detailSection) {
      return;
    }

    const topbarHeight = topbarRef.current?.offsetHeight ?? 0;
    const overviewHeight = overviewSectionRef.current?.offsetHeight ?? 0;
    const targetTop =
      detailSection.getBoundingClientRect().top +
      window.scrollY -
      topbarHeight -
      overviewHeight -
      16;

    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo({
        top: Math.max(targetTop, 0),
        behavior: 'smooth',
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeOverviewCard]);

  const completionSummary = useMemo(() => {
    const checklist = [
      Boolean(profile.photoFileName),
      Boolean(profile.fullName.trim()),
      Boolean(profile.placeOfBirth.trim()),
      Boolean(profile.dateOfBirth),
      Boolean(profile.currentAddress.trim()),
      Boolean(profile.phone.trim()),
      Boolean(profile.email.trim()),
      Boolean(profile.profileSummary.trim()),
      Boolean(profile.education.institution.trim()),
      countFilledItems(profile.skills) > 0,
      countFilledItems(profile.preferredLocations) > 0,
      countFilledItems(profile.preferredRoles) > 0,
      Boolean(profile.salaryMin.trim()),
      Boolean(profile.salaryMax.trim()),
      profile.resumeFiles.length > 0,
    ];
    const completedItems = checklist.filter(Boolean).length;
    const completionPercent = Math.round((completedItems / checklist.length) * 100);

    return {
      completedItems,
      totalItems: checklist.length,
      completionPercent,
    };
  }, [profile]);

  const handleProfileFieldChange = (field, value) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      [field]: value,
    }));
    setSaveMessage('');
  };

  const handleEducationChange = (field, value) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      education: {
        ...currentProfile.education,
        [field]: value,
      },
    }));
    setSaveMessage('');
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
    setSaveMessage('');
  };

  const handleListFieldChange = (field, index, value) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      [field]: currentProfile[field].map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
    setSaveMessage('');
  };

  const handleFileChange = (field, files, maxFiles) => {
    const fileNames = Array.from(files || [])
      .slice(0, maxFiles)
      .map((file) => file.name);

    setProfile((currentProfile) => ({
      ...currentProfile,
      [field]: fileNames,
    }));
    setSaveMessage('');
  };

  const handlePhotoChange = (files) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      photoFileName: files?.[0]?.name || '',
    }));
    setSaveMessage('');
  };

  const handleSaveProfile = () => {
    localStorage.setItem(
      getCandidateProfileStorageKey(user.id),
      JSON.stringify({
        ...profile,
        fullName: profile.fullName.trim(),
        email: profile.email.trim(),
      })
    );
    setSaveMessage('Data pelamar berhasil disimpan di browser ini.');
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setIsMobileNavOpen(false);
    navigate(getCandidateSectionRoute(section));
  };

  const handleLogout = () => {
    setIsMobileNavOpen(false);
    logout();
  };

  const filledSkills = profile.skills.filter((item) => item.trim());
  const filledLocations = profile.preferredLocations.filter((item) => item.trim());
  const filledRoles = profile.preferredRoles.filter((item) => item.trim());
  const overviewCards = [
    {
      key: 'profile',
      label: 'Profil terisi',
      value: `${completionSummary.completionPercent}%`,
      note: `${completionSummary.completedItems}/${completionSummary.totalItems} komponen utama`,
    },
    {
      key: 'skills',
      label: 'Keahlian utama',
      value: `${filledSkills.length}/5`,
      note: 'Maksimal lima kemampuan utama',
    },
    {
      key: 'locations',
      label: 'Minat lokasi',
      value: `${filledLocations.length}/5`,
      note: 'Lokasi kerja yang paling diutamakan',
    },
    {
      key: 'documents',
      label: 'Dokumen',
      value: `${profile.resumeFiles.length + profile.certificateFiles.length}`,
      note: 'Resume dan sertifikat yang terdata',
    },
  ];
  const availableJobs = useMemo(
    () => [...jobs].sort((firstJob, secondJob) => Number(secondJob.id) - Number(firstJob.id)),
    [jobs]
  );
  const profileSectionClassName = `workspace-section-stack${
    activeOverviewCard ? ` is-overview-filtered filter-${activeOverviewCard}` : ''
  }`;

  const handleOverviewCardToggle = (cardKey) => {
    setActiveOverviewCard((currentCard) => (currentCard === cardKey ? null : cardKey));
  };

  return (
    <div className="workspace-page workspace-page-candidate">
      <header
        ref={topbarRef}
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
                <strong>{profile.fullName || user.name}</strong>
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
              <strong>{profile.fullName || user.name}</strong>
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
        {activeSection === 'profile' && (
          <>
            <section ref={overviewSectionRef} className="workspace-candidate-kpi-slot">
              <div className="workspace-kpi-grid">
                {overviewCards.map((card) => (
                  <button
                    key={card.key}
                    type="button"
                    className={`workspace-kpi-card workspace-kpi-card-button${
                      activeOverviewCard === card.key ? ' is-active' : ''
                    }`}
                    onClick={() => handleOverviewCardToggle(card.key)}
                    aria-expanded={activeOverviewCard === card.key}
                  >
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                    <small>{card.note}</small>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {saveMessage && <div className="success workspace-feedback">{saveMessage}</div>}

        {activeSection === 'resume' && (
          <section id="resume" className="workspace-section-stack">
            <article className="workspace-panel workspace-profile-resume-panel" data-reveal>
              <div className="workspace-panel-heading">
                <div>
                  <span className="workspace-section-label">Profile</span>
                  <h2>Resume singkat kandidat</h2>
                </div>
                <p>
                  Ringkasan ini mengambil data langsung dari empat card utama, jadi setiap perubahan
                  pada profil, keahlian, lokasi, dan dokumen akan otomatis ikut diperbarui di sini.
                </p>
              </div>

              <div className="workspace-profile-resume-hero">
                <div className="workspace-profile-resume-identity">
                  <strong>{profile.fullName || user.name}</strong>
                  <span>{profile.email || 'Email pelamar belum diisi'}</span>
                </div>
                <div className="workspace-profile-resume-progress">
                  <strong>{completionSummary.completionPercent}% lengkap</strong>
                  <small>
                    {completionSummary.completedItems}/{completionSummary.totalItems} komponen inti
                  </small>
                </div>
              </div>

              <div className="workspace-profile-resume-grid">
                <article className="workspace-subcard workspace-profile-resume-card">
                  <div className="workspace-subcard-heading">
                    <strong>Profil terisi</strong>
                    <span>{completionSummary.completionPercent}%</span>
                  </div>
                  <p>
                    {completionSummary.completedItems} dari {completionSummary.totalItems} komponen
                    utama sudah diisi.
                  </p>
                </article>

                <article className="workspace-subcard workspace-profile-resume-card">
                  <div className="workspace-subcard-heading">
                    <strong>Keahlian utama</strong>
                    <span>{filledSkills.length}/5</span>
                  </div>
                  <div className="workspace-chip-wrap">
                    {filledSkills.length > 0 ? (
                      filledSkills.slice(0, 5).map((skill) => (
                        <span key={`resume-skill-${skill}`} className="workspace-chip">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="workspace-chip workspace-chip-muted">
                        Belum ada keahlian utama
                      </span>
                    )}
                  </div>
                </article>

                <article className="workspace-subcard workspace-profile-resume-card">
                  <div className="workspace-subcard-heading">
                    <strong>Minat lokasi</strong>
                    <span>{filledLocations.length}/5</span>
                  </div>
                  <div className="workspace-chip-wrap">
                    {filledLocations.length > 0 ? (
                      filledLocations.slice(0, 5).map((locationItem) => (
                        <span
                          key={`resume-location-${locationItem}`}
                          className="workspace-chip workspace-chip-secondary"
                        >
                          {locationItem}
                        </span>
                      ))
                    ) : (
                      <span className="workspace-chip workspace-chip-muted">
                        Belum ada lokasi prioritas
                      </span>
                    )}
                  </div>
                </article>

                <article className="workspace-subcard workspace-profile-resume-card">
                  <div className="workspace-subcard-heading">
                    <strong>Dokumen</strong>
                    <span>{profile.resumeFiles.length + profile.certificateFiles.length}</span>
                  </div>
                  <div className="workspace-profile-resume-doc-list">
                    <span>Resume: {profile.resumeFiles.length}</span>
                    <span>Sertifikat: {profile.certificateFiles.length}</span>
                  </div>
                </article>
              </div>

              <div className="workspace-action-row">
                <button type="button" className="btn btn-primary" onClick={handleSaveProfile}>
                  Simpan Data Pelamar
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => handleSectionChange('profile')}
                >
                  Lengkapi Info Data Diri
                </button>
              </div>
            </article>
          </section>
        )}

        {activeSection === 'profile' && (
          <section ref={profileSectionRef} id="profile" className={profileSectionClassName}>
            <article
              className="workspace-panel workspace-profile-block workspace-profile-block-profile"
              data-reveal
            >
              <div className="workspace-panel-heading">
                <div>
                  <span className="workspace-section-label">Data Diri</span>
                  <h2>Profil pelamar utama</h2>
                </div>
                <p>
                  Isi nama lengkap, kontak aktif, domisili, serta data dasar agar recruiter mudah
                  menghubungi dan memvalidasi profil Anda.
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
                  <span>Foto diri terbaru</span>
                  <input type="file" accept="image/*" onChange={(event) => handlePhotoChange(event.target.files)} />
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
                  <span>Alamat saat ini</span>
                  <textarea
                    rows="3"
                    value={profile.currentAddress}
                    onChange={(event) =>
                      handleProfileFieldChange('currentAddress', event.target.value)
                    }
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
                  <span>Nomor telepon aktif</span>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(event) => handleProfileFieldChange('phone', event.target.value)}
                  />
                </label>
                <label className="workspace-field">
                  <span>Email aktif</span>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(event) => handleProfileFieldChange('email', event.target.value)}
                  />
                </label>
              </div>

              {profile.photoFileName && (
                <p className="workspace-inline-note">
                  Foto terbaru: <strong>{profile.photoFileName}</strong>
                </p>
              )}
            </article>

            <article
              className="workspace-panel workspace-profile-block workspace-profile-block-profile"
              data-reveal
              data-reveal-delay="60ms"
            >
              <div className="workspace-panel-heading">
                <div>
                  <span className="workspace-section-label">Ringkasan & Media Sosial</span>
                  <h2>Perkenalkan diri Anda dengan singkat</h2>
                </div>
                <p>
                  Gunakan ringkasan profil untuk menjelaskan kekuatan utama Anda, lalu tambahkan
                  akun media sosial yang relevan seperti LinkedIn, Instagram, TikTok, atau lainnya.
                </p>
              </div>

              <div className="workspace-form-grid workspace-form-grid-two">
                <label className="workspace-field workspace-field-span-two">
                  <span>Ringkasan profil</span>
                  <textarea
                    rows="5"
                    value={profile.profileSummary}
                    onChange={(event) =>
                      handleProfileFieldChange('profileSummary', event.target.value)
                    }
                  />
                </label>
                <label className="workspace-field">
                  <span>LinkedIn</span>
                  <input
                    type="text"
                    value={profile.linkedin}
                    onChange={(event) => handleProfileFieldChange('linkedin', event.target.value)}
                  />
                </label>
                <label className="workspace-field">
                  <span>Instagram</span>
                  <input
                    type="text"
                    value={profile.instagram}
                    onChange={(event) => handleProfileFieldChange('instagram', event.target.value)}
                  />
                </label>
                <label className="workspace-field">
                  <span>TikTok</span>
                  <input
                    type="text"
                    value={profile.tiktok}
                    onChange={(event) => handleProfileFieldChange('tiktok', event.target.value)}
                  />
                </label>
                <label className="workspace-field">
                  <span>Social media lainnya</span>
                  <input
                    type="text"
                    value={profile.otherSocial}
                    onChange={(event) =>
                      handleProfileFieldChange('otherSocial', event.target.value)
                    }
                  />
                </label>
              </div>
            </article>

            <article
              className="workspace-panel workspace-profile-block workspace-profile-block-profile"
              data-reveal
              data-reveal-delay="80ms"
            >
              <div className="workspace-panel-heading">
                <div>
                  <span className="workspace-section-label">Pendidikan Terakhir</span>
                  <h2>Institusi, jurusan, dan periode studi</h2>
                </div>
                <p>
                  Masukkan pendidikan terakhir Anda dengan format yang diminta client: nama
                  institusi, jurusan, tahun masuk, dan tahun lulus.
                </p>
              </div>

              <div className="workspace-form-grid workspace-form-grid-two">
                <label className="workspace-field">
                  <span>Nama institusi</span>
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
                  <span>Tahun masuk</span>
                  <input
                    type="text"
                    value={profile.education.startYear}
                    onChange={(event) => handleEducationChange('startYear', event.target.value)}
                  />
                </label>
                <label className="workspace-field">
                  <span>Tahun lulus</span>
                  <input
                    type="text"
                    value={profile.education.endYear}
                    onChange={(event) => handleEducationChange('endYear', event.target.value)}
                  />
                </label>
              </div>
            </article>

            <article
              className="workspace-panel workspace-profile-block workspace-profile-block-profile"
              data-reveal
              data-reveal-delay="100ms"
            >
              <div className="workspace-panel-heading">
                <div>
                  <span className="workspace-section-label">Pengalaman Kerja / Magang</span>
                  <h2>Maksimal lima pengalaman terakhir</h2>
                </div>
                <p>
                  Setiap pengalaman dapat memuat nama perusahaan, posisi, tahun, tanggung jawab,
                  pencapaian utama, alasan berhenti, dan referensi kerja bila ada.
                </p>
              </div>

              <div className="workspace-card-list">
                {profile.experiences.map((experience, index) => (
                  <article key={`experience-${index}`} className="workspace-subcard">
                    <div className="workspace-subcard-heading">
                      <strong>Pengalaman {index + 1}</strong>
                      <span>Opsional</span>
                    </div>
                    <div className="workspace-form-grid workspace-form-grid-two">
                      <label className="workspace-field">
                        <span>Nama perusahaan</span>
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
                        <span>Alasan berhenti</span>
                        <input
                          type="text"
                          value={experience.reasonForLeaving}
                          onChange={(event) =>
                            handleExperienceChange(index, 'reasonForLeaving', event.target.value)
                          }
                        />
                      </label>
                      <label className="workspace-field workspace-field-span-two">
                        <span>Tanggung jawab</span>
                        <textarea
                          rows="3"
                          value={experience.responsibilities}
                          onChange={(event) =>
                            handleExperienceChange(index, 'responsibilities', event.target.value)
                          }
                        />
                      </label>
                      <label className="workspace-field workspace-field-span-two">
                        <span>Pencapaian utama</span>
                        <textarea
                          rows="3"
                          value={experience.achievement}
                          onChange={(event) =>
                            handleExperienceChange(index, 'achievement', event.target.value)
                          }
                        />
                      </label>
                      <label className="workspace-field">
                        <span>Nama referensi kerja</span>
                        <input
                          type="text"
                          value={experience.referenceName}
                          onChange={(event) =>
                            handleExperienceChange(index, 'referenceName', event.target.value)
                          }
                        />
                      </label>
                      <label className="workspace-field">
                        <span>Nomor referensi kerja</span>
                        <input
                          type="text"
                          value={experience.referencePhone}
                          onChange={(event) =>
                            handleExperienceChange(index, 'referencePhone', event.target.value)
                          }
                        />
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            </article>

            <section className="workspace-two-column-grid workspace-profile-block workspace-profile-block-skills">
              <article className="workspace-panel" data-reveal data-reveal-delay="120ms">
                <div className="workspace-panel-heading">
                  <div>
                    <span className="workspace-section-label">Keahlian</span>
                    <h2>Maksimal lima kemampuan</h2>
                  </div>
                  <p>Isi kemampuan utama yang paling relevan untuk pekerjaan yang Anda incar.</p>
                </div>

                <div className="workspace-list-inputs">
                  {profile.skills.map((skill, index) => (
                    <label key={`skill-${index}`} className="workspace-field">
                      <span>{`Keahlian ${index + 1}`}</span>
                      <input
                        type="text"
                        value={skill}
                        onChange={(event) =>
                          handleListFieldChange('skills', index, event.target.value)
                        }
                      />
                    </label>
                  ))}
                </div>
              </article>

              <article className="workspace-panel" data-reveal data-reveal-delay="140ms">
                <div className="workspace-panel-heading">
                  <div>
                    <span className="workspace-section-label">Harapan Gaji</span>
                    <h2>Min - maks per bulan atau harian</h2>
                  </div>
                  <p>Tambahkan kisaran kompensasi agar recruiter cepat menilai kecocokan awal.</p>
                </div>

                <div className="workspace-form-grid">
                  <label className="workspace-field">
                    <span>Gaji minimum</span>
                    <input
                      type="text"
                      value={profile.salaryMin}
                      onChange={(event) => handleProfileFieldChange('salaryMin', event.target.value)}
                    />
                  </label>
                  <label className="workspace-field">
                    <span>Gaji maksimum</span>
                    <input
                      type="text"
                      value={profile.salaryMax}
                      onChange={(event) => handleProfileFieldChange('salaryMax', event.target.value)}
                    />
                  </label>
                  <label className="workspace-field">
                    <span>Satuan</span>
                    <select
                      value={profile.salaryPeriod}
                      onChange={(event) =>
                        handleProfileFieldChange('salaryPeriod', event.target.value)
                      }
                    >
                      <option value="bulan">Per Bulan</option>
                      <option value="hari">Per Hari</option>
                    </select>
                  </label>
                </div>
              </article>
            </section>

            <section className="workspace-two-column-grid workspace-profile-block workspace-profile-block-locations">
              <article className="workspace-panel" data-reveal data-reveal-delay="160ms">
                <div className="workspace-panel-heading">
                  <div>
                    <span className="workspace-section-label">Minat Lokasi Kerja</span>
                    <h2>Maksimal lima lokasi</h2>
                  </div>
                  <p>Pilih area kerja yang Anda prioritaskan agar matching lowongan lebih cepat.</p>
                </div>

                <div className="workspace-list-inputs">
                  {profile.preferredLocations.map((locationItem, index) => (
                    <label key={`location-${index}`} className="workspace-field">
                      <span>{`Lokasi ${index + 1}`}</span>
                      <input
                        type="text"
                        value={locationItem}
                        onChange={(event) =>
                          handleListFieldChange('preferredLocations', index, event.target.value)
                        }
                      />
                    </label>
                  ))}
                </div>
              </article>

              <article className="workspace-panel" data-reveal data-reveal-delay="180ms">
                <div className="workspace-panel-heading">
                  <div>
                    <span className="workspace-section-label">Minat Posisi</span>
                    <h2>Maksimal lima posisi kerja</h2>
                  </div>
                  <p>Tuliskan jabatan yang paling Anda minati untuk mempermudah shortlist awal.</p>
                </div>

                <div className="workspace-list-inputs">
                  {profile.preferredRoles.map((role, index) => (
                    <label key={`role-${index}`} className="workspace-field">
                      <span>{`Posisi ${index + 1}`}</span>
                      <input
                        type="text"
                        value={role}
                        onChange={(event) =>
                          handleListFieldChange('preferredRoles', index, event.target.value)
                        }
                      />
                    </label>
                  ))}
                </div>
              </article>
            </section>

            <article
              className="workspace-panel workspace-profile-block workspace-profile-block-documents"
              data-reveal
              data-reveal-delay="200ms"
            >
              <div className="workspace-panel-heading">
                <div>
                  <span className="workspace-section-label">Upload Dokumen</span>
                  <h2>Resume atau sertifikat terbaru</h2>
                </div>
                <p>
                  Unggah resume terbaru dan dokumen pendukung agar recruiter dapat meninjau Anda
                  lebih lengkap.
                </p>
              </div>

              <div className="workspace-form-grid workspace-form-grid-two">
                <label className="workspace-field">
                  <span>Resume terbaru</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    multiple
                    onChange={(event) =>
                      handleFileChange('resumeFiles', event.target.files, 3)
                    }
                  />
                </label>
                <label className="workspace-field">
                  <span>Sertifikat terbaru</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    onChange={(event) =>
                      handleFileChange('certificateFiles', event.target.files, 5)
                    }
                  />
                </label>
              </div>

              <div className="workspace-file-grid">
                <div className="workspace-file-card">
                  <strong>Resume</strong>
                  {profile.resumeFiles.length > 0 ? (
                    <ul>
                      {profile.resumeFiles.map((fileName) => (
                        <li key={fileName}>{fileName}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>Belum ada resume yang dipilih.</p>
                  )}
                </div>

                <div className="workspace-file-card">
                  <strong>Sertifikat</strong>
                  {profile.certificateFiles.length > 0 ? (
                    <ul>
                      {profile.certificateFiles.map((fileName) => (
                        <li key={fileName}>{fileName}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>Belum ada sertifikat yang dipilih.</p>
                  )}
                </div>
              </div>
            </article>
          </section>
        )}

        {activeSection === 'jobs' && (
          <section id="jobs" className="workspace-section-stack">
            <section className="workspace-candidate-job-action-slot">
              <div className="workspace-action-row workspace-job-action-row">
                <Link to="/jobs" className="btn btn-primary">
                  Buka Halaman Lowongan Lengkap
                </Link>
              </div>
            </section>

            <article className="workspace-panel" data-reveal>
              <div className="workspace-panel-heading">
                <div>
                  <span className="workspace-section-label">Cari Pekerjaan</span>
                  <h2>Lowongan yang sudah tersedia</h2>
                </div>
                <p>
                  Menu ini menampilkan isi lowongan yang sebelumnya sudah dibuat recruiter,
                  termasuk lowongan demo dan lowongan baru yang ditambahkan dari dashboard company.
                </p>
              </div>

              <div className="workspace-job-summary-row">
                <article className="workspace-subcard workspace-job-summary-card">
                  <div className="workspace-subcard-heading">
                    <strong>Posisi yang diminati</strong>
                    <span>{filledRoles.length}/5</span>
                  </div>
                  <div className="workspace-chip-wrap">
                    {filledRoles.length > 0 ? (
                      filledRoles.map((role) => (
                        <span key={role} className="workspace-chip">
                          {role}
                        </span>
                      ))
                    ) : (
                      <span className="workspace-chip workspace-chip-muted">
                        Belum ada posisi yang diprioritaskan
                      </span>
                    )}
                  </div>
                </article>
              </div>

            </article>

            <article className="workspace-panel" data-reveal data-reveal-delay="80ms">
              <div className="workspace-panel-heading">
                <div>
                  <span className="workspace-section-label">Daftar Lowongan</span>
                  <h2>Lowongan yang pernah dibuat</h2>
                </div>
                <p>
                  Saat recruiter membuat lowongan baru, isinya akan muncul di bagian ini setelah
                  halaman dibuka ulang atau menu ini diakses kembali.
                </p>
              </div>

              {isLoadingJobs ? (
                <p className="workspace-inline-note">Memuat daftar lowongan...</p>
              ) : null}

              {!isLoadingJobs && jobsError ? (
                <p className="workspace-inline-note workspace-inline-note-error">{jobsError}</p>
              ) : null}

              {!isLoadingJobs && !jobsError && availableJobs.length === 0 ? (
                <div className="workspace-job-empty-state">
                  <strong>Belum ada lowongan yang tersedia.</strong>
                  <p>
                    Minta recruiter membuat lowongan terlebih dahulu, lalu buka lagi menu ini
                    untuk melihat hasilnya.
                  </p>
                </div>
              ) : null}

              {!isLoadingJobs && !jobsError && availableJobs.length > 0 ? (
                <div className="workspace-job-list-grid">
                  {availableJobs.map((job) => {
                    const videoScreeningLabel = formatVideoScreeningRequirement(
                      job.video_screening_requirement
                    );

                    return (
                      <article key={job.id} className="workspace-job-list-card">
                        <div className="workspace-job-list-head">
                          <div>
                            <strong>{job.title}</strong>
                            <span>{job.recruiter?.name || 'Recruiter KerjaNusa'}</span>
                          </div>
                          <small>{formatDisplayLabel(job.job_type)}</small>
                        </div>

                        <div className="workspace-job-badge-row">
                          <span className="workspace-job-badge">{job.location || '-'}</span>
                          <span className="workspace-job-badge">
                            {formatExperienceLevel(job.experience_level)}
                          </span>
                          <span className="workspace-job-badge">
                            {formatWorkMode(job.work_mode)}
                          </span>
                          <span className="workspace-job-badge">
                            {job.category || 'Umum'}
                          </span>
                        </div>

                        <p className="workspace-job-list-description">{job.description || '-'}</p>

                        <div className="workspace-job-list-stats">
                          <span>{formatCurrency(job.salary_min)} - {formatCurrency(job.salary_max)}</span>
                          <span>{Number(job.openings_count) || 0} kebutuhan</span>
                          <span>{Number(job.applications_count) || 0} pelamar</span>
                        </div>

                        {videoScreeningLabel ? (
                          <p className="workspace-job-list-note">{videoScreeningLabel}</p>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </article>
          </section>
        )}

        {activeSection === 'chat' && (
          <section id="chat" className="workspace-two-column-grid">
            <article className="workspace-panel" data-reveal>
              <div className="workspace-panel-heading">
                <div>
                  <span className="workspace-section-label">Chat</span>
                  <h2>Pembaruan dari recruiter</h2>
                </div>
                <p>
                  Area ini merangkum pesan yang berkaitan dengan proses seleksi, permintaan
                  dokumen, dan jadwal interview.
                </p>
              </div>

              <div className="workspace-message-list">
                {CANDIDATE_CHAT_THREADS.map((thread) => (
                  <article key={`${thread.company}-${thread.role}`} className="workspace-message-card">
                    <div className="workspace-message-card-head">
                      <strong>{thread.company}</strong>
                      <span>{thread.status}</span>
                    </div>
                    <small>{thread.role}</small>
                    <p>{thread.message}</p>
                  </article>
                ))}
              </div>
            </article>

            <article className="workspace-panel" data-reveal data-reveal-delay="70ms">
              <div className="workspace-panel-heading">
                <div>
                  <span className="workspace-section-label">Tindak Lanjut</span>
                  <h2>Poin yang perlu Anda siapkan</h2>
                </div>
                <p>
                  Gunakan daftar ini sebagai pengingat singkat sebelum membalas recruiter atau
                  masuk ke tahap interview berikutnya.
                </p>
              </div>

              <div className="workspace-card-list">
                <article className="workspace-subcard">
                  <div className="workspace-subcard-heading">
                    <strong>Balasan cepat</strong>
                    <span>Prioritas tinggi</span>
                  </div>
                  <p>
                    Pastikan nomor telepon aktif dan email Anda benar, karena recruiter biasanya
                    melakukan follow-up ke dua kanal itu lebih dulu.
                  </p>
                </article>
                <article className="workspace-subcard">
                  <div className="workspace-subcard-heading">
                    <strong>Dokumen</strong>
                    <span>Perbarui berkala</span>
                  </div>
                  <p>
                    Simpan resume dan sertifikat terbaru di halaman ini agar mudah diperbarui saat
                    recruiter meminta dokumen tambahan.
                  </p>
                </article>
                <article className="workspace-subcard">
                  <div className="workspace-subcard-heading">
                    <strong>Interview</strong>
                    <span>Siap dijadwalkan</span>
                  </div>
                  <p>
                    Ringkasan profil, pengalaman, dan harapan gaji sebaiknya konsisten agar proses
                    verifikasi berjalan lebih cepat.
                  </p>
                </article>
              </div>
            </article>
          </section>
        )}
      </main>
    </div>
  );
};

export default CandidateDashboardPage;
