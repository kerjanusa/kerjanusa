import { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';
import '../styles/authForm.css';

const normalizeRole = (role) => (role === 'candidate' ? 'candidate' : 'recruiter');

const RegisterForm = ({ onSuccess, defaultRole = 'recruiter' }) => {
  const resolvedDefaultRole = normalizeRole(defaultRole);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: resolvedDefaultRole,
    password: '',
    password_confirmation: '',
  });

  const { register, isLoading, error } = useAuth();

  useEffect(() => {
    setFormData((currentData) => {
      if (currentData.role === resolvedDefaultRole) {
        return currentData;
      }

      return {
        ...currentData,
        role: resolvedDefaultRole,
      };
    });
  }, [resolvedDefaultRole]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      await register(formData);
      onSuccess?.();
    } catch {
      // Error state is already handled in the auth store.
    }
  };

  const formHeading =
    formData.role === 'candidate' ? 'Buat akun kandidat' : 'Buat akun recruiter';

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>{formHeading}</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="name">Nama</label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="role">Peran</label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            disabled={isLoading}
          >
            <option value="recruiter">Recruiter</option>
            <option value="candidate">Candidate</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="phone">Nomor Telepon</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          required
          disabled={isLoading}
        />
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password_confirmation">Konfirmasi Password</label>
          <input
            id="password_confirmation"
            name="password_confirmation"
            type="password"
            value={formData.password_confirmation}
            onChange={handleChange}
            required
            disabled={isLoading}
          />
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={isLoading}>
        {isLoading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
      </button>
    </form>
  );
};

export default RegisterForm;
