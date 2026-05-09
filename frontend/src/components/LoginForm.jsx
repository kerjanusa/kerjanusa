import { useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import '../styles/authForm.css';

const LoginForm = ({
  onSuccess,
  emailPlaceholder = 'Email recruiter / company',
  forgotPasswordTo = '/forgot-password',
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const { login, isLoading, error, validationErrors, clearError } = useAuth();

  const hasFieldErrors = Object.keys(validationErrors || {}).length > 0;
  const getFieldError = (fieldName) => validationErrors?.[fieldName]?.[0] || '';

  const handleEmailChange = (value) => {
    setEmail(value);

    if (error || hasFieldErrors) {
      clearError();
    }
  };

  const handlePasswordChange = (value) => {
    setPassword(value);

    if (error || hasFieldErrors) {
      clearError();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const authData = await login(email, password);
      onSuccess?.(authData);
    } catch {
      // Error is handled by Zustand store
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {error && !hasFieldErrors && <div className="error-message">{error}</div>}

      <div className={`form-group${getFieldError('email') ? ' has-error' : ''}`}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          placeholder={emailPlaceholder}
          value={email}
          onChange={(e) => handleEmailChange(e.target.value)}
          required
          disabled={isLoading}
          aria-invalid={Boolean(getFieldError('email'))}
        />
        {getFieldError('email') && <p className="field-error">{getFieldError('email')}</p>}
      </div>

      <div className={`form-group${getFieldError('password') ? ' has-error' : ''}`}>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Ketik password"
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
          required
          disabled={isLoading}
          aria-invalid={Boolean(getFieldError('password'))}
        />
        {getFieldError('password') && <p className="field-error">{getFieldError('password')}</p>}
      </div>

      <div className="auth-form-support">
        <label className="auth-form-remember" htmlFor="remember_device">
          <input
            id="remember_device"
            type="checkbox"
            checked={rememberDevice}
            onChange={(e) => setRememberDevice(e.target.checked)}
            disabled={isLoading}
          />
          <span>Ingat perangkat ini</span>
        </label>
        <Link
          to={forgotPasswordTo}
          className={`auth-form-forgot${isLoading ? ' is-disabled' : ''}`}
          onClick={(event) => {
            if (isLoading) {
              event.preventDefault();
            }
          }}
          aria-disabled={isLoading}
        >
          Lupa kata sandi?
        </Link>
      </div>

      <button type="submit" className="btn btn-primary" disabled={isLoading}>
        {isLoading ? 'Memproses...' : 'Login'}
      </button>
    </form>
  );
};

export default LoginForm;
