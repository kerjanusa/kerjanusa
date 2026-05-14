import { formatExperienceLevel } from './jobFormatters.js';
import {
  getApplicationStage,
  getApplicationStageLabel,
  isRecruiterApplicationStageActive,
} from './recruiterFlow.js';

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

const normalizeStringList = (items, maxLength) =>
  Array.from({ length: maxLength }, (_, index) => String(items?.[index] || ''));

export const createCandidateProfile = (user) => ({
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

export const mergeCandidateProfile = (user, savedProfile) => {
  const baseProfile = createCandidateProfile(user);

  if (!savedProfile || typeof savedProfile !== 'object') {
    return baseProfile;
  }

  return {
    ...baseProfile,
    ...savedProfile,
    fullName: savedProfile.fullName || user?.name || '',
    email: savedProfile.email || user?.email || '',
    phone: savedProfile.phone || user?.phone || '',
    education: {
      ...baseProfile.education,
      ...(savedProfile.education || {}),
    },
    experiences: baseProfile.experiences.map((item, index) => ({
      ...item,
      ...(savedProfile.experiences?.[index] || {}),
    })),
    skills: normalizeStringList(savedProfile.skills, 5),
    preferredLocations: normalizeStringList(savedProfile.preferredLocations, 5),
    preferredRoles: normalizeStringList(savedProfile.preferredRoles, 5),
    resumeFiles: Array.isArray(savedProfile.resumeFiles) ? savedProfile.resumeFiles.slice(0, 3) : [],
    certificateFiles: Array.isArray(savedProfile.certificateFiles)
      ? savedProfile.certificateFiles.slice(0, 5)
      : [],
  };
};

export const getCandidateProfileStorageKey = (userId) =>
  `${CANDIDATE_PROFILE_STORAGE_PREFIX}:${userId || 'guest'}`;

const getCandidateProfileSource = (user, options = {}) => {
  const preferStoredDraft = options.preferStoredDraft ?? true;
  const backendProfile =
    user?.candidate_profile && typeof user.candidate_profile === 'object'
      ? user.candidate_profile
      : null;

  if (!preferStoredDraft) {
    return mergeCandidateProfile(user, backendProfile);
  }

  if (typeof window === 'undefined') {
    return mergeCandidateProfile(user, backendProfile);
  }

  try {
    const storedProfile = localStorage.getItem(getCandidateProfileStorageKey(user?.id));
    const parsedStoredProfile = storedProfile ? JSON.parse(storedProfile) : null;

    return mergeCandidateProfile(user, {
      ...(backendProfile || {}),
      ...(parsedStoredProfile && typeof parsedStoredProfile === 'object' ? parsedStoredProfile : {}),
    });
  } catch {
    return mergeCandidateProfile(user, backendProfile);
  }
};

export const readCandidateProfile = (user, options = {}) => {
  return getCandidateProfileSource(user, options);
};

export const saveCandidateProfile = (user, profile) => {
  const normalizedProfile = mergeCandidateProfile(user, {
    ...profile,
    fullName: profile?.fullName?.trim?.() || '',
    email: profile?.email?.trim?.() || user?.email || '',
    phone: profile?.phone?.trim?.() || '',
    currentAddress: profile?.currentAddress?.trim?.() || '',
    profileSummary: profile?.profileSummary?.trim?.() || '',
  });

  if (typeof window === 'undefined') {
    return normalizedProfile;
  }

  localStorage.setItem(
    getCandidateProfileStorageKey(user?.id),
    JSON.stringify(normalizedProfile)
  );

  return normalizedProfile;
};

export const countFilledItems = (items = []) =>
  items.filter((item) => String(item || '').trim()).length;

export const getCandidateProfileChecklist = (profile) => {
  const hasLatestEducation =
    Boolean(profile.education?.institution?.trim()) || Boolean(profile.education?.major?.trim());
  const hasExperience = profile.experiences.some(
    (item) => item.company?.trim() || item.position?.trim()
  );

  return [
    { key: 'fullName', label: 'Nama lengkap', isComplete: Boolean(profile.fullName?.trim()), required: true },
    { key: 'phone', label: 'Nomor telepon aktif', isComplete: Boolean(profile.phone?.trim()), required: true },
    { key: 'email', label: 'Email akun', isComplete: Boolean(profile.email?.trim()), required: true },
    {
      key: 'currentAddress',
      label: 'Domisili / alamat saat ini',
      isComplete: Boolean(profile.currentAddress?.trim()),
      required: true,
    },
    {
      key: 'profileSummary',
      label: 'Ringkasan profil',
      isComplete: Boolean(profile.profileSummary?.trim()),
      required: true,
    },
    {
      key: 'preferredRoles',
      label: 'Posisi yang dicari',
      isComplete: countFilledItems(profile.preferredRoles) > 0,
      required: true,
    },
    {
      key: 'preferredLocations',
      label: 'Lokasi kerja yang diminati',
      isComplete: countFilledItems(profile.preferredLocations) > 0,
      required: true,
    },
    {
      key: 'skills',
      label: 'Minimal satu keahlian utama',
      isComplete: countFilledItems(profile.skills) > 0,
      required: true,
    },
    {
      key: 'educationOrExperience',
      label: 'Pendidikan atau pengalaman terbaru',
      isComplete: hasLatestEducation || hasExperience,
      required: true,
    },
    {
      key: 'resumeFiles',
      label: 'CV / resume',
      isComplete: profile.resumeFiles.length > 0,
      required: true,
    },
    {
      key: 'photoFileName',
      label: 'Foto profil',
      isComplete: Boolean(profile.photoFileName),
      required: false,
    },
    {
      key: 'salaryExpectation',
      label: 'Ekspektasi gaji',
      isComplete: Boolean(profile.salaryMin?.trim()) && Boolean(profile.salaryMax?.trim()),
      required: false,
    },
    {
      key: 'certificates',
      label: 'Dokumen pendukung',
      isComplete: profile.certificateFiles.length > 0,
      required: false,
    },
  ];
};

export const getCandidateProfileCompletion = (profile) => {
  const checklist = getCandidateProfileChecklist(profile);
  const requiredChecklist = checklist.filter((item) => item.required);
  const completedItems = checklist.filter((item) => item.isComplete).length;
  const completedRequiredItems = requiredChecklist.filter((item) => item.isComplete).length;
  const completionPercent = Math.round((completedItems / checklist.length) * 100);
  const readinessPercent = Math.round((completedRequiredItems / requiredChecklist.length) * 100);
  const missingRequiredItems = requiredChecklist
    .filter((item) => !item.isComplete)
    .map((item) => item.label);

  return {
    checklist,
    requiredChecklist,
    completedItems,
    totalItems: checklist.length,
    completedRequiredItems,
    totalRequiredItems: requiredChecklist.length,
    completionPercent,
    readinessPercent,
    isReady: missingRequiredItems.length === 0,
    missingRequiredItems,
  };
};

export const getCandidateProfileStatusLabel = (completion) => {
  if (completion.isReady) {
    return 'Siap melamar';
  }

  if (completion.readinessPercent >= 70) {
    return 'Hampir siap melamar';
  }

  return 'Belum siap melamar';
};

const normalizeText = (value = '') => String(value).trim().toLowerCase();

const includesAnyText = (haystack, needles) => {
  const normalizedHaystack = normalizeText(haystack);

  return needles.some((needle) => {
    const normalizedNeedle = normalizeText(needle);
    return normalizedNeedle && normalizedHaystack.includes(normalizedNeedle);
  });
};

export const getCandidateJobMatchScore = (job, profile) => {
  let score = 0;
  const reasons = [];
  const preferredRoles = profile.preferredRoles.filter((item) => item.trim());
  const preferredLocations = profile.preferredLocations.filter((item) => item.trim());
  const skills = profile.skills.filter((item) => item.trim());

  if (includesAnyText(`${job.title} ${job.category}`, preferredRoles)) {
    score += 4;
    reasons.push('Posisi sesuai minat Anda');
  }

  if (includesAnyText(job.location, preferredLocations)) {
    score += 3;
    reasons.push('Lokasi cocok dengan preferensi');
  }

  if (includesAnyText(job.description, skills)) {
    score += 2;
    reasons.push('Kebutuhan lowongan relevan dengan skill Anda');
  }

  if (profile.experiences.some((item) => includesAnyText(`${item.position} ${item.company}`, [job.title, job.category]))) {
    score += 2;
    reasons.push('Ada pengalaman yang mendekati posisi ini');
  }

  if (job.experience_level === 'entry') {
    score += 1;
    reasons.push('Cocok untuk kandidat yang masih tahap awal karier');
  }

  return {
    score,
    reasons: reasons.slice(0, 3),
  };
};

export const sortCandidateRecommendedJobs = (jobs, profile, applications = []) => {
  const appliedJobIds = new Set(applications.map((application) => Number(application.job_id)));

  return [...jobs]
    .filter((job) => job.status !== 'inactive')
    .map((job) => ({
      ...job,
      candidate_match: getCandidateJobMatchScore(job, profile),
      alreadyApplied: appliedJobIds.has(Number(job.id)),
    }))
    .sort((firstJob, secondJob) => {
      if (secondJob.candidate_match.score !== firstJob.candidate_match.score) {
        return secondJob.candidate_match.score - firstJob.candidate_match.score;
      }

      return Number(secondJob.id) - Number(firstJob.id);
    });
};

const APPLICATION_STAGE_META = {
  applied: {
    label: 'Sedang direview',
    summary: 'Lamaran sudah terkirim dan sedang ditinjau recruiter.',
    nextAction: 'Pantau status secara berkala. Pastikan nomor telepon Anda aktif.',
    tone: 'warning',
    progressStep: 1,
  },
  screening: {
    label: 'Sedang discreening',
    summary: 'Recruiter sedang memeriksa kecocokan awal profil Anda dengan kebutuhan lowongan.',
    nextAction: 'Pastikan profil, CV, dan kontak Anda tetap aktif dan mudah dihubungi.',
    tone: 'warning',
    progressStep: 1,
  },
  shortlisted: {
    label: 'Lolos seleksi awal',
    summary: 'Profil Anda masuk shortlist dan menunggu proses lanjutan dari recruiter.',
    nextAction: 'Siapkan diri untuk dihubungi recruiter terkait interview atau instruksi berikutnya.',
    tone: 'success',
    progressStep: 2,
  },
  interview: {
    label: 'Masuk tahap interview',
    summary: 'Recruiter membawa Anda ke tahap interview untuk proses seleksi berikutnya.',
    nextAction: 'Cek email dan telepon secara berkala agar jadwal interview tidak terlewat.',
    tone: 'success',
    progressStep: 2,
  },
  offering: {
    label: 'Masuk tahap offering',
    summary: 'Anda sudah masuk tahap penawaran kerja untuk lowongan ini.',
    nextAction: 'Siapkan dokumen tambahan dan periksa detail penawaran dari recruiter.',
    tone: 'success',
    progressStep: 2,
  },
  hired: {
    label: 'Diterima',
    summary: 'Recruiter memilih Anda untuk mengisi lowongan ini.',
    nextAction: 'Pastikan komunikasi onboarding dan dokumen kerja Anda berjalan lancar.',
    tone: 'success',
    progressStep: 3,
  },
  rejected: {
    label: 'Tidak lanjut',
    summary: 'Recruiter memutuskan untuk tidak melanjutkan proses pada lowongan ini.',
    nextAction: 'Gunakan profil yang sama untuk melamar lowongan serupa lainnya.',
    tone: 'danger',
    progressStep: 3,
  },
  withdrawn: {
    label: 'Dibatalkan',
    summary: 'Lamaran dibatalkan dan tidak lagi diproses.',
    nextAction: 'Anda bisa fokus ke lowongan lain yang lebih cocok.',
    tone: 'muted',
    progressStep: 3,
  },
};

export const formatCandidateApplicationStatus = (status, application = null) =>
  APPLICATION_STAGE_META[getApplicationStage(application || { status })]?.label ||
  getApplicationStageLabel(getApplicationStage(application || { status })) ||
  'Status belum dikenal';

export const getCandidateApplicationMeta = (status, application = null) => {
  const stage = getApplicationStage(application || { status });

  return APPLICATION_STAGE_META[stage] || {
    label: getApplicationStageLabel(stage) || status || 'Status belum dikenal',
    summary: 'Status lamaran belum tersedia.',
    nextAction: 'Periksa kembali nanti.',
    tone: 'muted',
    progressStep: 0,
  };
};

export const getCandidateApplicationTimeline = (status, application = null) => {
  const stage = getApplicationStage(application || { status });
  const { progressStep } = getCandidateApplicationMeta(status, application);
  const finalLabel =
    stage === 'hired'
      ? 'Diterima'
      : stage === 'rejected'
        ? 'Tidak lanjut'
        : stage === 'withdrawn'
          ? 'Dibatalkan'
          : 'Proses lanjut';

  return [
    { key: 'submitted', label: 'Terkirim', done: progressStep >= 0, current: progressStep === 0 },
    { key: 'review', label: 'Direview', done: progressStep >= 1, current: progressStep === 1 },
    {
      key: 'result',
      label: progressStep >= 2 ? finalLabel : 'Menunggu hasil',
      done: progressStep >= 2,
      current: progressStep === 2,
    },
  ];
};

export const isCandidateApplicationActive = (status, application = null) =>
  isRecruiterApplicationStageActive(getApplicationStage(application || { status }));

export const formatCandidateCareerStage = (profile) => {
  const latestRole = profile.preferredRoles.find((item) => item.trim());
  const hasExperience = profile.experiences.some((item) => item.company?.trim() || item.position?.trim());

  if (latestRole) {
    return latestRole;
  }

  if (hasExperience) {
    return 'Kandidat berpengalaman';
  }

  return formatExperienceLevel('entry');
};
