import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo.jsx';
import RegisterForm from '../components/RegisterForm.jsx';
import '../styles/auth.css';

const REGISTER_COPY = {
  recruiter: {
    heading: 'Daftar sebagai recruiter',
    description:
      'Buka akun recruiter untuk memasang lowongan dan mengelola kandidat dari satu dashboard.',
  },
  candidate: {
    heading: 'Daftar sebagai kandidat',
    description:
      'Buka akun kandidat untuk melamar lowongan dan mengikuti proses rekrutmen yang tersedia.',
  },
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedRole = searchParams.get('role') === 'candidate' ? 'candidate' : 'recruiter';
  const registerCopy = REGISTER_COPY[selectedRole];

  const handleRegisterSuccess = () => {
    navigate('/');
  };

  return (
    <div className="auth-page auth-page-register">
      <div className="auth-container auth-container-wide auth-container-register">
        <div className="auth-card auth-card-register" data-reveal>
          <div className="auth-brand auth-brand-register">
            <BrandLogo />
            <div className="auth-brand-copy auth-brand-copy-register">
              <h1>{registerCopy.heading}</h1>
              <p>{registerCopy.description}</p>
            </div>
          </div>
          <RegisterForm onSuccess={handleRegisterSuccess} defaultRole={selectedRole} />
          <p className="auth-link auth-link-register">
            Sudah punya akun? <Link to="/login">Login di sini</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
