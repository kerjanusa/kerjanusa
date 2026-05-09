import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { APP_ROUTES, getLoginRouteForRole } from '../utils/routeHelpers.js';
import '../styles/auth.css';
import '../styles/authForm.css';
import '../styles/forgotPassword.css';

const FORGOT_PASSWORD_COPY = {
  default: {
    heading: 'Reset Password Akun',
    description:
      'Masukkan email yang Anda gunakan saat login. Kami akan menyiapkan instruksi pemulihan akses secara aman.',
    emailPlaceholder: 'Email recruiter / pelamar / admin',
    loginTo: APP_ROUTES.login,
    loginLabel: 'Kembali ke login',
    helper: 'Gunakan email yang sama dengan akun KerjaNusa Anda.',
  },
  recruiter: {
    heading: 'Reset Password Company',
    description:
      'Masukkan email recruiter atau company yang terdaftar untuk menerima panduan reset password dashboard company.',
    emailPlaceholder: 'Email recruiter / company',
    loginTo: getLoginRouteForRole('recruiter'),
    loginLabel: 'Kembali ke login company',
    helper: 'Pastikan alamat email anda sudah sesuai dengan akun terdaftar',
  },
  candidate: {
    heading: 'Reset Password Pelamar',
    description:
      'Masukkan email pelamar yang terdaftar agar Anda bisa melanjutkan proses melamar dan membuka kembali dashboard kandidat.',
    emailPlaceholder: 'Email pelamar',
    loginTo: getLoginRouteForRole('candidate'),
    loginLabel: 'Kembali ke login pelamar',
    helper: 'Instruksi reset akan dikirim ke email yang terkait dengan akun pelamar.',
  },
  superadmin: {
    heading: 'Reset Password Superadmin',
    description:
      'Masukkan email superadmin KerjaNusa yang terdaftar untuk menerima instruksi pemulihan akses dashboard utama.',
    emailPlaceholder: 'Email superadmin KerjaNusa',
    loginTo: getLoginRouteForRole('superadmin'),
    loginLabel: 'Kembali ke login superadmin',
    helper: 'Untuk akun superadmin, gunakan email resmi yang sudah didaftarkan oleh administrator utama.',
  },
};

const FORGOT_PASSWORD_STEPS = [
  {
    title: 'Masukkan email',
    description: 'Gunakan email yang sama dengan akun login Anda.',
  },
  {
    title: 'Cek inbox',
    description: 'Instruksi reset akan dikirim ke email jika akun ditemukan.',
  },
  {
    title: 'Buat password baru',
    description: 'Atur ulang akses agar bisa masuk kembali ke dashboard Anda.',
  },
];

const ForgotPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const requestedRole = searchParams.get('role');
  const entryKey =
    requestedRole === 'candidate' || requestedRole === 'recruiter'
      ? requestedRole
      : requestedRole === 'superadmin' || requestedRole === 'internal'
        ? 'superadmin'
        : 'default';
  const forgotPasswordCopy = FORGOT_PASSWORD_COPY[entryKey];

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmittedEmail(email.trim());
  };

  const handleReset = () => {
    setSubmittedEmail('');
  };

  return (
    <div className="auth-page auth-page-forgot">
      <div className="auth-forgot-layout">
        <section className="auth-forgot-showcase" data-reveal>
          <span className="auth-forgot-kicker">Pemulihan Akses</span>
          <h1>Tata cara penggunaan</h1>
          <div className="auth-forgot-steps" aria-label="Tahapan reset password">
            {FORGOT_PASSWORD_STEPS.map((step, index) => (
              <article key={step.title} className="auth-forgot-step">
                <span className="auth-forgot-step-index">{index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.description}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="auth-forgot-note">
            <strong>Catatan keamanan</strong>
            <p>
              Demi menjaga privasi akun, sistem tidak akan menampilkan apakah email tertentu
              terdaftar atau tidak.
            </p>
          </div>
        </section>

        <section className="auth-forgot-panel" data-reveal data-reveal-delay="120ms">
          <div className="auth-forgot-panel-inner">
            <div className="auth-panel-brand auth-forgot-brand">
              <img
                className="auth-panel-brand-image"
                src="/kerjanusa-logo-cutout.png"
                alt="KerjaNusa Recruitment Platform"
              />
            </div>

            <div className="auth-forgot-copy">
              <p>{forgotPasswordCopy.helper}</p>
            </div>

            {submittedEmail ? (
              <div className="auth-forgot-success">
                <span className="auth-forgot-success-kicker">Permintaan diterima</span>
                <h3>Cek email Anda</h3>
                <p>
                  Jika <strong>{submittedEmail}</strong> terdaftar, instruksi reset password akan
                  dikirim ke inbox email tersebut.
                </p>

                <div className="auth-forgot-success-actions">
                  <Link to={forgotPasswordCopy.loginTo} className="btn btn-primary">
                    {forgotPasswordCopy.loginLabel}
                  </Link>
                  <button type="button" className="btn btn-outline" onClick={handleReset}>
                    Gunakan email lain
                  </button>
                </div>
              </div>
            ) : (
              <form className="auth-form auth-forgot-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="forgot_password_email">Email</label>
                  <input
                    id="forgot_password_email"
                    type="email"
                    autoComplete="email"
                    placeholder={forgotPasswordCopy.emailPlaceholder}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary">
                  Kirim tautan reset
                </button>

                <p className="auth-forgot-inline-note">
                  Jika email terdaftar, kami akan mengirim panduan pemulihan akses ke inbox Anda.
                </p>

                <p className="auth-link auth-forgot-back-link">
                  <Link to={forgotPasswordCopy.loginTo}>{forgotPasswordCopy.loginLabel}</Link>
                </p>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
